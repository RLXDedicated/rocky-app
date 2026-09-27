// Application Service (Phase 12 §5): read-only team retrieval. Team Score
// is computed by engine/teamScore.ts (calculateTeamScore et al.) — never a
// sum of individual XP, unchanged (DOMAIN_RULES.md).
import { ApiError } from '../api/errors'
import type { PersistenceContext } from '../infrastructure/persistenceContext'
import { getCurrentUserTeamId, getTeamDetail, getTeamLeaderboard } from '../domain/rockyEngine'
import type { TeamLeaderboardResponse, TeamResponse } from '../types/dto'

export interface TeamApplicationServiceDeps {
  persistence: PersistenceContext
}

export function createTeamApplicationService({ persistence }: TeamApplicationServiceDeps) {
  return {
    getTeam(agentId: string): TeamResponse {
      const repo = persistence.repoStore.forAgent(agentId)
      const teamId = getCurrentUserTeamId()
      const detail = getTeamDetail(teamId, repo)
      if (!detail) throw ApiError.notFound(`No team found for agent "${agentId}".`)
      return {
        id: detail.id,
        name: detail.name,
        memberCount: detail.memberCount,
        score: detail.score,
        evolutionStage: detail.evolutionStage,
        mood: detail.mood,
        members: detail.members,
      }
    },

    getTeamLeaderboard(agentId: string): TeamLeaderboardResponse {
      const repo = persistence.repoStore.forAgent(agentId)
      return { teams: getTeamLeaderboard(repo) }
    },
  }
}

export type TeamApplicationService = ReturnType<typeof createTeamApplicationService>
