import type { Mood } from '../types/domain'
import { rankName } from './ranks'

// No punitive language anywhere in these pools — no "failure", "penalty",
// "punishment", "bad agent", "you failed". Worried is concerned, never sad,
// angry, or intimidating; Recovery reads as a comeback, not a reprieve.
const MESSAGES: Record<Mood, string[]> = {
  Happy: ["You're on a roll!", "Rocky is thrilled to see you!", "Great streak — Rocky's having a fantastic day!"],
  Motivated: ["Let's keep it going.", "Rocky's ready to tackle documentation with you.", "Let's keep this momentum going!"],
  Worried: [
    "Let's get back into the rhythm.",
    "Rocky's a bit low on energy — a check-in would help.",
    "Rocky misses the daily streak.",
    "Every streak starts with day one — Rocky's cheering you on!",
    "Rocky's excited to see this streak grow. Keep it going!",
  ],
  Recovery: [
    "Good comeback. Let's keep rebuilding.",
    "Rocky's bouncing back already — nice work!",
    "Every comeback counts. Rocky believes in you.",
  ],
}

export function moodMessage(mood: Mood): string {
  const options = MESSAGES[mood]
  return options[Math.floor(Math.random() * options.length)]
}

export function checkInReaction(): string {
  const reactions = [
    'Rocky does a happy little stomp!',
    'Rocky nods approvingly — nice work today!',
    'Rocky lets out a cheerful snort of joy!',
  ]
  return reactions[Math.floor(Math.random() * reactions.length)]
}

// QA Pass: audit came back clean. Rocky celebrates — full happy energy.
export function qaPassReaction(): string {
  const reactions = [
    'Rocky throws a little hoof-pump — clean audit!',
    'Rocky does a joyful bounce — great documentation!',
    "Rocky's beaming — that's how it's done!",
  ]
  return reactions[Math.floor(Math.random() * reactions.length)]
}

export function achievementReaction(name: string): string {
  return `🏅 Achievement unlocked: ${name}! Rocky's proud of you.`
}

export function levelUpReaction(previousLevel: number, newLevel: number): string {
  return `🎉 Level Up! ${previousLevel} → ${newLevel}. Rocky's cheering you on!`
}

// A new rank is a bigger moment than a normal Level Up — a milestone in a
// professional tool, not a kids'-game power-up. Rocky himself never changes
// (one official look); the agent's rank does.
export function evolutionReaction(previousStage: string, newStage: string): string {
  return `🏅 New rank! ${rankName(previousStage)} → ${rankName(newStage)}.`
}

// Documentation Alert: framed as "let's recover together", never "you failed".
// Rocky stays a friendly, happy animal — just a little concerned, never sad,
// angry, or intimidating.
export function documentationAlertReaction(): string {
  const reactions = [
    "Rocky notices something to fix — let's tackle it together.",
    "Rocky's a little concerned, but ready to help you bounce back.",
    "Rocky gives a gentle nudge — small fix, quick recovery.",
  ]
  return reactions[Math.floor(Math.random() * reactions.length)]
}
