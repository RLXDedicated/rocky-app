// Single source of truth for the approved game-rule numbers (Phase 9 §Rule
// 4). gameEngine.ts and reminderEngine.ts import from here instead of
// declaring their own local constants, so a value only ever needs to change
// in one place. Levels/Achievements/Streak-Milestones already lived in their
// own single-purpose files (levels.ts / achievements.ts / streakMilestones.ts)
// before this phase — they're re-exported here for discoverability, not
// duplicated.
//
// CONFIRMED (Phase 10, authoritative product decision) — two values a Phase
// 9 brief listed didn't match Phases 1-8's implemented behavior; product
// ownership has since confirmed the implementation was correct as built.
// See DOMAIN_RULES.md:
//   1. Streak milestones grant XP only (see STREAK_MILESTONES in
//      streakMilestones.ts) — there is no Energy grant for them.
//   2. "Getting Started" IS the first-QA-Pass achievement — ACHIEVEMENT_CATALOG
//      has exactly 6 entries, not 7 (First Step, Getting Started, One Week
//      Strong, Two Weeks Strong, Monthly Champion, Consistency).

import { DEFAULT_WORKING_HOURS } from '../types/reminder'
import { ACHIEVEMENT_CATALOG } from './achievements'
import { LEVEL_THRESHOLDS, MAX_DEFINED_LEVEL } from './levels'
import { STREAK_MILESTONES } from './streakMilestones'

export const GAME_CONFIG = {
  xp: {
    checkIn: 10,
    qaPass: 25,
  },
  energy: {
    checkIn: 5,
    qaPass: 10,
    alertLoss: 20,
    dailyAlertCap: 40,
    min: 0,
    max: 100,
  },
  mood: {
    /** Hours after a positive action that Recovery still applies. */
    recoveryWindowHours: 24,
    happyEnergyThreshold: 70,
    happyStreakThreshold: 7,
    motivatedEnergyThreshold: 40,
    worriedEnergyThreshold: 40,
    /** Hours an unanswered QA alert keeps Rocky Worried (until a Check-in or QA Pass). */
    unansweredAlertHours: 72,
  },
  levels: {
    thresholds: LEVEL_THRESHOLDS,
    maxDefinedLevel: MAX_DEFINED_LEVEL,
  },
  streakMilestones: STREAK_MILESTONES,
  achievements: ACHIEVEMENT_CATALOG,
  reminders: {
    cooldownMinutes: 90,
    adaptiveCooldownMultiplier: 2,
    maxPerDay: 4,
    positiveActionSuppressionMinutes: 30,
    recoveryDelayMinutes: 30,
    // Re-exported from types/reminder.ts rather than redeclared — that file
    // owns WorkingHoursSettings and its default, since it's a plain data
    // shape a settings screen would eventually edit directly.
    defaultWorkingHours: DEFAULT_WORKING_HOURS,
  },
} as const
