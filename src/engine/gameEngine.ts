import {
  DEFAULT_AGENT_ID,
  INITIAL_GAME_STATE,
  type Achievement,
  type EvolutionStage,
  type GameEvent,
  type GameState,
  type Mood,
  type QAOutcome,
} from '../types/domain'
import { ACHIEVEMENT_CATALOG, evaluateAchievements, type AchievementDef, type AchievementMetrics } from './achievements'
import { daysBetweenKeys, missedWorkingDays, todayKey } from './dateUtils'
import { GAME_CONFIG } from './gameConfig'
import { calculateLevel, evolutionForLevel, evolutionRank } from './levels'
import { evaluateStreakMilestones, type StreakMilestone } from './streakMilestones'

export { calculateLevel, evolutionForLevel }
export { ACHIEVEMENT_CATALOG }

let idCounter = 0
export function makeEventId(): string {
  idCounter += 1
  return `evt_${Date.now()}_${idCounter}`
}

/**
 * Extracts the trailing creation-sequence number from a `makeEventId()` id
 * (the `_<n>` suffix), or `0` if the id doesn't look like one of ours (e.g.
 * a hand-written test fixture). Several events created within the same
 * `processCheckIn`/`processQAPass` call share an identical `timestamp` —
 * this is the tie-breaker that keeps replay order correct for those
 * siblings even if the array holding them was stored/retrieved out of
 * creation order (Phase 10 §Rule 19 — "events in unexpected order").
 */
function eventSequence(id: string): number {
  const match = /_(\d+)$/.exec(id)
  return match ? Number(match[1]) : 0
}

export function calculateEnergy(current: number, delta: number): number {
  return Math.max(GAME_CONFIG.energy.min, Math.min(GAME_CONFIG.energy.max, current + delta))
}

export function calculateStreak(
  previousStreak: number,
  lastCheckInDate: string | null,
  today: string,
): { currentStreak: number; alreadyCheckedInToday: boolean } {
  if (lastCheckInDate === today) {
    return { currentStreak: previousStreak, alreadyCheckedInToday: true }
  }
  if (lastCheckInDate === null) {
    return { currentStreak: 1, alreadyCheckedInToday: false }
  }
  const gap = daysBetweenKeys(lastCheckInDate, today)
  if (gap === 1) {
    return { currentStreak: previousStreak + 1, alreadyCheckedInToday: false }
  }
  // gap > 1 (missed a day) resets the streak to 1 for today's check-in
  return { currentStreak: 1, alreadyCheckedInToday: false }
}

export function calculateMood(
  state: Pick<GameState, 'energy' | 'currentStreak' | 'lastAlertAt' | 'lastPositiveActionAt'>,
  now: Date = new Date(),
): Mood {
  const { recoveryWindowHours, happyEnergyThreshold, happyStreakThreshold, motivatedEnergyThreshold, worriedEnergyThreshold, unansweredAlertHours } =
    GAME_CONFIG.mood

  // Recovery: there was a recent alert, AND a positive action (Check-in or QA
  // Pass) happened afterwards. An alert alone never produces Recovery — only
  // the follow-up action does. This keeps Recovery meaning "bouncing back",
  // not "just got flagged".
  if (state.lastAlertAt && state.lastPositiveActionAt) {
    const alertAt = new Date(state.lastAlertAt).getTime()
    const positiveAt = new Date(state.lastPositiveActionAt).getTime()
    const hoursSincePositive = (now.getTime() - positiveAt) / (1000 * 60 * 60)
    if (positiveAt > alertAt && hoursSincePositive < recoveryWindowHours && state.energy >= motivatedEnergyThreshold) {
      return 'Recovery'
    }
  }

  // Worried only has specific causes — Rocky is never sad by default:
  //   1. Energy has run low (repeated alerts / neglect), or
  //   2. a QA alert is still unanswered: no Check-in or QA Pass since it,
  //      within the alert window.
  if (state.energy < worriedEnergyThreshold) return 'Worried'
  if (state.lastAlertAt) {
    const alertAt = new Date(state.lastAlertAt).getTime()
    const positiveAt = state.lastPositiveActionAt ? new Date(state.lastPositiveActionAt).getTime() : -Infinity
    const hoursSinceAlert = (now.getTime() - alertAt) / (1000 * 60 * 60)
    if (positiveAt < alertAt && hoursSinceAlert < unansweredAlertHours) return 'Worried'
  }
  if (state.energy >= happyEnergyThreshold && state.currentStreak >= happyStreakThreshold) return 'Happy'

  // Everything else is Rocky's calm, ready default ("Motivated"): a new
  // agent, a streak that's still building, or a day off without problems.
  return 'Motivated'
}

