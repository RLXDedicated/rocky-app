// The API layer (Phase 12 §3, §6). Every handler here does exactly four
// things: authenticate/authorize (via middleware), validate the request,
// call an Application Service, and shape the response. None of them
// compute XP/Energy/Level/Mood/Streak/Evolution/Achievements — grep this
// file if you doubt it (Phase 12 §23 architecture quality check).
import { Router, type Request, type Response } from 'express'
import { requireRole } from '../middleware/devIdentity'
import { parseJsonBody, rejectClientAuthoredState, requireAuditDate, requireEnum, requireNonEmptyString } from './validation'
import type { GameApplicationService } from '../application/gameApplicationService'
import type { QaApplicationService } from '../application/qaApplicationService'
import type { ReminderApplicationService } from '../application/reminderApplicationService'
import type { LeaderboardApplicationService } from '../application/leaderboardApplicationService'
import type { TeamApplicationService } from '../application/teamApplicationService'
import type { AdminApplicationService } from '../application/adminApplicationService'
import type { PetApplicationService, Actor } from '../application/petApplicationService'
import type { AuthApplicationService } from '../application/authApplicationService'
import { PET_ACTION_TYPES, type PetAction } from '../../../src/game/pet'
import type { Outfit } from '../../../src/game/closet'
import type { AgentResponse } from '../types/dto'
import { ApiError } from './errors'
import { systemClock, type Clock } from '../domain/rockyEngine'

export interface ApiServices {
  game: GameApplicationService
  qa: QaApplicationService
  reminders: ReminderApplicationService
  leaderboard: LeaderboardApplicationService
  team: TeamApplicationService
  admin: AdminApplicationService
  pet: PetApplicationService
  auth: AuthApplicationService
  clock?: Clock
}

/** The level each evolution starts at (engine/levels.ts evolutionForLevel). */
const EVOLUTION_LEVEL = { Young: 5, Advanced: 10, Elite: 20 } as const

const actorOf = (req: Request): Actor => ({ id: req.identity!.agentId, via: req.identity!.via })

function parsePetAction(body: Record<string, unknown>): PetAction {
  const type = requireEnum(body.type, PET_ACTION_TYPES, 'type')
  if (type === 'buy') return { type, itemId: requireNonEmptyString(body.itemId, 'itemId') }
  if (type === 'quiz') {
    if (!body.answers || typeof body.answers !== 'object' || Array.isArray(body.answers)) throw ApiError.validation('"answers" is required.')
    return { type, answers: body.answers as Record<string, number> }
  }
  if (type === 'equip') {
    if (!body.outfit || typeof body.outfit !== 'object') throw ApiError.validation('"outfit" is required.')
    return { type, outfit: body.outfit as Outfit }
  }
  return { type } as PetAction
}

function requireInteger(value: unknown, field: string, limit: number): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value === 0 || Math.abs(value) > limit) {
    throw ApiError.validation(`"${field}" must be a non-zero whole number between -${limit} and ${limit}.`)
  }
  return value
}

function idempotencyKey(req: Request): string | undefined {
  const header = req.header('Idempotency-Key')
  return header && header.trim().length > 0 ? header.trim() : undefined
}

