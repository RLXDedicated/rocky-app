// The durable local Repository implementation (Phase 13). Implements the
// SAME `Repository` interface `InMemoryRepositoryStore` and the frontend's
// `LocalStorageRepository` already do — imported, not redeclared. Contains
// NO business rules, only SQL reads/writes and the type marshalling
// between GameState/GameEvent/Achievement/ReminderRecord and their SQLite
// row shapes. See docs/PERSISTENCE_FOUNDATION.md.
import { DatabaseSync } from 'node:sqlite'
import { INITIAL_GAME_STATE, type Achievement, type Agent, type EvolutionStage, type GameEvent, type GameState, type Mood } from '../../../../src/types/domain'
import type { Repository } from '../../../../src/repository/repository'
import type { ReminderCategory, ReminderRecord, ReminderStatus } from '../../../../src/types/reminder'
import { openDatabase } from './database'
import { RepositoryConflictError, sameContent } from '../repositories/conflictGuard'
import type { RepositoryStore } from '../repositories/RepositoryStore'

interface GameStateRow {
  xp: number
  level: number
  energy: number
  mood: string
  evolution_stage: string
  current_streak: number
  best_streak: number
  last_check_in_date: string | null
  last_alert_at: string | null
  last_positive_action_at: string | null
  last_activity_label: string | null
  last_activity_at: string | null
}

function rowToGameState(row: GameStateRow): GameState {
  return {
    xp: row.xp,
    level: row.level,
    energy: row.energy,
    mood: row.mood as Mood,
    evolutionStage: row.evolution_stage as EvolutionStage,
    currentStreak: row.current_streak,
    bestStreak: row.best_streak,
    lastCheckInDate: row.last_check_in_date,
    lastAlertAt: row.last_alert_at,
    lastPositiveActionAt: row.last_positive_action_at,
    lastActivityLabel: row.last_activity_label,
    lastActivityAt: row.last_activity_at,
  }
}

interface EventRow {
  event_id: string
  agent_id: string
  type: string
  event_date: string
  timestamp: string
  payload_json: string | null
  corrects_event_id: string | null
}

function rowToEvent(row: EventRow): GameEvent {
  const event: GameEvent = {
    id: row.event_id,
    type: row.type as GameEvent['type'],
    agentId: row.agent_id,
    date: row.event_date,
    timestamp: row.timestamp,
  }
  if (row.payload_json !== null) event.payload = JSON.parse(row.payload_json) as Record<string, unknown>
  if (row.corrects_event_id !== null) event.correctsEventId = row.corrects_event_id
  return event
}

interface ReminderRow {
  reminder_id: string
  category: string
  message: string
  timestamp: string
  status: string
  actionable: number
  dedupe_key: string | null
}

function rowToReminder(row: ReminderRow): ReminderRecord {
  const reminder: ReminderRecord = {
    id: row.reminder_id,
    category: row.category as ReminderCategory,
    message: row.message,
    timestamp: row.timestamp,
    status: row.status as ReminderStatus,
    actionable: row.actionable === 1,
  }
  if (row.dedupe_key !== null) reminder.dedupeKey = row.dedupe_key
  return reminder
}

export class SqliteRepositoryStore implements RepositoryStore {
  private db: DatabaseSync

  constructor(dbPath: string) {
    this.db = openDatabase(dbPath)
  }

  /** Exposed for SqliteIdempotencyStore, which must share this exact connection so its writes participate in the same transaction (see infrastructure/idempotency). */
  get connection(): DatabaseSync {
    return this.db
  }

