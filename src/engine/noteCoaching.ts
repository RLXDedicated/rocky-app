// Rocky's note coaching: the documentation side of every Teams card. Rocky's
// line is the hook; the lesson is the point — why notes matter, how a good
// one is built, when and how to write it, what never goes in, and how QA
// reads it. Lessons rotate (an agent never gets the same one twice in a
// short while) and each week has a focus theme, so over a month an agent
// walks the whole note process a little at a time.
//
// Built on the same standard as the Note Check game (src/game/notesQuiz.ts);
// QA can edit both to match RLX's exact note standard. Pure module: shared
// by the backend (cards) and the web app.
import { NOTE_CHECKLIST } from '../game/notesQuiz'

export type LessonTheme = 'why' | 'structure' | 'process' | 'examples' | 'safety' | 'qa'

export interface NoteLesson {
  id: string
  theme: LessonTheme
  title: string
  text: string
  /** A before/after pair: the vague note and the one Rocky wants. */
  bad?: string
  good?: string
}

export const THEME_LABEL: Record<LessonTheme, string> = {
  why: 'Why notes matter',
  structure: 'How a note is built',
  process: 'The note process',
  examples: 'Before & after',
  safety: 'What never goes in',
  qa: 'How QA reads it',
}

export const THEME_ICON: Record<LessonTheme, string> = {
  why: '💡',
  structure: '🧱',
  process: '🔁',
  examples: '✍️',
  safety: '🔒',
  qa: '🔍',
}

