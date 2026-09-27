import { countCheckIns, countEffectiveAlerts, countEffectiveQaPasses } from '../engine/gameEngine'
import { evolutionRank } from '../engine/levels'
import { calculateTeamMetrics, calculateTeamMood, calculateTeamScore, evaluateTeamEvolution, rankTeams } from '../engine/teamScore'
import { repository } from '../repository/localStorageRepository'
import type { Repository } from '../repository/repository'
import { DEFAULT_AGENT_ID, type EvolutionStage } from '../types/domain'
import type { Team, TeamMemberStats, TeamRankChange, TeamRankEntry, TeamSummary } from '../types/team'
import { MOCK_AGENTS, MOCK_TEAM_STATS, TEAM_ALPHA_ID, TEAM_BRAVO_ID, TEAM_CHARLIE_ID } from './mockAgents'

export const TEAMS: Team[] = [
  { id: TEAM_ALPHA_ID, name: 'Team Alpha' },
  { id: TEAM_BRAVO_ID, name: 'Team Bravo' },
  { id: TEAM_CHARLIE_ID, name: 'Team Charlie' },
]

// The local/real user's team assignment (Phase 6 §1 example: "Agent 1 ->
// Team Alpha"). A future multi-agent backend would read this per-agent
// instead of hardcoding it.
export const CURRENT_USER_TEAM_ID = TEAM_ALPHA_ID

interface RosterMember extends TeamMemberStats {
  teamId: string
  name: string
  level: number
  isCurrentUser: boolean
}

function currentUserRosterMember(repo: Repository): RosterMember {
  const agent = repo.getAgent()
  const state = repo.getGameState()
  const events = repo.getEvents()
  const achievements = repo.getAchievements()
  const agentId = agent.id ?? DEFAULT_AGENT_ID

  return {
    agentId,
    teamId: CURRENT_USER_TEAM_ID,
    name: agent.name,
    level: state.level,
    currentStreak: state.currentStreak,
    bestStreak: state.bestStreak,
    achievementCount: achievements.length,
    qaPassCount: countEffectiveQaPasses(events, agentId),
    qaAlertCount: countEffectiveAlerts(events, agentId),
    totalPositiveActions: countCheckIns(events, agentId) + countEffectiveQaPasses(events, agentId),
    isCurrentUser: true,
  }
}

function fullRoster(repo: Repository): RosterMember[] {
  const mocks: RosterMember[] = MOCK_AGENTS.map((a) => ({
    agentId: a.agentId,
    teamId: a.teamId ?? 'unassigned',
    name: a.name,
    level: a.level,
    currentStreak: a.currentStreak,
    bestStreak: a.bestStreak,
    achievementCount: a.achievementCount,
    ...MOCK_TEAM_STATS[a.agentId],
    isCurrentUser: false,
  }))
  return [...mocks, currentUserRosterMember(repo)]
}

// Two small, UI-facing, non-economy signals persisted per team so Team
// Evolution can "never regress" and Team Mood can show Recovery — mirrors
// the rationale in leaderboardService.ts's rank tracker. Neither is
// GameState, XP, Energy, or Streak; both are pure display bookkeeping.
const HIGHEST_STAGE_KEY = 'rocky.teams.highestStage'
const LAST_SCORE_KEY = 'rocky.teams.lastScore'

function readMap<T>(key: string): Record<string, T> {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as Record<string, T>) : {}
  } catch {
    return {}
  }
}

function writeMap(key: string, value: Record<string, unknown>): void {
  window.localStorage.setItem(key, JSON.stringify(value))
}

export interface TeamMember {
  agentId: string
  name: string
  level: number
  currentStreak: number
  isCurrentUser: boolean
}

export interface TeamDetail extends TeamRankEntry {
  members: TeamMember[]
}

