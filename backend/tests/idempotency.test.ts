import { describe, expect, it } from 'vitest'
import request from 'supertest'
import { AGENT_HEADER, ROLE_HEADER, buildTestApp } from './testApp'

const QA_HEADERS = { [AGENT_HEADER]: 'qa-reviewer-1', [ROLE_HEADER]: 'QA' } as const

describe('Idempotency', () => {
  it('a retried QA Pass with the same Idempotency-Key does NOT award XP twice', async () => {
    const app = buildTestApp()
    const body = { agentId: 'agent-retry', auditDate: '2026-09-08' }

    const first = await request(app)
      .post('/api/events/qa-pass')
      .set(QA_HEADERS)
      .set('Idempotency-Key', 'audit-record-42')
      .send(body)
    const retried = await request(app)
      .post('/api/events/qa-pass')
      .set(QA_HEADERS)
      .set('Idempotency-Key', 'audit-record-42')
      .send(body)

    expect(first.status).toBe(200)
    expect(retried.status).toBe(200)
    expect(retried.body).toEqual(first.body) // identical cached response
    expect(retried.body.state.xp).toBe(50) // NOT double-granted (would be 75+ if it re-ran)

    const finalState = await request(app).get('/api/game-state').set(AGENT_HEADER, 'agent-retry')
    expect(finalState.body.xp).toBe(50)
  })

  it('a DIFFERENT Idempotency-Key for the same agent is a genuinely new event (two real audits)', async () => {
    const app = buildTestApp()
    const first = await request(app)
      .post('/api/events/qa-pass')
      .set(QA_HEADERS)
      .set('Idempotency-Key', 'audit-1')
      .send({ agentId: 'agent-two-audits', auditDate: '2026-09-08' })
    const second = await request(app)
      .post('/api/events/qa-pass')
      .set(QA_HEADERS)
      .set('Idempotency-Key', 'audit-2')
      .send({ agentId: 'agent-two-audits', auditDate: '2026-09-08' })

    expect(first.body.state.xp).toBe(50) // 25 base + 25 first-QA-pass achievement
    expect(second.body.state.xp).toBe(75) // +25 more — a second, real QA Pass
  })

  it('without an Idempotency-Key, a retried request is a distinct submission (documents the boundary — QA Console MUST send one)', async () => {
    const app = buildTestApp()
    const body = { agentId: 'agent-no-key', auditDate: '2026-09-08' }
    const first = await request(app).post('/api/events/qa-pass').set(QA_HEADERS).send(body)
    const second = await request(app).post('/api/events/qa-pass').set(QA_HEADERS).send(body)

    expect(first.body.state.xp).toBe(50)
    expect(second.body.state.xp).toBe(75) // no key supplied — treated as two real audits, by design
  })

  it('a duplicate Check-in submission (no key needed — the domain same-day guard already handles it)', async () => {
    const app = buildTestApp()
    const first = await request(app).post('/api/events/check-in').set(AGENT_HEADER, 'agent-checkin-retry').send({})
    const second = await request(app).post('/api/events/check-in').set(AGENT_HEADER, 'agent-checkin-retry').send({})

    expect(first.body.alreadyCheckedInToday).toBe(false)
    expect(second.body.alreadyCheckedInToday).toBe(true)
    expect(second.body.state.xp).toBe(first.body.state.xp)
  })
})