export const NOTE_LESSONS: NoteLesson[] = [
  // ---------------------------------------------------------------- why
  { id: 'why-next-agent', theme: 'why', title: 'The note is for the next person', text: 'Whoever opens the account next — a teammate, a supervisor, QA — only knows what your note says. Write it so they can act in 10 seconds without calling the customer again.' },
  { id: 'why-customer', theme: 'why', title: 'Notes save the customer a call', text: 'A clear note means the customer never has to repeat their story. That is the difference between “let me check” and “I see exactly what happened.”' },
  { id: 'why-protects-you', theme: 'why', title: 'A good note protects you', text: 'If a case is escalated or reviewed, your note is the record of what you did. Clear facts, times and reference numbers show you did it right.' },
  { id: 'why-promise', theme: 'why', title: 'A promise in the note is a team promise', text: 'Callbacks, redeliveries, claims: if it’s in the note, anyone can keep the promise — even on your day off.' },
  { id: 'why-habit', theme: 'why', title: 'Every interaction gets a note', text: 'Calls, chats, emails, voicemails, quick confirmations. Small interactions get short notes — but they always get one. That’s the habit.' },
  // ---------------------------------------------------------------- structure
  { id: 'st-four-parts', theme: 'structure', title: 'The four parts: who · what · outcome · next step', text: 'Who you spoke with (or tried to), what happened, what you did and how it ended, and what happens next — with dates.' },
  { id: 'st-who', theme: 'structure', title: 'Start with who and how', text: 'Name and role of the person (account holder, spouse, driver, store), and the channel: inbound call, outbound call, chat, email.', bad: 'Talked to cx.', good: 'Inbound call from Maria Lopez (account holder).' },
  { id: 'st-facts', theme: 'structure', title: 'What happened, in facts', text: 'Attribute what you were told — “Customer states…”, “Driver reports…”. Facts, not feelings or opinions.', bad: 'Customer was rude about the box.', good: 'Customer states the box was open on arrival; sent 2 photos by email.' },
  { id: 'st-action', theme: 'structure', title: 'What you did, with references', text: 'Every action with its reference: ticket, claim, order or case number. The number links your note to the case.', good: 'Opened damage claim #D-4471; replacement requested.' },
  { id: 'st-next', theme: 'structure', title: 'Always close with the next step', text: 'What happens next, who owns it and when. A note without a next step leaves the next agent guessing.', bad: 'Will follow up.', good: 'Next: callback 6/14 after 2 pm ET at (555) 123-4567 with the new ETA.' },
  { id: 'st-dates', theme: 'structure', title: 'Dates and times, not “tomorrow”', text: '“Tomorrow” changes meaning the next day. Write the date, the time and the time zone.', bad: 'Delivery moved to tomorrow.', good: 'Delivery moved from 6/12 to 6/13, 8–12 window.' },
  // ---------------------------------------------------------------- process
  { id: 'pr-right-away', theme: 'process', title: 'Write it right away', text: 'During or right after the interaction — not at the end of the shift. Details fade after the next call.' },
  { id: 'pr-update', theme: 'process', title: 'Things changed? Add a new note', text: 'Notes are a timeline. Don’t rewrite or delete the old one — add a dated update so the history stays clear.' },
  { id: 'pr-transfer', theme: 'process', title: 'Transfers: note the hand-off', text: 'Who or which team you transferred to, and why. A warm hand-off in the note means the customer doesn’t start over.', bad: 'Transferred.', good: 'Transferred to Returns (ext. 4410) — customer wants to return the dryer, outside our scope.' },
  { id: 'pr-voicemail', theme: 'process', title: 'No answer still gets a note', text: 'Every attempt counts: the time, the number you called, and whether you left a voicemail.', good: 'Outbound 10:42 ET to (555) 123-4567, no answer, VM left with callback number.' },
  { id: 'pr-escalation', theme: 'process', title: 'Escalations: the full picture', text: 'What the customer asked for, who you escalated to, the reference number and when they can expect an answer.' },
  { id: 'pr-reread', theme: 'process', title: 'Re-read before you save', text: 'Five seconds: would a teammate who has never seen this account understand it? If not, add the missing piece.' },
  // ---------------------------------------------------------------- examples
  { id: 'ex-reschedule', theme: 'examples', title: 'A reschedule', text: 'Old date, new date, window, who asked and why.', bad: 'Called cx. Rescheduled.', good: 'Spoke with Maria (account holder). Delivery moved 6/12 → 6/14, 8–12 window, at her request (not home). Confirmed address and gate code.' },
  { id: 'ex-abbrev', theme: 'examples', title: 'Abbreviations', text: 'Only standard ones. If it needs decoding, it isn’t a note — it’s a puzzle.', bad: 'cx ntfd re dlvy, wl cb tmrw', good: 'Notified customer about the delivery delay; will call back 6/13 after 2 pm ET with the new ETA.' },
  { id: 'ex-driver', theme: 'examples', title: 'A driver report', text: 'Say where the information came from and every step you took.', bad: 'Customer no-show.', good: 'Driver (route 14) reported no one home at 11:05; left door tag. Called customer, no answer, VM left. Redelivery to be scheduled.' },
  { id: 'ex-short', theme: 'examples', title: 'A 1-minute call', text: 'Short call, short note — but a complete one.', bad: '(no note)', good: 'Confirmed delivery address with account holder, no changes.' },
  // ---------------------------------------------------------------- safety
  { id: 'sa-payment', theme: 'safety', title: 'No card numbers, ever', text: 'Full card numbers, CVVs and bank details never go in a note. Reference the transaction or the last 4 digits only if your process allows it.' },
  { id: 'sa-passwords', theme: 'safety', title: 'No passwords or codes', text: 'Passwords, PINs and verification codes never go in a note — not even “temporarily”.' },
  { id: 'sa-opinions', theme: 'safety', title: 'No opinions about the customer', text: 'Notes can be read by many people, sometimes by the customer. Describe what happened, not what you think of the person.', bad: 'Difficult customer, yelling.', good: 'Customer upset about the delay; asked for a supervisor.' },
  // ---------------------------------------------------------------- qa
  { id: 'qa-three-checks', theme: 'qa', title: 'QA’s three questions', text: 'Is it complete? Is it accurate? Is the next step clear? QA reads your note like the next agent would.' },
  { id: 'qa-length', theme: 'qa', title: 'Longer isn’t better', text: 'QA doesn’t score length. A short note with who, what, outcome and next step beats a long story every time.' },
  { id: 'qa-match', theme: 'qa', title: 'The note matches the call', text: 'What’s in the note must be what happened on the call — the same dates, numbers and promises. Accuracy is part of the score.' },
  { id: 'qa-learn', theme: 'qa', title: 'Audits are coaching', text: 'Every audit points at one thing to keep and one thing to try. Pick one, use it on your next note, and Rocky will notice.' },
]

