// Rocky's Teams voice: the reminder engine decides WHEN and WHAT category;
// this picks HOW Rocky says it. With "roast" on (Admin → Horarios y Teams),
// about half the nudges come with Duolingo-style cheek — teasing, never
// mean: Rocky roasts the situation (and himself), not the person's skills.
// Guardrail: no insults, no "you failed", nothing about QA scores or
// performance being bad, nothing a team lead wouldn't say out loud.
import type { ReminderCategory } from '../types/reminder'

export interface VoiceContext {
  firstName: string
  streak: number
  energy: number
  level: number
  checkedInToday: boolean
}

export interface VoiceLine {
  text: string
  /** A chat sticker id (src/components/chat/Stickers.tsx). */
  sticker: string
}

type Line = [string, string] // [text with {name} {streak} {energy} {level} {next}, sticker]

export const ROAST_LINES: Record<ReminderCategory, Line[]> = {
  Documentation: [
    ['Hi {name}. It’s me, Rocky. Your notes called — they miss you. 📝', 'hi'],
    ['I’m not saying I’m judging your notes… but my horns are tingling. 👀', 'hmm'],
    ['Plot twist: your next note is the best one of the day. Prove me right, {name}.', 'boss'],
    ['Duolingo has an owl. You have a bull. Choose your next note wisely. 🦉🐂', 'lol'],
    ['These reminders won’t stop until the notes start. I have all day. Literally. ⏰', 'focus'],
    ['I ate your pencil. Kidding. Mostly. Go write that note. ✏️', 'oops'],
    ['A clear note today saves a confused customer tomorrow. Also, it makes me dance. 💃', 'party'],
  ],
  Streak: [
    ['Your {streak}-day streak is looking at me nervously. Don’t let it down, {name}. 🔥', 'fire'],
    ['{streak} days! It would be a shame if something… happened to it. Check in. 😏', 'boss'],
    ['Streaks don’t feed themselves, {name}. Neither do I, by the way. 🍎', 'lunch'],
    ['I told the other bulls about your streak. Please don’t make me a liar. 🙏', 'help'],
  ],
  Recovery: [
    ['My energy is at {energy}. I’m fine. Totally fine. (A check-in would help.) 😅', 'tired'],
    ['Tiny setback, huge comeback energy. One clean note and I’ll stop giving you the look. 👀', 'rescue'],
    ['Rocky has seen worse. Rocky has DONE worse. Let’s bounce back, {name}. 💪', 'oops'],
    ['Coffee for you, hay for me, a great note for the customer. Deal? ☕', 'tired'],
  ],
  Progress: [
    ['Level {level} looks good on you. Level {next} would look better. Just saying. 😎', 'boss'],
    ['I’ve been doing push-ups. You’ve been doing notes. Let’s see who levels up first. 🏋️', 'focus'],
    ['Consistency: 10/10. My diet: 2/10. Anyway, keep going, {name}. 🍕', 'lunch'],
    ['Other bulls have horns. I have YOU. Keep it up. 🤗', 'hug'],
  ],
  Celebration: [
    ['Look at you! I’m telling everyone. EVERYONE. 📣', 'party'],
    ['Who is this legend? Oh wait, it’s {name}. Obviously. 🏆', 'congrats'],
  ],
}

/** The sticker that goes with a calm (non-roast) message of each category. */
export const CALM_STICKER: Record<ReminderCategory, string> = {
  Documentation: 'nice',
  Streak: 'fire',
  Recovery: 'rescue',
  Progress: 'boss',
  Celebration: 'congrats',
}

/** Celebration messages come from the engine; this matches their sticker. */
export function celebrationSticker(message: string): string {
  if (/evolved/i.test(message)) return 'fire'
  if (/level/i.test(message)) return 'levelup'
  if (/streak/i.test(message)) return 'fire'
  if (/achievement/i.test(message)) return 'congrats'
  return 'party'
}

const fill = (text: string, c: VoiceContext) =>
  text
    .replace(/\{name\}/g, c.firstName)
    .replace(/\{streak\}/g, String(c.streak))
    .replace(/\{energy\}/g, String(c.energy))
    .replace(/\{level\}/g, String(c.level))
    .replace(/\{next\}/g, String(c.level + 1))

/**
 * What Rocky says in a Teams card. Celebrations keep the engine's exact
 * message (it names the level/stage) with a cheeky tail when roast is on.
 */
export function voiceFor(
  category: ReminderCategory,
  engineMessage: string,
  ctx: VoiceContext,
  opts: { roast: boolean; random?: () => number; avoid?: string | null },
): VoiceLine {
  const random = opts.random ?? Math.random
  if (category === 'Celebration') {
    const sticker = celebrationSticker(engineMessage)
    if (!opts.roast || random() < 0.5) return { text: engineMessage, sticker }
    const tail = ROAST_LINES.Celebration[Math.floor(random() * ROAST_LINES.Celebration.length)]!
    return { text: `${engineMessage} ${fill(tail[0], ctx)}`, sticker }
  }
  if (!opts.roast || random() < 0.4) return { text: engineMessage, sticker: CALM_STICKER[category] }
  // Streak lines need a streak worth teasing about.
  let pool = ROAST_LINES[category].filter(([t]) => !t.includes('{streak}') || ctx.streak >= 2)
  if (pool.length > 1 && opts.avoid) pool = pool.filter(([t]) => fill(t, ctx) !== opts.avoid)
  const [text, sticker] = pool[Math.floor(random() * pool.length)] ?? ROAST_LINES.Documentation[0]!
  return { text: fill(text, ctx), sticker }
}

/** Stickers drawn from a reaction illustration (one image for every stage); the rest follow the agent's stage. */
export const REACTION_STICKERS = new Set(['yay', 'nice', 'levelup', 'fire', 'oops', 'gotit', 'congrats', 'rescue'])

/** Path of a rendered sticker (public/teams/stickers, see tools/teams-app/render-stickers.mjs). */
export function stickerImage(id: string, stage: string): string {
  return REACTION_STICKERS.has(id) ? `/teams/stickers/${id}.png` : `/teams/stickers/${id}-${stage.toLowerCase()}.png`
}
