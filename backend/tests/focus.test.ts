import { describe, expect, it } from 'vitest'
import request from 'supertest'
import { createApp } from '../src/app'
import { loadConfig } from '../src/config/env'
import type { Clock } from '../../src/engine/clock'
import { buildMemoryPersistence } from './testApp'
import { RULES_VERSION } from '../src/application/chatApplicationService'

const ANA = 'ana.perez@rlx.us'
const LUIS = 'luis.gomez@rlx.us'
const LEADER = 'mcantillo@rlx.us'
const ADMIN = 'qa.lead@rlx.us'
const as = (email: string) => ({ 'X-Agent-Email': email })

function build(start: string) {
  let now = new Date(start)
  const clock: Clock = { now: () => new Date(now) }
  const config = loadConfig({ NODE_ENV: 'production', ROCKY_PERSISTENCE_DRIVER: 'sqlite', ROCKY_DB_PATH: '/tmp/rocky-focus-test.db', ROCKY_AUTH_MODE: 'pilot-header', ROCKY_ADMIN_EMAILS: ADMIN })
  const app = createApp({ config, persistence: buildMemoryPersistence(), clock, backupTarget: { dir: null, key: null, s3: null } })
  return { app, set: (at: string) => (now = new Date(at)) }
}
const arcade = (app: ReturnType<typeof build>['app'], who: string) =>
  request(app).post('/api/pet/actions').set(as(who)).send({ type: 'arcade', game: 'run', score: 10 })

describe('keeping Rocky a break', () => {
  it('caps Arcade rounds per day (admin-configurable, 0 = no limit) and resets the next day', async () => {
    const t = build('2026-10-06T15:00:00')
    const { app } = t
    await request(app).get('/api/pet').set(as(ANA))
    for (let i = 0; i < 5; i++) expect((await arcade(app, ANA)).body.ok).toBe(true)
    const sixth = await arcade(app, ANA)
    expect(sixth.body).toMatchObject({ ok: false, reason: 'arcade-limit' })
    expect((await request(app).put('/api/admin/games-limit').set(as(ANA)).send({ limit: 0 })).status).toBe(403)
    const set = await request(app).put('/api/admin/games-limit').set(as(ADMIN)).send({ limit: 7 })
    expect(set.body.dailyLimit).toBe(7)
    expect((await arcade(app, ANA)).body.ok).toBe(true)
    t.set('2026-10-07T15:00:00')
    expect((await arcade(app, ANA)).body.ok).toBe(true)
  })

  it('focus mode: a leader pauses the Arcade and chat for their team only, until it ends', async () => {
    const t = build('2026-10-06T15:00:00')
    const { app } = t
    for (const e of [ANA, LUIS, LEADER]) {
      await request(app).get('/api/agent/me').set(as(e))
      await request(app).get('/api/pet').set(as(e))
      await request(app).post('/api/chat/rules').set(as(e)).send({ version: RULES_VERSION })
    }
    await request(app).put(`/api/admin/people/${encodeURIComponent(ANA)}`).set(as(ADMIN)).send({ leader: LEADER })
    // Only leaders (or admins) can turn it on.
    expect((await request(app).put('/api/focus').set(as(ANA)).send({ minutes: 30 })).status).toBe(403)
    const on = await request(app).put('/api/focus').set(as(LEADER)).send({ minutes: 30 })
    expect(on.status).toBe(200)
    expect(on.body.team).toBeTruthy()
    expect((await request(app).get('/api/focus').set(as(ANA))).body.mine).toBeTruthy()
    expect((await arcade(app, ANA)).body).toMatchObject({ ok: false, reason: 'focus' })
    expect((await arcade(app, LUIS)).body.ok).toBe(true) // not in that team
    const general = (await request(app).get('/api/chat/channels').set(as(ANA))).body.channels.find((c: { kind: string }) => c.kind === 'general')
    const blocked = await request(app).post(`/api/chat/channels/${general.id}/messages`).set(as(ANA)).send({ text: 'hola' })
    expect(blocked.status).toBe(423)
    // The pet view carries it, so the browser shows the pause too.
    expect((await request(app).get('/api/pet').set(as(ANA))).body.catalog['focus:me']).toBeTruthy()
    t.set('2026-10-06T15:31:00')
    expect((await arcade(app, ANA)).body.ok).toBe(true)
    // Admins can pause everyone, and end it early.
    await request(app).put('/api/focus').set(as(ADMIN)).send({ team: 'all', minutes: 60 })
    expect((await arcade(app, LUIS)).body).toMatchObject({ ok: false, reason: 'focus' })
    await request(app).put('/api/focus').set(as(ADMIN)).send({ team: 'all', minutes: 0 })
    expect((await arcade(app, LUIS)).body.ok).toBe(true)
  })

  it('usage: one minute per ping (no double counting), sessions, and an admin report', async () => {
    const t = build('2026-10-06T15:00:00')
    const { app } = t
    await request(app).get('/api/pet').set(as(ANA))
    expect((await request(app).post('/api/usage/ping').set(as(ANA))).body.counted).toBe(true)
    expect((await request(app).post('/api/usage/ping').set(as(ANA))).body.counted).toBe(false) // same minute (2 tabs)
    t.set('2026-10-06T15:01:00')
    await request(app).post('/api/usage/ping').set(as(ANA))
    t.set('2026-10-06T15:30:00') // a new session after a quiet stretch
    await request(app).post('/api/usage/ping').set(as(ANA))
    expect((await request(app).get('/api/admin/usage').set(as(ANA))).status).toBe(403)
    const r = await request(app).get('/api/admin/usage?days=7').set(as(ADMIN))
    expect(r.status).toBe(200)
    expect(r.body.agents[0]).toMatchObject({ minutes: 3, sessions: 2, daysActive: 1, perDay: 3 })
    expect(r.body.goal).toEqual({ min: 3, max: 5 })
  })
})
