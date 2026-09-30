import type { GameEvent, GameState, Mood } from '../types/domain'
import { DEFAULT_WORKING_HOURS, type ReminderCategory, type ReminderRecord, type WorkingHoursSettings } from '../types/reminder'
import { todayKey } from './dateUtils'
import { GAME_CONFIG } from './gameConfig'
import { calculateMood } from './gameEngine'
import { pickReminderMessage } from './reminderMessages'

// ---------------------------------------------------------------------------
// Tunables — sourced from GAME_CONFIG (Phase 9 §Rule 4), documented there.
// ---------------------------------------------------------------------------
export const COOLDOWN_MINUTES = GAME_CONFIG.reminders.cooldownMinutes
export const ADAPTIVE_COOLDOWN_MULTIPLIER = GAME_CONFIG.reminders.adaptiveCooldownMultiplier
export const MAX_DAILY_REMINDERS = GAME_CONFIG.reminders.maxPerDay
/** Suppress any reminder for this long after a Check-in/QA Pass. */
export const POSITIVE_ACTION_SUPPRESSION_MINUTES = GAME_CONFIG.reminders.positiveActionSuppressionMinutes
/** "A reasonable period" after a Documentation Alert before offering Recovery. */
export const RECOVERY_DELAY_MINUTES = GAME_CONFIG.reminders.recoveryDelayMinutes

// ---------------------------------------------------------------------------
// Working hours
// ---------------------------------------------------------------------------
export function isWithinWorkingHours(now: Date, settings: WorkingHoursSettings = DEFAULT_WORKING_HOURS): boolean {
  if (!settings.workingDays.includes(now.getDay())) return false
  const minutesNow = now.getHours() * 60 + now.getMinutes()
  const [startH, startM] = settings.workingStartTime.split(':').map(Number)
  const [endH, endM] = settings.workingEndTime.split(':').map(Number)
  return minutesNow >= startH * 60 + startM && minutesNow < endH * 60 + endM
}

function minutesSince(now: Date, iso: string | null | undefined): number | null {
  if (!iso) return null
  return (now.getTime() - new Date(iso).getTime()) / 60000
}

// ---------------------------------------------------------------------------
// Adaptive frequency (Phase 7 §15) — simple, documented rule: if the last 3
// reminders were all ignored (sent or dismissed, never opened/acted on),
// double the cooldown for a while instead of continuing to interrupt at the
// normal rate. Any real engagement resets back to the normal cadence.
// ---------------------------------------------------------------------------
export function effectiveCooldownMinutes(history: ReminderRecord[]): number {
  const recent = history.slice(-3)
  const allIgnored = recent.length === 3 && recent.every((r) => r.status === 'sent' || r.status === 'dismissed')
  return allIgnored ? COOLDOWN_MINUTES * ADAPTIVE_COOLDOWN_MULTIPLIER : COOLDOWN_MINUTES
}

export function isInCooldown(now: Date, history: ReminderRecord[]): boolean {
  const last = history[history.length - 1]
  if (!last) return false
  const minutes = minutesSince(now, last.timestamp)
  return minutes !== null && minutes < effectiveCooldownMinutes(history)
}

// ---------------------------------------------------------------------------
// Daily frequency — a cap on OPPORTUNITIES actually sent, not evaluated.
// ---------------------------------------------------------------------------
export function reminderCountToday(history: ReminderRecord[], now: Date): number {
  const today = todayKey(now)
  return history.filter((r) => todayKey(new Date(r.timestamp)) === today).length
}

export function hasReachedDailyLimit(history: ReminderRecord[], now: Date): boolean {
  return reminderCountToday(history, now) >= MAX_DAILY_REMINDERS
}

// ---------------------------------------------------------------------------
// Suppression
// ---------------------------------------------------------------------------
export function isSuppressedByRecentPositiveAction(now: Date, state: GameState): boolean {
  const minutes = minutesSince(now, state.lastPositiveActionAt)
  return minutes !== null && minutes < POSITIVE_ACTION_SUPPRESSION_MINUTES
}

// ---------------------------------------------------------------------------
// Celebration — event-tied, highest priority, never repeated (Phase 7 §16,
// §18, §19). Priority: Evolution > Level Up > Achievement / Streak Milestone.
// ---------------------------------------------------------------------------
const CELEBRATION_EVENT_PRIORITY: GameEvent['type'][] = ['EVOLUTION', 'LEVEL_UP', 'ACHIEVEMENT', 'STREAK_MILESTONE']

export function findPendingCelebration(
  events: GameEvent[],
  agentId: string,
  history: ReminderRecord[],
  now?: Date,
): GameEvent | undefined {
  const alreadyCelebrated = new Set(history.map((r) => r.dedupeKey).filter((k): k is string => Boolean(k)))
  const oldest = now ? now.getTime() - GAME_CONFIG.reminders.celebrationMaxAgeHours * 3_600_000 : -Infinity
  const candidates = events.filter(
    (e) =>
      e.agentId === agentId &&
      CELEBRATION_EVENT_PRIORITY.includes(e.type) &&
      !alreadyCelebrated.has(e.id) &&
      new Date(e.timestamp).getTime() >= oldest,
  )
  for (const type of CELEBRATION_EVENT_PRIORITY) {
    const matches = candidates.filter((e) => e.type === type)
    if (matches.length > 0) {
      return matches.reduce((latest, e) => (e.timestamp > latest.timestamp ? e : latest))
    }
  }
  return undefined
}

