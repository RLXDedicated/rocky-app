import { describe, expect, it } from 'vitest'
import request from 'supertest'
import { createApp, type LiveContext } from '../src/app'
import { loadConfig } from '../src/config/env'
import type { Clock } from '../../src/engine/clock'
import { buildMemoryPersistence } from './testApp'
import { friendKey } from '../src/application/petApplicationService'

// Shifts in US Eastern are converted to the server's zone (Colombia in production).
process.env.TZ = 'America/Bogota'

const ADMIN = 'qa.lead@rlx.us'
const ANA = 'ana.perez@rlx.us'
const LUIS = 'luis.gomez@rlx.us'
const LEADER = 'mcantillo@rlx.us'
const as = (email: string) => ({ 'X-Agent-Email': email })

function movableClock(start: string) {
  let now = new Date(start)
  const clock: Clock = { now: () => new Date(now) }
  return { clock, set: (at: string) => (now = new Date(at)) }
}

interface Posted {
  type: string
  updates?: { deliveryId: string; email: string; card: { body: unknown[]; actions: { title: string }[] } }[]
  cards: { email: string; deliveryId: string; kind: string; card: { actions: { title: string; url: string }[] } }[]
}

function build(clock: Clock, status = 202, notesOnly = false) {
  const posted: Posted[] = []
  const fetchFn = (async (_url: string, init: { body: string }) => {
    posted.push(JSON.parse(init.body))
    return new Response(null, { status })
  }) as unknown as typeof fetch
  const config = loadConfig({
    NODE_ENV: 'production',
    ROCKY_PERSISTENCE_DRIVER: 'sqlite',
    ROCKY_DB_PATH: '/tmp/rocky-teams-test.db',
    ROCKY_AUTH_MODE: 'pilot-header',
    ROCKY_ADMIN_EMAILS: ADMIN,
  })
  const app = createApp({
    config,
    persistence: buildMemoryPersistence(),
    clock,
    backupTarget: { dir: null, key: null, s3: null },
    teams: { webhookUrl: 'https://example.invalid/workflows/hook', apiUrl: 'https://api.test', webUrl: 'https://web.test', linkSecret: 'test-secret', fetchFn },
  })
  const live = app.locals.live as LiveContext
  // These tests cover the full Rocky cards; notes-only mode has its own tests below.
  if (!notesOnly) live.teams.setNotesOnly(false, 'test')
  return { app, live, posted }
}

const ROSTER = [
  'Correo,Nombre,Líder,Días,Entrada,Salida',
  `${ANA},Ana Pérez,${LEADER},L-V,8:00,17:00`,
  `${LUIS},Luis Gómez,${LEADER},Lunes a Viernes,2:00 pm,11:00 pm`,
  'not-an-email,Nobody,,L-V,8,17',
].join('\n')

const token = (url: string) => new URL(url).searchParams.get('t')!

