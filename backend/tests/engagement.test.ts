import { describe, expect, it } from 'vitest'
import request from 'supertest'
import { createApp, type LiveContext } from '../src/app'
import { loadConfig } from '../src/config/env'
import type { Clock } from '../../src/engine/clock'
import { buildMemoryPersistence } from './testApp'
import { RULES_VERSION } from '../src/application/chatApplicationService'
import { dailyMissions } from '../../src/game/engagement'

const ANA = 'ana.perez@rlx.us'
const LUIS = 'luis.gomez@rlx.us'
const BEA = 'bea.ruiz@rlx.us'
const ADMIN = 'qa.lead@rlx.us'
const as = (email: string) => ({ 'X-Agent-Email': email })

function movableClock(start: string) {
  let now = new Date(start)
  const clock: Clock = { now: () => new Date(now) }
  return { clock, set: (at: string) => (now = new Date(at)) }
}

function build(clock: Clock) {
  const config = loadConfig({ NODE_ENV: 'production', ROCKY_PERSISTENCE_DRIVER: 'sqlite', ROCKY_DB_PATH: '/tmp/rocky-eng-test.db', ROCKY_AUTH_MODE: 'pilot-header', ROCKY_ADMIN_EMAILS: ADMIN })
  const app = createApp({ config, persistence: buildMemoryPersistence(), clock, backupTarget: { dir: null, key: null, s3: null } })
  return { app, live: app.locals.live as LiveContext }
}

async function enroll(app: ReturnType<typeof build>['app'], ...emails: string[]) {
  for (const e of emails) {
    await request(app).get('/api/agent/me').set(as(e))
    await request(app).get('/api/pet').set(as(e))
    await request(app).post('/api/chat/rules').set(as(e)).send({ version: RULES_VERSION })
  }
}
const keyOf = async (app: ReturnType<typeof build>['app'], viewer: string, name: string) =>
  ((await request(app).get('/api/friends').set(as(viewer))).body.friends.find((f: { name: string }) => f.name.startsWith(name)).id as string)
const arcade = (app: ReturnType<typeof build>['app'], who: string, game: string, score: number) =>
  request(app).post('/api/pet/actions').set(as(who)).send({ type: 'arcade', game, score })