  private ensureAgentRow(agentId: string): void {
    const existing = this.db.prepare('SELECT agent_id FROM agents WHERE agent_id = ?').get(agentId)
    if (existing) return
    this.db.prepare('INSERT INTO agents (agent_id, name, rocky_name) VALUES (?, ?, ?)').run(agentId, 'Agent', 'Rocky')
    this.db
      .prepare(
        `INSERT INTO game_state (
           agent_id, xp, level, energy, mood, evolution_stage,
           current_streak, best_streak, last_check_in_date, last_alert_at,
           last_positive_action_at, last_activity_label, last_activity_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        agentId,
        INITIAL_GAME_STATE.xp,
        INITIAL_GAME_STATE.level,
        INITIAL_GAME_STATE.energy,
        INITIAL_GAME_STATE.mood,
        INITIAL_GAME_STATE.evolutionStage,
        INITIAL_GAME_STATE.currentStreak,
        INITIAL_GAME_STATE.bestStreak,
        INITIAL_GAME_STATE.lastCheckInDate,
        INITIAL_GAME_STATE.lastAlertAt,
        INITIAL_GAME_STATE.lastPositiveActionAt,
        INITIAL_GAME_STATE.lastActivityLabel,
        INITIAL_GAME_STATE.lastActivityAt,
      )
  }

  forAgent(agentId: string): Repository {
    this.ensureAgentRow(agentId)
    const db = this.db

    return {
      getAgent: (): Agent => {
        const row = db.prepare('SELECT agent_id, name, rocky_name FROM agents WHERE agent_id = ?').get(agentId) as
          | { agent_id: string; name: string; rocky_name: string }
          | undefined
        if (!row) return { id: agentId, name: 'Agent', rockyName: 'Rocky' }
        return { id: row.agent_id, name: row.name, rockyName: row.rocky_name }
      },

      saveAgent: (agent: Agent): void => {
        db.prepare('UPDATE agents SET name = ?, rocky_name = ? WHERE agent_id = ?').run(agent.name, agent.rockyName, agentId)
      },

      getGameState: (): GameState => {
        const row = db.prepare('SELECT * FROM game_state WHERE agent_id = ?').get(agentId) as GameStateRow | undefined
        return row ? rowToGameState(row) : { ...INITIAL_GAME_STATE }
      },

      saveGameState: (state: GameState): void => {
        db.prepare(
          `UPDATE game_state SET
             xp = ?, level = ?, energy = ?, mood = ?, evolution_stage = ?,
             current_streak = ?, best_streak = ?, last_check_in_date = ?,
             last_alert_at = ?, last_positive_action_at = ?,
             last_activity_label = ?, last_activity_at = ?
           WHERE agent_id = ?`,
        ).run(
          state.xp,
          state.level,
          state.energy,
          state.mood,
          state.evolutionStage,
          state.currentStreak,
          state.bestStreak,
          state.lastCheckInDate,
          state.lastAlertAt,
          state.lastPositiveActionAt,
          state.lastActivityLabel,
          state.lastActivityAt,
          agentId,
        )
      },

      getEvents: (): GameEvent[] => {
        const rows = db.prepare('SELECT * FROM events WHERE agent_id = ? ORDER BY timestamp ASC, rowid ASC').all(agentId) as unknown as EventRow[]
        return rows.map(rowToEvent)
      },

      saveEvent: (event: GameEvent): void => {
        const existingRow = db.prepare('SELECT * FROM events WHERE event_id = ?').get(event.id) as EventRow | undefined
        if (existingRow) {
          if (!sameContent(rowToEvent(existingRow), event)) throw new RepositoryConflictError('event', event.id)
          return // identical resubmission — idempotent no-op
        }
        db.prepare(
          `INSERT INTO events (event_id, agent_id, type, event_date, timestamp, payload_json, corrects_event_id)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        ).run(
          event.id,
          event.agentId,
          event.type,
          event.date,
          event.timestamp,
          event.payload !== undefined ? JSON.stringify(event.payload) : null,
          event.correctsEventId ?? null,
        )
      },

