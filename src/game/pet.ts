// Rocky the pet: needs (health, happiness, cleanliness), care actions
// (pet, treat, play, bath), the wallet and the shop — one pure reducer that
// the browser and the backend both run. In remote mode the backend is the
// source of truth: the browser applies an action optimistically, the
// server re-applies it with the same rules, stores the result and records
// it in the ledger/audit trail, and the browser adopts the server's copy.
//
// Nothing here changes XP, Energy, Level, Streak, Mood or Evolution.
import { todayKey } from '../engine/dateUtils'
import type { Achievement, GameState } from '../types/domain'
import { CLOSET, DEFAULT_OUTFIT, findItem, isUsable, sanitizeOutfit, type ClosetItem, type Outfit, type ProgressFacts } from './closet'
import { coinsEarned, TREAT_BAG } from './economy'

export const NEEDS_MAX = 100

/** How the needs drift over real time (per hour). Gentle on purpose: a weekend away never "kills" Rocky. */
export const NEEDS_RATES = {
  happinessDecay: 1.5,
  dirtGain: 2,
  /** Health drops only while Rocky is very dirty or very unhappy, and recovers otherwise. */
  healthDecay: 1,
  healthRecover: 1.5,
  dirtyThreshold: 70,
  sadThreshold: 20,
  /** Longest stretch of time applied in one go (a long absence counts as this many hours). */
  maxHours: 72,
} as const

/** What each care action does to the needs. */
export const CARE_EFFECTS = {
  pet: { happiness: 5 },
  feed: { health: 12, happiness: 6 },
  play: { happiness: 14, dirt: 12 },
  bath: { dirt: -100, happiness: 4, health: 3 },
} as const

/** Petting cheers Rocky up at most this many times a day (petting stays fun, never grindy). */
export const PETS_PER_DAY = 8

export interface Needs {
  health: number
  happiness: number
  /** 0 = spotless, 100 = covered in mud. */
  dirt: number
  /** When the needs were last brought up to date. */
  updatedAt: string
}

export interface PetState {
  version: 1
  outfit: Outfit
  /** Shop items bought. */
  owned: string[]
  /** Items an admin gave the agent (usable even before the progress unlock, and free). */
  granted: string[]
  needs: Needs
  /** Daily counters. */
  day: { date: string; pets: number; plays: number; baths: number }
  treatsUsed: number
  bonusTreats: number
  coinsSpent: number
  /** Net admin coin adjustments (grants minus deductions). */
  coinsAdjust: number
  /** When the agent finished the intro (kept server-side so a new device skips it). */
  onboardedAt: string | null
}

export type PetAction =
  | { type: 'pet' }
  | { type: 'feed' }
  | { type: 'play' }
  | { type: 'bath' }
  | { type: 'buy'; itemId: string }
  | { type: 'buyTreats' }
  | { type: 'equip'; outfit: Outfit }

export const PET_ACTION_TYPES = ['pet', 'feed', 'play', 'bath', 'buy', 'buyTreats', 'equip'] as const

export interface PetContext {
  facts: ProgressFacts
  now: Date
  catalog?: ClosetItem[]
}

export type PetFailure = 'no-treats' | 'locked' | 'owned' | 'coins' | 'unknown-item' | 'unavailable' | 'invalid'

/** A coin movement to record in the ledger. */
export interface LedgerEntry {
  delta: number
  kind: 'purchase' | 'treat-bag' | 'admin-grant' | 'admin-deduct'
  itemId?: string
  note?: string
}

export type PetResult = { ok: true; state: PetState; ledger?: LedgerEntry } | { ok: false; reason: PetFailure; state: PetState }

/** The progress the shop and the economy read, from the Game Engine's state and achievement metrics. */
export function factsFrom(state: GameState, progress: { unlocked: Achievement[]; metrics: { checkins: number; qaPasses: number } }): ProgressFacts {
  return {
    level: state.level,
    stage: state.evolutionStage,
    bestStreak: state.bestStreak,
    checkIns: progress.metrics.checkins,
    qaPasses: progress.metrics.qaPasses,
    badgeIds: progress.unlocked.map((a) => a.id),
  }
}

const clamp = (n: number) => Math.max(0, Math.min(NEEDS_MAX, Math.round(n * 10) / 10))

export function initialPetState(now: Date = new Date()): PetState {
  return {
    version: 1,
    outfit: { ...DEFAULT_OUTFIT, decor: [...DEFAULT_OUTFIT.decor] },
    owned: [],
    granted: [],
    needs: { health: 100, happiness: 80, dirt: 10, updatedAt: now.toISOString() },
    day: { date: todayKey(now), pets: 0, plays: 0, baths: 0 },
    treatsUsed: 0,
    bonusTreats: 0,
    coinsSpent: 0,
    coinsAdjust: 0,
    onboardedAt: null,
  }
}

const num = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback)
const ids = (v: unknown) => (Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === 'string'))] : [])