function celebrationMessageFor(event: GameEvent, random: () => number): string {
  switch (event.type) {
    case 'EVOLUTION': {
      const stage = event.payload?.newStage ?? event.payload?.stage ?? 'a new stage'
      return `✨ Rocky evolved into ${stage} Rocky!`
    }
    case 'LEVEL_UP': {
      const level = event.payload?.newLevel ?? event.payload?.level
      return `🎉 Level ${level} reached! ${pickReminderMessage('Celebration', undefined, random)}`
    }
    case 'ACHIEVEMENT': {
      const name = event.payload?.name ?? 'a new achievement'
      return `🏅 Achievement unlocked: ${name}!`
    }
    case 'STREAK_MILESTONE': {
      const days = event.payload?.days
      return `🔥 ${days}-day streak milestone!`
    }
    default:
      return pickReminderMessage('Celebration', undefined, random)
  }
}

// ---------------------------------------------------------------------------
// Recovery eligibility (Phase 7 §17) — not immediately after the Alert; only
// once a reasonable delay has passed, and only if the user hasn't already
// taken a positive action since (Mood already shows Recovery in that case).
// ---------------------------------------------------------------------------
export function isRecoveryEligible(now: Date, state: GameState): boolean {
  if (!state.lastAlertAt) return false
  if (state.lastPositiveActionAt && state.lastPositiveActionAt > state.lastAlertAt) return false
  const minutesSinceAlert = minutesSince(now, state.lastAlertAt)
  return minutesSinceAlert !== null && minutesSinceAlert >= RECOVERY_DELAY_MINUTES
}

// ---------------------------------------------------------------------------
// Contextual category selection (Phase 7 §7) — each state maps to a
// (primary, secondary) pair; the engine falls back to the secondary when the
// primary would repeat the immediately preceding reminder's category.
// ---------------------------------------------------------------------------
export function contextualCategoryPair(
  state: Pick<GameState, 'energy' | 'currentStreak'>,
  mood: Mood,
): [ReminderCategory, ReminderCategory] {
  if (mood === 'Worried') return ['Recovery', 'Documentation']
  if (mood === 'Recovery') return ['Recovery', 'Progress']
  if (mood === 'Happy') return ['Celebration', 'Progress']
  if (state.energy < GAME_CONFIG.mood.worriedEnergyThreshold) return ['Recovery', 'Documentation']
  if (state.currentStreak === 0) return ['Documentation', 'Progress']
  if (state.currentStreak <= 2) return ['Streak', 'Documentation']
  if (state.currentStreak >= 7) return ['Progress', 'Celebration']
  return ['Streak', 'Progress'] // Healthy streak (3-6 days)
}

// A reminder is actionable when a Check-in genuinely resolves it — Progress
// and Celebration are informational, not asking for anything.
function isActionableCategory(category: ReminderCategory): boolean {
  return category === 'Documentation' || category === 'Streak' || category === 'Recovery'
}

export interface ReminderCandidate {
  category: ReminderCategory
  message: string
  actionable: boolean
  dedupeKey?: string
}

export interface ReminderContext {
  now: Date
  state: GameState
  events: GameEvent[]
  history: ReminderRecord[]
  agentId: string
  settings?: WorkingHoursSettings
  random?: () => number
  /** Developer Controls: bypass the working-hours check for testing. */
  forceWorkingHours?: boolean
}

/**
 * The single entry point tying every rule together. Deterministic given a
 * fixed `now` and injected `random` — no hidden calls to Date.now() or
 * Math.random() inside, so tests can be exact. Returns null whenever no
 * reminder should be sent right now; never mutates GameState/events itself.
 */
export function evaluateReminderOpportunity(ctx: ReminderContext): ReminderCandidate | null {
  const { now, state, events, history, agentId } = ctx
  const settings = ctx.settings ?? DEFAULT_WORKING_HOURS
  const random = ctx.random ?? Math.random

  if (!ctx.forceWorkingHours && !isWithinWorkingHours(now, settings)) return null
  if (hasReachedDailyLimit(history, now)) return null
  if (isInCooldown(now, history)) return null
  if (isSuppressedByRecentPositiveAction(now, state)) return null

  const lastRecord = history[history.length - 1]

  // 1) Celebration always wins when one is pending.
  const celebrationEvent = findPendingCelebration(events, agentId, history, now)
  if (celebrationEvent) {
    return {
      category: 'Celebration',
      message: celebrationMessageFor(celebrationEvent, random),
      actionable: false,
      dedupeKey: celebrationEvent.id,
    }
  }

  // 2) Recovery, once enough time has passed since an Alert.
  if (isRecoveryEligible(now, state)) {
    return buildCandidate('Recovery', lastRecord, random)
  }

  // 3) Contextual Mood/Streak/Energy pick.
  const mood = calculateMood(state, now)
  const [primary, secondary] = contextualCategoryPair(state, mood)
  let category = primary

  // Already checked in today -> a Documentation/Streak nudge has nothing
  // left to ask for; talk about Progress instead.
  const alreadyCheckedInToday = state.lastCheckInDate === todayKey(now)
  if (alreadyCheckedInToday && (category === 'Documentation' || category === 'Streak')) {
    category = 'Progress'
  }

  // Don't immediately repeat the same category as the last reminder shown.
  if (lastRecord && lastRecord.category === category && secondary !== category) {
    category = secondary
  }

  return buildCandidate(category, lastRecord, random)
}

function buildCandidate(
  category: ReminderCategory,
  lastRecord: ReminderRecord | undefined,
  random: () => number,
): ReminderCandidate {
  const lastMessage = lastRecord?.category === category ? lastRecord.message : undefined
  return {
    category,
    message: pickReminderMessage(category, lastMessage, random),
    actionable: isActionableCategory(category),
  }
}
