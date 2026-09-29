import { describe, expect, it } from 'vitest'
import request from 'supertest'
import { createApp, type LiveContext } from '../src/app'
import { loadConfig } from '../src/config/env'
import type { Clock } from '../../src/engine/clock'
import { buildMemoryPersistence } from './testApp'
import { RULES_VERSION } from '../src/application/chatApplicationService'

const ADMIN = 'qa.lead@rlx.us'
const LEADER = 'mcantillo@rlx.us'
const ANA = 'ana.perez@rlx.us'
const LUIS = 'luis.gomez@rlx.us'
const as = (email: string) => ({ 'X-Agent-Email': email })

/** A clock the test can move forward. */
function movableClock(start: string) {
  let now = new Date(start)
  const clock: Clock = { now: () => new Date(now) }
  return { clock, set: (at: string) => (now = new Date(at)) }
}

function build(clock: Clock) {
  const config = loadConfig({
    NODE_ENV: 'production',
    ROCKY_PERSISTENCE_DRIVER: 'sqlite',
    ROCKY_DB_PATH: '/tmp/rocky-extras-test.db',
    ROCKY_AUTH_MODE: 'pilot-header',
    ROCKY_ADMIN_EMAILS: ADMIN,
  })
  const app = createApp({ config, persistence: buildMemoryPersistence(), clock, backupTarget: { dir: null, key: null, s3: null } })
  return { app, live: app.locals.live as LiveContext }
}

describe('team challenges', () => {
  it('shows progress to the team and pays the reward once the window closes', async () => {
    const t = movableClock('2026-09-07T15:00:00')
    const { app, live } = build(t.clock)
    for (const e of [LEADER, ANA, LUIS]) await request(app).get('/api/agent/me').set(as(e))
    for (const e of [ANA, LUIS]) await request(app).put(`/api/admin/people/${e}`).set(as(ADMIN)).send({ leader: LEADER }).expect(200)
    const created = await request(app)
      .post('/api/admin/challenges')
      .set(as(ADMIN))
      .send({ title: 'Everyone checks in', leaderId: LEADER, metric: 'checkins', target: 80, startDay: '2026-09-07', endDay: '2026-09-08', rewardItem: 'hat-bucket', rewardCoins: 25 })
    expect(created.status).toBe(201)
    // Monday: both check in; Tuesday: both again.
    for (const day of ['2026-09-07T15:00:00', '2026-09-08T15:00:00']) {
      t.set(day)
      for (const e of [ANA, LUIS]) await request(app).post('/api/events/check-in').set(as(e)).send({}).expect(200)
    }
    const mine = await request(app).get('/api/challenges').set(as(ANA))
    expect(mine.body.challenges[0]).toMatchObject({ title: 'Everyone checks in', score: 100, status: 'active', members: 2 })
    // Bea, outside the team, doesn't see it.
    expect((await request(app).get('/api/challenges').set(as('bea.ruiz@rlx.us'))).body.challenges).toEqual([])
    t.set('2026-09-09T09:00:00')
    expect(live.challenges.settle()).toBe(1)
    expect(live.challenges.settle()).toBe(0)
    const pet = await request(app).get('/api/pet').set(as(ANA))
    expect(pet.body.state.granted).toContain('hat-bucket')
    const admin = await request(app).get('/api/admin/challenges').set(as(ADMIN))
    expect(admin.body.challenges[0]).toMatchObject({ status: 'won', score: 100 })
    expect((await request(app).post('/api/admin/challenges').set(as(ANA)).send({})).status).toBe(403)
  })
})

