// Note Check — Rocky's daily mini-game about the core habit: leaving a
// clear account note after every interaction. Five questions a day, the
// same five for everyone (picked from the date), with Rocky's tip after
// each answer. The first round of the day earns a few coins (checked on the
// server, which scores the answers with this same bank); replays are for
// practice. Pure module: shared by the browser and the backend.
//
// Questions are generic customer-service documentation practice. QA can
// edit this bank to match RLX's exact note standard.
import { todayKey } from '../engine/dateUtils'
import { EXTRA_QUESTIONS } from './notesQuizBank'

export interface QuizQuestion {
  id: string
  prompt: string
  options: string[]
  answer: number
  /** Rocky's tip, shown after answering. */
  tip: string
}

const BASE_QUESTIONS: QuizQuestion[] = [
  {
    id: 'q-must-have',
    prompt: 'What must every account note include?',
    options: [
      'Just the date — the system knows the rest',
      'Who you talked to, what happened, the outcome and the next step',
      'How the customer sounded',
      'Only the order number',
    ],
    answer: 1,
    tip: 'Who, what, outcome, next step. If the next agent can pick up without calling back, the note did its job.',
  },
  {
    id: 'q-better-reschedule',
    prompt: 'Which note is better?',
    options: [
      'Called cx. Rescheduled.',
      'Spoke with Maria (account holder). Delivery moved from 6/12 to 6/14, 8–12 window, at her request (not home). Confirmed address and gate code.',
    ],
    answer: 1,
    tip: 'Old date, new date, window, who asked and why. “Rescheduled” alone leaves the next agent guessing.',
  },
  {
    id: 'q-when',
    prompt: 'When is the best time to write the note?',
    options: ['At the end of the shift, all together', 'During or right after the interaction', 'Only if the customer complains', 'The next morning'],
    answer: 1,
    tip: 'Notes written right away are the accurate ones. Details fade fast after the next call.',
  },
  {
    id: 'q-facts',
    prompt: 'A customer was upset about a damaged item. Which note is most professional?',
    options: [
      'Customer was rude and yelling.',
      'Customer reported a cracked washer door on delivery 6/10. Sent photos by email. Opened damage claim #D-4471. Replacement pending approval.',
      'Angry customer, handled it.',
    ],
    answer: 1,
    tip: 'Facts, not feelings: what was reported, what you did, the reference number and what happens next.',
  },
  {
    id: 'q-callback',
    prompt: 'You promised a callback. What does the note need?',
    options: [
      'Nothing — you’ll remember',
      'The date/time you promised and the number to call',
      'Just “will call back”',
      'Your personal phone number',
    ],
    answer: 1,
    tip: 'A promise in the note is a promise the whole team can keep, even if you’re off tomorrow.',
  },
  {
    id: 'q-sensitive',
    prompt: 'Which of these should NEVER go in a note?',
    options: ['The ticket number', 'A full card number or a password', 'The delivery window', 'The name of the person you spoke with'],
    answer: 1,
    tip: 'Payment data and passwords never go in notes. Reference the transaction, not the card.',
  },
  {
    id: 'q-voicemail',
    prompt: 'You called and got voicemail. Do you leave a note?',
    options: [
      'No, nothing happened',
      'Yes: time, number called, and that you left a voicemail (or didn’t)',
      'Only after the third try',
      'Only if QA is auditing',
    ],
    answer: 1,
    tip: 'Every attempt counts. “No answer, VM left at 10:42 to (555) 123-4567” proves the contact happened.',
  },
  {
    id: 'q-transfer',
    prompt: 'You transferred the call. What should the note say?',
    options: ['Nothing, the other team will note it', 'Who/which team you transferred to and why', 'Just “transferred”', 'The customer’s mood'],
    answer: 1,
    tip: 'A warm hand-off in the note means the customer never has to repeat their story.',
  },
  {
    id: 'q-audience',
    prompt: 'Who are you really writing the note for?',
    options: ['Yourself only', 'The next person who opens the account', 'Nobody reads notes', 'The customer'],
    answer: 1,
    tip: 'Write it so a teammate who has never seen the account understands it in 10 seconds.',
  },
  {
    id: 'q-abbrev',
    prompt: 'Which note is clearer?',
    options: [
      'cx ntfd re dlvy, wl cb tmrw',
      'Notified customer about the delivery delay; will call back tomorrow (6/13) after 2 pm with the new ETA.',
    ],
    answer: 1,
    tip: 'Only standard abbreviations. If it needs decoding, it isn’t a note — it’s a puzzle.',
  },
  {
    id: 'q-reference',
    prompt: 'A claim or ticket was opened. What must the note include?',
    options: ['The ticket or claim number', 'An apology', 'Nothing extra', 'The weather'],
    answer: 0,
    tip: 'Reference numbers link the note to the case. Without one, the next agent starts from zero.',
  },
  {
    id: 'q-escalation',
    prompt: 'The customer asked for a supervisor. What goes in the note?',
    options: [
      '“Escalated.”',
      'What they asked for, who you escalated to, the reference number and the expected follow-up',
      'Nothing — supervisors write their own',
      'That the customer was difficult',
    ],
    answer: 1,
    tip: 'Escalations get reviewed. A clear note protects you and gets the customer help faster.',
  },
  {
    id: 'q-driver-report',
    prompt: 'A driver reported the customer wasn’t home. How do you note it?',
    options: [
      'Customer no-show.',
      'Driver (route 14) reported no one home at 11:05; left door tag. Called customer, no answer, VM left. Redelivery to be scheduled.',
      'Driver says whatever.',
    ],
    answer: 1,
    tip: 'Say where the information came from (driver, customer, system) and every step you took.',
  },
  {
    id: 'q-qa-looks',
    prompt: 'What does a QA audit look for in a note?',
    options: ['Length — longer is better', 'Complete, accurate, and a clear next step', 'Emojis', 'Perfect grammar only'],
    answer: 1,
    tip: 'QA reads notes like the next agent would: is it complete, is it true, and is it clear what happens next?',
  },
  {
    id: 'q-quote',
    prompt: 'How do you record what the customer said about a problem?',
    options: [
      'Your opinion of it',
      'Their words, attributed: “Customer states the box was open on arrival.”',
      'Leave it out',
      'A summary of your feelings',
    ],
    answer: 1,
    tip: '“Customer states…” keeps the note factual and fair to everyone.',
  },
  {
    id: 'q-update',
    prompt: 'The situation changed after your first note. What do you do?',
    options: ['Leave the old note as it is', 'Add a new, dated note with the update', 'Delete the old note', 'Tell a teammate verbally'],
    answer: 1,
    tip: 'Notes are a timeline. Add, don’t erase — the history matters.',
  },
  {
    id: 'q-contact',
    prompt: 'Which detail proves how you reached the customer?',
    options: ['The number or email you used', 'Your break time', 'The customer’s mood', 'Nothing is needed'],
    answer: 0,
    tip: 'The contact method and number/email make the note verifiable.',
  },
  {
    id: 'q-short-call',
    prompt: 'A quick 1-minute call just confirmed an address. Note it?',
    options: ['No, too small', 'Yes: “Confirmed delivery address with account holder, no changes.”', 'Only on busy days', 'Only if they ask'],
    answer: 1,
    tip: 'Small calls get small notes — but they always get one. That’s the habit Rocky loves.',
  },
]

