import type { LeaderboardAgent, LeaderboardEntry } from '../types/leaderboard'

/**
 * Deterministic ranking order:
 *   1. Level (desc)
 *   2. XP (desc)
 *   3. Current Streak (desc)
 *   4. Best Streak (desc)
 *   5. agentId (asc) — a stable final tiebreaker so an exact tie never
 *      produces a different order between renders/reloads.
 *
 * Never reads or writes GameState/events — pure data in, ranked data out.
 */
function compareAgents(a: LeaderboardAgent, b: LeaderboardAgent): number {
  if (b.level !== a.level) return b.level - a.level
  if (b.xp !== a.xp) return b.xp - a.xp
  if (b.currentStreak !== a.currentStreak) return b.currentStreak - a.currentStreak
  if (b.bestStreak !== a.bestStreak) return b.bestStreak - a.bestStreak
  return a.agentId.localeCompare(b.agentId)
}

export function rankLeaderboardEntries(agents: LeaderboardAgent[]): LeaderboardEntry[] {
  return [...agents]
    .sort(compareAgents)
    .map((agent, index) => ({ ...agent, rank: index + 1 }))
}

/** The entry belonging to the current user, if present in the ranked list. */
export function findCurrentUserEntry(entries: LeaderboardEntry[]): LeaderboardEntry | undefined {
  return entries.find((e) => e.isCurrentUser)
}

/**
 * How much XP the current user needs to overtake the agent immediately
 * above them (rank - 1). Returns null when already #1 or not found — there
 * is nobody to catch up to.
 */
export function xpGapToNextRank(entries: LeaderboardEntry[]): number | null {
  const current = findCurrentUserEntry(entries)
  if (!current || current.rank === 1) return null
  const above = entries.find((e) => e.rank === current.rank - 1)
  if (!above) return null
  return Math.max(0, above.xp - current.xp + 1)
}