const THEMES: LessonTheme[] = ['why', 'structure', 'process', 'examples', 'safety', 'qa']

/** Week number since 2024-01-01 (Monday), so the focus theme is the same for everyone that week. */
function weekIndex(now: Date): number {
  const base = Date.UTC(2024, 0, 1)
  const day = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.floor((day - base) / (7 * 86_400_000))
}

/** This week's focus theme (rotates weekly through the whole process). */
export function weekTheme(now: Date = new Date()): LessonTheme {
  return THEMES[((weekIndex(now) % THEMES.length) + THEMES.length) % THEMES.length]!
}

/**
 * The next lesson for an agent: never one of `recent` (lesson ids they got
 * lately) while a fresh one exists; `theme` picks from that theme first.
 */
export function pickLesson(recent: string[], opts: { theme?: LessonTheme; random?: () => number } = {}): NoteLesson {
  const random = opts.random ?? Math.random
  const seen = new Set(recent)
  const themed = opts.theme ? NOTE_LESSONS.filter((l) => l.theme === opts.theme && !seen.has(l.id)) : []
  const fresh = NOTE_LESSONS.filter((l) => !seen.has(l.id))
  // Everything used: the least recently seen come back first.
  const pool = themed.length ? themed : fresh.length ? fresh : NOTE_LESSONS.filter((l) => l.id !== recent[0])
  return pool[Math.floor(random() * pool.length)] ?? NOTE_LESSONS[0]!
}

export function findLesson(id: string | null | undefined): NoteLesson | null {
  return NOTE_LESSONS.find((l) => l.id === id) ?? null
}

export { NOTE_CHECKLIST }

/** The lesson as Adaptive Card elements (an emphasis container). */
export function lessonBlock(lesson: NoteLesson, heading?: string) {
  const items: Record<string, unknown>[] = [
    { type: 'TextBlock', text: `${THEME_ICON[lesson.theme]} ${heading ?? `Note habit · ${THEME_LABEL[lesson.theme]}`}`, size: 'Small', weight: 'Bolder', color: 'Accent', wrap: true },
    { type: 'TextBlock', text: lesson.title, weight: 'Bolder', wrap: true, spacing: 'Small' },
    { type: 'TextBlock', text: lesson.text, wrap: true, spacing: 'Small' },
  ]
  if (lesson.bad) items.push({ type: 'TextBlock', text: `❌ ${lesson.bad}`, wrap: true, spacing: 'Small', isSubtle: true, fontType: 'Monospace', size: 'Small' })
  if (lesson.good) items.push({ type: 'TextBlock', text: `✅ ${lesson.good}`, wrap: true, spacing: 'Small', color: 'Good', fontType: 'Monospace', size: 'Small' })
  return { type: 'Container', style: 'emphasis', bleed: false, spacing: 'Medium', items }
}

/** The five-point checklist as a compact card block. */
export function checklistBlock() {
  return {
    type: 'Container',
    spacing: 'Medium',
    items: [
      { type: 'TextBlock', text: '📋 Every note, every time', weight: 'Bolder', size: 'Small', wrap: true },
      { type: 'TextBlock', text: NOTE_CHECKLIST.map((c) => `- ${c}`).join('\n'), wrap: true, spacing: 'Small', size: 'Small' },
    ],
  }
}