describe('engagement', () => {
  it('duels: challenge with your score, the friend answers, the winner gets coins', async () => {
    const t = movableClock('2026-10-06T15:00:00')
    const { app } = build(t.clock)
    await enroll(app, ANA, LUIS)
    const luis = await keyOf(app, ANA, 'Luis')
    expect((await request(app).post('/api/duels').set(as(ANA)).send({ to: luis, game: 'run', score: 0 })).status).toBeGreaterThanOrEqual(400)
    const d = await request(app).post('/api/duels').set(as(ANA)).send({ to: luis, game: 'run', score: 20 })
    expect(d.status).toBe(200)
    expect((await request(app).post('/api/duels').set(as(ANA)).send({ to: luis, game: 'run', score: 25 })).status).toBeGreaterThanOrEqual(400)
    const incoming = await request(app).get('/api/duels').set(as(LUIS))
    expect(incoming.body.incoming[0]).toMatchObject({ gameName: 'Rocky Run', theirScore: 20 })
    const before = (await request(app).get('/api/pet').set(as(LUIS))).body.state.coins ?? null
    const ans = await request(app).post(`/api/duels/${d.body.id}/answer`).set(as(LUIS)).send({ score: 31 })
    expect(ans.body).toMatchObject({ result: 'won', myScore: 31, theirScore: 20 })
    expect((await request(app).get('/api/duels').set(as(ANA))).body.recent[0]).toMatchObject({ result: 'lost' })
    void before
    expect((await request(app).post(`/api/duels/${d.body.id}/answer`).set(as(LUIS)).send({ score: 40 })).status).toBeGreaterThanOrEqual(400)
    // An open duel expires after 48 h.
    const e = await request(app).post('/api/duels').set(as(LUIS)).send({ to: await keyOf(app, LUIS, 'Ana'), game: 'hoop', score: 9 })
    t.set('2026-10-08T16:00:00')
    expect((await request(app).post(`/api/duels/${e.body.id}/answer`).set(as(ANA)).send({ score: 12 })).status).toBeGreaterThanOrEqual(400)
  })

  it('weekly Arcade champions wear a 🏆 honor in chat and on their profile until someone else takes it', async () => {
    const t = movableClock('2026-10-06T15:00:00') // Tuesday
    const { app, live } = build(t.clock)
    await enroll(app, ANA, LUIS)
    await arcade(app, ANA, 'crush', 120).expect(200)
    await arcade(app, LUIS, 'crush', 80).expect(200)
    t.set('2026-10-13T15:00:00') // next week: Ana is last week's #1
    live.engagement.refreshHonors()
    const msg = await request(app).post('/api/chat/channels/general/messages').set(as(ANA)).send({ text: 'Hola equipo' })
    expect(msg.body.honors).toEqual({ arcade: ['Rocky Crush'], rotw: false })
    expect((await request(app).get('/api/me/role').set(as(ANA))).body.honors).toEqual({ arcade: ['Rocky Crush'], rotw: false })
    const friends = await request(app).get('/api/friends').set(as(LUIS))
    expect(friends.body.friends.find((f: { name: string }) => f.name.startsWith('Ana')).honors.arcade).toEqual(['Rocky Crush'])
    // Luis takes it the week after.
    await arcade(app, LUIS, 'crush', 150).expect(200)
    t.set('2026-10-20T15:00:00')
    live.engagement.refreshHonors()
    expect((await request(app).get('/api/me/role').set(as(ANA))).body.honors).toBeUndefined()
    expect((await request(app).get('/api/me/role').set(as(LUIS))).body.honors.arcade).toEqual(['Rocky Crush'])
  })

  it('monthly tournament: points across games, top 3 get a cup and coins once', async () => {
    const t = movableClock('2026-10-06T15:00:00')
    const { app, live } = build(t.clock)
    await enroll(app, ANA, LUIS, BEA)
    await arcade(app, ANA, 'crush', 200).expect(200)
    await arcade(app, ANA, 'hoop', 20).expect(200)
    await arcade(app, LUIS, 'crush', 100).expect(200)
    const board = await request(app).get('/api/arcade/tournament').set(as(LUIS))
    expect(board.body.top.map((r: { name: string }) => r.name.split(' ')[0])).toEqual(['Ana', 'Luis'])
    expect(board.body.top[0].points).toBe(150)
    t.set('2026-11-02T10:00:00')
    expect(live.engagement.awardAll().tournament).toBe(2)
    expect(live.engagement.awardAll().tournament).toBe(0)
    const pet = await request(app).get('/api/pet').set(as(ANA))
    expect(pet.body.state.granted).toContain('decor-cup-gold')
  })

  it('Rocky of the week: one vote each (changeable), not for yourself; the winner gets 👑 the next week', async () => {
    const t = movableClock('2026-10-06T15:00:00')
    const { app, live } = build(t.clock)
    await enroll(app, ANA, LUIS, BEA)
    const ana = await keyOf(app, LUIS, 'Ana')
    expect((await request(app).put('/api/rotw/vote').set(as(ANA)).send({ to: ana })).status).toBeGreaterThanOrEqual(400)
    await request(app).put('/api/rotw/vote').set(as(LUIS)).send({ to: await keyOf(app, LUIS, 'Bea') }).expect(200)
    await request(app).put('/api/rotw/vote').set(as(LUIS)).send({ to: ana }).expect(200)
    const r = await request(app).put('/api/rotw/vote').set(as(BEA)).send({ to: ana })
    expect(r.body.top[0]).toMatchObject({ votes: 2 })
    expect(r.body.voters).toBe(2)
    t.set('2026-10-13T15:00:00')
    expect(live.engagement.awardAll().rotw).toBe(1)
    live.engagement.refreshHonors()
    expect((await request(app).get('/api/me/role').set(as(ANA))).body.honors).toEqual({ arcade: [], rotw: true })
    expect((await request(app).get('/api/rotw').set(as(BEA))).body.lastWinner.votes).toBe(2)
  })

  it('daily missions open a chest once; collections pay once when complete', async () => {
    const t = movableClock('2026-10-06T15:00:00')
    const { app } = build(t.clock)
    await enroll(app, ANA)
    expect((await request(app).post('/api/pet/actions').set(as(ANA)).send({ type: 'claimChest' })).body.ok).toBe(false)
    expect((await request(app).post('/api/pet/actions').set(as(ANA)).send({ type: 'claimSet', setId: 'set-coffee' })).body.ok).toBe(false)
    // Do today's missions.
    const ids = dailyMissions(t.clock.now()).map((m) => m.id)
    expect(ids[0]).toBe('quiz')
    expect(ids).toHaveLength(3)
  })

  it('@all / @todos mentions everyone in the conversation (once an hour in General)', async () => {
    const t = movableClock('2026-10-06T15:00:00')
    const { app } = build(t.clock)
    await enroll(app, ANA, LUIS)
    const first = await request(app).post('/api/chat/channels/general/messages').set(as(ANA)).send({ text: 'Hola @todos, reunión a las 3' })
    expect(first.status).toBe(201)
    const seen = await request(app).get('/api/chat/channels/general/messages').set(as(LUIS))
    expect(seen.body.messages.at(-1).mentionsMe).toBe(true)
    expect((await request(app).post('/api/chat/channels/general/messages').set(as(ANA)).send({ text: '@all again' })).status).toBe(422)
    t.set('2026-10-06T16:05:00')
    expect((await request(app).post('/api/chat/channels/general/messages').set(as(ANA)).send({ text: '@all again' })).status).toBe(201)
    // Admins aren't limited.
    await enroll(app, ADMIN)
    await request(app).post('/api/chat/channels/general/messages').set(as(ADMIN)).send({ text: '@all one' }).expect(201)
    await request(app).post('/api/chat/channels/general/messages').set(as(ADMIN)).send({ text: '@all two' }).expect(201)
  })
})
