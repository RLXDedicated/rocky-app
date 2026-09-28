// Application Service for Rocky the pet (needs, care, shop, coins) and the
// admin tools that manage it. The rules live in src/game/pet.ts — shared
// with the browser — so this file only loads, applies, stores and records:
// every change is saved together with its coin-ledger entry and audit-trail
// entry in one transaction.
import { ApiError } from '../api/errors'
import type { PersistenceContext } from '../infrastructure/persistenceContext'
import type { AuditRow, LedgerRow } from '../infrastructure/accounts/AccountStore'
import { GameService, systemClock, type Clock } from '../domain/rockyEngine'
import { CLOSET, findItem, resolveCatalog, type CatalogOverrides, type ProgressFacts } from '../../../src/game/closet'
import { coinBreakdown, type CoinBreakdown } from '../../../src/game/economy'
import {
  adminAdjustCoins,
  adminAdjustTreats,
  adminGrantItem,
  adminRestoreNeeds,
  adminRevokeItem,
  applyPetAction,
  coinBalance,
  factsFrom,
  initialPetState,
  normalizePetState,
  refreshPetState,
  treatsAvailable,
  type LedgerEntry,
  type PetAction,
  type PetFailure,
  type PetState,
} from '../../../src/game/pet'

export interface PetView {
  state: PetState
  coins: number
  treats: number
  earned: CoinBreakdown
  facts: ProgressFacts
  catalog: CatalogOverrides
  revision: number
  serverTime: string
}

export interface PetActionResponse extends PetView {
  ok: boolean
  reason: PetFailure | null
}

export interface Actor {
  id: string
  via?: string
}

export interface PetApplicationServiceDeps {
  persistence: PersistenceContext
  clock?: Clock
}

const LEDGER_LIMIT = 200
const AUDIT_LIMIT = 300

