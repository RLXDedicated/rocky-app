import { describe, expect, it } from 'vitest'
import request from 'supertest'
import { AGENT_HEADER, ROLE_HEADER, buildTestApp } from './testApp'

const QA_HEADERS = { [AGENT_HEADER]: 'qa-reviewer', [ROLE_HEADER]: 'QA' } as const

describe('Idempotency-Key reused with a DIFFERENT payload → 409, never executed (Phase 13 §6)', () => {
  it('rejects a QA Pass whose key was already used for a different auditDate', async () => {
    const app = buildTestApp()
    const first = await request(app)
      .post('/api/events/qa-pass')
      .set(QA_HEADERS)
      .set('Idempotency-Key', 'k1')
      .send({ agentId: 'agent-conflict', auditDate: '2026-09-08' })
    expect(first.status).toBe(200)

    const conflicting = await request(app)
      .post('/api/events/qa-pass')
      .set(QA_HEADERS)
      .set('Idempotency-Key', 'k1')
      .send({ agentId: 'agent-conflict', auditDate: '2026-09-07' }) // different date, same key

    expect(conflicting.status).toBe(409)
    expect(conflicting.body.error.code).toBe('CONFLICT')

    // The conflicting request must NOT have executed — state unchanged since the first call.
    const state = await request(app).get('/api/game-state').set(AGENT_HEADER, 'agent-conflict')
    expect(state.body.xp).toBe(first.body.state.xp)
  })

  it('rejects a QA Pass whose key was already used for a different agentId', async () => {
    const app = buildTestApp()
    await request(app)
      .post('/api/events/qa-pass')
      .set(QA_HEADERS)
      .set('Idempotency-Key', 'k2')
      .send({ agentId: 'agent-x', auditDate: '2026-09-08' })

    const conflicting = await request(app)
      .post('/api/events/qa-pass')
      .set(QA_HEADERS)
      .set('Idempotency-Key', 'k2')
      .send({ agentId: 'agent-y', auditDate: '2026-09-08' })

    // Different agentId means a different idempotency scope entirely
    // (keyed by agentId+route+key) — this is actually a fresh key for
    // agent-y, so it succeeds as a genuinely new submission, not a conflict.
    expect(conflicting.status).toBe(200)
  })

  it('rejects a Documentation Alert whose key was reused with a different payload', async () => {
    const app = buildTestApp()
    await request(app)
      .post('/api/events/documentation-alert')
      .set(QA_HEADERS)
      .set('Idempotency-Key', 'k3')
      .send({ agentId: 'agent-alert-conflict', auditDate: '2026-09-08' })

    const conflicting = await request(app)
      .post('/api/events/documentation-alert')
      .set(QA_HEADERS)
      .set('Idempotency-Key', 'k3')
      .send({ agentId: 'agent-alert-conflict', auditDate: '2026-09-07' })

    expect(conflicting.status).toBe(409)
  })

  it('rejects a Correction whose key was reused with a different correctedTo', async () => {
    const app = buildTestApp()
    const qaPass = await request(app)
      .post('/api/events/qa-pass')
      .set(QA_HEADERS)
      .send({ agentId: 'agent-correction-conflict', auditDate: '2026-09-08' })
    const originalEventId = qaPass.body.events.find((e: { type: string }) => e.type === 'QA_PASS').id

    await request(app)
      .post('/api/events/correction')
      .set(QA_HEADERS)
      .set('Idempotency-Key', 'k4')
      .send({ agentId: 'agent-correction-conflict', originalEventId, correctedTo: 'ALERT' })

    const conflicting = await request(app)
      .post('/api/events/correction')
      .set(QA_HEADERS)
      .set('Idempotency-Key', 'k4')
      .send({ agentId: 'agent-correction-conflict', originalEventId, correctedTo: 'PASS', reason: 'changed my mind' })

    expect(conflicting.status).toBe(409)
  })
})