export function createApiRouter(services: ApiServices): Router {
  const router = Router()
  const clock = services.clock ?? systemClock

  // ---------------------------------------------------------------------
  // Agent
  // ---------------------------------------------------------------------
  router.get('/agent/me', (req: Request, res: Response) => {
    const body: AgentResponse = { ...services.game.getAgent(req.identity!.agentId), role: req.identity!.role, via: req.identity!.via ?? null }
    res.json(body)
  })

  // The agent names their own Rocky (kept server-side so every device agrees).
  router.patch('/agent/me', (req: Request, res: Response) => {
    const body = parseJsonBody(req.body)
    rejectClientAuthoredState(body)
    const rockyName = requireNonEmptyString(body.rockyName, 'rockyName').trim()
    if (rockyName.length > 24) throw ApiError.validation('"rockyName" must be at most 24 characters.')
    const agent = services.game.renameRocky(req.identity!.agentId, rockyName)
    services.pet.audit(req.identity!.agentId, actorOf(req), 'agent.rocky-renamed', { rockyName }, clock.now())
    res.json({ ...agent, role: req.identity!.role, via: req.identity!.via ?? null })
  })

  router.post('/agent/onboarded', (req: Request, res: Response) => {
    res.json(services.pet.markOnboarded(req.identity!.agentId, actorOf(req)))
  })

  // The agent's own event history (diary, weekly streak, coin math on a new device).
  router.get('/events', (req: Request, res: Response) => {
    res.json({ events: services.game.getEvents(req.identity!.agentId) })
  })

  // ---------------------------------------------------------------------
  // Rocky the pet — needs, care, shop, coins (rules in src/game/pet.ts).
  // ---------------------------------------------------------------------
  router.get('/pet', (req: Request, res: Response) => {
    res.json(services.pet.getPet(req.identity!.agentId))
  })

  router.post('/pet/actions', (req: Request, res: Response) => {
    const body = parseJsonBody(req.body)
    rejectClientAuthoredState(body)
    res.json(services.pet.act(req.identity!.agentId, parsePetAction(body), actorOf(req)))
  })

  router.post('/auth/logout', (req: Request, res: Response) => {
    const token = req.header('Authorization')?.match(/^Bearer\s+(\S+)$/i)?.[1]
    res.json(token ? services.auth.logout(token) : { ok: true })
  })

  // ---------------------------------------------------------------------
  // Game state
  // ---------------------------------------------------------------------
  router.get('/game-state', (req: Request, res: Response) => {
    res.json(services.game.getGameState(req.identity!.agentId))
  })

  // ---------------------------------------------------------------------
  // Check-in — the acting agent always checks in as themselves.
  // ---------------------------------------------------------------------
  router.post('/events/check-in', (req: Request, res: Response) => {
    rejectClientAuthoredState(parseJsonBody(req.body))
    res.json(services.game.checkIn(req.identity!.agentId))
  })

  // ---------------------------------------------------------------------
  // QA Pass / Documentation Alert — QA (or ADMIN) only. QA is an EVENT
  // PRODUCER: the only fields accepted are which agent was audited, when,
  // and an optional idempotency reference — never a state value
  // (ADR-0002, docs/API_CONTRACTS.md §3).
  // ---------------------------------------------------------------------
  router.post('/events/qa-pass', requireRole('QA', 'ADMIN'), (req: Request, res: Response) => {
    const body = parseJsonBody(req.body)
    rejectClientAuthoredState(body)
    const agentId = requireNonEmptyString(body.agentId, 'agentId')
    const auditDate = requireAuditDate(body.auditDate, clock.now())
    const result = services.qa.qaPass({ agentId, auditDate, idempotencyKey: idempotencyKey(req) })
    services.pet.audit(agentId, actorOf(req), 'qa.pass', { auditDate }, clock.now())
    res.json(result)
  })

  router.post('/events/documentation-alert', requireRole('QA', 'ADMIN'), (req: Request, res: Response) => {
    const body = parseJsonBody(req.body)
    rejectClientAuthoredState(body)
    const agentId = requireNonEmptyString(body.agentId, 'agentId')
    const auditDate = requireAuditDate(body.auditDate, clock.now())
    const result = services.qa.documentationAlert({ agentId, auditDate, idempotencyKey: idempotencyKey(req) })
    services.pet.audit(agentId, actorOf(req), 'qa.alert', { auditDate }, clock.now())
    res.json(result)
  })

  router.post('/events/correction', requireRole('QA', 'ADMIN'), (req: Request, res: Response) => {
    const body = parseJsonBody(req.body)
    rejectClientAuthoredState(body)
    const agentId = requireNonEmptyString(body.agentId, 'agentId')
    const originalEventId = requireNonEmptyString(body.originalEventId, 'originalEventId')
    const correctedTo = requireEnum(body.correctedTo, ['PASS', 'ALERT'] as const, 'correctedTo')
    const reason = typeof body.reason === 'string' ? body.reason : undefined
    const result = services.qa.correction({ agentId, originalEventId, correctedTo, reason, idempotencyKey: idempotencyKey(req) })
    services.pet.audit(agentId, actorOf(req), 'qa.correction', { originalEventId, correctedTo, reason: reason ?? null }, clock.now())
    res.json(result)
  })

  // ---------------------------------------------------------------------
  // Admin roster — QA (or ADMIN) only. Read-only: every state change still
  // goes through the event routes above.
  // ---------------------------------------------------------------------
  const adminOnly = requireRole('QA', 'ADMIN')

  router.get('/admin/overview', adminOnly, (_req: Request, res: Response) => {
    res.json(services.admin.getOverview())
  })

  router.get('/admin/system', adminOnly, (_req: Request, res: Response) => {
    res.json(services.admin.getSystem())
  })

  router.get('/admin/agents', adminOnly, (_req: Request, res: Response) => {
    res.json(services.admin.listAgents())
  })

  router.get('/admin/agents/:id', adminOnly, (req: Request, res: Response) => {
    res.json(services.admin.getAgentDetail(req.params.id!))
  })

  // Administrative writes — never touch XP/Energy/etc. directly (see
  // adminApplicationService header).
  router.patch('/admin/agents/:id', adminOnly, (req: Request, res: Response) => {
    const body = parseJsonBody(req.body)
    const name = requireNonEmptyString(body.name, 'name').trim()
    if (name.length > 80) throw ApiError.validation('"name" must be at most 80 characters.')
    const result = services.admin.renameAgent(req.params.id!, name)
    services.pet.audit(req.params.id!, actorOf(req), 'admin.agent.renamed', { name }, clock.now())
    res.json(result)
  })

  router.post('/admin/agents/:id/reset', adminOnly, (req: Request, res: Response) => {
    const result = services.admin.resetAgent(req.params.id!)
    services.pet.audit(req.params.id!, actorOf(req), 'admin.agent.reset', null, clock.now())
    res.json(result)
  })

  router.delete('/admin/agents/:id', adminOnly, (req: Request, res: Response) => {
    const result = services.admin.deleteAgent(req.params.id!)
    services.pet.audit(req.params.id!, actorOf(req), 'admin.agent.deleted', null, clock.now())
    res.json(result)
  })

  // Progress: XP bonus, raise to a level, unlock an evolution (all via XP_GRANT events).
  router.post('/admin/agents/:id/xp', adminOnly, (req: Request, res: Response) => {
    const body = parseJsonBody(req.body)
    const xp = requireInteger(body.xp, 'xp', 50_000)
    if (xp < 0) throw ApiError.validation('"xp" must be positive — XP is never taken away.')
    const reason = requireNonEmptyString(body.reason, 'reason').trim().slice(0, 200)
    const result = services.admin.grantXp(req.params.id!, xp, reason, req.identity!.agentId)
    services.pet.audit(
      req.params.id!,
      actorOf(req),
      'admin.xp',
      { delta: xp, reason, level: result.state.level, stage: result.state.evolutionStage },
      clock.now(),
    )
    res.json(result)
  })

  router.post('/admin/agents/:id/level', adminOnly, (req: Request, res: Response) => {
    const body = parseJsonBody(req.body)
    let level: number
    let label: string
    if (body.stage !== undefined) {
      const stage = requireEnum(body.stage, ['Young', 'Advanced', 'Elite'] as const, 'stage')
      level = EVOLUTION_LEVEL[stage]
      label = `Evolution to ${stage} Rocky`
    } else {
      level = requireInteger(body.level, 'level', 20)
      label = `Raised to level ${level}`
    }
    const reason = typeof body.reason === 'string' && body.reason.trim() ? body.reason.trim().slice(0, 200) : label
    const result = services.admin.raiseToLevel(req.params.id!, level, reason, req.identity!.agentId)
    services.pet.audit(
      req.params.id!,
      actorOf(req),
      body.stage !== undefined ? 'admin.evolution' : 'admin.level',
      { level: result.state.level, stage: result.state.evolutionStage, delta: result.xpGranted, reason },
      clock.now(),
    )
    res.json(result)
  })

  // Pet, coins, items, sign-in and the audit trail for one agent.
  router.get('/admin/agents/:id/pet', adminOnly, (req: Request, res: Response) => {
    res.json(services.pet.getAdminPet(req.params.id!))
  })

  router.post('/admin/agents/:id/coins', adminOnly, (req: Request, res: Response) => {
    const body = parseJsonBody(req.body)
    const delta = requireInteger(body.delta, 'delta', 100_000)
    const note = requireNonEmptyString(body.note, 'note').trim().slice(0, 200)
    res.json(services.pet.adjustCoins(req.params.id!, delta, note, actorOf(req)))
  })

  router.post('/admin/agents/:id/treats', adminOnly, (req: Request, res: Response) => {
    const body = parseJsonBody(req.body)
    res.json(services.pet.adjustTreats(req.params.id!, requireInteger(body.delta, 'delta', 1000), actorOf(req)))
  })

  router.post('/admin/agents/:id/items', adminOnly, (req: Request, res: Response) => {
    const body = parseJsonBody(req.body)
    const itemId = requireNonEmptyString(body.itemId, 'itemId')
    const action = requireEnum(body.action, ['grant', 'revoke'] as const, 'action')
    res.json(
      action === 'grant'
        ? services.pet.grantItem(req.params.id!, itemId, actorOf(req))
        : services.pet.revokeItem(req.params.id!, itemId, actorOf(req)),
    )
  })

  router.post('/admin/agents/:id/needs/restore', adminOnly, (req: Request, res: Response) => {
    res.json(services.pet.restoreNeeds(req.params.id!, actorOf(req)))
  })

  router.post('/admin/agents/:id/pet/reset', adminOnly, (req: Request, res: Response) => {
    res.json(services.pet.resetPet(req.params.id!, actorOf(req)))
  })

  router.post('/admin/agents/:id/pin-reset', adminOnly, (req: Request, res: Response) => {
    if (!services.admin.hasAgent(req.params.id!)) throw ApiError.notFound(`Agent "${req.params.id}" does not exist.`)
    res.json(services.auth.resetPin(req.params.id!, req.identity!.agentId))
  })

  router.post('/admin/agents/:id/sessions/revoke', adminOnly, (req: Request, res: Response) => {
    if (!services.admin.hasAgent(req.params.id!)) throw ApiError.notFound(`Agent "${req.params.id}" does not exist.`)
    res.json(services.auth.revokeSessions(req.params.id!, req.identity!.agentId))
  })

  // Shop catalogue, pilot-wide economy and audit trail.
  router.get('/admin/catalog', adminOnly, (_req: Request, res: Response) => {
    res.json(services.pet.getCatalog())
  })

  router.patch('/admin/catalog/:itemId', adminOnly, (req: Request, res: Response) => {
    const body = parseJsonBody(req.body)
    const price = body.price === undefined || body.price === null ? null : body.price
    if (price !== null && (typeof price !== 'number' || !Number.isInteger(price) || price < 0 || price > 100_000)) {
      throw ApiError.validation('"price" must be a whole number from 0 to 100000.')
    }
    const enabled = body.enabled === undefined || body.enabled === null ? null : body.enabled
    if (enabled !== null && typeof enabled !== 'boolean') throw ApiError.validation('"enabled" must be true or false.')
    res.json(services.pet.setCatalogItem(req.params.itemId!, { price: price as number | null, enabled: enabled as boolean | null }, actorOf(req)))
  })

  router.get('/admin/economy', adminOnly, (_req: Request, res: Response) => {
    res.json({ ...services.pet.economySummary(), ledger: services.pet.listLedger(100) })
  })

  router.get('/admin/audit', adminOnly, (_req: Request, res: Response) => {
    res.json({ entries: services.pet.listAudit(300) })
  })

  // ---------------------------------------------------------------------
  // Achievements
  // ---------------------------------------------------------------------
  router.get('/achievements', (req: Request, res: Response) => {
    res.json(services.game.getAchievements(req.identity!.agentId))
  })

  // ---------------------------------------------------------------------
  // Leaderboard
  // ---------------------------------------------------------------------
  router.get('/leaderboard', (req: Request, res: Response) => {
    res.json(services.leaderboard.getLeaderboard(req.identity!.agentId))
  })

  // ---------------------------------------------------------------------
  // Team
  // ---------------------------------------------------------------------
  router.get('/team', (req: Request, res: Response) => {
    res.json(services.team.getTeam(req.identity!.agentId))
  })

  router.get('/team-leaderboard', (req: Request, res: Response) => {
    res.json(services.team.getTeamLeaderboard(req.identity!.agentId))
  })

  // ---------------------------------------------------------------------
  // Reminders
  // ---------------------------------------------------------------------
  router.get('/reminders', (req: Request, res: Response) => {
    res.json(services.reminders.getReminders(req.identity!.agentId))
  })

  router.post('/reminders/:id/opened', (req: Request, res: Response) => {
    res.json(services.reminders.markOpened(req.identity!.agentId, req.params.id))
  })

  router.post('/reminders/:id/acted', (req: Request, res: Response) => {
    res.json(services.reminders.markActed(req.identity!.agentId, req.params.id))
  })

  router.post('/reminders/:id/dismissed', (req: Request, res: Response) => {
    res.json(services.reminders.markDismissed(req.identity!.agentId, req.params.id))
  })

  return router
}
