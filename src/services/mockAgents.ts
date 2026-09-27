import type { LeaderboardAgent } from '../types/leaderboard'
import type { TeamMemberStats } from '../types/team'

// Team assignment (Phase 6 §1): deliberately uneven team sizes — Team
// Charlie has only Sarah — so normalization (not raw team size) is what
// Team Score testing actually exercises.
export const TEAM_ALPHA_ID = 'team-alpha'
export const TEAM_BRAVO_ID = 'team-bravo'
export const TEAM_CHARLIE_ID = 'team-charlie'

// Fictitious agents used to populate the Individual Leaderboard so ranking,
// ties, and every Evolution stage can be exercised without needing five real
// people. Each one deliberately sits in a different progression tier (see
// Phase 5 spec's "Mock Agent States"); the real local user is added
// separately by leaderboardService and competes against these fixed points.
export const MOCK_AGENTS: LeaderboardAgent[] = [
  {
    // New Agent: low level, low XP, short streak.
    agentId: 'mock-alex',
    name: 'Alex',
    rockyName: "Alex's Rocky",
    level: 2,
    xp: 120,
    currentStreak: 1,
    bestStreak: 1,
    evolutionStage: 'Baby',
    achievementCount: 1,
    isCurrentUser: false,
    teamId: TEAM_ALPHA_ID,
  },
  {
    // Consistent Agent: medium level, healthy streak.
    agentId: 'mock-maria',
    name: 'Maria',
    rockyName: "Maria's Rocky",
    level: 6,
    xp: 1050,
    currentStreak: 9,
    bestStreak: 9,
    evolutionStage: 'Young',
    achievementCount: 3,
    isCurrentUser: false,
    teamId: TEAM_BRAVO_ID,
  },
  {
    // Strong Performer: high level, high XP, long streak — Advanced Rocky.
    agentId: 'mock-james',
    name: 'James',
    rockyName: "James's Rocky",
    level: 12,
    xp: 3900,
    currentStreak: 21,
    bestStreak: 21,
    evolutionStage: 'Advanced',
    achievementCount: 5,
    isCurrentUser: false,
    teamId: TEAM_BRAVO_ID,
  },
  {
    // Elite Rocky: Level 20, long-term mastery.
    agentId: 'mock-sarah',
    name: 'Sarah',
    rockyName: "Sarah's Rocky",
    level: 20,
    xp: 10600,
    currentStreak: 45,
    bestStreak: 60,
    evolutionStage: 'Elite',
    achievementCount: 6,
    isCurrentUser: false,
    teamId: TEAM_CHARLIE_ID,
  },
]

// Supplemental per-mock-agent stats needed only for Team Score aggregation
// (QA audit history, lifetime activity count). Kept separate from
// MOCK_AGENTS/LeaderboardAgent because the Individual Leaderboard has no use
// for them — this keeps that type focused.
export const MOCK_TEAM_STATS: Record<string, Pick<TeamMemberStats, 'qaPassCount' | 'qaAlertCount' | 'totalPositiveActions'>> = {
  'mock-alex': { qaPassCount: 2, qaAlertCount: 1, totalPositiveActions: 4 },
  'mock-maria': { qaPassCount: 8, qaAlertCount: 1, totalPositiveActions: 20 },
  'mock-james': { qaPassCount: 15, qaAlertCount: 2, totalPositiveActions: 34 },
  'mock-sarah': { qaPassCount: 25, qaAlertCount: 0, totalPositiveActions: 70 },
}