/** Every question (the original set plus the full-process bank). */
export const QUIZ_BANK: QuizQuestion[] = [...BASE_QUESTIONS, ...EXTRA_QUESTIONS]

export const QUIZ_ROUND_SIZE = 5
/** Coins per correct answer, and the bonus for a perfect round (first round of the day only). */
export const QUIZ_REWARD = { perCorrect: 4, perfectBonus: 10, perfectTreats: 1 } as const

/** A small seeded PRNG (mulberry32), so every device builds the same quiz for a day. */
function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffle<T>(list: T[], random: () => number): T[] {
  const out = [...list]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[out[i], out[j]] = [out[j]!, out[i]!]
  }
  return out
}

/** Days since 2024-01-01 for a local day key (the same day for everyone). */
function dayNumber(now: Date): number {
  const [y, m, d] = todayKey(now).split('-').map(Number) as [number, number, number]
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(2024, 0, 1)) / 86_400_000)
}

/**
 * Today's five questions — the same for everyone on a given day, and a
 * different set every day: the bank is shuffled once per cycle and each day
 * takes the next five, so no question comes back until the whole bank has
 * been used (then a new shuffle starts). The options are shuffled per day
 * too, so the right answer isn't always in the same place.
 */
export function dailyQuestions(now: Date = new Date(), bank: QuizQuestion[] = QUIZ_BANK): QuizQuestion[] {
  const size = Math.min(QUIZ_ROUND_SIZE, bank.length)
  const perCycle = Math.max(1, Math.floor(bank.length / size))
  const day = dayNumber(now)
  const cycle = Math.floor(day / perCycle)
  const slot = ((day % perCycle) + perCycle) % perCycle
  const order = shuffle(bank, rng(0x5eed + cycle * 7919))
  const picked = order.slice(slot * size, slot * size + size)
  const random = rng(day * 104729 + 17)
  return picked.map((q) => {
    const idx = shuffle(q.options.map((_, i) => i), random)
    return { ...q, options: idx.map((i) => q.options[i]!), answer: idx.indexOf(q.answer) }
  })
}

/** Scores answers (question id → chosen option) against today's round; unknown ids are ignored. */
export function scoreQuiz(answers: Record<string, number>, now: Date = new Date()): { correct: number; total: number } {
  const round = dailyQuestions(now)
  const correct = round.filter((q) => answers[q.id] === q.answer).length
  return { correct, total: round.length }
}

/** What makes a good note — shown next to the game as a quick reference. */
export const NOTE_CHECKLIST = [
  'Who you spoke with (or tried to reach), and how',
  'What happened, in facts — “Customer states…”',
  'What you did, with ticket / claim numbers',
  'The outcome and the next step, with dates',
  'Written right away. No card numbers or passwords.',
]

/** Short reminders Rocky mixes into his speech. */
export const NOTE_TIPS = [
  'Every call gets a note — even the quick ones.',
  'Who, what, outcome, next step. That’s a Rocky-approved note.',
  'A promise in the note is a promise the team can keep.',
  'Write it now, while it’s fresh!',
  'Ticket number in the note = happy next agent.',
  'Facts, not feelings: “Customer states…”',
  'Voicemail? Note the time and the number.',
  'Great notes mean nobody has to call the customer twice.',
]