/** Repairs anything malformed (old saves, hand-edited storage) into a valid PetState. */
export function normalizePetState(raw: unknown, now: Date = new Date()): PetState {
  const base = initialPetState(now)
  if (!raw || typeof raw !== 'object') return base
  const r = raw as Partial<PetState> & Record<string, unknown>
  const needs = (r.needs ?? {}) as Partial<Needs>
  const day = (r.day ?? {}) as Partial<PetState['day']>
  const o = (r.outfit ?? {}) as Partial<Outfit>
  return {
    version: 1,
    outfit: {
      hat: o.hat === null || typeof o.hat === 'string' ? (o.hat ?? null) : base.outfit.hat,
      scene: typeof o.scene === 'string' ? o.scene : base.outfit.scene,
      decor: Array.isArray(o.decor) ? ids(o.decor) : base.outfit.decor,
      fx: typeof o.fx === 'string' ? o.fx : null,
    },
    owned: ids(r.owned),
    granted: ids(r.granted),
    needs: {
      health: clamp(num(needs.health, base.needs.health)),
      happiness: clamp(num(needs.happiness, base.needs.happiness)),
      dirt: clamp(num(needs.dirt, base.needs.dirt)),
      updatedAt: typeof needs.updatedAt === 'string' && !Number.isNaN(Date.parse(needs.updatedAt)) ? needs.updatedAt : base.needs.updatedAt,
    },
    day: {
      date: typeof day.date === 'string' ? day.date : base.day.date,
      pets: Math.max(0, num(day.pets, 0)),
      plays: Math.max(0, num(day.plays, 0)),
      baths: Math.max(0, num(day.baths, 0)),
    },
    treatsUsed: Math.max(0, num(r.treatsUsed, 0)),
    bonusTreats: Math.max(0, num(r.bonusTreats, 0)),
    coinsSpent: Math.max(0, num(r.coinsSpent, 0)),
    coinsAdjust: num(r.coinsAdjust, 0),
    onboardedAt: typeof r.onboardedAt === 'string' ? r.onboardedAt : null,
  }
}

/** Brings the needs up to `now`: happiness fades, dirt builds up, health follows how Rocky is kept. */
export function tickNeeds(needs: Needs, now: Date): Needs {
  const since = Date.parse(needs.updatedAt)
  const hours = Math.min(NEEDS_RATES.maxHours, Math.max(0, (now.getTime() - since) / 3_600_000))
  if (hours < 1 / 60) return needs
  const happiness = clamp(needs.happiness - NEEDS_RATES.happinessDecay * hours)
  const dirt = clamp(needs.dirt + NEEDS_RATES.dirtGain * hours)
  // Health uses the average condition over the stretch (simple, stable, fair).
  const avgDirt = (needs.dirt + dirt) / 2
  const avgHappy = (needs.happiness + happiness) / 2
  const neglected = avgDirt >= NEEDS_RATES.dirtyThreshold || avgHappy <= NEEDS_RATES.sadThreshold
  const health = clamp(needs.health + (neglected ? -NEEDS_RATES.healthDecay : NEEDS_RATES.healthRecover) * hours)
  return { health, happiness, dirt, updatedAt: now.toISOString() }
}

/** The state as of `now` (needs ticked, daily counters rolled over). */
export function refreshPetState(state: PetState, now: Date): PetState {
  const today = todayKey(now)
  return {
    ...state,
    needs: tickNeeds(state.needs, now),
    day: state.day.date === today ? state.day : { date: today, pets: 0, plays: 0, baths: 0 },
  }
}

/** Treats are earned by real work (1 per check-in, 2 per clean QA audit) plus treat bags bought with coins. */
export function treatsAvailable(state: PetState, facts: ProgressFacts): number {
  return Math.max(0, facts.checkIns + facts.qaPasses * 2 + state.bonusTreats - state.treatsUsed)
}

export function coinBalance(state: PetState, facts: ProgressFacts): number {
  return Math.max(0, coinsEarned(facts) + state.coinsAdjust - state.coinsSpent)
}

function bump(needs: Needs, fx: Partial<Record<'health' | 'happiness' | 'dirt', number>>): Needs {
  return {
    ...needs,
    health: clamp(needs.health + (fx.health ?? 0)),
    happiness: clamp(needs.happiness + (fx.happiness ?? 0)),
    dirt: clamp(needs.dirt + (fx.dirt ?? 0)),
  }
}

