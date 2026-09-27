// Application Service (Phase 12 §5): reminder retrieval and lifecycle.
// Never touches XP/Energy/Streak/Mood — reminder status is UI/lifecycle
// bookkeeping only (DOMAIN_RULES.md §Reminders), unchanged here.
import { ApiError } from '../api/errors'
import type { PersistenceContext } from '../infrastructure/persistenceContext'
import type { Repository } from '../domain/rockyEngine'
import {
  checkForReminder,
  getReminderHistory,
  markReminderActed,
  markReminderDismissed,
  markReminderOpened,
  systemClock,
  type Clock,
} from '../domain/rockyEngine'
import type { ReminderActionResponse, RemindersResponse } from '../types/dto'

export interface ReminderApplicationServiceDeps {
  persistence: PersistenceContext
  clock?: Clock
}

export function createReminderApplicationService({ persistence, clock = systemClock }: ReminderApplicationServiceDeps) {
  return {
    getReminders(agentId: string): RemindersResponse {
      const repo = persistence.repoStore.forAgent(agentId)
      // Also gives a due reminder a chance to be created, mirroring the
      // frontend's ReminderHost poll — a read-and-record call, same as the
      // local architecture already does (ARCHITECTURE.md §Reminder flow).
      checkForReminder(repo, clock.now())
      return { reminders: getReminderHistory(repo) }
    },

    markOpened(agentId: string, reminderId: string): ReminderActionResponse {
      const repo = persistence.repoStore.forAgent(agentId)
      assertReminderExists(repo, reminderId)
      markReminderOpened(reminderId, repo)
      return { id: reminderId, status: 'opened' }
    },

    markActed(agentId: string, reminderId: string): ReminderActionResponse {
      const repo = persistence.repoStore.forAgent(agentId)
      assertReminderExists(repo, reminderId)
      markReminderActed(reminderId, repo)
      return { id: reminderId, status: 'acted' }
    },

    markDismissed(agentId: string, reminderId: string): ReminderActionResponse {
      const repo = persistence.repoStore.forAgent(agentId)
      assertReminderExists(repo, reminderId)
      markReminderDismissed(reminderId, repo)
      return { id: reminderId, status: 'dismissed' }
    },
  }

  function assertReminderExists(repo: Repository, reminderId: string): void {
    const exists = getReminderHistory(repo).some((r) => r.id === reminderId)
    if (!exists) throw ApiError.notFound(`No reminder with id "${reminderId}" for this agent.`)
  }
}

export type ReminderApplicationService = ReturnType<typeof createReminderApplicationService>
