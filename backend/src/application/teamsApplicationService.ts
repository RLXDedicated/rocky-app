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
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { ApiError } from '../api/errors'
import type { PersistenceContext } from '../infrastructure/persistenceContext'
import type { DeliveryRecord, ScheduleRecord } from '../infrastructure/accounts/AccountStore'
import { checkForReminder, markReminderActed, markReminderOpened, systemClock, todayKey, type Clock } from '../domain/rockyEngine'
import { emailFitsName, matchByName, minutesIntoShift, toLocalSchedule, validSchedule, validTimeZone, type AgentSchedule, type RosterRow } from '../../../src/game/schedule'
import { publicName } from './leaderboardApplicationService'
import { stickerImage, voiceFor, type VoiceLine } from '../../../src/engine/rockyVoice'
import type { PetApplicationService } from './petApplicationService'
import type { ReminderRecord } from '../../../src/types/reminder'

/** A card left unanswered this long counts as ignored. */
const IGNORED_AFTER_MS = 3 * 60 * 60_000
/** At most this many "ignored" nudges per agent per day. */
const MAX_IGNORED_PER_DAY = 2
/** Checking in from 30 minutes before to 60 minutes after the shift starts counts as on time. */
const ON_TIME_WINDOW: [number, number] = [-30, 60]
const LINK_TTL_MS = 7 * 86_400_000

export interface TeamsConfig {
  webhookUrl: string | null
  /** The web app (links land here). */
  webUrl: string
  /** This API's public address (card buttons point here). */
  apiUrl: string
  /** Signs the card links. */
  linkSecret: string
}

type Action = 'open' | 'done'

const b64 = (s: string) => Buffer.from(s).toString('base64url')