/** Applies one agent action. Always returns a state (unchanged on failure) so callers can re-render safely. */
export function applyPetAction(prev: PetState, action: PetAction, ctx: PetContext): PetResult {
  const catalog = ctx.catalog ?? CLOSET
  const state = refreshPetState(prev, ctx.now)
  const fail = (reason: PetFailure): PetResult => ({ ok: false, reason, state })

  switch (action.type) {
    case 'pet': {
      const cheer = state.day.pets < PETS_PER_DAY
      return {
        ok: true,
        state: { ...state, needs: cheer ? bump(state.needs, CARE_EFFECTS.pet) : state.needs, day: { ...state.day, pets: state.day.pets + 1 } },
      }
    }
    case 'feed': {
      if (treatsAvailable(state, ctx.facts) <= 0) return fail('no-treats')
      return { ok: true, state: { ...state, treatsUsed: state.treatsUsed + 1, needs: bump(state.needs, CARE_EFFECTS.feed) } }
    }
    case 'play':
      return { ok: true, state: { ...state, needs: bump(state.needs, CARE_EFFECTS.play), day: { ...state.day, plays: state.day.plays + 1 } } }
    case 'bath': {
      const wasDirty = state.needs.dirt >= 20
      const fx = wasDirty ? CARE_EFFECTS.bath : { dirt: -100, happiness: 1 }
      return { ok: true, state: { ...state, needs: bump(state.needs, fx), day: { ...state.day, baths: state.day.baths + 1 } } }
    }
    case 'buy': {
      const item = findItem(action.itemId, catalog)
      if (!item) return fail('unknown-item')
      if (item.price === 0 || state.owned.includes(item.id) || state.granted.includes(item.id)) return fail('owned')
      if (item.enabled === false) return fail('unavailable')
      if (!item.isUnlocked(ctx.facts)) return fail('locked')
      if (coinBalance(state, ctx.facts) < item.price) return fail('coins')
      return {
        ok: true,
        state: { ...state, owned: [...state.owned, item.id], coinsSpent: state.coinsSpent + item.price },
        ledger: { delta: -item.price, kind: 'purchase', itemId: item.id },
      }
    }
    case 'buyTreats': {
      if (coinBalance(state, ctx.facts) < TREAT_BAG.price) return fail('coins')
      return {
        ok: true,
        state: { ...state, coinsSpent: state.coinsSpent + TREAT_BAG.price, bonusTreats: state.bonusTreats + TREAT_BAG.treats },
        ledger: { delta: -TREAT_BAG.price, kind: 'treat-bag', itemId: TREAT_BAG.id },
      }
    }
    case 'equip': {
      if (!action.outfit || typeof action.outfit !== 'object') return fail('invalid')
      return { ok: true, state: { ...state, outfit: sanitizeOutfit(action.outfit, ctx.facts, state.owned, state.granted, catalog) } }
    }
    default:
      return fail('invalid')
  }
}

// ---------------------------------------------------------------------------
// Admin operations (backend only; each one is recorded in the audit trail).
// ---------------------------------------------------------------------------

/** Grants (positive) or takes away (negative) coins. Never lets the balance go below zero. */
export function adminAdjustCoins(state: PetState, delta: number, facts: ProgressFacts, note?: string): { state: PetState; ledger: LedgerEntry } {
  const whole = Math.trunc(delta)
  const applied = whole < 0 ? -Math.min(-whole, coinBalance(state, facts)) : whole
  return {
    state: { ...state, coinsAdjust: state.coinsAdjust + applied },
    ledger: { delta: applied, kind: applied >= 0 ? 'admin-grant' : 'admin-deduct', note },
  }
}

/** Gives an item to the agent for free, bypassing its progress unlock. */
export function adminGrantItem(state: PetState, itemId: string): PetState {
  return state.granted.includes(itemId) ? state : { ...state, granted: [...state.granted, itemId] }
}

/** Takes an item away (gift or purchase — purchases are not refunded unless the admin also grants coins). */
export function adminRevokeItem(state: PetState, itemId: string, facts: ProgressFacts, catalog: ClosetItem[] = CLOSET): PetState {
  const next = { ...state, granted: state.granted.filter((i) => i !== itemId), owned: state.owned.filter((i) => i !== itemId) }
  return { ...next, outfit: sanitizeOutfit(next.outfit, facts, next.owned, next.granted, catalog) }
}

/** Restores the needs (full health, happy, clean) — e.g. after an outage or on request. */
export function adminRestoreNeeds(state: PetState, now: Date): PetState {
  return { ...state, needs: { health: 100, happiness: 100, dirt: 0, updatedAt: now.toISOString() } }
}

/** Adds treats (positive) or removes unused bonus treats (negative). */
export function adminAdjustTreats(state: PetState, delta: number): PetState {
  return { ...state, bonusTreats: Math.max(0, state.bonusTreats + Math.trunc(delta)) }
}

/** Whether `item` is usable for this agent — convenience for UIs. */
export function canUse(state: PetState, item: ClosetItem, facts: ProgressFacts): boolean {
  return isUsable(item, facts, state.owned, state.granted)
}

/** How Rocky feels about his needs, for speech lines and the needs dock. */
export function needsSummary(needs: Needs): 'dirty' | 'sad' | 'unwell' | 'great' | 'ok' {
  if (needs.health < 35) return 'unwell'
  if (needs.dirt >= NEEDS_RATES.dirtyThreshold) return 'dirty'
  if (needs.happiness <= 30) return 'sad'
  if (needs.health >= 80 && needs.happiness >= 70 && needs.dirt < 30) return 'great'
  return 'ok'
}