      getAchievements: (): Achievement[] => {
        const rows = db
          .prepare('SELECT achievement_id, name, description, unlocked_at FROM achievements WHERE agent_id = ? ORDER BY unlocked_at ASC')
          .all(agentId) as { achievement_id: string; name: string; description: string; unlocked_at: string }[]
        return rows.map((r) => ({ id: r.achievement_id, name: r.name, description: r.description, unlockedAt: r.unlocked_at }))
      },

      saveAchievement: (achievement: Achievement): void => {
        const existingRow = db
          .prepare('SELECT achievement_id, name, description, unlocked_at FROM achievements WHERE agent_id = ? AND achievement_id = ?')
          .get(agentId, achievement.id) as { achievement_id: string; name: string; description: string; unlocked_at: string } | undefined
        if (existingRow) {
          const existing: Achievement = {
            id: existingRow.achievement_id,
            name: existingRow.name,
            description: existingRow.description,
            unlockedAt: existingRow.unlocked_at,
          }
          if (!sameContent(existing, achievement)) throw new RepositoryConflictError('achievement', achievement.id)
          return
        }
        db.prepare('INSERT INTO achievements (agent_id, achievement_id, name, description, unlocked_at) VALUES (?, ?, ?, ?, ?)').run(
          agentId,
          achievement.id,
          achievement.name,
          achievement.description,
          achievement.unlockedAt,
        )
      },

      getReminders: (): ReminderRecord[] => {
        const rows = db.prepare('SELECT * FROM reminders WHERE agent_id = ? ORDER BY timestamp ASC, rowid ASC').all(agentId) as unknown as ReminderRow[]
        return rows.map(rowToReminder)
      },

      saveReminder: (reminder: ReminderRecord): void => {
        const existing = db.prepare('SELECT reminder_id FROM reminders WHERE reminder_id = ?').get(reminder.id)
        if (existing) return // idempotent by id, same as InMemory/LocalStorage
        db.prepare(
          `INSERT INTO reminders (reminder_id, agent_id, category, message, timestamp, status, actionable, dedupe_key)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        ).run(reminder.id, agentId, reminder.category, reminder.message, reminder.timestamp, reminder.status, reminder.actionable ? 1 : 0, reminder.dedupeKey ?? null)
      },

      updateReminderStatus: (id: string, status: ReminderStatus): void => {
        const row = db.prepare('SELECT status FROM reminders WHERE reminder_id = ? AND agent_id = ?').get(id, agentId) as
          | { status: string }
          | undefined
        if (!row) return
        if (row.status === 'acted' || row.status === 'dismissed') return // terminal — never downgraded
        db.prepare('UPDATE reminders SET status = ? WHERE reminder_id = ? AND agent_id = ?').run(status, id, agentId)
      },

      resetReminders: (): void => {
        db.prepare('DELETE FROM reminders WHERE agent_id = ?').run(agentId)
      },

      resetAll: (): void => {
        db.prepare('DELETE FROM reminders WHERE agent_id = ?').run(agentId)
        db.prepare('DELETE FROM achievements WHERE agent_id = ?').run(agentId)
        db.prepare('DELETE FROM events WHERE agent_id = ?').run(agentId)
        db.prepare('DELETE FROM game_state WHERE agent_id = ?').run(agentId)
        db.prepare('DELETE FROM agents WHERE agent_id = ?').run(agentId)
        this.ensureAgentRow(agentId)
      },
    }
  }

  /** See RepositoryStore.listAgentIds. */
  listAgentIds(): string[] {
    const rows = this.db.prepare('SELECT agent_id FROM agents ORDER BY agent_id ASC').all() as unknown as { agent_id: string }[]
    return rows.map((row) => row.agent_id)
  }

  withTransaction<T>(fn: () => T): T {
    this.db.exec('BEGIN')
    try {
      const result = fn()
      this.db.exec('COMMIT')
      return result
    } catch (err) {
      this.db.exec('ROLLBACK')
      throw err
    }
  }

  close(): void {
    this.db.close()
  }
}
