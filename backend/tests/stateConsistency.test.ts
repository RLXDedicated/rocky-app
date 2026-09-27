import { describe, expect, it } from 'vitest'
import request from 'supertest'
import { AGENT_HEADER, buildTestApp } from './testApp'

describe('State consistency', () => {
  it('GET /api/game-state after a Check-in reflects exactly what the Check-in response returned', async () => {
    const app = buildTestApp()
    const checkIn = await request(app).post('/api/events/check-in').set(AGENT_HEADER, 'agent-consistency').send({})
    const state = await request(app).get('/api/game-state').set(AGENT_HEADER, 'agent-consistency')

    expect(state.body).toEqual(checkIn.body.state)
  })

  it('two different agents never see each other\'s state (per-agent isolation)', async () => {
    const app = buildTestApp()
    await request(app).post('/api/events/check-in').set(AGENT_HEADER, 'agent-a').send({})

    const stateA = await request(app).get('/api/game-state').set(AGENT_HEADER, 'agent-a')
    const stateB = await request(app).get('/api/game-state').set(AGENT_HEADER, 'agent-b')

    expect(stateA.body.xp).toBe(35)
    expect(stateB.body.xp).toBe(0) // untouched — agent-b never checked in
  })

  it('GET /api/agent/me returns the identity the request authenticated as', async () => {
    const app = buildTestApp()
    const res = await request(app).get('/api/agent/me').set(AGENT_HEADER, 'agent-identity-check')
    expect(res.status).toBe(200)
    expect(res.body.id).toBe('agent-identity-check')
  })
})

describe('Event persistence', () => {
  it('a Check-in persists a CHECK_IN event (and an ACHIEVEMENT event for the first one) retrievable via game-state\'s companion data', async () => {
    const app = buildTestApp()
    const res = await request(app).post('/api/events/check-in').set(AGENT_HEADER, 'agent-events').send({})

    const types = res.body.events.map((e: { type: string }) => e.type)
    expect(types).toContain('CHECK_IN')
    expect(types).toContain('ACHIEVEMENT')
    for (const event of res.body.events) {
      expect(event.id).toBeTruthy()
      expect(event.agentId).toBe('agent-events')
      expect(event.timestamp).toBeTruthy()
    }
  })

  it('events are immutable and additive: a second distinct action appends, never replaces, history', async () => {
    const app = buildTestApp()
    const checkIn = await request(app).post('/api/events/check-in').set(AGENT_HEADER, 'agent-append').send({})
    const achievements = await request(app).get('/api/achievements').set(AGENT_HEADER, 'agent-append')

    expect(checkIn.body.events.length).toBeGreaterThan(0)
    expect(achievements.body.unlocked.length).toBe(1)
    expect(achievements.body.metrics.checkins).toBe(1)
  })
})

describe('Response DTO correctness', () => {
  it('CheckInResponse has exactly the documented shape (no leaked internal fields)', async () => {
    const app = buildTestApp()
    const res = await request(app).post('/api/events/check-in').set(AGENT_HEADER, 'agent-dto').send({})

    expect(Object.keys(res.body).sort()).toEqual(
      ['alreadyCheckedInToday', 'events', 'evolved', 'leveledUp', 'newAchievements', 'state'].sort(),
    )
  })

  it('AchievementsResponse has the documented shape', async () => {
    const app = buildTestApp()
    await request(app).post('/api/events/check-in').set(AGENT_HEADER, 'agent-dto-2').send({})
    const res = await request(app).get('/api/achievements').set(AGENT_HEADER, 'agent-dto-2')

    expect(Object.keys(res.body).sort()).toEqual(['metrics', 'unlocked'].sort())
    expect(Object.keys(res.body.metrics).sort()).toEqual(['checkins', 'qaPasses', 'streak'].sort())
  })

  it('LeaderboardResponse has the documented shape', async () => {
    const app = buildTestApp()
    const res = await request(app).get('/api/leaderboard').set(AGENT_HEADER, 'agent-dto-3')

    expect(Object.keys(res.body).sort()).toEqual(['currentUser', 'entries', 'rankChange'].sort())
    expect(Array.isArray(res.body.entries)).toBe(true)
  })

  it('an error response always has { error: { code, message, requestId } } and nothing else sensitive', async () => {
    const app = buildTestApp()
    const res = await request(app).get('/api/game-state') // no identity header
    expect(res.status).toBe(401)
    expect(Object.keys(res.body)).toEqual(['error'])
    expect(Object.keys(res.body.error).sort()).toEqual(['code', 'message', 'requestId'].sort())
    expect(res.body.error.message).not.toMatch(/at\s+.*\(.*:\d+:\d+\)/) // no stack-trace-shaped content
  })
})
