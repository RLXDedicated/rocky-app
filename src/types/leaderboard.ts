import type { EvolutionStage } from './domain'

// Deliberately NOT coupled to "one individual per row": this same shape will
// back a future Team Leaderboard (a team is just an aggregate of these, or a
// parallel entity keyed by teamId). `teamId` is reserved and unused today —
// Team Rocky is a later phase — but keeping it here means the ranking
// function and the UI card shape don't need to change when it arrives.
export interface LeaderboardAgent {
  agentId: string
  name: string
  rockyName: string
  level: number
  xp: number
  currentStreak: number
  bestStreak: number
  evolutionStage: EvolutionStage
  achievementCount: number
  isCurrentUser: boolean
  /** Reserved for Team Rocky (not implemented yet). */
  teamId?: string
}

export interface LeaderboardEntry extends LeaderboardAgent {
  rank: number
}
