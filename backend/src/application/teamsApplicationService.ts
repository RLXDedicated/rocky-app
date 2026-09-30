// Rocky ↔ Microsoft Teams, with standard Microsoft 365 connectors only.
//
//   Rocky → Teams: every few minutes Rocky checks, for each agent on the
//   roster, whether a reminder is due *inside their shift* (the same
//   reminder engine as the app: cooldowns, daily cap, priorities). The due
//   ones go in one POST to a Teams "Workflows" webhook ("When a Teams webhook
//   request is received" — a standard trigger); the flow only loops and posts
//   each ready-made Adaptive Card to the agent in chat (Flow bot). No rule
//   lives in the flow (docs/adr/0004).
//
//   Teams → Rocky: the card's buttons are signed links to Rocky. Opening
//   Rocky or confirming "notes done" is recorded, and it changes Rocky:
//   answering a card / checking in on time makes him happier and pays a few
//   coins; cards left unanswered for hours make him a little sad.
//
// The roster and shifts come from the SharePoint list, pasted/imported in
// Admin (Rocky has no Graph access in the pilot).
//
// Every card is a note-coaching card first: Rocky's line is the hook, and a
// rotating lesson (src/engine/noteCoaching.ts) teaches the documentation
// process a little at a time — why notes matter, their structure, the
// process, before/after examples, what never goes in and how QA reads them.
//
// Cards an agent can get (inside their shift):
//   greeting    at the start of the shift (extra: not one of the 3 reminders);
//   weekly      the greeting of the first shift day of the week, with last week's summary;
//   reminder    the reminder engine's nudges (max 3 a day, milestones as a big card);
//   streakrisk  near the end of the shift when a streak would break (counts as a reminder);
//   kudos       teammates' thank-yous (extra).
// Team leads get a weekly team summary (Monday morning).
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { ApiError } from '../api/errors'
import type { PersistenceContext } from '../infrastructure/persistenceContext'
import type { DeliveryRecord, ScheduleRecord } from '../infrastructure/accounts/AccountStore'
import { checkForReminder, markReminderActed, markReminderOpened, systemClock, todayKey, type Clock } from '../domain/rockyEngine'
import { emailFitsName, matchByName, minutesIntoShift, toLocalSchedule, validSchedule, validTimeZone, type AgentSchedule, type RosterRow } from '../../../src/game/schedule'
import { publicName } from './leaderboardApplicationService'
import { stickerImage, voiceFor, type VoiceLine } from '../../../src/engine/rockyVoice'
import { checklistBlock, findLesson, lessonBlock, pickLesson, THEME_ICON, THEME_LABEL, weekTheme, type NoteLesson } from '../../../src/engine/noteCoaching'
import { NOTE_TIPS } from '../../../src/game/notesQuiz'
import { MAX_DAILY_REMINDERS } from '../../../src/engine/reminderEngine'
import { WORKING_DAYS } from '../../../src/engine/dateUtils'
import type { PetApplicationService } from './petApplicationService'
import type { ChallengeApplicationService } from './challengeApplicationService'
import { KUDOS_TAGS } from './kudosApplicationService'
import type { ReminderRecord } from '../../../src/types/reminder'

/** A card left unanswered this long counts as ignored. */
const IGNORED_AFTER_MS = 3 * 60 * 60_000
/** At most this many "ignored" nudges per agent per day. */
const MAX_IGNORED_PER_DAY = 2
/** Checking in from 30 minutes before to 60 minutes after the shift starts counts as on time. */
const ON_TIME_WINDOW: [number, number] = [-30, 60]
const LINK_TTL_MS = 7 * 86_400_000
/** The shift greeting goes out in the shift's first minutes. */
const GREETING_WINDOW: [number, number] = [0, 45]
/** "Your streak is about to break": this many minutes before the shift ends. */
const STREAK_RISK_WINDOW: [number, number] = [30, 120]
/** Team leads' weekly summary: Monday from this hour (server time). */
const LEADER_SUMMARY_HOUR = 9
/** Kinds the agent answers (cheers Rocky up the first time; card replaced once answered). */
const ANSWERABLE = new Set(['reminder', 'streakrisk', 'test'])

const GREETING_LINES: [string, string][] = [
  ['Rocky’s here and ready. Let’s make every note count today, {name}.', 'gm'],
  ['New shift, clean slate. Who · what · outcome · next step — let’s go.', 'gm'],
  ['Coffee ☕ for you, hay 🌾 for me, clear notes for everyone.', 'hi'],
  ['I stretched, I ate, I’m ready to cheer for your notes. 💪', 'focus'],
  ['Today’s goal: every interaction gets a note. Even the tiny ones.', 'boss'],
  ['Your notes are someone else’s head start today. Let’s make them great.', 'hi'],
  ['Good to see you, {name}! Rocky’s tip of the day is below. 👇', 'gm'],
  ['Shift on. Notes on. Bull on. 🐂', 'boss'],
]
const STREAK_RISK_LINES = [
  'Your {streak}-day streak ends with this shift unless you check in. Close the day with complete notes and let Rocky know. 🔥',
  'Before you log off: last notes complete, next steps written, and a quick check-in so the {streak}-day streak lives on. 🔥',
  '{streak} days in a row — don’t let it end on the last hour. Finish your notes and check in with Rocky. 🙏',
]
export interface TeamsConfig {
  webhookUrl: string | null
  /** The web app (links land here). */
  webUrl: string
  /** This API's public address (card buttons point here). */
  apiUrl: string
  /** Signs the card links. */
  linkSecret: string
}

type Action = 'open' | 'done' | 'learn'
type Go = 'team' | 'kudos'

const b64 = (s: string) => Buffer.from(s).toString('base64url')

