import type { EvolutionStage } from './domain'

export type TeamMood = 'Happy' | 'Motivated' | 'Worried' | 'Recovery'

export type TeamRankChange = 'up' | 'down' | 'same' | 'first-time'

export interface Team {
  id: string
  name: string
}

// The per-member inputs Team Score is computed from. Deliberately NOT the
// same shape as GameState — a Team never stores its own XP/Energy/Streak
// (see Phase 6 spec §19, "no duplicar economía"). This is just enough of
// each member's real, already-persisted data to derive aggregate metrics.
export interface TeamMemberStats {
  agentId: string
  currentStreak: number
  bestStreak: number
  achievementCount: number
  /** Effectively-a-PASS QA audits (correction-aware), never shown per-member. */
  qaPassCount: number
  /** Effectively-an-ALERT QA audits (correction-aware), never shown per-member. */
  qaAlertCount: number
  /** Check-ins + QA Passes, lifetime — the raw activity count behind Participation. */
  totalPositiveActions: number
}

export interface TeamMetrics {
  /** 0-100: average of each member's activity level relative to a target. */
  participation: number
  /** Raw average Current Streak across members, in days — for display. */
  averageStreak: number
  /** 0-100: averageStreak normalized against a cap — used in the score, not shown directly. */
  averageStreakScore: number
  /** 0-100: average QA Pass rate across members (effective passes / effective audits). */
  qaPassRate: number
  /** 0-100: average of how close each member is to their own peak (current/best streak). */
  improvement: number
  /** 0-100: average of each member's achievement-catalog completion. */
  engagement: number
}

export interface TeamSummary extends Team {
  memberCount: number
  score: number
  evolutionStage: EvolutionStage
  mood: TeamMood
  metrics: TeamMetrics
}

export interface TeamRankEntry extends TeamSummary {
  rank: number
}