export function evaluateEvolution(level: number, previousStage: EvolutionStage): EvolutionStage {
  const target = evolutionForLevel(level)
  // Evolution never regresses.
  return evolutionRank(target) > evolutionRank(previousStage) ? target : previousStage
}

/** Correction-aware map: originalEventId -> the outcome it was corrected to. */
export function buildCorrectionMap(events: GameEvent[]): Map<string, QAOutcome> {
  const map = new Map<string, QAOutcome>()
  for (const event of events) {
    if (event.type === 'CORRECTION' && event.correctsEventId) {
      const correctedTo = event.payload?.correctedTo as QAOutcome | undefined
      if (correctedTo) map.set(event.correctsEventId, correctedTo)
    }
  }
  return map
}

function isEffectiveAlert(event: GameEvent, correctionMap: Map<string, QAOutcome>): boolean {
  const correctedTo = correctionMap.get(event.id)
  if (event.type === 'DOCUMENTATION_ALERT') return (correctedTo ?? 'ALERT') === 'ALERT'
  if (event.type === 'QA_PASS') return correctedTo === 'ALERT'
  return false
}

function isEffectiveQaPass(event: GameEvent, correctionMap: Map<string, QAOutcome>): boolean {
  const correctedTo = correctionMap.get(event.id)
  if (event.type === 'QA_PASS') return (correctedTo ?? 'PASS') === 'PASS'
  if (event.type === 'DOCUMENTATION_ALERT') return correctedTo === 'PASS'
  return false
}

/** Lifetime count of real Check-ins recorded for this agent (never corrected). */
export function countCheckIns(events: GameEvent[], agentId: string): number {
  return events.filter((e) => e.agentId === agentId && e.type === 'CHECK_IN').length
}

/** Lifetime count of QA Passes that are still effectively a PASS after any corrections. */
export function countEffectiveQaPasses(events: GameEvent[], agentId: string): number {
  const correctionMap = buildCorrectionMap(events)
  return events.filter((e) => e.agentId === agentId && isEffectiveQaPass(e, correctionMap)).length
}

/** Lifetime count of audits that are still effectively an ALERT after any corrections. */
export function countEffectiveAlerts(events: GameEvent[], agentId: string): number {
  const correctionMap = buildCorrectionMap(events)
  return events.filter((e) => e.agentId === agentId && isEffectiveAlert(e, correctionMap)).length
}

function grantedMilestoneDays(events: GameEvent[], agentId: string): Set<number> {
  const days = new Set<number>()
  for (const e of events) {
    if (e.agentId === agentId && e.type === 'STREAK_MILESTONE') {
      const day = e.payload?.days as number | undefined
      if (typeof day === 'number') days.add(day)
    }
  }
  return days
}

function unlockedAchievementIds(events: GameEvent[], agentId: string): Set<string> {
  const ids = new Set<string>()
  for (const e of events) {
    if (e.agentId === agentId && e.type === 'ACHIEVEMENT') {
      const id = e.payload?.achievementId as string | undefined
      if (id) ids.add(id)
    }
  }
  return ids
}

interface ProgressionResult {
  events: GameEvent[]
  achievements: Achievement[]
  bonusXp: number
  leveledUp: boolean
  evolved: boolean
}

/**
 * Shared by processCheckIn and processQAPass: given the metrics *after* the
 * triggering action, grants any newly-reached Streak Milestones and
 * Achievements (as events + persistent Achievement records), then folds in
 * the resulting Level Up / Evolution events computed from the *total* XP
 * (base action XP + milestone XP + achievement XP) in one pass — so a
 * milestone or achievement that itself crosses a level threshold is
 * reflected correctly, with only one LEVEL_UP / EVOLUTION event emitted.
 */