export function createPetApplicationService({ persistence, clock = systemClock }: PetApplicationServiceDeps) {
  const accounts = persistence.accounts

  function facts(agentId: string): ProgressFacts {
    const service = new GameService(persistence.repoStore.forAgent(agentId), clock)
    return factsFrom(service.getSnapshot().gameState, service.getAchievementProgress())
  }

  function load(agentId: string, now: Date): { state: PetState; revision: number } {
    const record = accounts.getPetProfile(agentId)
    const state = record ? normalizePetState(record.state, now) : initialPetState(now)
    return { state: refreshPetState(state, now), revision: record?.revision ?? 0 }
  }

  function view(state: PetState, f: ProgressFacts, revision: number, now: Date, overrides = accounts.getCatalogOverrides()): PetView {
    return {
      state,
      coins: coinBalance(state, f),
      treats: treatsAvailable(state, f),
      earned: coinBreakdown(f),
      facts: f,
      catalog: overrides,
      revision,
      serverTime: now.toISOString(),
    }
  }

  function audit(agentId: string | null, actor: Actor, action: string, detail: Record<string, unknown> | null, now: Date) {
    accounts.addAudit({ agentId, actor: actor.id, action, detail, source: actor.via ?? null, createdAt: now.toISOString() })
  }

  function ledger(agentId: string, actor: Actor, entry: LedgerEntry, balanceAfter: number, now: Date) {
    accounts.addLedger({
      agentId,
      delta: entry.delta,
      kind: entry.kind,
      itemId: entry.itemId ?? null,
      note: entry.note ?? null,
      actor: actor.id,
      balanceAfter,
      createdAt: now.toISOString(),
    })
  }

  function save(agentId: string, state: PetState, now: Date): number {
    return accounts.savePetProfile(agentId, state, now.toISOString()).revision
  }

  /** Admin changes all follow the same shape: load → change → save → ledger/audit → view. */
  function adminChange(
    agentId: string,
    actor: Actor,
    action: string,
    detail: Record<string, unknown>,
    change: (state: PetState, f: ProgressFacts, now: Date) => { state: PetState; ledger?: LedgerEntry },
  ): PetView {
    if (!persistence.repoStore.hasAgent(agentId)) throw ApiError.notFound(`Agent "${agentId}" does not exist.`)
    return persistence.withTransaction(() => {
      const now = clock.now()
      const f = facts(agentId)
      const { state } = load(agentId, now)
      const result = change(state, f, now)
      const revision = save(agentId, result.state, now)
      const coins = coinBalance(result.state, f)
      if (result.ledger && result.ledger.delta !== 0) ledger(agentId, actor, result.ledger, coins, now)
      audit(agentId, actor, action, { ...detail, ...(result.ledger ? { applied: result.ledger.delta } : {}) }, now)
      return view(result.state, f, revision, now)
    })
  }

  return {
    getPet(agentId: string): PetView {
      const now = clock.now()
      const f = facts(agentId)
      const { state, revision } = load(agentId, now)
      return view(state, f, revision, now)
    },

    act(agentId: string, action: PetAction, actor: Actor): PetActionResponse {
      return persistence.withTransaction(() => {
        const now = clock.now()
        const f = facts(agentId)
        const overrides = accounts.getCatalogOverrides()
        const { state, revision } = load(agentId, now)
        const result = applyPetAction(state, action, { facts: f, now, catalog: resolveCatalog(overrides) })
        if (!result.ok) {
          audit(
            agentId,
            actor,
            `pet.${action.type}.rejected`,
            { reason: result.reason, ...('itemId' in action ? { itemId: action.itemId } : {}) },
            now,
          )
          return { ...view(state, f, revision, now, overrides), ok: false, reason: result.reason }
        }
        const nextRevision = save(agentId, result.state, now)
        const coins = coinBalance(result.state, f)
        if (result.ledger) ledger(agentId, actor, result.ledger, coins, now)
        const detail: Record<string, unknown> = {
          needs: { h: result.state.needs.health, j: result.state.needs.happiness, d: result.state.needs.dirt },
        }
        if ('itemId' in action) detail.itemId = action.itemId
        if (action.type === 'equip') detail.outfit = result.state.outfit
        if (result.ledger) detail.coins = result.ledger.delta
        if (action.type === 'quiz') detail.score = `${result.state.quiz.lastScore}/${result.state.quiz.lastTotal}`
        audit(agentId, actor, `pet.${action.type}`, detail, now)
        return { ...view(result.state, f, nextRevision, now, overrides), ok: true, reason: null }
      })
    },

    markOnboarded(agentId: string, actor: Actor): PetView {
      return persistence.withTransaction(() => {
        const now = clock.now()
        const f = facts(agentId)
        const { state } = load(agentId, now)
        const next = state.onboardedAt ? state : { ...state, onboardedAt: now.toISOString() }
        const revision = save(agentId, next, now)
        if (!state.onboardedAt) audit(agentId, actor, 'agent.onboarded', null, now)
        return view(next, f, revision, now)
      })
    },

    // ----------------------------------------------------------------- admin
    getAdminPet(agentId: string) {
      if (!persistence.repoStore.hasAgent(agentId)) throw ApiError.notFound(`Agent "${agentId}" does not exist.`)
      const pet = this.getPet(agentId)
      return {
        pet,
        ledger: accounts.listLedger(agentId, LEDGER_LIMIT) as LedgerRow[],
        audit: accounts.listAudit(agentId, AUDIT_LIMIT) as AuditRow[],
        sessions: accounts.listSessions(agentId).map((s) => ({
          createdAt: s.createdAt,
          lastSeenAt: s.lastSeenAt,
          expiresAt: s.expiresAt,
          userAgent: s.userAgent,
          revokedAt: s.revokedAt,
          active: !s.revokedAt && s.expiresAt > clock.now().toISOString(),
        })),
        hasPin: accounts.getCredential(agentId) !== null,
      }
    },

    adjustCoins(agentId: string, delta: number, note: string, actor: Actor): PetView {
      return adminChange(agentId, actor, 'admin.coins', { delta, note }, (state, f) => adminAdjustCoins(state, delta, f, note))
    },

    adjustTreats(agentId: string, delta: number, actor: Actor): PetView {
      return adminChange(agentId, actor, 'admin.treats', { delta }, (state) => ({ state: adminAdjustTreats(state, delta) }))
    },

    grantItem(agentId: string, itemId: string, actor: Actor): PetView {
      if (!findItem(itemId)) throw ApiError.validation(`Unknown item "${itemId}".`)
      return adminChange(agentId, actor, 'admin.item.grant', { itemId }, (state) => ({ state: adminGrantItem(state, itemId) }))
    },

    revokeItem(agentId: string, itemId: string, actor: Actor): PetView {
      if (!findItem(itemId)) throw ApiError.validation(`Unknown item "${itemId}".`)
      return adminChange(agentId, actor, 'admin.item.revoke', { itemId }, (state, f) => ({
        state: adminRevokeItem(state, itemId, f, resolveCatalog(accounts.getCatalogOverrides())),
      }))
    },

    restoreNeeds(agentId: string, actor: Actor): PetView {
      return adminChange(agentId, actor, 'admin.needs.restore', {}, (state, _f, now) => ({ state: adminRestoreNeeds(state, now) }))
    },

    resetPet(agentId: string, actor: Actor): PetView {
      return adminChange(agentId, actor, 'admin.pet.reset', {}, (state, _f, now) => ({
        state: { ...initialPetState(now), onboardedAt: state.onboardedAt },
      }))
    },

    getCatalog() {
      const overrides = accounts.getCatalogOverrides()
      return {
        overrides,
        items: resolveCatalog(overrides).map((i) => {
          const base = CLOSET.find((c) => c.id === i.id)!
          return {
            id: i.id,
            slot: i.slot,
            name: i.name,
            requirement: i.requirement,
            price: i.price,
            basePrice: base.price,
            enabled: i.enabled !== false,
          }
        }),
      }
    },

    setCatalogItem(itemId: string, value: { price: number | null; enabled: boolean | null }, actor: Actor) {
      if (!findItem(itemId)) throw ApiError.validation(`Unknown item "${itemId}".`)
      return persistence.withTransaction(() => {
        const now = clock.now()
        const base = findItem(itemId)!
        // Storing the default price/availability is the same as "no override".
        const price = value.price === null || value.price === base.price ? null : value.price
        const enabled = value.enabled === null || value.enabled === true ? null : false
        accounts.setCatalogOverride(itemId, { price, enabled }, actor.id, now.toISOString())
        audit(null, actor, 'admin.catalog', { itemId, price: value.price, enabled: value.enabled }, now)
        return this.getCatalog()
      })
    },

    listLedger(limit = 200) {
      return accounts.listLedger(null, limit)
    },

    listAudit(limit = 300) {
      return accounts.listAudit(null, limit)
    },

    /** Economy totals for the admin overview. */
    economySummary() {
      const now = clock.now()
      const rows = persistence.repoStore.listAgentIds().map((agentId) => {
        const f = facts(agentId)
        const { state } = load(agentId, now)
        return {
          agentId,
          earned: coinBreakdown(f).total,
          spent: state.coinsSpent,
          adjust: state.coinsAdjust,
          balance: coinBalance(state, f),
          needs: state.needs,
          items: state.owned.length + state.granted.length,
        }
      })
      const sum = (k: 'earned' | 'spent' | 'adjust' | 'balance') => rows.reduce((a, r) => a + r[k], 0)
      const avg = (k: 'health' | 'happiness' | 'dirt') => (rows.length ? Math.round(rows.reduce((a, r) => a + r.needs[k], 0) / rows.length) : 0)
      return {
        totals: { earned: sum('earned'), spent: sum('spent'), adjustments: sum('adjust'), balance: sum('balance') },
        needs: { health: avg('health'), happiness: avg('happiness'), dirt: avg('dirt') },
        agents: rows.sort((a, b) => b.balance - a.balance),
      }
    },

    audit,
  }
}

export type PetApplicationService = ReturnType<typeof createPetApplicationService>