export function createTeamsApplicationService({
  persistence,
  pet,
  config,
  clock = systemClock,
  fetchFn = fetch,
  log = console.log,
}: {
  persistence: PersistenceContext
  pet: PetApplicationService
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
  function link(deliveryId: string, agentId: string, action: Action): string {
    const body = b64(JSON.stringify({ d: deliveryId, a: agentId, x: action, e: clock.now().getTime() + LINK_TTL_MS }))
    return `${config.apiUrl}/api/teams/go?t=${body}.${sign(body)}`
  }
  function readLink(token: string): { d: string; a: string; x: Action } {
    const [body, mac] = token.split('.')
    if (!body || !mac) throw ApiError.forbidden('That link is not valid.')
    const expected = Buffer.from(sign(body))
    const got = Buffer.from(mac)
    if (expected.length !== got.length || !timingSafeEqual(expected, got)) throw ApiError.forbidden('That link is not valid.')
    let data: { d: string; a: string; x: Action; e: number }
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

  function card(
    agentId: string,
    deliveryId: string,
    reminder: Pick<ReminderRecord, 'category' | 'message' | 'actionable'>,
    name: string,
    fixed?: VoiceLine,
  ) {
    const game = repo.forAgent(agentId).getGameState()
    const firstName = name.split(' ')[0] || name
    const voice =
      fixed ??
      voiceFor(reminder.category, reminder.message, { firstName, streak: game.currentStreak, energy: game.energy, level: game.level, checkedInToday: game.lastCheckInDate === todayKey(clock.now()) }, { roast: roastOn() })
    const img = `${config.webUrl}${stickerImage(voice.sticker, game.evolutionStage)}`
    const title =
      reminder.category === 'Celebration'
        ? '🎉 Rocky is celebrating!'
        : reminder.category === 'Recovery'
          ? '💚 Rocky is here for you'
          : reminder.category === 'Streak'
            ? '🔥 Keep the streak alive'
            : '📝 Rocky’s notes check'
    const actions = [
      ...(reminder.actionable ? [{ type: 'Action.OpenUrl', title: '✅ My notes are done', url: link(deliveryId, agentId, 'done'), style: 'positive' }] : []),
      { type: 'Action.OpenUrl', title: '🐂 Open Rocky', url: link(deliveryId, agentId, 'open') },
    ]
    return {
      type: 'AdaptiveCard',
      $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
      version: '1.4',
      msteams: { width: 'Full' },
      body: [
        {
          type: 'ColumnSet',
          columns: [
            { type: 'Column', width: 'auto', items: [{ type: 'Image', url: img, width: '96px', altText: 'Rocky sticker' }] },
            {
              type: 'Column',
              width: 'stretch',
              verticalContentAlignment: 'Center',
              items: [
                { type: 'TextBlock', text: title, weight: 'Bolder', size: 'Medium', wrap: true },
                { type: 'TextBlock', text: voice.text, wrap: true, spacing: 'Small' },
                {
                  type: 'TextBlock',
                  text: `${firstName} · Level ${game.level} · 🔥 ${game.currentStreak} day${game.currentStreak === 1 ? '' : 's'} · ⚡ ${game.energy}`,
                  isSubtle: true,
                  size: 'Small',
                  wrap: true,
                  spacing: 'Small',
                },
              ],
            },
          ],
        },
      ],
      actions,
    }
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
      ],
      actions: [{ type: 'Action.OpenUrl', title: '🐂 Open Rocky', url: `${config.webUrl}/?${new URLSearchParams({ agente: d.agentId })}` }],
    }
  }

  /** Cards answered or expired in the last week whose Teams message still shows the buttons. */
  function pendingUpdates(now: Date) {
    return accounts
      .listDeliveries({ since: new Date(now.getTime() - 7 * 86_400_000).toISOString(), limit: 5000 })
      .filter((d) => d.ok && (d.kind === 'reminder' || d.kind === 'test') && !d.cardUpdatedAt && (d.actedAt || d.openedAt || d.ignoredAt))
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
      if (d.kind !== 'reminder' || !d.ok || d.openedAt || d.actedAt || d.ignoredAt || d.sentAt > cutoff) continue
      accounts.updateDelivery(d.id, { ignoredAt: now.toISOString() })
      const ignoredToday = recent.filter((x) => x.agentId === d.agentId && x.ignoredAt && todayKey(new Date(x.ignoredAt)) === today).length
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

    /** Checks every rostered agent and sends the due reminder cards (one webhook call). */
    async dispatch(): Promise<{ due: number; sent: number; error: string | null }> {
      const now = clock.now()
      penalizeIgnored(now)
      if (!config.webhookUrl) return { due: 0, sent: 0, error: 'not-configured' }
      const items: Parameters<typeof post>[0] = []
      const deliveries: DeliveryRecord[] = []
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
        const reminder = persistence.withTransaction(() => checkForReminder(repo.forAgent(agentId), now, shift))
        if (!reminder) continue
        const d = newDelivery(agentId, 'reminder', reminder)
        const name = nameOf(agentId, s)
        deliveries.push(d)
        const c = card(agentId, d.id, reminder, name)
        items.push({ email: agentId, name, deliveryId: d.id, kind: 'reminder', category: reminder.category, message: reminder.message, card: c })
      }
      const updates = pendingUpdates(now)
      if (items.length === 0) {
        if (updates.length) await post([], updates)
        lastDispatch = { at: now.toISOString(), due: 0, sent: 0, error: null }
        return { due: 0, sent: 0, error: null }
      }
      const result = await post(items, updates)
      for (const d of deliveries) accounts.addDelivery({ ...d, ok: result.ok, error: result.error })
      lastDispatch = { at: now.toISOString(), due: items.length, sent: result.ok ? items.length : 0, error: result.error }
      log(`[rocky-backend] teams: ${items.length} card(s) ${result.ok ? 'sent' : `NOT sent (${result.error})`}`)
      return { due: items.length, sent: result.ok ? items.length : 0, error: result.error }
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
      const result = await post([{ email: agentId, name, deliveryId: d.id, kind: 'test', category: 'Documentation', message: voice.text, card: card(agentId, d.id, reminder, name, voice) }])
      accounts.addDelivery({ ...d, category: 'Documentation', ok: result.ok, error: result.error })
      return result
    },

    /** The card as it would look for an agent (Admin preview / flow setup). */
    preview(agentId: string) {
      const name = nameOf(agentId, accounts.getSchedules()[agentId])
      return card(agentId, 'preview', { category: 'Documentation', message: 'Did you leave a clear note after your last interaction? Rocky is counting on you! 📝', actionable: true }, name)
    },

    /** A card button was clicked: record it, let Rocky react, and say where to send the agent. */
    follow(token: string): string {
      const { d: deliveryId, a: agentId, x: action } = readLink(token)
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
        if (first && !d.ignoredAt && d.kind === 'reminder' && repo.hasAgent(agentId)) {
          try {
            pet.teamsEffect(agentId, 'acted', action === 'done' ? 'Confirmed notes from a Teams card' : 'Opened Rocky from a Teams card')
          } catch {
            // nothing to change
          }
        }
      }
      // Swap the card in Teams for its "done" version right away (not on the next 5-minute round).
      if (d && config.webhookUrl) void post([], pendingUpdates(now).filter((x) => x.id === deliveryId))
      const q = new URLSearchParams({ agente: agentId, from: 'teams', teams: action })
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
        webhookHost: host,
        roster: Object.keys(accounts.getSchedules()).length,
        teamsOn: Object.values(accounts.getSchedules()).filter((s) => s.teams).length,
        lastDispatch,
        last24h: {
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