function grantProgression(
  agentId: string,
  date: string,
  now: Date,
  eventsSoFar: GameEvent[],
  metrics: AchievementMetrics,
  previousLevel: number,
  previousStage: EvolutionStage,
  xpBeforeProgression: number,
): ProgressionResult {
  const events: GameEvent[] = []
  let bonusXp = 0

  if (metrics.streak > 0) {
    const alreadyGrantedDays = grantedMilestoneDays(eventsSoFar, agentId)
    const newMilestones: StreakMilestone[] = evaluateStreakMilestones(metrics.streak, alreadyGrantedDays)
    for (const milestone of newMilestones) {
      bonusXp += milestone.xp
      events.push({
        id: makeEventId(),
        type: 'STREAK_MILESTONE',
        agentId,
        date,
        timestamp: now.toISOString(),
        payload: { days: milestone.days, xpGained: milestone.xp },
      })
    }
  }

  const alreadyUnlocked = unlockedAchievementIds(eventsSoFar, agentId)
  const newAchievementDefs: AchievementDef[] = evaluateAchievements(metrics, alreadyUnlocked)
  const achievements: Achievement[] = []
  for (const def of newAchievementDefs) {
    bonusXp += def.rewardXp
    achievements.push({ id: def.id, name: def.name, description: def.description, unlockedAt: now.toISOString() })
    events.push({
      id: makeEventId(),
      type: 'ACHIEVEMENT',
      agentId,
      date,
      timestamp: now.toISOString(),
      payload: { achievementId: def.id, name: def.name, xpGained: def.rewardXp },
    })
  }

  const finalXp = xpBeforeProgression + bonusXp
  const finalLevel = calculateLevel(finalXp)
  const finalStage = evaluateEvolution(finalLevel, previousStage)
  const leveledUp = finalLevel > previousLevel
  const evolved = finalStage !== previousStage

  if (leveledUp) {
    // A single action (base reward + milestone + achievement XP combined)
    // can cross more than one Level threshold at once — e.g. Level 4 -> 6.
    // We emit exactly one LEVEL_UP event capturing the whole jump, rather
    // than one event per intermediate level.
    events.push({
      id: makeEventId(),
      type: 'LEVEL_UP',
      agentId,
      date,
      timestamp: now.toISOString(),
      payload: { previousLevel, newLevel: finalLevel, level: finalLevel },
    })
  }
  if (evolved) {
    events.push({
      id: makeEventId(),
      type: 'EVOLUTION',
      agentId,
      date,
      timestamp: now.toISOString(),
      payload: { previousStage, newStage: finalStage, stage: finalStage },
    })
  }

  return { events, achievements, bonusXp, leveledUp, evolved }
}

export interface CheckInResult {
  state: GameState
  events: GameEvent[]
  newAchievements: Achievement[]
  alreadyCheckedInToday: boolean
  leveledUp: boolean
  evolved: boolean
}

/** Most streak shields an agent can hold at once. */
export const MAX_STREAK_SHIELDS = 2

/**
 * The streak after today's check-in, spending shields on missed days: a gap
 * of N missed days is forgiven when the agent holds at least N shields.
 */
export function shieldedStreak(
  previousStreak: number,
  lastCheckInDate: string | null,
  today: string,
  shields: number,
  /** The agent's scheduled work days (from the Teams/SharePoint roster): days off never count as missed. */
  workingDays?: readonly number[],
): { currentStreak: number; alreadyCheckedInToday: boolean; shieldsUsed: number } {
  const base = calculateStreak(previousStreak, lastCheckInDate, today)
  if (base.alreadyCheckedInToday || !lastCheckInDate || previousStreak <= 0) return { ...base, shieldsUsed: 0 }
  const missed = workingDays?.length ? missedWorkingDays(lastCheckInDate, today, workingDays) : daysBetweenKeys(lastCheckInDate, today) - 1
  if (missed <= 0) return { currentStreak: previousStreak + 1, alreadyCheckedInToday: false, shieldsUsed: 0 }
  if (missed >= 1 && missed <= shields) return { currentStreak: previousStreak + 1, alreadyCheckedInToday: false, shieldsUsed: missed }
  return { ...base, shieldsUsed: 0 }
}

