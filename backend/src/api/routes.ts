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
  clock?: Clock
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
    const body: AgentResponse = { ...services.game.getAgent(req.identity!.agentId), role: req.identity!.role }
    res.json(body)
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
    res.json(services.qa.qaPass({ agentId, auditDate, idempotencyKey: idempotencyKey(req) }))
  })

  router.post('/events/documentation-alert', requireRole('QA', 'ADMIN'), (req: Request, res: Response) => {
    const body = parseJsonBody(req.body)
    rejectClientAuthoredState(body)
    const agentId = requireNonEmptyString(body.agentId, 'agentId')
    const auditDate = requireAuditDate(body.auditDate, clock.now())
    res.json(services.qa.documentationAlert({ agentId, auditDate, idempotencyKey: idempotencyKey(req) }))
  })

  router.post('/events/correction', requireRole('QA', 'ADMIN'), (req: Request, res: Response) => {
    const body = parseJsonBody(req.body)
    rejectClientAuthoredState(body)
    const agentId = requireNonEmptyString(body.agentId, 'agentId')
    const originalEventId = requireNonEmptyString(body.originalEventId, 'originalEventId')
    const correctedTo = requireEnum(body.correctedTo, ['PASS', 'ALERT'] as const, 'correctedTo')
    const reason = typeof body.reason === 'string' ? body.reason : undefined
    res.json(
      services.qa.correction({ agentId, originalEventId, correctedTo, reason, idempotencyKey: idempotencyKey(req) }),
    )
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
    res.json(services.admin.renameAgent(req.params.id!, name))
  })

  router.post('/admin/agents/:id/reset', adminOnly, (req: Request, res: Response) => {
    res.json(services.admin.resetAgent(req.params.id!))
  })

  router.delete('/admin/agents/:id', adminOnly, (req: Request, res: Response) => {
    res.json(services.admin.deleteAgent(req.params.id!))
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
