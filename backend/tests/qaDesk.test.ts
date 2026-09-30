import { describe, expect, it } from 'vitest'
import request from 'supertest'
import { createApp } from '../src/app'
import { loadConfig } from '../src/config/env'
import { fixedClock } from '../../src/engine/clock'
import { buildMemoryPersistence } from './testApp'

const ADMIN = 'qa.lead@rlx.us'
const QA = 'kcolina@rlx.us'
const ANA = 'ana.perez@rlx.us'
const LUIS = 'luis.gomez@rlx.us'
const as = (email: string) => ({ 'X-Agent-Email': email })

function build() {
  const config = loadConfig({
    NODE_ENV: 'production',
    ROCKY_PERSISTENCE_DRIVER: 'sqlite',
    ROCKY_DB_PATH: '/tmp/rocky-qadesk-test.db',
    ROCKY_AUTH_MODE: 'pilot-header',
    ROCKY_ADMIN_EMAILS: ADMIN,
  })
  return createApp({ config, persistence: buildMemoryPersistence(), clock: fixedClock('2026-09-30T15:00:00.000Z'), backupTarget: { dir: null, key: null, s3: null } })
}

async function setup() {
  const app = build()
  for (const e of [QA, ANA, LUIS]) await request(app).get('/api/agent/me').set(as(e))
  await request(app).put(`/api/admin/people/${QA}`).set(as(ADMIN)).send({ title: 'qa' }).expect(200)
  await request(app).post(`/api/admin/agents/${ANA}/profile`).set(as(ADMIN)).send({ name: 'Ana Pérez' })
  return app
}

describe('QA desk', () => {
  it('is only for QA analysts and admins', async () => {
    const app = await setup()
    expect((await request(app).get('/api/qa/desk').set(as(ANA))).status).toBe(403)
    expect((await request(app).get('/api/qa/desk').set(as(QA))).status).toBe(200)
    expect((await request(app).get('/api/qa/desk').set(as(ADMIN))).status).toBe(200)
  })

  it('a pass and a fail change the agent’s Rocky; a wrong entry can be flipped', async () => {
    const app = await setup()
    const before = (await request(app).get('/api/game-state').set(as(ANA))).body
    const pass = await request(app).post('/api/qa/audits').set(as(QA)).send({ agent: ANA, date: '2026-09-29', result: 'pass', ticket: 'T-1' })
    expect(pass.status).toBe(201)
    const afterPass = (await request(app).get('/api/game-state').set(as(ANA))).body
    expect(afterPass.xp).toBeGreaterThan(before.xp)
    // Same ticket, same day: not logged twice.
    expect((await request(app).post('/api/qa/audits').set(as(QA)).send({ agent: ANA, date: '2026-09-29', result: 'pass', ticket: 'T-1' })).status).toBe(409)
    const petBefore = (await request(app).get('/api/pet').set(as(ANA))).body.state.needs.happiness
    const fail = await request(app).post('/api/qa/audits').set(as(QA)).send({ agent: ANA, date: '2026-09-30', result: 'fail', reason: 'Missing notes' })
    expect(fail.body).toMatchObject({ result: 'fail', reason: 'Missing notes', auditor: QA })
    const afterFail = (await request(app).get('/api/game-state').set(as(ANA))).body
    expect(afterFail.energy).toBeLessThan(afterPass.energy)
    expect((await request(app).get('/api/pet').set(as(ANA))).body.state.needs.happiness).toBeLessThan(petBefore)
    // Entered wrong: flip it to a pass (an engine correction).
    const flipped = await request(app).put(`/api/qa/audits/${fail.body.id}`).set(as(QA)).send({ result: 'pass' })
    expect(flipped.body).toMatchObject({ result: 'pass', reason: null })
    expect(flipped.body.correctedAt).toBeTruthy()
    expect((await request(app).get('/api/game-state').set(as(ANA))).body.energy).toBeGreaterThanOrEqual(afterFail.energy)
    const desk = (await request(app).get('/api/qa/desk').set(as(QA))).body
    expect(desk.recent).toHaveLength(2)
  })

  it('imports a pasted sheet: by email or name, scores, and bad rows reported', async () => {
    const app = await setup()
    const text = ['Agente\tFecha\tPuntaje\tCaso\tMotivo', `${LUIS}\t29/09/2026\t95\t100\t`, 'Ana Pérez\t29/09/2026\t60\t101\tIncomplete notes', 'Nobody Known\t29/09/2026\t90\t102\t', `${ANA}\t05/10/2026\tPass\t103\t`].join('\n')
    const res = await request(app).post('/api/qa/audits/bulk').set(as(QA)).send({ text, passMark: 85 })
    expect(res.body.logged).toBe(2)
    expect(res.body.results.filter((r: { ok: boolean }) => !r.ok)).toHaveLength(2)
    const desk = (await request(app).get('/api/qa/desk').set(as(QA))).body
    expect(desk.recent.map((a: { agentId: string; result: string }) => `${a.agentId}:${a.result}`).sort()).toEqual([`${ANA}:fail`, `${LUIS}:pass`])
  })

  it('nobody audits themselves', async () => {
    const app = await setup()
    expect((await request(app).post('/api/qa/audits').set(as(QA)).send({ agent: QA, date: '2026-09-29', result: 'pass' })).status).toBe(422)
  })
})
