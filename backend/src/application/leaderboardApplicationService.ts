// Application Service (Phase 12 §5): read-only leaderboard retrieval.
// Ranking itself is computed by engine/leaderboard.ts (rankLeaderboardEntries,
// via getIndividualLeaderboardWithRankChange) — unchanged.
import type { PersistenceContext } from '../infrastructure/persistenceContext'
import { getIndividualLeaderboardWithRankChange } from '../domain/rockyEngine'
import type { LeaderboardResponse } from '../types/dto'

export interface LeaderboardApplicationServiceDeps {
  persistence: PersistenceContext
}

export function createLeaderboardApplicationService({ persistence }: LeaderboardApplicationServiceDeps) {
  return {
    getLeaderboard(agentId: string): LeaderboardResponse {
      const repo = persistence.repoStore.forAgent(agentId)
      const result = getIndividualLeaderboardWithRankChange(repo)
      return { entries: result.entries, currentUser: result.currentUser, rankChange: result.rankChange }
    },
  }
}

export type LeaderboardApplicationService = ReturnType<typeof createLeaderboardApplicationService>
