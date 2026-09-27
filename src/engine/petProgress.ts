// Presentation-side progress helpers for the pet screens. Pure functions
// over the engine's own outputs (GameState, events, config tables) — they
// never compute or change XP/Energy/Streak/Level themselves, they only
// describe "how far along" the agent is for the UI.
import { daysBetweenKeys, todayKey } from './dateUtils'
import { LEVEL_THRESHOLDS, MAX_DEFINED_LEVEL, xpForCurrentLevel, xpForNextLevel } from './levels'
import { STREAK_MILESTONES, type StreakMilestone } from './streakMilestones'
import type { EvolutionStage, GameEvent } from '../types/domain'

export interface LevelProgress {
  level: number
  /** XP earned inside the current level. */
  intoLevel: number
  /** XP the current level spans (0 at max level). */
  levelSpan: number
  /** XP still needed for the next level (0 at max level). */
  toNext: number
  /** 0..1 */
  fraction: number
  isMax: boolean
}

export function levelProgress(xp: number, level: number): LevelProgress {
  const floor = xpForCurrentLevel(level)
  const ceiling = xpForNextLevel(level)
  if (ceiling === null) return { level, intoLevel: xp - floor, levelSpan: 0, toNext: 0, fraction: 1, isMax: true }
  const span = ceiling - floor
  const into = Math.max(0, Math.min(span, xp - floor))
  return { level, intoLevel: into, levelSpan: span, toNext: ceiling - xp, fraction: span === 0 ? 1 : into / span, isMax: false }
}

export interface WeekDay {
  key: string
  /** Short weekday label, e.g. "Mon". */
  label: string
  checkedIn: boolean
  isToday: boolean
}

/** The last 7 local days (oldest first), marking which had a Check-in. */
export function checkInWeek(events: GameEvent[], now: Date = new Date()): WeekDay[] {
  const checked = new Set(events.filter((e) => e.type === 'CHECK_IN').map((e) => e.date))
  const today = todayKey(now)
  const fmt = new Intl.DateTimeFormat('en-US', { weekday: 'short' })
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now)
    d.setDate(d.getDate() - (6 - i))
    const key = todayKey(d)
    return { key, label: fmt.format(d), checkedIn: checked.has(key), isToday: key === today }
  })
}

export interface NextMilestone extends StreakMilestone {
  daysToGo: number
}

/** The next streak milestone above the current streak, or null past the last one. */
export function nextStreakMilestone(currentStreak: number): NextMilestone | null {
  const next = STREAK_MILESTONES.find((m) => m.days > currentStreak)
  return next ? { ...next, daysToGo: next.days - currentStreak } : null
}

export const EVOLUTION_LEVELS: Record<EvolutionStage, number> = { Baby: 1, Young: 5, Advanced: 10, Elite: 20 }

export interface NextEvolution {
  stage: EvolutionStage
  atLevel: number
  xpToGo: number
}

export function nextEvolution(stage: EvolutionStage, xp: number): NextEvolution | null {
  const order: EvolutionStage[] = ['Baby', 'Young', 'Advanced', 'Elite']
  const next = order[order.indexOf(stage) + 1]
  if (!next) return null
  const atLevel = EVOLUTION_LEVELS[next]
  const needed = LEVEL_THRESHOLDS[Math.min(atLevel, MAX_DEFINED_LEVEL)] ?? 0
  return { stage: next, atLevel, xpToGo: Math.max(0, needed - xp) }
}

/** Days since the last Check-in (null if never). */
export function daysSinceCheckIn(lastCheckInDate: string | null, now: Date = new Date()): number | null {
  return lastCheckInDate ? daysBetweenKeys(lastCheckInDate, todayKey(now)) : null
}