const CHECK_IN_XP = GAME_CONFIG.xp.checkIn
const CHECK_IN_ENERGY = GAME_CONFIG.energy.checkIn

export function processCheckIn(
  state: GameState,
  eventsSoFar: GameEvent[] = [],
  now: Date = new Date(),
  agentId: string = DEFAULT_AGENT_ID,
  workingDays?: readonly number[],
): CheckInResult {
  const today = todayKey(now)
  const shields = state.streakShields ?? 0
  const { currentStreak, alreadyCheckedInToday, shieldsUsed } = shieldedStreak(state.currentStreak, state.lastCheckInDate, today, shields, workingDays)

  if (alreadyCheckedInToday) {
    return { state, events: [], newAchievements: [], alreadyCheckedInToday: true, leveledUp: false, evolved: false }
  }

  const energy = calculateEnergy(state.energy, CHECK_IN_ENERGY)
  const bestStreak = Math.max(state.bestStreak, currentStreak)
  const xpFromCheckIn = state.xp + CHECK_IN_XP

  const events: GameEvent[] = [
    {
      id: makeEventId(),
      type: 'CHECK_IN',
      agentId,
      date: today,
      timestamp: now.toISOString(),
      payload: {
        xpGained: CHECK_IN_XP,
        energyGained: CHECK_IN_ENERGY,
        streak: currentStreak,
        ...(shieldsUsed ? { shieldsUsed } : {}),
        // Kept so a replay (QA corrections) reaches the same streak.
        ...(workingDays?.length ? { workingDays: [...workingDays] } : {}),
      },
    },
  ]

  const metrics: AchievementMetrics = {
    checkins: countCheckIns(eventsSoFar, agentId) + 1,
    qaPasses: countEffectiveQaPasses(eventsSoFar, agentId),
    streak: currentStreak,
  }
  const progression = grantProgression(agentId, today, now, eventsSoFar, metrics, state.level, state.evolutionStage, xpFromCheckIn)
  events.push(...progression.events)

  const xp = xpFromCheckIn + progression.bonusXp
  const level = calculateLevel(xp)
  const evolutionStage = evaluateEvolution(level, state.evolutionStage)

  const nextState: GameState = {
    ...state,
    xp,
    energy,
    level,
    currentStreak,
    bestStreak,
    evolutionStage,
    streakShields: shields - shieldsUsed,
    lastCheckInDate: today,
    lastPositiveActionAt: now.toISOString(),
    lastActivityLabel: 'Check-in completed',
    lastActivityAt: now.toISOString(),
  }
  nextState.mood = calculateMood(nextState, now)

  return {
    state: nextState,
    events,
    newAchievements: progression.achievements,
    alreadyCheckedInToday: false,
    leveledUp: progression.leveledUp,
    evolved: progression.evolved,
  }
}

export interface QAPassResult {
  state: GameState
  events: GameEvent[]
  newAchievements: Achievement[]
  leveledUp: boolean
  evolved: boolean
}

const QA_PASS_XP = GAME_CONFIG.xp.qaPass
const QA_PASS_ENERGY = GAME_CONFIG.energy.qaPass

/**
 * A QA Pass means an audit was completed with no Documentation Alert. It
 * does not require (or touch) the daily Check-in — they are independent
 * reward paths. QA Pass never changes Streak.
 */
