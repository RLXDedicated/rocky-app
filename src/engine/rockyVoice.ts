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
    ['Future you just read your last note and said “thank you”. Let’s keep future you happy. 🔮', 'thanks'],
    ['Quick poll: who writes the clearest notes on the team? I’m voting for you, {name}. Don’t make me recount. 🗳️', 'boss'],
    ['I practiced my “proud face” all morning. Give me a reason to use it. 😤', 'focus'],
    ['Notes are like hay: nobody notices until there isn’t any. 🌾', 'hmm'],
    ['Your keyboard misses you. It told me. We talk. ⌨️', 'lol'],
    ['One tidy note, one happy bull. That’s the whole deal, {name}. 🤝', 'gotit'],
    ['Somewhere a supervisor is smiling at a great note. Let’s make it yours. 😌', 'nice'],
  ],
  Streak: [
    ['Your {streak}-day streak is looking at me nervously. Don’t let it down, {name}. 🔥', 'fire'],
    ['{streak} days! It would be a shame if something… happened to it. Check in. 😏', 'boss'],
    ['Streaks don’t feed themselves, {name}. Neither do I, by the way. 🍎', 'lunch'],
    ['I told the other bulls about your streak. Please don’t make me a liar. 🙏', 'help'],
    ['Day {streak} of being awesome. Day {next} is waiting by the door. 🚪', 'fire'],
    ['Breaking a {streak}-day streak should be illegal. I checked. It isn’t. So please don’t. 🚨', 'omg'],
    ['Your streak and I are both hungry. Only one of us is easy to feed: check in. 🍽️', 'lunch'],
    ['{streak} days in a row? Okay, show-off. Keep going. 😎', 'boss'],
  ],
  Recovery: [
    ['My energy is at {energy}. I’m fine. Totally fine. (A check-in would help.) 😅', 'tired'],
    ['Tiny setback, huge comeback energy. One clean note and I’ll stop giving you the look. 👀', 'rescue'],
    ['Rocky has seen worse. Rocky has DONE worse. Let’s bounce back, {name}. 💪', 'oops'],
    ['Coffee for you, hay for me, a great note for the customer. Deal? ☕', 'tired'],
    ['Every legend has a rough chapter. This is where the comeback starts. 📖', 'rescue'],
    ['I’m not worried. I’m just… standing here… worriedly. One good note fixes it. 🙃', 'hmm'],
    ['Reset button pressed. Next note, fresh start, same great {name}. 🔄', 'gm'],
    ['Hugs don’t fit through Teams, so here’s a virtual one. Now let’s get back to it. 🤗', 'hug'],
  ],
  Progress: [
    ['Level {level} looks good on you. Level {next} would look better. Just saying. 😎', 'boss'],
    ['I’ve been doing push-ups. You’ve been doing notes. Let’s see who levels up first. 🏋️', 'focus'],
    ['Consistency: 10/10. My diet: 2/10. Anyway, keep going, {name}. 🍕', 'lunch'],
    ['Other bulls have horns. I have YOU. Keep it up. 🤗', 'hug'],
    ['Level {next} is so close I can smell it. It smells like… good documentation. 👃', 'yay'],
    ['You’re on a roll. I’m on a bale of hay. We’re both winning. 🌾', 'party'],
    ['If notes were a sport, you’d have a jersey by now. Number {level}. 🏅', 'congrats'],
    ['I don’t say this to everyone… actually I do. But I mean it more with you, {name}. 💚', 'love'],
  ],
  Celebration: [
    ['Look at you! I’m telling everyone. EVERYONE. 📣', 'party'],
    ['Who is this legend? Oh wait, it’s {name}. Obviously. 🏆', 'congrats'],
    ['Somebody get this person a trophy. And me a snack. 🏆🍎', 'party'],
    ['I’d clap, but hooves. Imagine very loud clapping. 👏', 'yay'],
    ['This is going on the fridge. I don’t have a fridge. I’m getting one. 🧲', 'love'],
    ['Screenshot this. Frame it. Show your grandkids. 🖼️', 'boss'],
    ['Confetti budget: blown. Worth it. 🎊', 'party'],
    ['I knew you could. I also said you couldn’t, just to motivate you. It worked. 😏', 'lol'],
    ['Big moment. Bigger bull. Biggest proud face. 😤', 'congrats'],
    ['The other Rockys are jealous. As they should be. 💅', 'boss'],
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
  opts: { roast: boolean; random?: () => number; avoid?: string[] },
): VoiceLine {
  const random = opts.random ?? Math.random
  const seen = opts.avoid ?? []
  // Lines this agent got recently are skipped (unless every line was used — then the oldest come back).
  const fresh = (lines: Line[]) => {
    const unused = lines.filter(([t]) => !seen.some((s) => s.includes(fill(t, ctx))))
    return unused.length ? unused : lines
  }
  if (category === 'Celebration') {
    const sticker = celebrationSticker(engineMessage)
    if (!opts.roast || random() < 0.5) return { text: engineMessage, sticker }
    const tails = fresh(ROAST_LINES.Celebration)
    const tail = tails[Math.floor(random() * tails.length)]!
    return { text: `${engineMessage} ${fill(tail[0], ctx)}`, sticker }
  }
  if (!opts.roast || random() < 0.4) return { text: engineMessage, sticker: CALM_STICKER[category] }
  // Streak lines need a streak worth teasing about.
  const pool = fresh(ROAST_LINES[category].filter(([t]) => !t.includes('{streak}') || ctx.streak >= 2))
  const [text, sticker] = pool[Math.floor(random() * pool.length)] ?? ROAST_LINES.Documentation[0]!
  return { text: fill(text, ctx), sticker }
}

/** Path of a rendered sticker (public/teams/stickers, see tools/teams-app/render-stickers.mjs). One official Rocky for everyone — no per-stage art. */
export function stickerImage(id: string, _stage?: string): string {
  return `/teams/stickers/${id}.png`
}
