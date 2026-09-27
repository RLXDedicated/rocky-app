import { describe, expect, it } from 'vitest'
import request from 'supertest'
import { AGENT_HEADER, ROLE_HEADER, buildTestApp } from './testApp'

const QA_HEADERS = { [AGENT_HEADER]: 'qa-reviewer-1', [ROLE_HEADER]: 'QA' } as const

describe('POST /api/events/qa-pass', () => {
  it('processes a real QA Pass through the unchanged Game Engine, for the audited agent', async () => {
    const app = buildTestApp()
    const res = await request(app)
      .post('/api/events/qa-pass')
      .set(QA_HEADERS)
      .send({ agentId: 'agent-audited', auditDate: '2026-09-08' })

    expect(res.status).toBe(200)
    // +25 XP base, +25 "Getting Started" achievement (first QA Pass) = 50.
    expect(res.body.state.xp).toBe(50)
    expect(res.body.state.energy).toBe(80)
    expect(res.body.newAchievements[0].id).toBe('getting_started')

    // The QA reviewer's own state must be untouched — QA never affects its
    // own gamification by auditing someone else.
    const reviewerState = await request(app).get('/api/game-state').set(QA_HEADERS)
    expect(reviewerState.body.xp).toBe(0)
  })

  it('authorization boundary: an AGENT (default role) cannot submit a QA Pass', async () => {
    const app = buildTestApp()
    const res = await request(app)
      .post('/api/events/qa-pass')
      .set(AGENT_HEADER, 'not-qa')
      .send({ agentId: 'agent-audited', auditDate: '2026-09-08' })

    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe('FORBIDDEN')
  })

  it('rejects a client attempting to manipulate XP directly alongside a QA Pass', async () => {
    const app = buildTestApp()
    const res = await request(app)
      .post('/api/events/qa-pass')
      .set(QA_HEADERS)
      .send({ agentId: 'agent-audited', auditDate: '2026-09-08', xp: 5000 })

    expect(res.status).toBe(422)
    expect(res.body.error.code).toBe('VALIDATION_FAILED')
  })

  it('rejects a client attempting to manipulate Energy directly', async () => {
    const app = buildTestApp()
    const res = await request(app)
      .post('/api/events/qa-pass')
      .set(QA_HEADERS)
      .send({ agentId: 'agent-audited', auditDate: '2026-09-08', energy: 100 })

    expect(res.status).toBe(422)
  })

  it('rejects a client attempting to manipulate Level directly', async () => {
    const app = buildTestApp()
    const res = await request(app)
      .post('/api/events/qa-pass')
      .set(QA_HEADERS)
      .send({ agentId: 'agent-audited', auditDate: '2026-09-08', level: 10 })

    expect(res.status).toBe(422)
  })

  it('rejects an invalid payload (missing agentId)', async () => {
    const app = buildTestApp()
    const res = await request(app).post('/api/events/qa-pass').set(QA_HEADERS).send({ auditDate: '2026-09-08' })
    expect(res.status).toBe(422)
  })

  it('rejects an audit date in the future', async () => {
    const app = buildTestApp()
    const res = await request(app)
      .post('/api/events/qa-pass')
      .set(QA_HEADERS)
      .send({ agentId: 'agent-audited', auditDate: '2099-01-01' })
    expect(res.status).toBe(422)
  })
})

describe('POST /api/events/documentation-alert', () => {
  it('processes a real Documentation Alert (Energy down, Streak broken, XP untouched)', async () => {
    const app = buildTestApp()
    // Give the audited agent a streak first.
    await request(app).post('/api/events/check-in').set(AGENT_HEADER, 'agent-alerted').send({})

    const res = await request(app)
      .post('/api/events/documentation-alert')
      .set(QA_HEADERS)
      .send({ agentId: 'agent-alerted', auditDate: '2026-09-08' })

    expect(res.status).toBe(200)
    expect(res.body.state.energy).toBe(55) // 75 (after check-in) - 20
    expect(res.body.state.currentStreak).toBe(0)
    expect(res.body.state.xp).toBe(35) // unchanged — the check-in's XP/achievement survive
  })

  it('authorization boundary: an AGENT cannot submit a Documentation Alert', async () => {
    const app = buildTestApp()
    const res = await request(app)
      .post('/api/events/documentation-alert')
      .set(AGENT_HEADER, 'not-qa')
      .send({ agentId: 'agent-alerted', auditDate: '2026-09-08' })
    expect(res.status).toBe(403)
  })
})

describe('POST /api/events/correction', () => {
  it('corrects a QA Pass to an Alert, retroactively recomputing state', async () => {
    const app = buildTestApp()
    const original = await request(app)
      .post('/api/events/qa-pass')
      .set(QA_HEADERS)
      .send({ agentId: 'agent-corrected', auditDate: '2026-09-08' })
    const originalEventId = original.body.events.find((e: { type: string }) => e.type === 'QA_PASS').id

    const res = await request(app)
      .post('/api/events/correction')
      .set(QA_HEADERS)
      .send({ agentId: 'agent-corrected', originalEventId, correctedTo: 'ALERT' })

    expect(res.status).toBe(200)
    expect(res.body.state.energy).toBe(50) // the QA Pass's +10 is gone, replaced by the Alert's -20 (70 base? no — recomputed from scratch)
  })

  it('rejects a correction referencing an unknown event id (404, not 500)', async () => {
    const app = buildTestApp()
    const res = await request(app)
      .post('/api/events/correction')
      .set(QA_HEADERS)
      .send({ agentId: 'agent-x', originalEventId: 'evt_does_not_exist', correctedTo: 'ALERT' })

    expect(res.status).toBe(404)
    expect(res.body.error.code).toBe('NOT_FOUND')
  })

  it('rejects an invalid correctedTo enum value', async () => {
    const app = buildTestApp()
    const res = await request(app)
      .post('/api/events/correction')
      .set(QA_HEADERS)
      .send({ agentId: 'agent-x', originalEventId: 'evt_1', correctedTo: 'MAYBE' })
    expect(res.status).toBe(422)
  })

  it('authorization boundary: an AGENT cannot submit a correction', async () => {
    const app = buildTestApp()
    const res = await request(app)
      .post('/api/events/correction')
      .set(AGENT_HEADER, 'not-qa')
      .send({ agentId: 'agent-x', originalEventId: 'evt_1', correctedTo: 'ALERT' })
    expect(res.status).toBe(403)
  })
})