describe('Teams integration', () => {
  it('imports the roster: shifts, leaders and teams', async () => {
    const { app } = build(movableClock('2026-09-07T09:00:00').clock)
    const res = await request(app).post('/api/admin/roster/import').set(as(ADMIN)).send({ text: ROSTER })
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ schedules: 2, leaders: 2 })
    const status = await request(app).get('/api/admin/teams/status').set(as(ADMIN))
    expect(status.body.configured).toBe(true)
    expect(status.body.roster).toBe(2)
    expect(status.body.schedules.find((s: { agentId: string }) => s.agentId === LUIS)).toMatchObject({ days: [1, 2, 3, 4, 5], start: '14:00', end: '23:00', leader: LEADER })
    // Agents can't reach it.
    expect((await request(app).get('/api/admin/teams/status').set(as(ANA))).status).toBe(403)
  })

  it('imports the pilot list (AgentName / TeamsEmail / Active) with a default shift', async () => {
    const { app } = build(movableClock('2026-09-07T09:00:00').clock)
    const text = ['AgentName\tTeamsEmail\tActive\tPilotStatus', `Ana Pérez\t${ANA}\tYes\tTest`, `Luis Gómez\t${LUIS}\tNo\tTest`].join('\n')
    const res = await request(app).post('/api/admin/roster/import').set(as(ADMIN)).send({ text, defaultSchedule: { days: [1, 2, 3, 4, 5], start: '09:00', end: '18:00' } })
    // Active = No keeps the shift (streaks, in-app reminders) but no Teams cards.
    expect(res.body).toMatchObject({ schedules: 2, leaders: 0 })
    const status = await request(app).get('/api/admin/teams/status').set(as(ADMIN))
    expect(status.body.schedules).toMatchObject([
      { agentId: ANA, name: 'Ana Pérez', start: '09:00', end: '18:00', teams: true },
      { agentId: LUIS, teams: false },
    ])
  })

  it('sends reminder cards only inside each agent’s shift, in one webhook call', async () => {
    const t = movableClock('2026-09-06T10:00:00') // Sunday
    const { app, live, posted } = build(t.clock)
    await request(app).post('/api/admin/roster/import').set(as(ADMIN)).send({ text: ROSTER }).expect(200)
    expect((await live.teams.dispatch()).due).toBe(0)
    expect(posted).toHaveLength(0)
    t.set('2026-09-08T10:00:00') // Tuesday: Ana is working, Luis starts at 14:00
    const r = await live.teams.dispatch()
    expect(r).toMatchObject({ due: 1, sent: 1, error: null })
    expect(posted).toHaveLength(1)
    expect(posted[0]!.type).toBe('rocky.cards')
    expect(posted[0]!.cards.map((c) => c.email)).toEqual([ANA])
    // The card shows a chat sticker of the agent's own Rocky.
    expect(JSON.stringify(posted[0]!.cards[0]!.card)).toMatch(/https:\/\/web\.test\/teams\/stickers\/[a-z]+(-baby)?\.png/)
    // Everyone on the roster has a Rocky now, with their roster name.
    expect((await request(app).get('/api/agent/me').set(as(ANA))).body.name ?? 'Ana Pérez').toContain('Ana')
  })

  it('a card button records the answer and cheers Rocky up (once)', async () => {
    const t = movableClock('2026-09-07T10:00:00')
    const { app, live, posted } = build(t.clock)
    await request(app).post('/api/admin/roster/import').set(as(ADMIN)).send({ text: ROSTER }).expect(200)
    await live.teams.dispatch()
    const card = posted[0]!.cards[0]!
    const done = card.card.actions.find((a) => a.title.includes('done')) ?? card.card.actions[0]!
    expect(done.url.startsWith('https://api.test/api/teams/go?t=')).toBe(true)
    const before = (await request(app).get('/api/pet').set(as(ANA))).body.state
    const go = await request(app).get(`/api/teams/go?t=${token(done.url)}`)
    expect(go.status).toBe(302)
    expect(go.headers.location).toMatch(/^https:\/\/web\.test\/\?agente=ana\.perez%40rlx\.us&from=teams&teams=/)
    const after = (await request(app).get('/api/pet').set(as(ANA))).body.state
    expect(after.gameCoins).toBe(before.gameCoins + 2)
    // A second click doesn't pay again.
    await request(app).get(`/api/teams/go?t=${token(done.url)}`).expect(302)
    expect((await request(app).get('/api/pet').set(as(ANA))).body.state.gameCoins).toBe(after.gameCoins)
    const status = await request(app).get('/api/admin/teams/status').set(as(ADMIN))
    expect(status.body.last24h.opened).toBe(1)
  })

  it('rejects tampered or expired links', async () => {
    const t = movableClock('2026-09-07T10:00:00')
    const { app, live, posted } = build(t.clock)
    await request(app).post('/api/admin/roster/import').set(as(ADMIN)).send({ text: ROSTER }).expect(200)
    await live.teams.dispatch()
    const url = posted[0]!.cards[0]!.card.actions[0]!.url
    const [body, mac] = token(url).split('.')
    const forged = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(body!, 'base64url').toString()), a: LUIS })).toString('base64url')
    expect((await request(app).get(`/api/teams/go?t=${forged}.${mac}`)).status).toBe(403)
    expect((await request(app).get('/api/teams/go?t=garbage')).status).toBe(403)
    t.set('2026-09-15T10:00:00')
    expect((await request(app).get(`/api/teams/go?t=${token(url)}`)).status).toBe(403)
  })

  it('an unanswered card makes Rocky a little sad, at most twice a day', async () => {
    const t = movableClock('2026-09-08T08:50:00')
    const { app, live } = build(t.clock)
    await request(app).post('/api/admin/roster/import').set(as(ADMIN)).send({ text: ROSTER }).expect(200)
    await live.teams.dispatch()
    const before = (await request(app).get('/api/pet').set(as(ANA))).body.state.needs.happiness
    t.set('2026-09-08T12:05:00')
    await live.teams.dispatch()
    const status = await request(app).get('/api/admin/teams/status').set(as(ADMIN))
    expect(status.body.last24h.ignored).toBe(1)
    const after = (await request(app).get('/api/pet').set(as(ANA))).body.state.needs.happiness
    expect(after).toBeLessThan(before)
  })

  it('checking in on time for the shift pays a bonus once a day', async () => {
    const t = movableClock('2026-09-07T08:10:00')
    const { app } = build(t.clock)
    await request(app).post('/api/admin/roster/import').set(as(ADMIN)).send({ text: ROSTER }).expect(200)
    const before = (await request(app).get('/api/pet').set(as(ANA))).body.state.gameCoins
    await request(app).post('/api/events/check-in').set(as(ANA)).send({}).expect(200)
    expect((await request(app).get('/api/pet').set(as(ANA))).body.state.gameCoins).toBe(before + 5)
    // Luis checks in at 08:10 but his shift starts at 14:00: no bonus.
    const luis = (await request(app).get('/api/pet').set(as(LUIS))).body.state.gameCoins
    await request(app).post('/api/events/check-in').set(as(LUIS)).send({}).expect(200)
    expect((await request(app).get('/api/pet').set(as(LUIS))).body.state.gameCoins).toBe(luis)
  })

  it('days off in the shift don’t break the streak', async () => {
    const t = movableClock('2026-09-07T09:00:00') // Monday
    const { app } = build(t.clock)
    // Ana works Mon, Wed, Fri only.
    await request(app).put(`/api/admin/schedules/${ANA}`).set(as(ADMIN)).send({ days: [1, 3, 5], start: '08:00', end: '17:00' }).expect(200)
    await request(app).post('/api/events/check-in').set(as(ANA)).send({}).expect(200)
    t.set('2026-09-09T09:00:00') // Wednesday
    const res = await request(app).post('/api/events/check-in').set(as(ANA)).send({}).expect(200)
    expect(res.body.state?.currentStreak ?? res.body.gameState?.currentStreak).toBe(2)
  })

  it('replaces an answered card with its "done" version, and expired ones on the next round', async () => {
    const t = movableClock('2026-09-08T08:50:00')
    const { app, live, posted } = build(t.clock)
    await request(app).post('/api/admin/roster/import').set(as(ADMIN)).send({ text: ROSTER }).expect(200)
    await live.teams.dispatch()
    const card = posted[0]!.cards[0]!
    const done = card.card.actions.find((a) => a.title.includes('done'))!
    await request(app).get(`/api/teams/go?t=${token(done.url)}`).expect(302)
    await new Promise((r) => setTimeout(r, 20))
    const update = posted.find((p) => p.updates?.length)!
    expect(update.cards).toEqual([])
    expect(update.updates![0]).toMatchObject({ deliveryId: card.deliveryId, email: ANA })
    expect(JSON.stringify(update.updates![0]!.card)).toContain('Notes done')
    expect(update.updates![0]!.card.actions.map((a) => a.title)).toEqual(['🐂 Open Rocky'])
    // Sent once: the next round doesn't resend it.
    const before = posted.length
    t.set('2026-09-08T09:20:00')
    await live.teams.dispatch()
    expect(posted.slice(before).some((p) => p.updates?.some((u) => u.deliveryId === card.deliveryId))).toBe(false)
  })

  it('roast mode can be turned off by an admin', async () => {
    const { app, live } = build(movableClock('2026-09-07T10:00:00').clock)
    expect(live.teams.roast()).toBe(true)
    await request(app).put('/api/admin/teams/roast').set(as(ADMIN)).send({ on: false }).expect(200)
    expect((await request(app).get('/api/admin/teams/status').set(as(ADMIN))).body.roast).toBe(false)
    expect((await request(app).put('/api/admin/teams/roast').set(as(ANA)).send({ on: true })).status).toBe(403)
  })

  it('reports webhook failures without losing track', async () => {
    const t = movableClock('2026-09-08T10:00:00')
    const { app, live } = build(t.clock, 500)
    await request(app).post('/api/admin/roster/import').set(as(ADMIN)).send({ text: ROSTER }).expect(200)
    expect(await live.teams.dispatch()).toMatchObject({ due: 1, sent: 0, error: 'Teams answered 500' })
    const status = await request(app).get('/api/admin/teams/status').set(as(ADMIN))
    expect(status.body.last24h.failed).toBe(1)
  })

  it('imports the SharePoint list, then updated hours by name in US Eastern time; only Active agents get cards', async () => {
    const t = movableClock('2026-09-30T07:30:00') // Wednesday, Colombia (07:30 = 08:30 in New York)
    const { app, live, posted } = build(t.clock)
    const sharepoint = [
      '"Título","TeamLead","TeamLeadEmail","AgentName","TeamsEmail","Active","ShiftStart","ShiftEnd","WorkDays"',
      `,"Maria Cantillo","${LEADER}","Ana Pérez","${ANA}","Yes","07:00","16:00","Wed,Thu,Fri,Sat,Sun"`,
      `,"Maria Cantillo","${LEADER}","Luis Gómez","${LUIS}","No","07:00","16:00","Wed,Thu,Fri,Sat,Sun"`,
    ].join('\n')
    const first = await request(app).post('/api/admin/roster/import').set(as(ADMIN)).send({ text: sharepoint, timeZone: 'America/Bogota' })
    expect(first.body).toMatchObject({ schedules: 2, leaders: 2 })
    // The updated list has names only, with hours in New York time.
    const updated = await request(app)
      .post('/api/admin/roster/import')
      .set(as(ADMIN))
      .send({ text: 'Name\tSchedule\nAna Perez\tWED-SUN / 0800 - 1700\nLuis Gomez\tWED-SUN / 0800 - 1700\nNobody Here\tMON-FRI / 0800 - 1700', timeZone: 'America/New_York' })
    expect(updated.body).toMatchObject({ schedules: 2, matchedByName: 2, unmatched: ['Nobody Here'] })
    const status = await request(app).get('/api/admin/teams/status').set(as(ADMIN))
    const ana = status.body.schedules.find((s: { agentId: string }) => s.agentId === ANA)
    expect(ana).toMatchObject({ start: '08:00', end: '17:00', timeZone: 'America/New_York', teams: true, local: { start: '07:00', end: '16:00' } })
    expect(status.body.schedules.find((s: { agentId: string }) => s.agentId === LUIS).teams).toBe(false)
    expect(status.body.teamsOn).toBe(1)
    // 07:30 in Colombia is inside the (converted) shift: Ana gets a card, Luis (Active = No) doesn't.
    await live.teams.dispatch()
    expect(posted.flatMap((p) => p.cards.map((c) => c.email))).toEqual([ANA])
    // 06:30 in Colombia (07:30 in New York) is before the shift.
    t.set('2026-10-01T06:30:00')
    expect((await live.teams.dispatch()).due).toBe(0)
  })

  it('greets each agent at the start of the shift with the day’s note lesson (an extra card, weekly summary on the first shift day)', async () => {
    const t = movableClock('2026-09-07T08:05:00') // Monday, Ana starts at 08:00
    const { app, live, posted } = build(t.clock)
    await request(app).post('/api/admin/roster/import').set(as(ADMIN)).send({ text: ROSTER }).expect(200)
    await live.teams.dispatch()
    const weekly = posted[0]!.cards.find((c) => c.email === ANA)!
    expect(weekly.kind).toBe('weekly')
    const text = JSON.stringify(weekly.card)
    expect(text).toContain('Your last week with Rocky')
    expect(text).toContain('Today’s focus')
    expect(text).toContain('Every note, every time')
    // Not twice, and no reminder right on its heels.
    t.set('2026-09-07T08:30:00')
    await live.teams.dispatch()
    expect(posted.slice(1).flatMap((p) => p.cards).filter((c) => c.email === ANA)).toEqual([])
    // Tuesday: the plain greeting.
    t.set('2026-09-08T08:03:00')
    await live.teams.dispatch()
    const tue = posted.at(-1)!.cards.find((c) => c.email === ANA)!
    expect(tue.kind).toBe('greeting')
    expect(JSON.stringify(tue.card)).not.toContain('Your last week')
    // The greeting doesn't use up the 3 reminders.
    const status = await request(app).get('/api/admin/teams/status').set(as(ADMIN))
    expect(status.body.last24h.byKind.greeting).toBe(1)
  })

  it('every reminder carries a note lesson, never the same one twice in a row, and "Practice notes" opens the Note Check', async () => {
    const t = movableClock('2026-09-08T09:00:00')
    const { app, live, posted } = build(t.clock)
    await request(app).post('/api/admin/roster/import').set(as(ADMIN)).send({ text: ROSTER }).expect(200)
    await live.teams.dispatch()
    const card = posted[0]!.cards[0]!
    expect(JSON.stringify(card.card)).toContain('Note habit')
    const learn = card.card.actions.find((a) => a.title.includes('Practice'))!
    const go = await request(app).get(`/api/teams/go?t=${token(learn.url)}`).expect(302)
    expect(go.headers.location).toContain('go=notes')
    const lessons: string[] = []
    for (const at of ['2026-09-08T12:00:00', '2026-09-08T15:00:00']) {
      t.set(at)
      await live.teams.dispatch()
    }
    for (const p of posted) for (const c of p.cards) if (c.email === ANA) lessons.push(/"text":"([^"]+)","size":"Medium","weight":"Bolder","wrap":true,"spacing":"Small"/.exec(JSON.stringify(c.card))?.[1] ?? '')
    expect(new Set(lessons).size).toBe(lessons.length)
  })

  it('warns near the end of the shift when a streak would break (counts as a reminder)', async () => {
    const t = movableClock('2026-09-07T09:00:00')
    const { app, live, posted } = build(t.clock)
    await request(app).post('/api/admin/roster/import').set(as(ADMIN)).send({ text: ROSTER }).expect(200)
    await request(app).post('/api/events/check-in').set(as(ANA)).send({}).expect(200)
    t.set('2026-09-08T09:00:00')
    await request(app).post('/api/events/check-in').set(as(ANA)).send({}).expect(200)
    t.set('2026-09-09T15:30:00') // Wednesday, 90 minutes before Ana logs off, no check-in yet
    await live.teams.dispatch()
    const card = posted.flatMap((p) => p.cards).find((c) => c.email === ANA)!
    expect(card.kind).toBe('streakrisk')
    expect(JSON.stringify(card.card)).toContain('2-day streak ends with this shift')
    expect(card.card.actions.map((a) => a.title)).toContain('✅ My notes are done')
    t.set('2026-09-09T15:45:00')
    await live.teams.dispatch()
    expect(posted.flatMap((p) => p.cards).filter((c) => c.kind === 'streakrisk')).toHaveLength(1)
  })

  it('kudos: a teammate’s thank-you lifts Rocky, reaches Teams once, and is limited', async () => {
    const t = movableClock('2026-09-08T10:00:00')
    const { app, live, posted } = build(t.clock)
    await request(app).post('/api/admin/roster/import').set(as(ADMIN)).send({ text: ROSTER }).expect(200)
    const before = (await request(app).get('/api/pet').set(as(ANA))).body.state.gameCoins
    await request(app).get('/api/pet').set(as(LUIS)).expect(200)
    const give = await request(app).post('/api/kudos').set(as(LUIS)).send({ to: friendKey(ANA), tag: 'great-note', message: 'Loved your claim note!' })
    expect(give.status).toBe(200)
    expect((await request(app).get('/api/pet').set(as(ANA))).body.state.gameCoins).toBe(before + 3)
    expect((await request(app).post('/api/kudos').set(as(LUIS)).send({ to: friendKey(ANA), tag: 'helped' })).status).toBeGreaterThanOrEqual(400)
    expect((await request(app).post('/api/kudos').set(as(LUIS)).send({ to: friendKey(LUIS), tag: 'helped' })).status).toBeGreaterThanOrEqual(400)
    const mine = await request(app).get('/api/kudos').set(as(ANA))
    expect(mine.body.received[0]).toMatchObject({ label: 'Great note', message: 'Loved your claim note!' })
    await live.teams.dispatch()
    const card = posted.flatMap((p) => p.cards).find((c) => c.email === ANA)!
    expect(card.kind).toBe('kudos')
    expect(JSON.stringify(card.card)).toContain('Loved your claim note!')
    t.set('2026-09-08T11:00:00')
    await live.teams.dispatch()
    expect(posted.flatMap((p) => p.cards).filter((c) => c.kind === 'kudos')).toHaveLength(1)
  })

  it('team leads get a weekly summary of their team on Monday (and on demand from Admin)', async () => {
    const t = movableClock('2026-09-07T10:00:00') // Monday
    const { app, live, posted } = build(t.clock)
    await request(app).post('/api/admin/roster/import').set(as(ADMIN)).send({ text: ROSTER }).expect(200)
    await live.teams.dispatch()
    const card = posted.flatMap((p) => p.cards).find((c) => c.email === LEADER)!
    expect(card.kind).toBe('leader')
    const text = JSON.stringify(card.card)
    expect(text).toContain('Ana Pérez')
    expect(text).toContain('Luis Gómez')
    expect(text).toContain('For your huddle')
    t.set('2026-09-07T14:00:00')
    await live.teams.dispatch()
    expect(posted.flatMap((p) => p.cards).filter((c) => c.kind === 'leader')).toHaveLength(1)
    const now = await request(app).post('/api/admin/teams/leaders/send').set(as(ADMIN)).expect(200)
    expect(now.body).toMatchObject({ ok: true, sent: 1 })
    await request(app).put('/api/admin/teams/leader-summary').set(as(ADMIN)).send({ on: false }).expect(200)
    expect((await request(app).get('/api/admin/teams/status').set(as(ADMIN))).body.leaderSummary).toBe(false)
    for (const kind of ['greeting', 'weekly', 'streakrisk', 'milestone', 'kudos', 'leader', 'reminder'])
      expect((await request(app).get(`/api/admin/teams/preview/${ANA}?kind=${kind}`).set(as(ADMIN))).body.card.type).toBe('AdaptiveCard')
  })

  it('notes-only mode (the default): plain note reminders, no Rocky, no pet data, no app links, no pet effects', async () => {
    const t = movableClock('2026-09-08T08:05:00') // Tuesday, Ana starts at 08:00
    const { app, live, posted } = build(t.clock, 202, true)
    expect(live.teams.notesOnly()).toBe(true)
    await request(app).post('/api/admin/roster/import').set(as(ADMIN)).send({ text: ROSTER }).expect(200)
    await live.teams.dispatch()
    const start = posted[0]!.cards.find((c) => c.email === ANA)!
    expect(start.kind).toBe('notes-start')
    t.set('2026-09-08T09:00:00')
    await live.teams.dispatch()
    const reminder = posted.flatMap((p) => p.cards).find((c) => c.kind === 'notes')!
    for (const c of [start, reminder]) {
      const text = JSON.stringify(c.card)
      expect(text).not.toMatch(/Rocky|sticker|Level|⚡/)
      expect(text.toLowerCase()).toContain('note')
    }
    expect(reminder.card.actions.map((a) => a.title)).toEqual(['✅ My notes are done'])
    const before = (await request(app).get('/api/pet').set(as(ANA))).body.state.gameCoins
    const go = await request(app).get(`/api/teams/go?t=${token(reminder.card.actions[0]!.url)}`)
    expect(go.status).toBe(200)
    expect(go.text).toContain('Thanks')
    expect((await request(app).get('/api/pet').set(as(ANA))).body.state.gameCoins).toBe(before)
    await new Promise((r) => setTimeout(r, 20))
    const update = posted.find((p) => p.updates?.length)!
    expect(JSON.stringify(update.updates![0]!.card)).toContain('Notes confirmed')
    expect(JSON.stringify(update.updates![0]!.card)).not.toContain('Rocky')
    // No leader summary, kudos or streak cards; at most 3 reminders a day.
    for (const at of ['2026-09-08T11:00:00', '2026-09-08T13:00:00', '2026-09-08T15:00:00', '2026-09-08T16:30:00']) {
      t.set(at)
      await live.teams.dispatch()
    }
    const kinds = posted.flatMap((p) => p.cards).filter((c) => c.email === ANA).map((c) => c.kind)
    expect(kinds.filter((k) => k === 'notes').length).toBeLessThanOrEqual(3)
    expect(kinds.every((k) => k === 'notes' || k === 'notes-start')).toBe(true)
    t.set('2026-09-14T10:00:00') // Monday
    await live.teams.dispatch()
    expect(posted.flatMap((p) => p.cards).some((c) => c.kind === 'leader')).toBe(false)
  })
})
