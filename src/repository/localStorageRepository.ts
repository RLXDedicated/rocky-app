import {
  DEFAULT_AGENT_ID,
  INITIAL_GAME_STATE,
  type Achievement,
  type Agent,
  type GameEvent,
  type GameState,
} from '../types/domain'
import type { ReminderRecord, ReminderStatus } from '../types/reminder'
import type { Repository } from './repository'
import { isValidAgent, sanitizeAchievements, sanitizeEvents, sanitizeGameState, sanitizeReminders } from './sanitize'

const KEYS = {
  agent: 'rocky.agent',
  gameState: 'rocky.gameState',
  events: 'rocky.events',
  achievements: 'rocky.achievements',
  reminders: 'rocky.reminders',
  schemaVersion: 'rocky.schemaVersion',
} as const

// Bumped whenever a persisted shape changes in a way a future migration
// would need to know about. Nothing reads/branches on this yet (there is
// only ever one schema so far) — it exists so a real migration path exists
// before it's needed, per Phase 9 §Rule 9 ("introduce schema/version
// handling where useful").
const CURRENT_SCHEMA_VERSION = 1

const DEFAULT_AGENT: Agent = {
  id: DEFAULT_AGENT_ID,
  name: 'Agent',
  rockyName: 'Rocky',
}

/** Dev-only diagnostic — never surfaced to the agent (Phase 9 §Rule 14). */
function warnRecovered(key: string, detail: string): void {
  if (typeof console !== 'undefined') {
    console.warn(`[rocky] Recovered from corrupted localStorage key "${key}": ${detail}`)
  }
}

function readRawJson(key: string): unknown {
  const raw = window.localStorage.getItem(key)
  if (!raw) return undefined
  try {
    return JSON.parse(raw)
  } catch {
    warnRecovered(key, 'invalid JSON')
    return undefined
  }
}

function writeJson<T>(key: string, value: T): void {
  window.localStorage.setItem(key, JSON.stringify(value))
  window.localStorage.setItem(KEYS.schemaVersion, String(CURRENT_SCHEMA_VERSION))
}

export class LocalStorageRepository implements Repository {
  getAgent(): Agent {
    const raw = readRawJson(KEYS.agent)
    if (raw === undefined) return DEFAULT_AGENT
    if (!isValidAgent(raw)) {
      warnRecovered(KEYS.agent, 'unexpected shape')
      return DEFAULT_AGENT
    }
    return raw
  }

  saveAgent(agent: Agent): void {
    writeJson(KEYS.agent, agent)
  }

  getGameState(): GameState {
    const raw = readRawJson(KEYS.gameState)
    if (raw === undefined) return { ...INITIAL_GAME_STATE }
    return sanitizeGameState(raw)
  }

  saveGameState(state: GameState): void {
    writeJson(KEYS.gameState, state)
  }

  getEvents(): GameEvent[] {
    const raw = readRawJson(KEYS.events)
    if (raw === undefined) return []
    const sanitized = sanitizeEvents(raw)
    if (Array.isArray(raw) && sanitized.length !== raw.length) {
      warnRecovered(KEYS.events, `dropped ${raw.length - sanitized.length} malformed event(s)`)
    }
    return sanitized
  }

  saveEvent(event: GameEvent): void {
    const events = this.getEvents()
    // Idempotent insert (Phase 9 §Rule 6): the same event id is never
    // appended twice, so a duplicate saveEvent call (a retried write, a
    // replay-adjacent bug) can never double-apply a reward.
    if (events.some((e) => e.id === event.id)) return
    events.push(event)
    writeJson(KEYS.events, events)
  }

  getAchievements(): Achievement[] {
    const raw = readRawJson(KEYS.achievements)
    if (raw === undefined) return []
    const sanitized = sanitizeAchievements(raw)
    if (Array.isArray(raw) && sanitized.length !== raw.length) {
      warnRecovered(KEYS.achievements, `dropped ${raw.length - sanitized.length} malformed achievement(s)`)
    }
    return sanitized
  }

  saveAchievement(achievement: Achievement): void {
    const achievements = this.getAchievements()
    if (achievements.some((a) => a.id === achievement.id)) return
    achievements.push(achievement)
    writeJson(KEYS.achievements, achievements)
  }

  getReminders(): ReminderRecord[] {
    const raw = readRawJson(KEYS.reminders)
    if (raw === undefined) return []
    const sanitized = sanitizeReminders(raw)
    if (Array.isArray(raw) && sanitized.length !== raw.length) {
      warnRecovered(KEYS.reminders, `dropped ${raw.length - sanitized.length} malformed reminder(s)`)
    }
    return sanitized
  }

  saveReminder(reminder: ReminderRecord): void {
    const reminders = this.getReminders()
    if (reminders.some((r) => r.id === reminder.id)) return
    reminders.push(reminder)
    writeJson(KEYS.reminders, reminders)
  }

  updateReminderStatus(id: string, status: ReminderStatus): void {
    const reminders = this.getReminders()
    const index = reminders.findIndex((r) => r.id === id)
    if (index === -1) return
    // "acted" and "dismissed" are terminal — once reached, a later "opened"
    // (e.g. a duplicate render re-marking the toast as viewed) must not
    // downgrade the record.
    if (reminders[index].status === 'acted' || reminders[index].status === 'dismissed') return
    reminders[index] = { ...reminders[index], status }
    writeJson(KEYS.reminders, reminders)
  }

  resetReminders(): void {
    window.localStorage.removeItem(KEYS.reminders)
  }

  resetAll(): void {
    window.localStorage.removeItem(KEYS.agent)
    window.localStorage.removeItem(KEYS.gameState)
    window.localStorage.removeItem(KEYS.events)
    window.localStorage.removeItem(KEYS.achievements)
    window.localStorage.removeItem(KEYS.reminders)
  }
}

export const repository = new LocalStorageRepository()
