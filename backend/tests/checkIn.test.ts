import { describe, expect, it } from 'vitest'
import request from 'supertest'
import { AGENT_HEADER, buildTestApp } from './testApp'

describe('POST /api/events/check-in', () => {
  it('processes a real Check-in through the unchanged Game Engine', async () => {
    const app = buildTestApp()
    const res = await request(app).post('/api/events/check-in').set(AGENT_HEADER, 'agent-1').send({})

    expect(res.status).toBe(200)
    // First Check-in ever: +10 XP base, +25 "First Step" achievement = 35.
    // These numbers come from the Game Engine, not this test — this
    // assertion exists to prove the API is actually wired to it (Phase 12
    // §23), not to re-verify the rule itself (already covered by
    // src/engine/gameEngine.test.ts).
    expect(res.body.state.xp).toBe(35)
    expect(res.body.state.energy).toBe(75)
    expect(res.body.state.currentStreak).toBe(1)
    expect(res.body.newAchievements).toHaveLength(1)
    expect(res.body.newAchievements[0].id).toBe('first_step')
    expect(res.body.alreadyCheckedInToday).toBe(false)
  })

  it('rejects a request body that tries to author state directly (client-controlled XP)', async () => {
    const app = buildTestApp()
    const res = await request(app).post('/api/events/check-in').set(AGENT_HEADER, 'agent-1').send({ xp: 999999 })

    expect(res.status).toBe(422)
    expect(res.body.error.code).toBe('VALIDATION_FAILED')
  })

  it('a second real Check-in the same day is a no-op (existing same-day guard), not a duplicate reward', async () => {
    const app = buildTestApp()
    const agent = request.agent(app)
    const first = await agent.post('/api/events/check-in').set(AGENT_HEADER, 'agent-2').send({})
    const second = await agent.post('/api/events/check-in').set(AGENT_HEADER, 'agent-2').send({})

    expect(first.body.alreadyCheckedInToday).toBe(false)
    expect(second.body.alreadyCheckedInToday).toBe(true)
    expect(second.body.state.xp).toBe(first.body.state.xp) // no double reward
  })

  it('requires an X-Dev-Agent-Id header (401 without it)', async () => {
    const app = buildTestApp()
    const res = await request(app).post('/api/events/check-in').send({})
    expect(res.status).toBe(401)
    expect(res.body.error.code).toBe('UNAUTHORIZED')
  })

  it('rejects malformed JSON with 400, not 500', async () => {
    const app = buildTestApp()
    const res = await request(app)
      .post('/api/events/check-in')
      .set(AGENT_HEADER, 'agent-1')
      .set('Content-Type', 'application/json')
      .send('{not valid json')

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('BAD_REQUEST')
  })
})
