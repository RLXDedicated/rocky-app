import { evolutionRank } from './levels'
import { ACHIEVEMENT_CATALOG } from './achievements'
import type { EvolutionStage } from '../types/domain'
import type { TeamMemberStats, TeamMetrics, TeamMood, TeamRankEntry, TeamSummary } from '../types/team'

// ---------------------------------------------------------------------------
// Team Score — documented formula (Phase 6 §3-4)
//
// Deliberately NOT a sum of individual XP: a 10-person team must not beat a
// 5-person team just by having more people. Every input below is an AVERAGE
// or a RATE across members, never a total, so team size cancels out.
//
//   Team Score = 25% Participation
//              + 25% Average Streak (normalized)
//              + 25% QA Pass Performance
//              + 15% Improvement
//              + 10% Engagement
//
// These weights and the normalization caps below are an initial hypothesis
// for the pilot, explicitly called out in the spec as adjustable — change
// them here, in one place, if real usage suggests different weighting.
// ---------------------------------------------------------------------------

export const TEAM_SCORE_WEIGHTS = {
  participation: 0.25,
  averageStreakScore: 0.25,
  qaPassRate: 0.25,
  improvement: 0.15,
  engagement: 0.1,
} as const

/** A member hitting this many lifetime Check-ins + QA Passes counts as 100% participation. */
const PARTICIPATION_TARGET_ACTIONS = 20
/** A member averaging this many days of Current Streak counts as a 100% streak score. */
const STREAK_SCORE_CAP_DAYS = 30

function average(numbers: number[]): number {
  if (numbers.length === 0) return 0
  return numbers.reduce((sum, n) => sum + n, 0) / numbers.length
}

export function calculateTeamMetrics(members: TeamMemberStats[]): TeamMetrics {
  if (members.length === 0) {
    return { participation: 0, averageStreak: 0, averageStreakScore: 0, qaPassRate: 100, improvement: 100, engagement: 0 }
  }

  const participation = average(
    members.map((m) => Math.min(100, (m.totalPositiveActions / PARTICIPATION_TARGET_ACTIONS) * 100)),
  )

  const averageStreak = average(members.map((m) => m.currentStreak))
  const averageStreakScore = Math.min(100, (averageStreak / STREAK_SCORE_CAP_DAYS) * 100)

  // A member with no QA audits yet has a clean slate — scored neutrally
  // positive (100), not punished for lack of data.
  const qaPassRate = average(
    members.map((m) => {
      const totalAudits = m.qaPassCount + m.qaAlertCount
      return totalAudits === 0 ? 100 : (m.qaPassCount / totalAudits) * 100
    }),
  )

  // "Improvement": how much of their own peak consistency each member is
  // currently holding onto (current streak / best streak). A member with no
  // streak history yet is treated neutrally (100), not punished.
  const improvement = average(
    members.map((m) => (m.bestStreak === 0 ? 100 : Math.min(100, (m.currentStreak / m.bestStreak) * 100))),
  )

  const engagement = average(
    members.map((m) => Math.min(100, (m.achievementCount / ACHIEVEMENT_CATALOG.length) * 100)),
  )

  return { participation, averageStreak, averageStreakScore, qaPassRate, improvement, engagement }
}

export function calculateTeamScore(metrics: TeamMetrics): number {
  const raw =
    metrics.participation * TEAM_SCORE_WEIGHTS.participation +
    metrics.averageStreakScore * TEAM_SCORE_WEIGHTS.averageStreakScore +
    metrics.qaPassRate * TEAM_SCORE_WEIGHTS.qaPassRate +
    metrics.improvement * TEAM_SCORE_WEIGHTS.improvement +
    metrics.engagement * TEAM_SCORE_WEIGHTS.engagement
  return Math.round(raw)
}

// ---------------------------------------------------------------------------
// Team Rocky Evolution — documented thresholds (Phase 6 §6)
// Reuses the same 4 stages as individual Rocky; driven by Team Score instead
// of Level. Initial hypothesis, adjustable during the pilot.
// ---------------------------------------------------------------------------
const TEAM_EVOLUTION_THRESHOLDS: { stage: EvolutionStage; minScore: number }[] = [
  { stage: 'Elite', minScore: 90 },
  { stage: 'Advanced', minScore: 70 },
  { stage: 'Young', minScore: 50 },
  { stage: 'Baby', minScore: 0 },
]

export function evolutionStageForTeamScore(score: number): EvolutionStage {
  for (const tier of TEAM_EVOLUTION_THRESHOLDS) {
    if (score >= tier.minScore) return tier.stage
  }
  return 'Baby'
}

/**
 * Team Evolution never regresses, exactly like individual Rocky: a dip in
 * score can lower the *live* stage-for-current-score, but the displayed
 * Evolution stays at the highest ever reached (`previousHighestStage`).
 */
export function evaluateTeamEvolution(score: number, previousHighestStage: EvolutionStage): EvolutionStage {
  const liveStage = evolutionStageForTeamScore(score)
  return evolutionRank(liveStage) > evolutionRank(previousHighestStage) ? liveStage : previousHighestStage
}

// ---------------------------------------------------------------------------
// Team Mood — documented formula (Phase 6 §9). Conceptually the same 4
// categories as individual Mood, but computed purely from team metrics —
// never copied from any one member's (e.g. the team leader's) own Mood.
// ---------------------------------------------------------------------------
export function calculateTeamMood(score: number, participation: number, lastScore: number | null): TeamMood {
  // Recovery: the team was recently struggling (below the Motivated line)
  // and has since climbed — "rebuilding", not "still failing".
  if (lastScore !== null && lastScore < 55 && score > lastScore) return 'Recovery'
  if (score < 40 || participation < 30) return 'Worried'
  if (score >= 80 && participation >= 70) return 'Happy'
  return 'Motivated'
}

// ---------------------------------------------------------------------------
// Team ranking — same determinism guarantees as the Individual Leaderboard.
// ---------------------------------------------------------------------------
function compareTeams(a: TeamSummary, b: TeamSummary): number {
  if (b.score !== a.score) return b.score - a.score
  if (b.metrics.participation !== a.metrics.participation) return b.metrics.participation - a.metrics.participation
  if (b.metrics.averageStreak !== a.metrics.averageStreak) return b.metrics.averageStreak - a.metrics.averageStreak
  return a.id.localeCompare(b.id)
}

export function rankTeams(teams: TeamSummary[]): TeamRankEntry[] {
  return [...teams].sort(compareTeams).map((team, index) => ({ ...team, rank: index + 1 }))
}
