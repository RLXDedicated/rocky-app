export type ReminderCategory = 'Documentation' | 'Streak' | 'Progress' | 'Celebration' | 'Recovery'

export type ReminderStatus = 'sent' | 'opened' | 'dismissed' | 'acted'

export interface ReminderRecord {
  id: string
  category: ReminderCategory
  message: string
  timestamp: string // ISO — when the reminder was sent
  status: ReminderStatus
  /** Present when the reminder can trigger a real action (e.g. Check-in). */
  actionable: boolean
  /**
   * Present only for event-tied Celebration reminders (a specific LEVEL_UP /
   * EVOLUTION / ACHIEVEMENT / STREAK_MILESTONE event id). Used for duplicate
   * prevention: the same underlying event never celebrates twice, no matter
   * how many times the evaluating effect re-runs (React StrictMode included).
   */
  dedupeKey?: string
}

export interface WorkingHoursSettings {
  /** 0 = Sunday ... 6 = Saturday */
  workingDays: number[]
  /** "HH:MM", 24h, local time */
  workingStartTime: string
  workingEndTime: string
}

// Reasonable prototype defaults (Phase 7 §3) — Monday-Friday, 08:00-18:00.
// Kept as a plain, easily-swapped constant; a later phase can move this into
// user-editable settings without touching the engine.
export const DEFAULT_WORKING_HOURS: WorkingHoursSettings = {
  workingDays: [1, 2, 3, 4, 5],
  workingStartTime: '08:00',
  workingEndTime: '18:00',
}