export function processQAPass(
  state: GameState,
  eventsSoFar: GameEvent[] = [],
  now: Date = new Date(),
  agentId: string = DEFAULT_AGENT_ID,
): QAPassResult {
  const today = todayKey(now)
  const energy = calculateEnergy(state.energy, QA_PASS_ENERGY)
  const xpFromQaPass = state.xp + QA_PASS_XP

  const events: GameEvent[] = [
    {
      id: makeEventId(),
      type: 'QA_PASS',
      agentId,
      date: today,
      timestamp: now.toISOString(),
      payload: { xpGained: QA_PASS_XP, energyGained: QA_PASS_ENERGY },
    },
  ]

  const metrics: AchievementMetrics = {
    checkins: countCheckIns(eventsSoFar, agentId),
    qaPasses: countEffectiveQaPasses(eventsSoFar, agentId) + 1,
    streak: state.currentStreak,
  }
  const progression = grantProgression(agentId, today, now, eventsSoFar, metrics, state.level, state.evolutionStage, xpFromQaPass)
  events.push(...progression.events)

  const xp = xpFromQaPass + progression.bonusXp
  const level = calculateLevel(xp)
  const evolutionStage = evaluateEvolution(level, state.evolutionStage)

  const nextState: GameState = {
    ...state,
    xp,
    energy,
    level,
    evolutionStage,
    // A clean audit earns a streak shield (kept for a missed day later).
    streakShields: Math.min(MAX_STREAK_SHIELDS, (state.streakShields ?? 0) + 1),
    lastPositiveActionAt: now.toISOString(),
    lastActivityLabel: 'QA Pass recorded',
    lastActivityAt: now.toISOString(),
  }
  nextState.mood = calculateMood(nextState, now)

  return {
    state: nextState,
    events,
    newAchievements: progression.achievements,
    leveledUp: progression.leveledUp,
    evolved: progression.evolved,
  }
}

export interface DocumentationAlertResult {
  state: GameState
  events: GameEvent[]
}

const ALERT_ENERGY_LOSS = GAME_CONFIG.energy.alertLoss
const DAILY_ALERT_ENERGY_CAP = GAME_CONFIG.energy.dailyAlertCap

/**
 * How much Energy the *next* alert of the day should cost, given how many
 * effective alerts already landed today. Alerts stack, but total daily
 * Energy loss from Documentation Alerts is capped at DAILY_ALERT_ENERGY_CAP.
 */
export function energyLossForNextAlert(effectiveAlertsAlreadyToday: number): number {
  const lossSoFar = Math.min(DAILY_ALERT_ENERGY_CAP, effectiveAlertsAlreadyToday * ALERT_ENERGY_LOSS)
  return Math.max(0, Math.min(ALERT_ENERGY_LOSS, DAILY_ALERT_ENERGY_CAP - lossSoFar))
}

function applyAlertEffect(state: GameState, now: Date, energyLoss: number): GameState {
  const energy = calculateEnergy(state.energy, -energyLoss)
  const nextState: GameState = {
    ...state,
    energy,
    // A Documentation Alert always breaks the current streak — XP, Level,
    // achievements and evolution are deliberately left untouched. Rocky
    // never regresses; the system is built around recovering, not punishing.
    currentStreak: 0,
    lastAlertAt: now.toISOString(),
    lastActivityLabel: 'Documentation Alert recorded',
    lastActivityAt: now.toISOString(),
  }
  nextState.mood = calculateMood(nextState, now)
  return nextState
}

export function processDocumentationAlert(
  state: GameState,
  events: GameEvent[],
  now: Date = new Date(),
  agentId: string = DEFAULT_AGENT_ID,
): DocumentationAlertResult {
  const today = todayKey(now)
  const correctionMap = buildCorrectionMap(events)
  const effectiveAlertsToday = events.filter((e) => e.date === today && e.agentId === agentId && isEffectiveAlert(e, correctionMap)).length
  const energyLoss = energyLossForNextAlert(effectiveAlertsToday)

  const nextState = applyAlertEffect(state, now, energyLoss)

  const event: GameEvent = {
    id: makeEventId(),
    type: 'DOCUMENTATION_ALERT',
    agentId,
    date: today,
    timestamp: now.toISOString(),
    payload: { energyLoss, streakBroken: state.currentStreak > 0 },
  }

  return { state: nextState, events: [event] }
}

export interface DevXpGrantResult {
  state: GameState
  events: GameEvent[]
  leveledUp: boolean
  evolved: boolean
}

/**
 * Developer-only: force XP up to at least `xpFloor`, emitting the same
 * LEVEL_UP / EVOLUTION events real gameplay would. Never used by the real
 * Check-in / QA Pass / Alert flows — exists purely so Developer Controls can
 * jump straight to a Level or Evolution stage for testing. Never decreases
 * XP (XP is permanent, even from a dev tool), and never touches Streak,
 * Energy, or Achievements.
 */
