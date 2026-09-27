import { describe, expect, it } from 'vitest'
import request from 'supertest'
import { AGENT_HEADER, buildTestApp } from './testApp'

// Smoke/contract coverage (Phase 12 §19) for the remaining read endpoints
// documented in docs/API_CONTRACTS.md — these reuse teamService.ts /
// leaderboardService.ts / reminderService.ts unchanged, so the point of
// these tests is proving the API wiring and response shape, not
// re-verifying ranking/scoring rules already covered by those modules'
// own frontend tests.
describe('Team / Team Leaderboard / Reminders endpoints', () => {
  it('GET /api/team returns the caller\'s team detail', async () => {
    const app = buildTestApp()
    const res = await request(app).get('/api/team').set(AGENT_HEADER, 'agent-team')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('id')
    expect(res.body).toHaveProperty('score')
    expect(Array.isArray(res.body.members)).toBe(true)
  })

  it('GET /api/team-leaderboard returns all teams ranked', async () => {
    const app = buildTestApp()
    const res = await request(app).get('/api/team-leaderboard').set(AGENT_HEADER, 'agent-team')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.teams)).toBe(true)
    expect(res.body.teams.length).toBeGreaterThan(0)
  })

  it('GET /api/reminders returns the reminder history shape', async () => {
    const app = buildTestApp()
    const res = await request(app).get('/api/reminders').set(AGENT_HEADER, 'agent-reminders')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.reminders)).toBe(true)
  })

  it('reminder lifecycle actions 404 on an unknown reminder id rather than silently succeeding', async () => {
    const app = buildTestApp()
    const res = await request(app).post('/api/reminders/does-not-exist/opened').set(AGENT_HEADER, 'agent-reminders')
    expect(res.status).toBe(404)
  })

  it('all read endpoints require identity (401 without X-Dev-Agent-Id)', async () => {
    const app = buildTestApp()
    for (const path of ['/api/team', '/api/team-leaderboard', '/api/reminders', '/api/achievements', '/api/leaderboard']) {
      const res = await request(app).get(path)
      expect(res.status).toBe(401)
    }
  })
})
