// Application Service (Phase 12 §5): orchestrates validation → repository
// access → Game Engine → persistence → response DTO for the agent-facing
// game actions. Contains NO domain rules of its own — every number and
// decision comes from GameService, which calls the unchanged Game Engine.
//
// Phase 13: depends only on `PersistenceContext` — never on
// `InMemoryRepositoryStore`/`SqliteRepositoryStore` by name — and wraps
// Check-in's multiple repository writes (state + event(s) + achievement(s))
// in one transaction, so a failure partway through can't leave a partial
// state (Phase 13 §7).
import type { PersistenceContext } from '../infrastructure/persistenceContext'
import { GameService, systemClock, type Agent, type Clock } from '../domain/rockyEngine'
import type { AchievementsResponse, CheckInResponse, GameStateResponse } from '../types/dto'

export interface GameApplicationServiceDeps {
  persistence: PersistenceContext
  clock?: Clock
}

export function createGameApplicationService({ persistence, clock = systemClock }: GameApplicationServiceDeps) {
  function serviceFor(agentId: string): GameService {
    return new GameService(persistence.repoStore.forAgent(agentId), clock)
  }

  return {
    getAgent(agentId: string): Agent {
      return serviceFor(agentId).getSnapshot().agent
    },

    getGameState(agentId: string): GameStateResponse {
      return serviceFor(agentId).getSnapshot().gameState
    },

    checkIn(agentId: string): CheckInResponse {
      return persistence.withTransaction(() => {
        const result = serviceFor(agentId).checkIn()
        return {
          state: result.state,
          events: result.events,
          newAchievements: result.newAchievements,
          alreadyCheckedInToday: result.alreadyCheckedInToday,
          leveledUp: result.leveledUp,
          evolved: result.evolved,
        }
      })
    },

    getAchievements(agentId: string): AchievementsResponse {
      const progress = serviceFor(agentId).getAchievementProgress()
      return {
        unlocked: progress.unlocked,
        metrics: {
          checkins: progress.metrics.checkins,
          qaPasses: progress.metrics.qaPasses,
          streak: progress.metrics.streak,
        },
      }
    },
  }
}

export type GameApplicationService = ReturnType<typeof createGameApplicationService>