export function processDevXpGrant(state: GameState, xpFloor: number, now: Date = new Date(), agentId: string = DEFAULT_AGENT_ID): DevXpGrantResult {
  const xp = Math.max(state.xp, xpFloor)
  const level = calculateLevel(xp)
  const evolutionStage = evaluateEvolution(level, state.evolutionStage)
  const leveledUp = level > state.level
  const evolved = evolutionStage !== state.evolutionStage
  const today = todayKey(now)

  const events: GameEvent[] = []
  if (leveledUp) {
    events.push({
      id: makeEventId(),
      type: 'LEVEL_UP',
      agentId,
      date: today,
      timestamp: now.toISOString(),
      payload: { previousLevel: state.level, newLevel: level, level, dev: true },
    })
  }
  if (evolved) {
    events.push({
      id: makeEventId(),
      type: 'EVOLUTION',
      agentId,
      date: today,
      timestamp: now.toISOString(),
      payload: { previousStage: state.evolutionStage, newStage: evolutionStage, stage: evolutionStage, dev: true },
    })
  }

  const nextState: GameState = {
    ...state,
    xp,
    level,
    evolutionStage,
    lastActivityLabel: 'Developer: XP adjusted',
    lastActivityAt: now.toISOString(),
  }
  nextState.mood = calculateMood(nextState, now)

  return { state: nextState, events, leveledUp, evolved }
}

export interface XpGrantResult {
  state: GameState
  events: GameEvent[]
  leveledUp: boolean
  evolved: boolean
}

/**
 * XP granted by QA/admin (a bonus, a level-up or unlocking an evolution in
 * the admin console). Unlike processDevXpGrant it records an XP_GRANT event
 * carrying the amount, so replaying the event log reproduces it, and the
 * agent's diary shows it. Evolution follows the level, as always.
 */
/** `grantedBy` of XP won in Rocky's mini-games (shown differently in the diary). */
export const GAME_XP_SOURCE = 'rocky-games'

export function processXpGrant(
  state: GameState,
  amount: number,
  now: Date = new Date(),
  agentId: string = DEFAULT_AGENT_ID,
  meta: { reason?: string; grantedBy?: string } = {},
): XpGrantResult {
  const xpGained = Math.max(0, Math.round(amount))
  const xp = state.xp + xpGained
  const level = calculateLevel(xp)
  const evolutionStage = evaluateEvolution(level, state.evolutionStage)
  const leveledUp = level > state.level
  const evolved = evolutionStage !== state.evolutionStage
  const today = todayKey(now)
  const at = now.toISOString()

  const events: GameEvent[] = [
    {
      id: makeEventId(),
      type: 'XP_GRANT',
      agentId,
      date: today,
      timestamp: at,
      payload: { xp: xpGained, reason: meta.reason ?? '', grantedBy: meta.grantedBy ?? '' },
    },
  ]
  if (leveledUp) {
    events.push({
      id: makeEventId(),
      type: 'LEVEL_UP',
      agentId,
      date: today,
      timestamp: at,
      payload: { previousLevel: state.level, newLevel: level, level },
    })
  }
  if (evolved) {
    events.push({
      id: makeEventId(),
      type: 'EVOLUTION',
      agentId,
      date: today,
      timestamp: at,
      payload: { previousStage: state.evolutionStage, newStage: evolutionStage, stage: evolutionStage },
    })
  }
  const nextState: GameState = { ...state, xp, level, evolutionStage, lastActivityLabel: `+${xpGained} XP from QA`, lastActivityAt: at }
  nextState.mood = calculateMood(nextState, now)
  return { state: nextState, events, leveledUp, evolved }
}

export interface CorrectionInput {
  originalEventId: string
  correctedTo: QAOutcome
  reason?: string
}

export interface CorrectionResult {
  correctionEvent: GameEvent
  events: GameEvent[] // full history including the new CORRECTION event
  state: GameState // recalculated from the full corrected history
}

/**
 * Corrections never rewrite the original event — they add a new CORRECTION
 * event pointing at it, then the whole game state is recalculated from the
 * full (now-corrected) event history. This keeps the event log an honest,
 * append-only audit trail.
 */
