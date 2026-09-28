// Application Service: the pilot leaderboard. Ranks the REAL agents this
// backend knows (ranking rules from engine/leaderboard.ts, unchanged) — not
// the demo roster the offline app uses. Read-only.
//
// "Did I move up?" is per-viewer UI memory, so it is left to each browser
// (rankChange is always 'first-time' here). Tracking it on the server used
// one shared key for every agent, which mixed agents' ranks together.
import type { PersistenceContext } from '../infrastructure/persistenceContext'
import { rankLeaderboardEntries } from '../../../src/engine/leaderboard'
import type { LeaderboardAgent } from '../../../src/types/leaderboard'
import type { LeaderboardResponse } from '../types/dto'

export interface LeaderboardApplicationServiceDeps {
  persistence: PersistenceContext
}

/** A display name that never exposes a full email address. */
export function publicName(agentId: string, name: string): string {
  if (name && name !== 'Agent') return name
  const local = agentId.split('@')[0] ?? agentId
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((p) => p[0]!.toUpperCase() + p.slice(1))
    .join(' ')
}

export function createLeaderboardApplicationService({ persistence }: LeaderboardApplicationServiceDeps) {
  return {
    getLeaderboard(agentId: string): LeaderboardResponse {
      const store = persistence.repoStore
      store.forAgent(agentId) // make sure the viewer is on the board
      const agents: LeaderboardAgent[] = store.listAgentIds().map((id) => {
        const repo = store.forAgent(id)
        const agent = repo.getAgent()
        const state = repo.getGameState()
        return {
          agentId: id,
          name: publicName(id, agent.name),
          rockyName: agent.rockyName,
          level: state.level,
          xp: state.xp,
          currentStreak: state.currentStreak,
          bestStreak: state.bestStreak,
          evolutionStage: state.evolutionStage,
          achievementCount: repo.getAchievements().length,
          isCurrentUser: id === agentId,
        }
      })
      // Other agents' email addresses are never sent to the viewer.
      const entries = rankLeaderboardEntries(agents).map((e) => (e.isCurrentUser ? e : { ...e, agentId: `peer-${e.rank}` }))
      return { entries, currentUser: entries.find((e) => e.isCurrentUser), rankChange: 'first-time' }
    },
  }
}

export type LeaderboardApplicationService = ReturnType<typeof createLeaderboardApplicationService>
