import type { ReminderCategory } from '../types/reminder'

// Personality guardrail (Phase 7 §9): supportive, playful, concise,
// positive, workplace-appropriate. Never: "you failed", "you forgot",
// "you're falling behind", "bad documentation", "penalty", "warning",
// "compliance violation" — anywhere in this file.
export const REMINDER_MESSAGES: Record<ReminderCategory, string[]> = {
  Documentation: [
    "Rocky is ready when you are.",
    "One small step keeps the habit moving.",
    "Let's keep the documentation rhythm going.",
    "A quick check-in whenever you're ready.",
  ],
  Streak: [
    'Keep the streak alive.',
    "Rocky says: let's keep it going.",
    'Your consistency is showing.',
    "Let's keep building the rhythm.",
  ],
  Progress: [
    "You're getting closer to the next level.",
    'Rocky is growing with you.',
    'Another step forward.',
    "You're building something strong.",
  ],
  Celebration: [
    "Rocky's on a roll!",
    "You're on a roll!",
    'Nice work — worth celebrating.',
    'Rocky is cheering you on.',
  ],
  Recovery: [
    "Good comeback. Let's keep rebuilding.",
    'Rocky is bouncing back with you.',
    'One positive step at a time.',
    "Let's get back into the rhythm.",
  ],
}

/**
 * Picks a message for the category, avoiding an exact repeat of
 * `lastMessage` when another option exists. `random` defaults to
 * Math.random but is injectable so the engine stays deterministic in tests.
 */
export function pickReminderMessage(
  category: ReminderCategory,
  lastMessage: string | undefined,
  random: () => number = Math.random,
): string {
  const options = REMINDER_MESSAGES[category]
  const pool = options.length > 1 ? options.filter((m) => m !== lastMessage) : options
  const index = Math.floor(random() * pool.length)
  return pool[Math.min(index, pool.length - 1)]
}