export function processCorrection(
  events: GameEvent[],
  input: CorrectionInput,
  now: Date = new Date(),
  agentId: string = DEFAULT_AGENT_ID,
): CorrectionResult {
  const original = events.find((e) => e.id === input.originalEventId)
  if (!original) {
    throw new Error(`Cannot correct unknown event: ${input.originalEventId}`)
  }
  if (original.type !== 'QA_PASS' && original.type !== 'DOCUMENTATION_ALERT') {
    throw new Error('Only QA_PASS or DOCUMENTATION_ALERT events can be corrected')
  }

  const correctionEvent: GameEvent = {
    id: makeEventId(),
    type: 'CORRECTION',
    agentId,
    date: todayKey(now),
    timestamp: now.toISOString(),
    correctsEventId: original.id,
    payload: { originalType: original.type, correctedTo: input.correctedTo, reason: input.reason ?? null },
  }

  const fullHistory = [...events, correctionEvent]
  const state = recalculateStateFromEvents(fullHistory, agentId)

  return { correctionEvent, events: fullHistory, state }
}

/**
 * Rebuilds GameState from scratch by replaying the full event history in
 * order, honoring any CORRECTION events along the way. Used after a
 * correction is recorded, and available generally whenever state needs to
 * be recomputed from history rather than trusted from a snapshot.
 *
 * Newly-generated Streak Milestone / Achievement / Level Up / Evolution
 * events from each replayed step are intentionally discarded (only the
 * resulting `.state` is kept) — the real historical events for those already
 * exist in `events` and are what later steps in the replay see as "already
 * granted" history, so nothing is granted twice.
 */
export function recalculateStateFromEvents(events: GameEvent[], agentId: string = DEFAULT_AGENT_ID): GameState {
  // Idempotency at the replay boundary (Phase 9 §Rule 6/7): if the same
  // event id appears more than once in the array — a duplicate write, a
  // corrupted merge, a StrictMode-era bug — it must only ever be applied
  // once. Event IDs are the dedupe key; first occurrence wins.
  const seenIds = new Set<string>()
  const deduped = events.filter((e) => {
    if (seenIds.has(e.id)) return false
    seenIds.add(e.id)
    return true
  })

  const correctionMap = buildCorrectionMap(deduped)
  const relevant = deduped.filter((e) => e.agentId === agentId)
  const sorted = [...relevant].sort((a, b) => {
    const byTime = a.timestamp.localeCompare(b.timestamp)
    return byTime !== 0 ? byTime : eventSequence(a.id) - eventSequence(b.id)
  })

  let state: GameState = { ...INITIAL_GAME_STATE }
  const effectiveAlertsAppliedToday: Record<string, number> = {}

  for (let i = 0; i < sorted.length; i++) {
    const event = sorted[i]
    const historyBefore = sorted.slice(0, i)
    const when = new Date(event.timestamp)

    if (event.type === 'CHECK_IN') {
      const days = (event.payload as { workingDays?: unknown } | undefined)?.workingDays
      state = processCheckIn(state, historyBefore, when, agentId, Array.isArray(days) ? (days as number[]) : undefined).state
      continue
    }

    if (event.type === 'QA_PASS' || event.type === 'DOCUMENTATION_ALERT') {
      const correctedTo = correctionMap.get(event.id)
      const effectiveOutcome: QAOutcome = correctedTo ?? (event.type === 'QA_PASS' ? 'PASS' : 'ALERT')

      if (effectiveOutcome === 'PASS') {
        state = processQAPass(state, historyBefore, when, agentId).state
      } else {
        const day = todayKey(when)
        const countSoFar = effectiveAlertsAppliedToday[day] ?? 0
        const loss = energyLossForNextAlert(countSoFar)
        effectiveAlertsAppliedToday[day] = countSoFar + 1
        state = applyAlertEffect(state, when, loss)
      }
      continue
    }

    if (event.type === 'XP_GRANT') {
      state = processXpGrant(state, Number(event.payload?.xp ?? 0), when, agentId).state
      continue
    }

    // CORRECTION, LEVEL_UP, EVOLUTION, ACHIEVEMENT, STREAK_MILESTONE events
    // are derived/informational — they don't independently change state.
  }

  return state
}