/**
 * Computes every team's summary from its members' already-persisted data.
 * Read-only with respect to GameState/events/achievements: it only reads
 * from the Repository, and its own small localStorage bookkeeping (rank
 * high-water-mark, last score) is a display concern, never fed back into
 * XP/Energy/Streak or the event log.
 */
export function getTeamSummaries(repo: Repository = repository): TeamSummary[] {
  const roster = fullRoster(repo)
  const highestStages = readMap<EvolutionStage>(HIGHEST_STAGE_KEY)
  const lastScores = readMap<number>(LAST_SCORE_KEY)

  const summaries = TEAMS.map((team): TeamSummary => {
    const members = roster.filter((m) => m.teamId === team.id)
    const metrics = calculateTeamMetrics(members)
    const score = calculateTeamScore(metrics)
    const previousHighest = highestStages[team.id] ?? 'Baby'
    const evolutionStage = evaluateTeamEvolution(score, previousHighest)
    const lastScore = lastScores[team.id] ?? null
    const mood = calculateTeamMood(score, metrics.participation, lastScore)

    if (evolutionRank(evolutionStage) > evolutionRank(previousHighest)) {
      highestStages[team.id] = evolutionStage
    }
    lastScores[team.id] = score

    return { id: team.id, name: team.name, memberCount: members.length, score, evolutionStage, mood, metrics }
  })

  writeMap(HIGHEST_STAGE_KEY, highestStages)
  writeMap(LAST_SCORE_KEY, lastScores)

  return summaries
}

export function getTeamLeaderboard(repo: Repository = repository): TeamRankEntry[] {
  return rankTeams(getTeamSummaries(repo))
}

const LAST_TEAM_RANK_KEY = 'rocky.teams.lastRank'

/**
 * Same rank-change tracking pattern as leaderboardService's individual
 * version: read-and-record in one call. Callers that might invoke this more
 * than once per real "view" (e.g. a React effect under StrictMode) should
 * guard so it's only actually called once per mount — see Leaderboard.tsx.
 */
export function getTeamRankChange(teamId: string, repo: Repository = repository): TeamRankChange {
  const ranked = getTeamLeaderboard(repo)
  const team = ranked.find((t) => t.id === teamId)
  if (!team) return 'first-time'

  const lastRanks = readMap<number>(LAST_TEAM_RANK_KEY)
  const lastRank = lastRanks[teamId]
  let change: TeamRankChange = 'first-time'
  if (lastRank === undefined) change = 'first-time'
  else if (team.rank < lastRank) change = 'up'
  else if (team.rank > lastRank) change = 'down'
  else change = 'same'

  lastRanks[teamId] = team.rank
  writeMap(LAST_TEAM_RANK_KEY, lastRanks)
  return change
}

export function getTeamDetail(teamId: string, repo: Repository = repository): TeamDetail | undefined {
  const ranked = getTeamLeaderboard(repo)
  const summary = ranked.find((t) => t.id === teamId)
  if (!summary) return undefined

  const roster = fullRoster(repo)
  const members: TeamMember[] = roster
    .filter((m) => m.teamId === teamId)
    .map((m) => ({
      agentId: m.agentId,
      name: m.isCurrentUser ? `${m.name} (You)` : m.name,
      level: m.level,
      currentStreak: m.currentStreak,
      isCurrentUser: m.isCurrentUser,
    }))
    .sort((a, b) => b.level - a.level || a.agentId.localeCompare(b.agentId))

  return { ...summary, members }
}

export function getCurrentUserTeamId(): string {
  return CURRENT_USER_TEAM_ID
}

/** Used by Reset Demo / Reset All Data so a fresh run doesn't inherit a stale Evolution high-water-mark, last score, or last rank. */
export function resetTeamTracking(): void {
  window.localStorage.removeItem(HIGHEST_STAGE_KEY)
  window.localStorage.removeItem(LAST_SCORE_KEY)
  window.localStorage.removeItem(LAST_TEAM_RANK_KEY)
}
