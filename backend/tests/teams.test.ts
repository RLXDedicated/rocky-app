import { describe, expect, it } from 'vitest'
import request from 'supertest'
import { createApp, type LiveContext } from '../src/app'
import { loadConfig } from '../src/config/env'
import type { Clock } from '../../src/engine/clock'
import { buildMemoryPersistence } from './testApp'

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
  cards: { email: string; deliveryId: string; kind: string; card: { actions: { title: string; url: string }[] } }[]
}

function build(clock: Clock, status = 202) {
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
  return { app, live: app.locals.live as LiveContext, posted }
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
    t.set('2026-09-07T10:00:00') // Monday: Ana is working, Luis starts at 14:00
    const r = await live.teams.dispatch()
    expect(r).toMatchObject({ due: 1, sent: 1, error: null })
    expect(posted).toHaveLength(1)
    expect(posted[0]!.type).toBe('rocky.cards')
    expect(posted[0]!.cards.map((c) => c.email)).toEqual([ANA])
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
    const t = movableClock('2026-09-07T08:30:00')
    const { app, live } = build(t.clock)
    await request(app).post('/api/admin/roster/import').set(as(ADMIN)).send({ text: ROSTER }).expect(200)
    await live.teams.dispatch()
    const before = (await request(app).get('/api/pet').set(as(ANA))).body.state.needs.happiness
    t.set('2026-09-07T11:45:00')
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

  it('reports webhook failures without losing track', async () => {
    const t = movableClock('2026-09-07T10:00:00')
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
})
