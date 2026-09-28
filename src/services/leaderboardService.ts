import { rankLeaderboardEntries } from '../engine/leaderboard'
import { repository } from '../repository/localStorageRepository'
import type { Repository } from '../repository/repository'
import type { LeaderboardAgent, LeaderboardEntry } from '../types/leaderboard'
import { MOCK_AGENTS } from './mockAgents'

// Rank-change tracking is purely a UI convenience (so Rocky can react to
// "you moved up") — it is NOT game state. It never touches GameState or the
// event log, so it can't violate "the leaderboard doesn't modify GameState /
// doesn't generate events". Kept in its own localStorage key for that reason.
const LAST_RANK_KEY = 'rocky.leaderboard.lastRank'

export type RankChange = 'up' | 'down' | 'same' | 'first-time'

export interface LeaderboardResult {
  entries: LeaderboardEntry[]
  currentUser: LeaderboardEntry | undefined
  rankChange: RankChange
}

function currentUserAgent(repo: Repository): LeaderboardAgent {
  const agent = repo.getAgent()
  const state = repo.getGameState()
  const achievements = repo.getAchievements()
  return {
    agentId: agent.id,
    name: agent.name,
    rockyName: agent.rockyName,
    level: state.level,
    xp: state.xp,
    currentStreak: state.currentStreak,
    bestStreak: state.bestStreak,
    evolutionStage: state.evolutionStage,
    achievementCount: achievements.length,
    isCurrentUser: true,
  }
}

/**
 * Builds the Individual Leaderboard from the same source of truth the rest
 * of the app uses (the Repository) plus the fixed mock roster. Read-only:
 * never calls saveGameState/saveEvent, so it cannot drift XP/Level/Streak/
 * Energy or fabricate a second copy of them.
 */
export function getIndividualLeaderboard(repo: Repository = repository): LeaderboardEntry[] {
  const all: LeaderboardAgent[] = [...MOCK_AGENTS, currentUserAgent(repo)]
  return rankLeaderboardEntries(all)
}

function readLastRank(): number | null {
  const raw = window.localStorage.getItem(LAST_RANK_KEY)
  if (!raw) return null
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : null
}

function writeLastRank(rank: number): void {
  window.localStorage.setItem(LAST_RANK_KEY, String(rank))
}

/** Used by Reset Demo / Reset All Data so a fresh run doesn't inherit a stale "last rank". */
export function resetLeaderboardTracking(): void {
  window.localStorage.removeItem(LAST_RANK_KEY)
}

/**
 * Same as getIndividualLeaderboard, plus a Rocky-facing rank-change signal
 * ("moved up" / "held steady" / "keep building") derived by comparing this
 * rank to the last one seen. This never touches Mood — Mood stays governed
 * solely by Energy/Streak/Alerts per the Game Engine.
 */
export function getIndividualLeaderboardWithRankChange(repo: Repository = repository): LeaderboardResult {
  return withRankChange(getIndividualLeaderboard(repo))
}

/** Adds this browser's "moved up / down" signal to a ranked list (local or from the pilot backend). */
export function withRankChange(entries: LeaderboardEntry[]): LeaderboardResult {
  const currentUser = entries.find((e) => e.isCurrentUser)

  let rankChange: RankChange = 'first-time'
  if (currentUser) {
    const lastRank = readLastRank()
    if (lastRank === null) {
      rankChange = 'first-time'
    } else if (currentUser.rank < lastRank) {
      rankChange = 'up'
    } else if (currentUser.rank > lastRank) {
      rankChange = 'down'
    } else {
      rankChange = 'same'
    }
    writeLastRank(currentUser.rank)
  }

  return { entries, currentUser, rankChange }
}
