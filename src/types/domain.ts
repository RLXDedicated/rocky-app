// Core domain types for Rocky Local MVP.
// Kept separate from UI and engine so the repository layer can be swapped later.

export type Mood = 'Happy' | 'Motivated' | 'Worried' | 'Recovery'

export type EvolutionStage = 'Baby' | 'Young' | 'Advanced' | 'Elite'

export type EventType =
  | 'CHECK_IN'
  | 'QA_PASS'
  | 'DOCUMENTATION_ALERT'
  | 'STREAK_MILESTONE'
  | 'LEVEL_UP'
  | 'EVOLUTION'
  | 'ACHIEVEMENT'
  | 'CORRECTION'
  /** XP granted by a QA coordinator/admin (payload: xp, reason, grantedBy). Counted on replay. */
  | 'XP_GRANT'

export interface GameEvent {
  id: string
  type: EventType
  agentId: string
  date: string // YYYY-MM-DD local day the event belongs to
  timestamp: string // ISO string
  payload?: Record<string, unknown>
  correctsEventId?: string // present only on CORRECTION events
}

// The corrected outcome a CORRECTION event assigns to the original audit.
export type QAOutcome = 'PASS' | 'ALERT'

export interface Achievement {
  id: string
  name: string
  description: string
  unlockedAt: string // ISO string
}

export interface GameState {
  xp: number
  level: number
  energy: number
  mood: Mood
  evolutionStage: EvolutionStage
  currentStreak: number
  bestStreak: number
  lastCheckInDate: string | null // YYYY-MM-DD, local day of last successful check-in
  lastAlertAt: string | null // ISO timestamp of most recent Documentation Alert
  lastPositiveActionAt: string | null // ISO timestamp of most recent Check-in or QA Pass
  lastActivityLabel: string | null
  lastActivityAt: string | null // ISO timestamp
}

export interface Agent {
  id: string
  name: string
  rockyName: string
}

export const DEFAULT_AGENT_ID = 'local-agent'

export const INITIAL_GAME_STATE: GameState = {
  xp: 0,
  level: 1,
  energy: 70,
  mood: 'Motivated',
  evolutionStage: 'Baby',
  currentStreak: 0,
  bestStreak: 0,
  lastCheckInDate: null,
  lastAlertAt: null,
  lastPositiveActionAt: null,
  lastActivityLabel: null,
  lastActivityAt: null,
}
