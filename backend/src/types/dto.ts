// Explicit request/response DTOs (Phase 12 §7). Internal domain objects
// (GameState, GameEvent, etc.) are never returned to a client blindly —
// every response shape here is deliberately chosen, and every request DTO
// deliberately has NO field for xp/level/energy/streak/mood/evolution/
// achievements. Those remain server/domain-controlled; a client cannot
// submit them as authoritative state (see §7, §11 of the Phase 12 brief).
import type { Achievement, Agent, GameEvent, GameState, QAOutcome } from '../domain/rockyEngine'
import type { ReminderRecord } from '../../../src/types/reminder'
import type { LeaderboardEntry } from '../../../src/types/leaderboard'
import type { TeamRankEntry } from '../../../src/types/team'
import type { TeamMember } from '../../../src/services/teamService'

// ---------------------------------------------------------------------------
// Agent
// ---------------------------------------------------------------------------
export type AgentResponse = Agent & {
  /** The caller's role for this request — lets the frontend decide whether to show QA/admin tooling. Server-decided; never trusted back from a client. */
  role: 'AGENT' | 'QA' | 'SUPERVISOR' | 'ADMIN'
}

// ---------------------------------------------------------------------------
// Game state
// ---------------------------------------------------------------------------
export type GameStateResponse = GameState

// ---------------------------------------------------------------------------
// Check-in
// ---------------------------------------------------------------------------
// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- deliberately empty: see file header
export interface CheckInRequest {}

export interface CheckInResponse {
  state: GameState
  events: GameEvent[]
  newAchievements: Achievement[]
  alreadyCheckedInToday: boolean
  leveledUp: boolean
  evolved: boolean
}

// ---------------------------------------------------------------------------
// QA Pass / Documentation Alert
// ---------------------------------------------------------------------------
export interface QAPassRequest {
  /** The agent being audited. Required — QA never audits "itself". */
  agentId: string
  /** ISO date (YYYY-MM-DD) the audit was performed. Required for a real audit trail. */
  auditDate: string
  /** Optional reference to the audit system's own record, for idempotency (see §Idempotency). */
  auditReferenceId?: string
}

export interface QAPassResponse {
  state: GameState
  events: GameEvent[]
  newAchievements: Achievement[]
  leveledUp: boolean
  evolved: boolean
}

export interface DocumentationAlertRequest {
  agentId: string
  auditDate: string
  auditReferenceId?: string
}

export interface DocumentationAlertResponse {
  state: GameState
  events: GameEvent[]
}

// ---------------------------------------------------------------------------
// Correction
// ---------------------------------------------------------------------------
export interface CorrectionRequest {
  agentId: string
  originalEventId: string
  correctedTo: QAOutcome
  reason?: string
}

export interface CorrectionResponse {
  correctionEvent: GameEvent
  events: GameEvent[]
  state: GameState
}

// ---------------------------------------------------------------------------
// Achievements
// ---------------------------------------------------------------------------
export interface AchievementsResponse {
  unlocked: Achievement[]
  metrics: {
    checkins: number
    qaPasses: number
    streak: number
  }
}

// ---------------------------------------------------------------------------
// Leaderboard / Team
// ---------------------------------------------------------------------------
export interface LeaderboardResponse {
  entries: LeaderboardEntry[]
  currentUser: LeaderboardEntry | undefined
  rankChange: 'up' | 'down' | 'same' | 'first-time'
}

export interface TeamResponse {
  id: string
  name: string
  memberCount: number
  score: number
  evolutionStage: string
  mood: string
  members: TeamMember[]
}

export interface TeamLeaderboardResponse {
  teams: TeamRankEntry[]
}

// ---------------------------------------------------------------------------
// Reminders
// ---------------------------------------------------------------------------
export interface RemindersResponse {
  reminders: ReminderRecord[]
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- deliberately empty
export interface ReminderActionRequest {}

export interface ReminderActionResponse {
  id: string
  status: string
}

// ---------------------------------------------------------------------------
// Admin (QA/ADMIN only)
// ---------------------------------------------------------------------------
export interface AdminAgentSummary {
  id: string
  name: string
  state: GameState
}

export interface AdminAgentsResponse {
  agents: AdminAgentSummary[]
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------
export interface ApiErrorResponse {
  error: {
    code: string
    message: string
    requestId: string
  }
}