export function createTeamsApplicationService({
  persistence,
  pet,
  challenges,
  config,
  clock = systemClock,
  fetchFn = fetch,
  log = console.log,
}: {
  persistence: PersistenceContext
  pet: PetApplicationService
  challenges?: ChallengeApplicationService
  config: TeamsConfig
  clock?: Clock
  fetchFn?: typeof fetch
  log?: (m: string) => void
}) {
  const accounts = persistence.accounts
  const repo = persistence.repoStore
  let lastDispatch: { at: string; due: number; sent: number; error: string | null } | null = null

  /** The agent's shift in server time right now (a US Eastern shift moves with US daylight saving). */
  const localShift = (s: ScheduleRecord, at: Date = clock.now()): AgentSchedule => toLocalSchedule({ days: s.days, start: s.start, end: s.end }, s.timeZone, at)
  const scheduleOf = (agentId: string): AgentSchedule | null => {
    const s = accounts.getSchedules()[agentId]
    return s ? localShift(s) : null
  }

  function nameOf(agentId: string, s?: ScheduleRecord): string {
    const stored = repo.hasAgent(agentId) ? repo.forAgent(agentId).getAgent().name : ''
    return publicName(agentId, stored && stored !== 'Agent' ? stored : (s?.name ?? ''))
  }

  // ---------------------------------------------------------------- links
  function sign(payload: string): string {
    return createHmac('sha256', config.linkSecret).update(payload).digest('base64url')
  }
  /** `go`: where in the app to land (team, kudos). */
  function link(deliveryId: string, agentId: string, action: Action, go?: Go): string {
    const body = b64(JSON.stringify({ d: deliveryId, a: agentId, x: action, e: clock.now().getTime() + LINK_TTL_MS, ...(go ? { g: go } : {}) }))
    return `${config.apiUrl}/api/teams/go?t=${body}.${sign(body)}`
  }
  function readLink(token: string): { d: string; a: string; x: Action; g?: Go } {
    const [body, mac] = token.split('.')
    if (!body || !mac) throw ApiError.forbidden('That link is not valid.')
    const expected = Buffer.from(sign(body))
    const got = Buffer.from(mac)
    if (expected.length !== got.length || !timingSafeEqual(expected, got)) throw ApiError.forbidden('That link is not valid.')
    let data: { d: string; a: string; x: Action; e: number; g?: Go }
    try {
      data = JSON.parse(Buffer.from(body, 'base64url').toString())
    } catch {
      throw ApiError.forbidden('That link is not valid.')
    }
    if (!data.e || data.e < clock.now().getTime()) throw ApiError.forbidden('That link has expired — open Rocky from Teams again.')
    return data
  }

  // ---------------------------------------------------------------- cards
  /** Roast mode (Admin): about half the nudges come with Duolingo-style cheek. On unless turned off. */
  const ROAST_KEY = 'setting:teams-roast'
  const roastOn = () => accounts.getCatalogOverrides()[ROAST_KEY]?.enabled !== false
  /** Team leads' weekly summary (Admin). On unless turned off. */
  const LEADER_KEY = 'setting:teams-leader-summary'
  const leaderSummaryOn = () => accounts.getCatalogOverrides()[LEADER_KEY]?.enabled !== false

  const firstNameOf = (name: string) => name.split(' ')[0] || name
  const recentVoices = (agentId: string) =>
    accounts
      .listDeliveries({ agentId, limit: 20 })
      .map((d) => d.voice)
      .filter((v): v is string => !!v)

  /** What Rocky says on a card: never a line this agent got in their last 20 cards. */
  function voiceOf(agentId: string, reminder: Pick<ReminderRecord, 'category' | 'message'>, name: string): VoiceLine {
    const game = repo.forAgent(agentId).getGameState()
    return voiceFor(
      reminder.category,
      reminder.message,
      { firstName: firstNameOf(name), streak: game.currentStreak, energy: game.energy, level: game.level, checkedInToday: game.lastCheckInDate === todayKey(clock.now()) },
      { roast: roastOn(), avoid: recentVoices(agentId) },
    )
  }

  /** The next note lesson for this agent (none of the last 20 they got); `theme` = this week's focus first. */
  function lessonOf(agentId: string, theme?: NoteLesson['theme']): NoteLesson {
    const recent = accounts
      .listDeliveries({ agentId, limit: 20 })
      .map((d) => d.lesson)
      .filter((l): l is string => !!l)
    return pickLesson(recent, { theme })
  }

  /** A line from a small pool, not the one this agent got last. */
  function lineFrom<T>(pool: T[], text: (t: T) => string, agentId: string): T {
    const seen = recentVoices(agentId)
    const fresh = pool.filter((t) => !seen.includes(text(t)))
    const from = fresh.length ? fresh : pool
    return from[Math.floor(Math.random() * from.length)]!
  }

  const fill = (t: string, first: string, streak: number) => t.replace(/\{name\}/g, first).replace(/\{streak\}/g, String(streak))

  function statusLine(agentId: string, name: string) {
    const game = repo.forAgent(agentId).getGameState()
    return {
      type: 'TextBlock',
      text: `${firstNameOf(name)} · Level ${game.level} · 🔥 ${game.currentStreak} day${game.currentStreak === 1 ? '' : 's'} · ⚡ ${game.energy}`,
      isSubtle: true,
      size: 'Small',
      wrap: true,
      spacing: 'Medium',
    }
  }

  /** Sticker on the left, title and Rocky's words on the right. */
  function header(img: string, title: string, text: string, size = '96px') {
    return {
      type: 'ColumnSet',
      columns: [
        { type: 'Column', width: 'auto', items: [{ type: 'Image', url: img, width: size, altText: 'Rocky sticker' }] },
        {
          type: 'Column',
          width: 'stretch',
          verticalContentAlignment: 'Center',
          items: [
            { type: 'TextBlock', text: title, weight: 'Bolder', size: 'Medium', wrap: true },
            { type: 'TextBlock', text, wrap: true, spacing: 'Small' },
          ],
        },
      ],
    }
  }

  const adaptive = (body: unknown[], actions: unknown[]) => ({
    type: 'AdaptiveCard',
    $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
    version: '1.4',
    msteams: { width: 'Full' },
    body,
    actions,
  })

  const stickerUrl = (agentId: string, sticker: string) => `${config.webUrl}${stickerImage(sticker, repo.forAgent(agentId).getGameState().evolutionStage)}`
  const learnAction = (deliveryId: string, agentId: string) => ({ type: 'Action.OpenUrl', title: '📘 Practice notes', url: link(deliveryId, agentId, 'learn') })
  const openAction = (deliveryId: string, agentId: string, title = '🐂 Open Rocky') => ({ type: 'Action.OpenUrl', title, url: link(deliveryId, agentId, 'open') })
  const doneAction = (deliveryId: string, agentId: string) => ({ type: 'Action.OpenUrl', title: '✅ My notes are done', url: link(deliveryId, agentId, 'done'), style: 'positive' })

  /** A reminder: Rocky's line, then the note lesson. Evolutions and streak milestones get a big celebration card. */
  function card(
    agentId: string,
    deliveryId: string,
    reminder: Pick<ReminderRecord, 'category' | 'message' | 'actionable'>,
    name: string,
    fixed?: VoiceLine,
    lesson?: NoteLesson,
  ) {
    const voice = fixed ?? voiceOf(agentId, reminder, name)
    const les = lesson ?? lessonOf(agentId)
    const img = stickerUrl(agentId, voice.sticker)
    const milestone = reminder.category === 'Celebration' && /evolved|streak milestone/i.test(reminder.message)
    const title =
      reminder.category === 'Celebration'
        ? '🎉 Rocky is celebrating!'
        : reminder.category === 'Recovery'
          ? '💚 Rocky is here for you'
          : reminder.category === 'Streak'
            ? '🔥 Keep the streak alive'
            : '📝 Rocky’s notes check'
    const actions = [...(reminder.actionable ? [doneAction(deliveryId, agentId)] : []), learnAction(deliveryId, agentId), openAction(deliveryId, agentId)]
    const top = milestone
      ? [
          { type: 'Image', url: img, width: '180px', horizontalAlignment: 'Center', altText: 'Rocky sticker' },
          { type: 'TextBlock', text: /evolved/i.test(reminder.message) ? '✨ Milestone: Rocky evolved!' : '🔥 Milestone: streak record!', weight: 'Bolder', size: 'Large', horizontalAlignment: 'Center', wrap: true },
          { type: 'TextBlock', text: voice.text, wrap: true, horizontalAlignment: 'Center', spacing: 'Small' },
          { type: 'TextBlock', text: 'Built one clear note at a time. Keep them coming. 🐂', isSubtle: true, horizontalAlignment: 'Center', wrap: true, spacing: 'Small' },
        ]
      : [header(img, title, voice.text)]
    return adaptive([...top, lessonBlock(les), statusLine(agentId, name)], actions)
  }

  /** What an agent did last week (the 7 days before today). */
  function weekOf(agentId: string, now: Date) {
    const s = accounts.getSchedules()[agentId]
    const days = s ? localShift(s, now).days : [...WORKING_DAYS]
    const window: string[] = []
    for (let i = 1; i <= 7; i++) {
      const d = new Date(now.getTime() - i * 86_400_000)
      if (days.includes(d.getDay())) window.push(todayKey(d))
    }
    const inWindow = new Set(window)
    const events = repo.hasAgent(agentId) ? repo.forAgent(agentId).getEvents() : []
    const checkIns = new Set(events.filter((e) => e.type === 'CHECK_IN' && inWindow.has(e.date)).map((e) => e.date)).size
    const since = todayKey(new Date(now.getTime() - 7 * 86_400_000))
    const qaPasses = events.filter((e) => e.type === 'QA_PASS' && e.date >= since && e.date < todayKey(now)).length
    const from = new Date(now.getTime() - 7 * 86_400_000).toISOString()
    const cards = accounts.listDeliveries({ agentId, since: from, limit: 500 }).filter((d) => d.ok && (d.kind === 'reminder' || d.kind === 'streakrisk') && d.sentAt < now.toISOString())
    const kudos = accounts.listKudos({ toId: agentId, since: from, limit: 100 }).length
    // "Could use a hand": no check-in over their last 3 shift days.
    const lastThree = window.slice(0, 3)
    const quiet = lastThree.length === 3 && !lastThree.some((d) => events.some((e) => e.type === 'CHECK_IN' && e.date === d))
    return {
      shiftDays: window.length,
      checkIns,
      cards: cards.length,
      answered: cards.filter((d) => d.openedAt || d.actedAt).length,
      notesDone: cards.filter((d) => d.actedAt).length,
      kudos,
      qaPasses,
      quiet,
    }
  }

  function activeChallenge(agentId: string) {
    try {
      return challenges?.mine(agentId).find((c) => c.status === 'active') ?? null
    } catch {
      return null
    }
  }

  /** Start of the shift: hello, today's focus lesson and the checklist (plus last week's summary on the first shift day of the week). */
  function greetingCard(agentId: string, deliveryId: string, name: string, lesson: NoteLesson, weekly: boolean, line: [string, string]) {
    const game = repo.forAgent(agentId).getGameState()
    const first = firstNameOf(name)
    const now = clock.now()
    const theme = weekTheme(now)
    const body: unknown[] = [header(stickerUrl(agentId, line[1]), weekly ? `📅 New week, ${first}!` : `☀️ Good shift, ${first}!`, fill(line[0], first, game.currentStreak))]
    if (weekly) {
      const w = weekOf(agentId, now)
      const facts = [
        { title: 'Check-ins', value: `${w.checkIns} of ${w.shiftDays} shift days` },
        { title: 'Rocky cards answered', value: w.cards ? `${w.answered} of ${w.cards}` : '—' },
        { title: 'Notes confirmed', value: String(w.notesDone) },
        ...(w.kudos ? [{ title: 'Kudos received', value: `🙌 ${w.kudos}` }] : []),
        ...(w.qaPasses ? [{ title: 'QA passes', value: `✅ ${w.qaPasses}` }] : []),
        { title: 'Streak · Level', value: `🔥 ${game.currentStreak} · Level ${game.level}` },
      ]
      body.push({
        type: 'Container',
        spacing: 'Medium',
        items: [
          { type: 'TextBlock', text: '📊 Your last week with Rocky', weight: 'Bolder', wrap: true },
          { type: 'FactSet', facts },
          { type: 'TextBlock', text: `This week’s note focus: ${THEME_ICON[theme]} **${THEME_LABEL[theme]}** — one lesson a day in these cards.`, wrap: true, spacing: 'Small' },
        ],
      })
    }
    body.push(lessonBlock(lesson, `Today’s focus · ${THEME_LABEL[lesson.theme]}`), checklistBlock())
    const ch = activeChallenge(agentId)
    if (ch)
      body.push({
        type: 'TextBlock',
        text: `🏆 Team challenge “${ch.title}”: **${ch.score}%** (goal ${ch.target}%)`,
        wrap: true,
        spacing: 'Medium',
      })
    body.push(statusLine(agentId, name))
    return adaptive(body, [openAction(deliveryId, agentId, '🐂 Say hi to Rocky'), learnAction(deliveryId, agentId)])
  }

  /** Near the end of the shift, a streak that would break: finish the notes and check in. */
  function streakRiskCard(agentId: string, deliveryId: string, name: string, lesson: NoteLesson, text: string, streak = repo.forAgent(agentId).getGameState().currentStreak) {
    return adaptive(
      [header(stickerUrl(agentId, 'fire'), `🔥 Your ${streak}-day streak ends with this shift`, text), lessonBlock(lesson, `Before you log off · ${THEME_LABEL[lesson.theme]}`), statusLine(agentId, name)],
      [doneAction(deliveryId, agentId), learnAction(deliveryId, agentId), openAction(deliveryId, agentId)],
    )
  }

  /** Teammates' thank-yous since the last kudos card. */
  function kudosCard(agentId: string, deliveryId: string, name: string, items: { from: string; tag: string; message: string | null }[]) {
    const who = items.length === 1 ? items[0]!.from : `${items.length} teammates`
    const lines = items.map((k) => {
      const t = KUDOS_TAGS[k.tag] ?? { emoji: '🙌', label: 'Kudos' }
      return `${t.emoji} **${t.label}** — from ${k.from}${k.message ? `: “${k.message}”` : ''}`
    })
    const tip = items.some((k) => k.tag === 'great-note')
      ? 'Great notes get noticed — by your team, by QA and by the next agent who opens the account. 📝'
      : `Rocky’s tip: ${NOTE_TIPS[Math.floor(Math.random() * NOTE_TIPS.length)]}`
    return adaptive(
      [
        header(stickerUrl(agentId, 'love'), `🙌 ${who} sent you kudos!`, `Nice one, ${firstNameOf(name)}. Rocky got a little happier (+4 ❤️ and 3 coins each).`),
        { type: 'TextBlock', text: lines.join('\n\n'), wrap: true, spacing: 'Medium' },
        { type: 'TextBlock', text: tip, wrap: true, isSubtle: true, spacing: 'Medium' },
      ],
      [{ type: 'Action.OpenUrl', title: '🙌 Send kudos back', url: link(deliveryId, agentId, 'open', 'kudos') }, openAction(deliveryId, agentId)],
    )
  }

  /** The members of a team lead's team (from Admin → Personas / the roster import). */
  const teamOf = (leaderId: string) =>
    Object.entries(accounts.getTeams())
      .filter(([m, l]) => l === leaderId && m !== leaderId)
      .map(([m]) => m)
  const leadersWithTeams = () => [...new Set(Object.values(accounts.getTeams()))].filter((l) => teamOf(l).length > 0)

  /** A team lead's week: every member's check-ins, cards and kudos, and who could use a hand. */
  function leaderCard(leaderId: string, deliveryId: string) {
    const now = clock.now()
    const members = teamOf(leaderId)
      .map((id) => ({ id, name: nameOf(id, accounts.getSchedules()[id]), game: repo.hasAgent(id) ? repo.forAgent(id).getGameState() : null, w: weekOf(id, now) }))
      .sort((a, b) => a.name.localeCompare(b.name))
    const sum = (f: (w: ReturnType<typeof weekOf>) => number) => members.reduce((n, m) => n + f(m.w), 0)
    const shiftDays = sum((w) => w.shiftDays)
    const cards = sum((w) => w.cards)
    const pct = (a: number, b: number) => (b ? `${Math.round((100 * a) / b)}%` : '—')
    const mood = (m: string | undefined) => (m === 'Happy' ? '😄' : m === 'Worried' ? '😟' : m === 'Recovery' ? '💚' : '🙂')
    const theme = weekTheme(now)
    const lesson = pickLesson([], { theme })
    const row = (cells: string[], bold = false) => ({
      type: 'ColumnSet',
      spacing: 'Small',
      columns: cells.map((c, i) => ({ type: 'Column', width: i === 0 ? 'stretch' : ['40px', '72px', '56px', '48px'][i - 1], items: [{ type: 'TextBlock', text: c, size: 'Small', weight: bold ? 'Bolder' : 'Default', wrap: true, horizontalAlignment: i === 0 ? 'Left' : 'Right' }] })),
    })
    const quiet = members.filter((m) => m.w.quiet).map((m) => m.name)
    const ch = activeChallenge(leaderId)
    const teamName = `${firstNameOf(nameOf(leaderId, accounts.getSchedules()[leaderId]))}’s team`
    return adaptive(
      [
        header(`${config.webUrl}${stickerImage('boss', 'Elite')}`, `📊 ${teamName} — last week with Rocky`, `${members.length} ${members.length === 1 ? 'person' : 'people'} · the 7 days before today. Here’s how the note habit is going.`, '80px'),
        {
          type: 'FactSet',
          spacing: 'Medium',
          facts: [
            { title: 'Check-in rate', value: `${pct(sum((w) => w.checkIns), shiftDays)} (${sum((w) => w.checkIns)} of ${shiftDays} shift days)` },
            { title: 'Rocky cards answered', value: `${pct(sum((w) => w.answered), cards)} (${sum((w) => w.answered)} of ${cards})` },
            { title: 'Notes confirmed from Teams', value: String(sum((w) => w.notesDone)) },
            { title: 'Kudos received', value: `🙌 ${sum((w) => w.kudos)}` },
            ...(ch ? [{ title: 'Team challenge', value: `${ch.title}: ${ch.score}% (goal ${ch.target}%)` }] : []),
          ],
        },
        { type: 'Container', style: 'emphasis', spacing: 'Medium', items: [row(['Agent', '🔥', 'Check-ins', 'Cards', 'Rocky'], true), ...members.map((m) => row([m.name, String(m.game?.currentStreak ?? 0), `${m.w.checkIns}/${m.w.shiftDays}`, m.w.cards ? `${m.w.answered}/${m.w.cards}` : '—', mood(m.game?.mood)]))] },
        ...(quiet.length
          ? [{ type: 'TextBlock', text: `🤝 **Could use a hand:** ${quiet.join(', ')} — no check-in in their last 3 shift days. A quick hello goes a long way.`, wrap: true, spacing: 'Medium' }]
          : [{ type: 'TextBlock', text: '💪 Everyone checked in during their last 3 shift days. Nice!', wrap: true, spacing: 'Medium' }]),
        lessonBlock(lesson, `For your huddle · this week’s focus: ${THEME_LABEL[theme]}`),
      ],
      [{ type: 'Action.OpenUrl', title: '👥 Open my team in Rocky', url: link(deliveryId, leaderId, 'open', 'team') }],
    )
  }

  function newDelivery(agentId: string, kind: string, reminder: ReminderRecord | null): DeliveryRecord {
    return {
      id: randomBytes(9).toString('base64url'),
      agentId,
      reminderId: reminder?.id ?? null,
      kind,
      category: reminder?.category ?? null,
      sentAt: clock.now().toISOString(),
      ok: false,
      error: null,
      openedAt: null,
      actedAt: null,
      ignoredAt: null,
    }
  }

  /**
   * The answered/expired version of a card: same sticker style, no buttons
   * to click again. Sent as an "update" the flow applies to the original
   * message (it keeps each card's message ID in a SharePoint list).
   */
  function finalCard(d: DeliveryRecord) {
    const game = repo.forAgent(d.agentId).getGameState()
    const first = nameOf(d.agentId, accounts.getSchedules()[d.agentId]).split(' ')[0]
    const [title, text, sticker] = d.actedAt
      ? [`✅ Notes done — thanks, ${first}!`, 'Rocky is proud of you. Keep them coming! 🐂', 'gotit']
      : d.openedAt
        ? ['👀 You checked in with Rocky', 'He saw you. He’s happy. That’s the whole message. 💚', 'hi']
        : ['⌛ This reminder expired', 'No worries — Rocky will be back later. 😉', 'tired']
    // The lesson stays in the chat after the buttons go: the card keeps teaching.
    const lesson = findLesson(d.lesson)
    return {
      type: 'AdaptiveCard',
      $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
      version: '1.4',
      msteams: { width: 'Full' },
      body: [
        {
          type: 'ColumnSet',
          columns: [
            { type: 'Column', width: 'auto', items: [{ type: 'Image', url: `${config.webUrl}${stickerImage(sticker, game.evolutionStage)}`, width: '72px', altText: 'Rocky sticker' }] },
            {
              type: 'Column',
              width: 'stretch',
              verticalContentAlignment: 'Center',
              items: [
                { type: 'TextBlock', text: title, weight: 'Bolder', wrap: true },
                { type: 'TextBlock', text, wrap: true, spacing: 'Small', isSubtle: true },
              ],
            },
          ],
        },
        ...(lesson ? [lessonBlock(lesson)] : []),
      ],
      actions: [{ type: 'Action.OpenUrl', title: '🐂 Open Rocky', url: `${config.webUrl}/?${new URLSearchParams({ agente: d.agentId })}` }],
    }
  }

  /** Cards answered or expired in the last week whose Teams message still shows the buttons. */
  function pendingUpdates(now: Date) {
    return accounts
      .listDeliveries({ since: new Date(now.getTime() - 7 * 86_400_000).toISOString(), limit: 5000 })
      .filter((d) => d.ok && ANSWERABLE.has(d.kind) && !d.cardUpdatedAt && (d.actedAt || d.openedAt || d.ignoredAt))
      .slice(0, 200)
  }

  async function post(
    items: { email: string; name: string; deliveryId: string; kind: string; category: string | null; message: string; card: unknown }[],
    updates: DeliveryRecord[] = [],
  ) {
    if (!config.webhookUrl) return { ok: false, error: 'Teams webhook not configured (ROCKY_TEAMS_WEBHOOK_URL).' }
    try {
      const res = await fetchFn(config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'rocky.cards',
          sentAt: clock.now().toISOString(),
          count: items.length,
          cards: items,
          updates: updates.map((d) => ({ deliveryId: d.id, email: d.agentId, card: finalCard(d) })),
        }),
      })
      if (res.ok) for (const d of updates) accounts.updateDelivery(d.id, { cardUpdatedAt: clock.now().toISOString() })
      return res.ok ? { ok: true, error: null } : { ok: false, error: `Teams answered ${res.status}` }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) }
    }
  }

  // ---------------------------------------------------------------- effects
  function penalizeIgnored(now: Date) {
    const cutoff = new Date(now.getTime() - IGNORED_AFTER_MS).toISOString()
    const today = todayKey(now)
    const recent = accounts.listDeliveries({ since: new Date(now.getTime() - 86_400_000).toISOString(), limit: 5000 })
    for (const d of recent) {
      if ((d.kind !== 'reminder' && d.kind !== 'streakrisk') || !d.ok || d.openedAt || d.actedAt || d.ignoredAt || d.sentAt > cutoff) continue
      accounts.updateDelivery(d.id, { ignoredAt: now.toISOString() })
      // The streak card only expires (its own consequence is the streak).
      if (d.kind !== 'reminder') continue
      const ignoredToday = recent.filter((x) => x.agentId === d.agentId && x.kind === 'reminder' && x.ignoredAt && todayKey(new Date(x.ignoredAt)) === today).length
      if (ignoredToday >= MAX_IGNORED_PER_DAY) continue
      try {
        pet.teamsEffect(d.agentId, 'ignored', 'A Rocky card in Teams went unanswered')
      } catch {
        // agent not in Rocky yet — nothing to change
      }
    }
  }

  return {
    scheduleOf,
    webUrl: config.webUrl,

    configured: () => Boolean(config.webhookUrl),

    roast: roastOn,
    setRoast(on: boolean, actorId: string) {
      accounts.setCatalogOverride(ROAST_KEY, { price: null, enabled: on }, actorId, clock.now().toISOString())
      accounts.addAudit({ agentId: null, actor: actorId, action: 'admin.teams.roast', detail: { on }, source: null, createdAt: clock.now().toISOString() })
      return { roast: on }
    },

    /** Checks every rostered agent and sends the due cards (one webhook call). */
    async dispatch(): Promise<{ due: number; sent: number; error: string | null }> {
      const now = clock.now()
      penalizeIgnored(now)
      if (!config.webhookUrl) return { due: 0, sent: 0, error: 'not-configured' }
      const today = todayKey(now)
      const items: Parameters<typeof post>[0] = []
      const deliveries: DeliveryRecord[] = []
      const kudosSent: number[] = []
      const queue = (d: DeliveryRecord, name: string, message: string, c: unknown) => {
        deliveries.push(d)
        items.push({ email: d.agentId, name, deliveryId: d.id, kind: d.kind, category: d.category, message, card: c })
      }
      for (const [agentId, s] of Object.entries(accounts.getSchedules())) {
        // SharePoint "Active" = No: the shift still counts in the app, but no cards in Teams.
        if (!s.teams) continue
        const local = localShift(s, now)
        const shift = { workingDays: local.days, workingStartTime: local.start, workingEndTime: local.end }
        // Everyone on the roster gets Rocky, even before they first open the app.
        if (!repo.hasAgent(agentId)) {
          const r = repo.forAgent(agentId)
          if (s.name) r.saveAgent({ ...r.getAgent(), name: s.name })
        }
        const into = minutesIntoShift(local, now)
        if (into === null) continue
        const [eh, em] = local.end.split(':').map(Number) as [number, number]
        const [sh, sm] = local.start.split(':').map(Number) as [number, number]
        const untilEnd = eh * 60 + em - (sh * 60 + sm) - into
        if (untilEnd <= 0) continue
        const name = nameOf(agentId, s)
        const first = firstNameOf(name)
        const game = repo.forAgent(agentId).getGameState()
        const todays = accounts.listDeliveries({ agentId, since: new Date(now.getTime() - 86_400_000).toISOString(), limit: 100 }).filter((d) => todayKey(new Date(d.sentAt)) === today)

        // 1) The shift greeting (an extra card, not one of the 3 reminders).
        if (into >= GREETING_WINDOW[0] && into <= GREETING_WINDOW[1] && !todays.some((d) => d.kind === 'greeting' || d.kind === 'weekly')) {
          const monIdx = (now.getDay() + 6) % 7
          const weekly = !local.days.some((d) => (d + 6) % 7 < monIdx)
          const lesson = lessonOf(agentId, weekTheme(now))
          const line = lineFrom(GREETING_LINES, (l) => fill(l[0], first, game.currentStreak), agentId)
          const d = newDelivery(agentId, weekly ? 'weekly' : 'greeting', null)
          d.voice = fill(line[0], first, game.currentStreak)
          d.lesson = lesson.id
          queue(d, name, d.voice, greetingCard(agentId, d.id, name, lesson, weekly, line))
          continue
        }

        // 2) Teammates' kudos (extra), batched into one card.
        const kudos = accounts.listKudos({ toId: agentId, undelivered: true, limit: 10 })
        if (kudos.length) {
          const d = newDelivery(agentId, 'kudos', null)
          const c = kudosCard(agentId, d.id, name, kudos.map((k) => ({ from: nameOf(k.fromId), tag: k.tag, message: k.message })).reverse())
          kudosSent.push(...kudos.map((k) => k.id))
          queue(d, name, `${kudos.length} kudos`, c)
          continue
        }

        // 3) A streak about to break at the end of the shift (counts as one of the day's reminders).
        const remindersToday = todays.filter((d) => d.kind === 'reminder' || d.kind === 'streakrisk').length
        if (
          untilEnd >= STREAK_RISK_WINDOW[0] &&
          untilEnd <= STREAK_RISK_WINDOW[1] &&
          game.currentStreak >= 2 &&
          game.lastCheckInDate !== today &&
          remindersToday < MAX_DAILY_REMINDERS &&
          !todays.some((d) => d.kind === 'streakrisk')
        ) {
          const text = fill(lineFrom(STREAK_RISK_LINES, (l) => fill(l, first, game.currentStreak), agentId), first, game.currentStreak)
          const reminder: ReminderRecord = { id: `teams-streak-${randomBytes(6).toString('hex')}`, category: 'Streak', message: text, timestamp: now.toISOString(), status: 'sent', actionable: true }
          // In the agent's reminder history too, so the engine's daily cap and cooldown see it.
          persistence.withTransaction(() => repo.forAgent(agentId).saveReminder(reminder))
          const lesson = lessonOf(agentId)
          const d = newDelivery(agentId, 'streakrisk', reminder)
          d.voice = text
          d.lesson = lesson.id
          queue(d, name, text, streakRiskCard(agentId, d.id, name, lesson, text))
          continue
        }

        // 4) The reminder engine's nudge (cooldowns, 3 a day, priorities) —
        //    not right on the heels of a greeting or kudos card.
        const last = todays[0]
        if (last && last.kind !== 'reminder' && now.getTime() - new Date(last.sentAt).getTime() < 45 * 60_000) continue
        const reminder = persistence.withTransaction(() => checkForReminder(repo.forAgent(agentId), now, shift))
        if (!reminder) continue
        const d = newDelivery(agentId, 'reminder', reminder)
        const voice = voiceOf(agentId, reminder, name)
        const lesson = lessonOf(agentId)
        d.voice = voice.text
        d.lesson = lesson.id
        queue(d, name, reminder.message, card(agentId, d.id, reminder, name, voice, lesson))
      }

      // Team leads' weekly summary: Monday morning, once a week.
      if (leaderSummaryOn() && now.getDay() === 1 && now.getHours() >= LEADER_SUMMARY_HOUR) {
        const weekAgo = new Date(now.getTime() - 5 * 86_400_000).toISOString()
        for (const leaderId of leadersWithTeams()) {
          if (accounts.listDeliveries({ agentId: leaderId, since: weekAgo, limit: 50 }).some((d) => d.kind === 'leader' && d.ok)) continue
          const d = newDelivery(leaderId, 'leader', null)
          queue(d, nameOf(leaderId, accounts.getSchedules()[leaderId]), 'Weekly team summary', leaderCard(leaderId, d.id))
        }
      }

      const updates = pendingUpdates(now)
      if (items.length === 0) {
        if (updates.length) await post([], updates)
        lastDispatch = { at: now.toISOString(), due: 0, sent: 0, error: null }
        return { due: 0, sent: 0, error: null }
      }
      const result = await post(items, updates)
      for (const d of deliveries) accounts.addDelivery({ ...d, ok: result.ok, error: result.error })
      if (result.ok && kudosSent.length) accounts.markKudosDelivered(kudosSent, now.toISOString())
      lastDispatch = { at: now.toISOString(), due: items.length, sent: result.ok ? items.length : 0, error: result.error }
      log(`[rocky-backend] teams: ${items.length} card(s) ${result.ok ? 'sent' : `NOT sent (${result.error})`}`)
      return { due: items.length, sent: result.ok ? items.length : 0, error: result.error }
    },

    leaderSummary: leaderSummaryOn,
    setLeaderSummary(on: boolean, actorId: string) {
      accounts.setCatalogOverride(LEADER_KEY, { price: null, enabled: on }, actorId, clock.now().toISOString())
      accounts.addAudit({ agentId: null, actor: actorId, action: 'admin.teams.leader-summary', detail: { on }, source: null, createdAt: clock.now().toISOString() })
      return { leaderSummary: on }
    },

    /** Sends every team lead their weekly summary now (Admin). */
    async sendLeaderSummaries() {
      const now = clock.now()
      const leaders = leadersWithTeams()
      if (!leaders.length) return { ok: false, sent: 0, error: 'No team leads with a team yet (Admin → Personas).' }
      const ds = leaders.map((id) => newDelivery(id, 'leader', null))
      const result = await post(ds.map((d) => ({ email: d.agentId, name: nameOf(d.agentId, accounts.getSchedules()[d.agentId]), deliveryId: d.id, kind: 'leader', category: null, message: 'Weekly team summary', card: leaderCard(d.agentId, d.id) })))
      for (const d of ds) accounts.addDelivery({ ...d, ok: result.ok, error: result.error, sentAt: now.toISOString() })
      return { ...result, sent: result.ok ? ds.length : 0 }
    },

    /** A test card to one person (Admin → Teams). */
    async sendTest(agentId: string) {
      const reminder: ReminderRecord = {
        id: `test-${Date.now()}`,
        category: 'Documentation',
        message: 'This is a test from Rocky: if you can read this in Teams, the connection works! 🐂',
        timestamp: clock.now().toISOString(),
        status: 'sent',
        actionable: true,
      }
      const d = newDelivery(agentId, 'test', null)
      const name = nameOf(agentId, accounts.getSchedules()[agentId])
      const voice = { text: `Hi ${name.split(' ')[0]}! This is a test from Rocky: if you can read this in Teams, we’re connected. Now go write a great note. 🐂`, sticker: 'hi' }
      const lesson = lessonOf(agentId)
      const result = await post([{ email: agentId, name, deliveryId: d.id, kind: 'test', category: 'Documentation', message: voice.text, card: card(agentId, d.id, reminder, name, voice, lesson) }])
      accounts.addDelivery({ ...d, category: 'Documentation', ok: result.ok, error: result.error, lesson: lesson.id })
      return result
    },

    /** A card as it would look for an agent (Admin preview / flow setup). */
    preview(agentId: string, kind: string = 'reminder') {
      const name = nameOf(agentId, accounts.getSchedules()[agentId])
      const game = repo.forAgent(agentId).getGameState()
      const first = firstNameOf(name)
      switch (kind) {
        case 'greeting':
        case 'weekly':
          return greetingCard(agentId, 'preview', name, lessonOf(agentId, weekTheme(clock.now())), kind === 'weekly', GREETING_LINES[0]!)
        case 'streakrisk':
          return streakRiskCard(agentId, 'preview', name, lessonOf(agentId), fill(STREAK_RISK_LINES[0]!, first, Math.max(2, game.currentStreak)), Math.max(2, game.currentStreak))
        case 'milestone':
          return card(agentId, 'preview', { category: 'Celebration', message: `✨ Rocky evolved into ${game.evolutionStage} Rocky!`, actionable: false }, name)
        case 'kudos':
          return kudosCard(agentId, 'preview', name, [
            { from: 'Ana', tag: 'great-note', message: 'Your note on that claim saved me 10 minutes!' },
            { from: 'Luis', tag: 'helped', message: null },
          ])
        case 'leader':
          return leaderCard(agentId, 'preview')
        default:
          return card(agentId, 'preview', { category: 'Documentation', message: 'Did you leave a clear note after your last interaction? Rocky is counting on you! 📝', actionable: true }, name)
      }
    },

    /** A card button was clicked: record it, let Rocky react, and say where to send the agent. */
    follow(token: string): string {
      const { d: deliveryId, a: agentId, x: action, g: go } = readLink(token)
      const d = accounts.getDelivery(deliveryId)
      const now = clock.now()
      const first = d && !d.openedAt && !d.actedAt
      if (d) {
        accounts.updateDelivery(deliveryId, action === 'done' ? { openedAt: now.toISOString(), actedAt: now.toISOString() } : { openedAt: now.toISOString() })
        if (d.reminderId && repo.hasAgent(agentId)) {
          const r = repo.forAgent(agentId)
          try {
            if (action === 'done') markReminderActed(d.reminderId, r)
            else markReminderOpened(d.reminderId, r)
          } catch {
            // the reminder may have been purged; the click still counts
          }
        }
        // Answering a card (the first time, before it went stale) cheers Rocky up.
        if (first && !d.ignoredAt && (d.kind === 'reminder' || d.kind === 'streakrisk') && repo.hasAgent(agentId)) {
          try {
            pet.teamsEffect(agentId, 'acted', action === 'done' ? 'Confirmed notes from a Teams card' : 'Opened Rocky from a Teams card')
          } catch {
            // nothing to change
          }
        }
      }
      // Swap the card in Teams for its "done" version right away (not on the next 5-minute round).
      if (d && config.webhookUrl) void post([], pendingUpdates(now).filter((x) => x.id === deliveryId))
      const q = new URLSearchParams({ agente: agentId, from: 'teams', teams: action === 'done' ? 'done' : 'open' })
      // "Practice notes" lands on the Note Check game; kudos and team cards on their screens.
      const target = action === 'learn' ? 'notes' : go
      if (target) q.set('go', target)
      return `${config.webUrl}/?${q}`
    },

    /** After a real check-in: on time for the shift → a small bonus (once a day). */
    onCheckIn(agentId: string) {
      const shift = scheduleOf(agentId)
      const now = clock.now()
      if (!shift) return
      const into = minutesIntoShift(shift, now)
      if (into === null || into < ON_TIME_WINDOW[0] || into > ON_TIME_WINDOW[1]) return
      const today = todayKey(now)
      const already = accounts.listDeliveries({ agentId, since: new Date(now.getTime() - 86_400_000).toISOString() }).some((d) => d.kind === 'ontime' && todayKey(new Date(d.sentAt)) === today)
      if (already) return
      accounts.addDelivery({ ...newDelivery(agentId, 'ontime', null), ok: true })
      try {
        pet.teamsEffect(agentId, 'ontime', 'On-time check-in for the shift')
      } catch {
        // nothing to change
      }
    },

    // ------------------------------------------------------------ roster
    schedules() {
      const all = accounts.getSchedules()
      return Object.values(all)
        .map((s) => ({ ...s, name: nameOf(s.agentId, s), signedUp: repo.hasAgent(s.agentId), leader: accounts.getTeams()[s.agentId] ?? null, local: s.timeZone ? localShift(s) : null }))
        .sort((a, b) => a.name.localeCompare(b.name))
    },

    setSchedule(
      agentId: string,
      s: (AgentSchedule & { timeZone?: string | null; teams?: boolean }) | null,
      actorId: string,
      name?: string | null,
    ) {
      const email = agentId.trim().toLowerCase()
      if (s && !validSchedule(s)) throw ApiError.validation('Pick at least one day, and an end time after the start time.')
      if (s?.timeZone && !validTimeZone(s.timeZone)) throw ApiError.validation('Unknown time zone.')
      const before = accounts.getSchedules()[email]
      accounts.setSchedule(
        email,
        s
          ? {
              days: s.days,
              start: s.start,
              end: s.end,
              timeZone: s.timeZone === undefined ? (before?.timeZone ?? null) : s.timeZone,
              teams: s.teams ?? before?.teams ?? true,
              name: name ?? before?.name ?? null,
              source: 'admin',
              updatedAt: clock.now().toISOString(),
              updatedBy: actorId,
            }
          : null,
      )
      accounts.addAudit({ agentId: email, actor: actorId, action: 'admin.schedule', detail: { schedule: s }, source: null, createdAt: clock.now().toISOString() })
    },

    /** Teams cards on/off for several agents at once (or everyone on the roster). */
    setTeamsFor(ids: string[] | 'all', on: boolean, actorId: string) {
      const all = accounts.getSchedules()
      const targets = ids === 'all' ? Object.keys(all) : ids.map((i) => i.trim().toLowerCase()).filter((i) => all[i])
      const at = clock.now().toISOString()
      persistence.withTransaction(() => {
        for (const id of targets) if (all[id]!.teams !== on) accounts.setSchedule(id, { ...all[id]!, teams: on, updatedAt: at, updatedBy: actorId })
      })
      accounts.addAudit({ agentId: null, actor: actorId, action: 'admin.teams.enabled', detail: { on, count: targets.length, all: ids === 'all' }, source: null, createdAt: at })
      return { changed: targets.length }
    },

    /**
     * Applies the rows of a pasted roster (only the usable ones). Rows with no
     * email (a "Name / Schedule" list) are matched by name to the roster
     * already in Rocky; a leader given by name is matched to a person too.
     */
    importRoster(
      rows: RosterRow[],
      actorId: string,
      opts: { removeMissing: boolean; defaultSchedule?: AgentSchedule | null; timeZone?: string | null },
    ) {
      if (opts.defaultSchedule && !validSchedule(opts.defaultSchedule)) throw ApiError.validation('The default shift needs at least one day and an end time after the start time.')
      if (opts.timeZone && !validTimeZone(opts.timeZone)) throw ApiError.validation('Unknown time zone.')
      const at = clock.now().toISOString()
      let schedules = 0
      let leaders = 0
      let matchedByName = 0
      const unmatched: string[] = []
      const unmatchedLeaders = new Set<string>()
      const seen = new Set<string>()
      const existing = accounts.getSchedules()
      // Everyone Rocky can name: the roster (existing + this paste) and people who opened the app.
      const people = new Map<string, string>()
      for (const id of repo.listAgentIds()) people.set(id, nameOf(id))
      for (const s of Object.values(existing)) if (s.name) people.set(s.agentId, s.name)
      for (const r of rows) if (r.email && r.name) people.set(r.email, r.name)
      const byName = [...people].map(([email, name]) => ({ email, name }))
      const leaderFor = (name: string): string | null => {
        const titled = Object.entries(accounts.getTitles())
          .filter(([, t]) => t === 'leader')
          .map(([email]) => ({ email, name: people.get(email) ?? nameOf(email) }))
        const hit = matchByName(name, titled) ?? titled.find((p) => emailFitsName(p.email, name)) ?? matchByName(name, byName)
        if (hit) return hit.email
        const guess = [...people.keys(), ...Object.keys(accounts.getTitles())].find((email) => emailFitsName(email, name))
        return guess ?? null
      }
      persistence.withTransaction(() => {
        for (const r of rows) {
          let email = r.email
          if (!email && r.name) {
            email = matchByName(r.name, byName)?.email ?? ''
            if (!email) {
              unmatched.push(r.name)
              continue
            }
            matchedByName++
          }
          // Invalid email or unreadable shift: left out.
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || r.problem) continue
          seen.add(email)
          const before = accounts.getSchedules()[email]
          const schedule = r.schedule ?? opts.defaultSchedule ?? null
          if (schedule) {
            accounts.setSchedule(email, {
              ...schedule,
              name: r.name ?? before?.name ?? null,
              timeZone: r.timeZone ?? opts.timeZone ?? null,
              teams: r.active ?? before?.teams ?? true,
              source: 'import',
              updatedAt: at,
              updatedBy: actorId,
            })
            schedules++
          } else if (before && typeof r.active === 'boolean' && before.teams !== r.active) {
            accounts.setSchedule(email, { ...before, teams: r.active, updatedAt: at, updatedBy: actorId })
          }
          const leader = r.leader ?? (r.leaderName ? leaderFor(r.leaderName) : null)
          if (r.leaderName && !leader) unmatchedLeaders.add(r.leaderName)
          if (leader && leader !== email) {
            if (!accounts.getTitles()[leader]) accounts.setTitle(leader, 'leader', actorId, at)
            if (accounts.getTitles()[leader] === 'leader') {
              accounts.setLeader(email, leader, actorId, at)
              leaders++
            }
          }
        }
        if (opts.removeMissing) for (const id of Object.keys(accounts.getSchedules())) if (!seen.has(id)) accounts.setSchedule(id, null)
      })
      accounts.addAudit({
        agentId: null,
        actor: actorId,
        action: 'admin.roster.import',
        detail: { rows: rows.length, schedules, leaders, matchedByName, unmatched, removeMissing: opts.removeMissing, defaultSchedule: opts.defaultSchedule ?? null, timeZone: opts.timeZone ?? null },
        source: null,
        createdAt: at,
      })
      return { schedules, leaders, matchedByName, unmatched, unmatchedLeaders: [...unmatchedLeaders] }
    },

    status() {
      const since = new Date(clock.now().getTime() - 86_400_000).toISOString()
      const recent = accounts.listDeliveries({ since, limit: 5000 }).filter((d) => d.kind === 'reminder')
      let host: string | null = null
      try {
        host = config.webhookUrl ? new URL(config.webhookUrl).host : null
      } catch {
        host = 'invalid URL'
      }
      return {
        configured: Boolean(config.webhookUrl),
        roast: roastOn(),
        leaderSummary: leaderSummaryOn(),
        leaders: leadersWithTeams().length,
        webhookHost: host,
        roster: Object.keys(accounts.getSchedules()).length,
        teamsOn: Object.values(accounts.getSchedules()).filter((s) => s.teams).length,
        lastDispatch,
        last24h: {
          byKind: accounts
            .listDeliveries({ since, limit: 5000 })
            .filter((d) => d.ok)
            .reduce<Record<string, number>>((m, d) => ((m[d.kind] = (m[d.kind] ?? 0) + 1), m), {}),
          sent: recent.filter((d) => d.ok).length,
          failed: recent.filter((d) => !d.ok).length,
          opened: recent.filter((d) => d.openedAt).length,
          done: recent.filter((d) => d.actedAt).length,
          ignored: recent.filter((d) => d.ignoredAt).length,
        },
        recent: accounts
          .listDeliveries({ limit: 40 })
          .map((d) => ({ ...d, name: nameOf(d.agentId, accounts.getSchedules()[d.agentId]) })),
      }
    },
  }
}

export type TeamsApplicationService = ReturnType<typeof createTeamsApplicationService>
