// LocalStorage hardening (Phase 9 §Rule 9). LocalStorage is just the current
// Repository implementation — a browser extension, a stale app version, or
// a hand-edited value can leave behind JSON that parses fine but doesn't
// match the shape the app expects (a string where a number belongs, Energy
// outside 0-100, an unknown enum value, and so on). None of that should ever
// crash the app or reach the agent as an error.
//
// Strategy: validate field-by-field. An invalid individual field falls back
// to its INITIAL_GAME_STATE default rather than discarding the whole
// record — "preserve valid information where practical" — and an
// unrecoverable shape (not an object at all) falls back to a clean initial
// state. Malformed entries in an array (events/achievements/reminders) are
// dropped individually rather than invalidating the entire array.
import { INITIAL_GAME_STATE, type Achievement, type Agent, type EvolutionStage, type GameEvent, type GameState, type Mood } from '../types/domain'
import type { ReminderRecord } from '../types/reminder'

const MOODS: readonly Mood[] = ['Happy', 'Motivated', 'Worried', 'Recovery']
const EVOLUTION_STAGES: readonly EvolutionStage[] = ['Baby', 'Young', 'Advanced', 'Elite']

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v)
}
function isString(v: unknown): v is string {
  return typeof v === 'string'
}
function isNullableString(v: unknown): v is string | null {
  return v === null || typeof v === 'string'
}
function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/**
 * Validates/repairs a persisted GameState field-by-field. Returns a fresh
 * INITIAL_GAME_STATE if the value isn't even object-shaped; otherwise keeps
 * every field that's valid and falls back per-field for anything that isn't
 * (e.g. Energy clamped to 0-100, an unrecognized Mood string replaced with
 * the default) — never crashes, never wipes more than necessary.
 */
export function sanitizeGameState(raw: unknown): GameState {
  if (!isPlainObject(raw)) return { ...INITIAL_GAME_STATE }

  const energy = isFiniteNumber(raw.energy) ? Math.max(0, Math.min(100, raw.energy)) : INITIAL_GAME_STATE.energy
  const xp = isFiniteNumber(raw.xp) && raw.xp >= 0 ? raw.xp : INITIAL_GAME_STATE.xp
  const level = isFiniteNumber(raw.level) && raw.level >= 1 ? Math.floor(raw.level) : INITIAL_GAME_STATE.level
  const mood = isString(raw.mood) && (MOODS as readonly string[]).includes(raw.mood) ? (raw.mood as Mood) : INITIAL_GAME_STATE.mood
  const evolutionStage =
    isString(raw.evolutionStage) && (EVOLUTION_STAGES as readonly string[]).includes(raw.evolutionStage)
      ? (raw.evolutionStage as EvolutionStage)
      : INITIAL_GAME_STATE.evolutionStage
  const currentStreak =
    isFiniteNumber(raw.currentStreak) && raw.currentStreak >= 0 ? Math.floor(raw.currentStreak) : INITIAL_GAME_STATE.currentStreak
  const bestStreak =
    isFiniteNumber(raw.bestStreak) && raw.bestStreak >= 0 ? Math.floor(raw.bestStreak) : INITIAL_GAME_STATE.bestStreak

  return {
    xp,
    level,
    energy,
    mood,
    evolutionStage,
    currentStreak,
    bestStreak,
    lastCheckInDate: isNullableString(raw.lastCheckInDate) ? raw.lastCheckInDate : INITIAL_GAME_STATE.lastCheckInDate,
    lastAlertAt: isNullableString(raw.lastAlertAt) ? raw.lastAlertAt : INITIAL_GAME_STATE.lastAlertAt,
    lastPositiveActionAt: isNullableString(raw.lastPositiveActionAt)
      ? raw.lastPositiveActionAt
      : INITIAL_GAME_STATE.lastPositiveActionAt,
    lastActivityLabel: isNullableString(raw.lastActivityLabel) ? raw.lastActivityLabel : INITIAL_GAME_STATE.lastActivityLabel,
    lastActivityAt: isNullableString(raw.lastActivityAt) ? raw.lastActivityAt : INITIAL_GAME_STATE.lastActivityAt,
    streakShields: typeof raw.streakShields === 'number' && Number.isFinite(raw.streakShields) ? Math.max(0, Math.min(2, Math.floor(raw.streakShields))) : 0,
  }
}

function isValidGameEvent(value: unknown): value is GameEvent {
  if (!isPlainObject(value)) return false
  return isString(value.id) && isString(value.type) && isString(value.agentId) && isString(value.date) && isString(value.timestamp)
}

/** Drops individually malformed entries rather than discarding the whole event log. */
export function sanitizeEvents(raw: unknown): GameEvent[] {
  if (!Array.isArray(raw)) return []
  return raw.filter(isValidGameEvent)
}

function isValidAchievement(value: unknown): value is Achievement {
  if (!isPlainObject(value)) return false
  return isString(value.id) && isString(value.name) && isString(value.description) && isString(value.unlockedAt)
}

export function sanitizeAchievements(raw: unknown): Achievement[] {
  if (!Array.isArray(raw)) return []
  return raw.filter(isValidAchievement)
}

function isValidReminder(value: unknown): value is ReminderRecord {
  if (!isPlainObject(value)) return false
  return (
    isString(value.id) &&
    isString(value.category) &&
    isString(value.message) &&
    isString(value.timestamp) &&
    isString(value.status) &&
    typeof value.actionable === 'boolean'
  )
}

export function sanitizeReminders(raw: unknown): ReminderRecord[] {
  if (!Array.isArray(raw)) return []
  return raw.filter(isValidReminder)
}

export function isValidAgent(raw: unknown): raw is Agent {
  if (!isPlainObject(raw)) return false
  return isString(raw.id) && isString(raw.name) && isString(raw.rockyName)
}
