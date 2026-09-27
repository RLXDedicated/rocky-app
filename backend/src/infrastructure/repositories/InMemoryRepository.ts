// The local/dev/test Repository implementation for this backend — the
// production equivalent of the frontend's LocalStorageRepository, but
// backed by an in-process Map instead of the browser's localStorage.
//
// It implements the SAME `Repository` interface the Game Engine's callers
// (GameService, reminderService, teamService, leaderboardService) already
// depend on — imported directly from the frontend, not redeclared —  so
// swapping this for a future SharePoint-/database-backed implementation is
// exactly the drop-in described in ARCHITECTURE.md's migration boundary
// and ADR-0003: construct a different class, pass it to the same Services,
// change nothing else.
//
// It contains NO business rules — only storage. Idempotency-by-id on
// saveEvent/saveAchievement/saveReminder mirrors LocalStorageRepository's
// contract exactly (DOMAIN_RULES.md §Idempotency) because that guarantee
// belongs to the Repository contract itself, not to any one implementation.
import { INITIAL_GAME_STATE, type Achievement, type Agent, type GameEvent, type GameState } from '../../../../src/types/domain'
import type { Repository } from '../../../../src/repository/repository'
import type { ReminderRecord, ReminderStatus } from '../../../../src/types/reminder'
import { RepositoryConflictError, sameContent } from './conflictGuard'
import type { RepositoryStore } from './RepositoryStore'

interface AgentRecord {
  agent: Agent
  gameState: GameState
  events: GameEvent[]
  achievements: Achievement[]
  reminders: ReminderRecord[]
}

function freshRecord(agentId: string): AgentRecord {
  return {
    agent: { id: agentId, name: 'Agent', rockyName: 'Rocky' },
    gameState: { ...INITIAL_GAME_STATE },
    events: [],
    achievements: [],
    reminders: [],
  }
}

/**
 * The `Repository` interface (like the local MVP's) represents one agent's
 * data — it has no `agentId` parameter on any method (DATA_MODEL.md notes
 * this is a deliberate, deferred Repository-level concern, not an Engine
 * one). This store holds many agents' records and hands out a
 * `Repository`-shaped view scoped to one agent at a time, so a multi-agent
 * backend can reuse the exact same single-agent-shaped Services per
 * request without changing their signatures.
 */
export class InMemoryRepositoryStore implements RepositoryStore {
  private records = new Map<string, AgentRecord>()

  /** Returns a Repository view scoped to exactly one agent's data. */
  forAgent(agentId: string): Repository {
    if (!this.records.has(agentId)) {
      this.records.set(agentId, freshRecord(agentId))
    }
    const record = this.records.get(agentId)!

    return {
      getAgent: () => ({ ...record.agent }),
      saveAgent: (agent: Agent) => {
        record.agent = { ...agent }
      },
      getGameState: () => ({ ...record.gameState }),
      saveGameState: (state: GameState) => {
        record.gameState = { ...state }
      },
      getEvents: () => [...record.events],
      saveEvent: (event: GameEvent) => {
        const existing = record.events.find((e) => e.id === event.id)
        if (existing) {
          if (!sameContent(existing, event)) throw new RepositoryConflictError('event', event.id)
          return // identical resubmission — idempotent no-op
        }
        record.events.push({ ...event })
      },
      getAchievements: () => [...record.achievements],
      saveAchievement: (achievement: Achievement) => {
        const existing = record.achievements.find((a) => a.id === achievement.id)
        if (existing) {
          if (!sameContent(existing, achievement)) throw new RepositoryConflictError('achievement', achievement.id)
          return
        }
        record.achievements.push({ ...achievement })
      },
      getReminders: () => [...record.reminders],
      saveReminder: (reminder: ReminderRecord) => {
        if (record.reminders.some((r) => r.id === reminder.id)) return
        record.reminders.push({ ...reminder })
      },
      updateReminderStatus: (id: string, status: ReminderStatus) => {
        const index = record.reminders.findIndex((r) => r.id === id)
        if (index === -1) return
        const current = record.reminders[index]!
        // Terminal statuses are never downgraded — same rule as
        // LocalStorageRepository.
        if (current.status === 'acted' || current.status === 'dismissed') return
        record.reminders[index] = { ...current, status }
      },
      resetReminders: () => {
        record.reminders = []
      },
      resetAll: () => {
        this.records.set(agentId, freshRecord(agentId))
      },
    }
  }

  /** See RepositoryStore.withTransaction — nothing to wrap for an in-memory Map. */
  withTransaction<T>(fn: () => T): T {
    return fn()
  }

  /** Test-only: wipe every agent's data. */
  resetAllAgents(): void {
    this.records.clear()
  }
}