describe('arcade weekly ranking', () => {
  it('ranks this week, and crowns last week’s #1 with the trophy once', async () => {
    const t = movableClock('2026-09-08T15:00:00')
    const { app, live } = build(t.clock)
    for (const [e, score] of [
      [ANA, 12],
      [LUIS, 7],
    ] as const) {
      await request(app).get('/api/agent/me').set(as(e))
      await request(app).post('/api/pet/actions').set(as(e)).send({ type: 'arcade', game: 'run', score }).expect(200)
    }
    const board = await request(app).get('/api/arcade/leaderboard').set(as(LUIS))
    expect(board.body.games.run.top.map((x: { name: string; score: number }) => [x.name, x.score])).toEqual([
      ['Ana Perez', 12],
      ['Luis Gomez', 7],
    ])
    expect(board.body.games.run.myRank).toBe(2)
    t.set('2026-09-15T10:00:00')
    expect(live.pet.awardArcadeChampions()).toBe(1)
    expect(live.pet.awardArcadeChampions()).toBe(0)
    const ana = await request(app).get('/api/pet').set(as(ANA))
    expect(ana.body.state.granted).toContain('decor-arcade-trophy')
  })
})

describe('photo album', () => {
  it('keeps each agent’s photos private', async () => {
    const t = movableClock('2026-09-08T15:00:00')
    const { app } = build(t.clock)
    const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da63f8ffff3f0005fe02fea7d6a4c50000000049454e44ae426082', 'hex')
    const saved = await request(app).post('/api/photos?caption=Party%20Rocky').set(as(ANA)).set('Content-Type', 'image/png').send(PNG)
    expect(saved.status).toBe(201)
    expect((await request(app).get('/api/photos').set(as(ANA))).body.photos).toEqual([{ id: saved.body.id, caption: 'Party Rocky', at: saved.body.at }])
    expect((await request(app).get(`/api/photos/${saved.body.id}`).set(as(ANA))).status).toBe(200)
    expect((await request(app).get(`/api/photos/${saved.body.id}`).set(as(LUIS))).status).toBe(404)
    await request(app).delete(`/api/photos/${saved.body.id}`).set(as(ANA)).expect(200)
    expect((await request(app).get('/api/photos').set(as(ANA))).body.photos).toEqual([])
  })
})

describe('chat pins and mentions', () => {
  it('admins pin an announcement; @mentions reach the person mentioned', async () => {
    const t = movableClock('2026-09-08T15:00:00')
    const { app, live } = build(t.clock)
    for (const e of [ANA, LUIS, ADMIN]) {
      await request(app).get('/api/agent/me').set(as(e))
      await request(app).post('/api/chat/rules').set(as(e)).send({ version: RULES_VERSION })
    }
    const got: { to: string[]; t: string }[] = []
    const original = live.bus.publish.bind(live.bus)
    live.bus.publish = (to: string[], event: Record<string, unknown>) => {
      got.push({ to, t: event.t as string })
      return original(to, event)
    }
    const msg = await request(app).post('/api/chat/channels/general/messages').set(as(ADMIN)).send({ text: 'Hoy hay auditoría — @Ana Perez revisa tus notas 🙏' })
    expect(got.filter((e) => e.t === 'chat.mention').map((e) => e.to)).toEqual([[ANA]])
    const anaView = await request(app).get('/api/chat/channels/general/messages').set(as(ANA))
    expect(anaView.body.messages[0].mentionsMe).toBe(true)
    expect(anaView.body.messages[0].email).toBeUndefined()
    const adminView = await request(app).get('/api/chat/channels/general/messages').set(as(ADMIN))
    expect(adminView.body.messages[0].email).toBe(ADMIN)

    expect((await request(app).post(`/api/admin/chat/messages/${msg.body.id}/pin`).set(as(ANA)).send({})).status).toBe(403)
    await request(app).post(`/api/admin/chat/messages/${msg.body.id}/pin`).set(as(ADMIN)).send({}).expect(200)
    const pinned = await request(app).get('/api/chat/channels/general/messages').set(as(LUIS))
    expect(pinned.body.pinned).toMatchObject({ id: msg.body.id, name: 'Qa Lead' })
    await request(app).post(`/api/admin/chat/messages/${msg.body.id}/pin`).set(as(ADMIN)).send({ pin: false }).expect(200)
    expect((await request(app).get('/api/chat/channels/general/messages').set(as(LUIS))).body.pinned).toBeNull()
  })
})
