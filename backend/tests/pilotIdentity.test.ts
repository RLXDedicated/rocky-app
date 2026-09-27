import { describe, expect, it } from 'vitest'
import request from 'supertest'
import { createApp } from '../src/app'
import { loadConfig } from '../src/config/env'
import { buildMemoryPersistence } from './testApp'
import { fixedClock } from '../../src/engine/clock'

function pilotConfig(overrides: Partial<Parameters<typeof loadConfig>[0]> = {}) {
  return loadConfig({
    NODE_ENV: 'production',
    ROCKY_PERSISTENCE_DRIVER: 'sqlite',
    ROCKY_DB_PATH: '/tmp/rocky-pilot-identity-test.db',
    ROCKY_AUTH_MODE: 'pilot-header',
    ...overrides,
  })
}

describe('Pilot identity (X-Agent-Email) — Teams-pilot-only stopgap', () => {
  it('is only active when ROCKY_AUTH_MODE=pilot-header — otherwise a production deployment stays fail-closed', () => {
    const cfg = loadConfig({ NODE_ENV: 'production', ROCKY_PERSISTENCE_DRIVER: 'sqlite', ROCKY_DB_PATH: '/tmp/rocky-default-test.db' })
    expect(cfg.authMode).toBe('dev')
    expect(cfg.devIdentityEnabled).toBe(false)
  })

  it('accepts a well-formed X-Agent-Email and treats it as the agentId, lowercased', async () => {
    const app = createApp({
      config: pilotConfig(),
      persistence: buildMemoryPersistence(),
      clock: fixedClock('2026-09-08T12:00:00.000Z'),
    })

    const res = await request(app).get('/api/agent/me').set('X-Agent-Email', 'Agent.One@RLX.us')
    expect(res.status).toBe(200)
    expect(res.body.id).toBe('agent.one@rlx.us')
  })

  it('rejects a request with no X-Agent-Email header', async () => {
    const app = createApp({ config: pilotConfig(), persistence: buildMemoryPersistence() })
    const res = await request(app).get('/api/game-state')
    expect(res.status).toBe(401)
  })

  it('rejects a value that does not look like an email', async () => {
    const app = createApp({ config: pilotConfig(), persistence: buildMemoryPersistence() })
    const res = await request(app).get('/api/game-state').set('X-Agent-Email', 'not-an-email')
    expect(res.status).toBe(401)
  })

  it('never grants QA/ADMIN roles without an allowlist — QA-only routes stay unreachable via pilot identity', async () => {
    const app = createApp({ config: pilotConfig(), persistence: buildMemoryPersistence() })
    const res = await request(app)
      .post('/api/events/qa-pass')
      .set('X-Agent-Email', 'agent.one@rlx.us')
      .send({ agentId: 'agent.one@rlx.us', auditDate: '2026-09-08' })
    expect(res.status).toBe(403)
  })

  it('reports role AGENT on /api/agent/me for a regular agent', async () => {
    const app = createApp({ config: pilotConfig({ ROCKY_ADMIN_EMAILS: 'qa.lead@rlx.us' }), persistence: buildMemoryPersistence() })
    const res = await request(app).get('/api/agent/me').set('X-Agent-Email', 'agent.one@rlx.us')
    expect(res.status).toBe(200)
    expect(res.body.role).toBe('AGENT')
  })

  describe('ROCKY_ADMIN_EMAILS allowlist', () => {
    const adminConfig = () => pilotConfig({ ROCKY_ADMIN_EMAILS: ' QA.Lead@RLX.us , second.qa@rlx.us' })

    it('grants ADMIN to an allowlisted address, case-insensitively, and reports it on /api/agent/me', async () => {
      const app = createApp({ config: adminConfig(), persistence: buildMemoryPersistence() })
      const res = await request(app).get('/api/agent/me').set('X-Agent-Email', 'qa.lead@rlx.us')
      expect(res.status).toBe(200)
      expect(res.body.role).toBe('ADMIN')
    })

    it('lets an allowlisted admin record a QA Pass for another agent', async () => {
      const app = createApp({ config: adminConfig(), persistence: buildMemoryPersistence(), clock: fixedClock('2026-09-08T12:00:00.000Z') })
      const res = await request(app)
        .post('/api/events/qa-pass')
        .set('X-Agent-Email', 'second.qa@rlx.us')
        .send({ agentId: 'agent.one@rlx.us', auditDate: '2026-09-08' })
      expect(res.status).toBe(200)
      expect(res.body.state.xp).toBeGreaterThan(0)
    })

    it('lists every known agent with their state on /api/admin/agents for admins only', async () => {
      const app = createApp({ config: adminConfig(), persistence: buildMemoryPersistence() })
      await request(app).get('/api/agent/me').set('X-Agent-Email', 'agent.two@rlx.us')
      await request(app).get('/api/agent/me').set('X-Agent-Email', 'agent.one@rlx.us')

      const forbidden = await request(app).get('/api/admin/agents').set('X-Agent-Email', 'agent.one@rlx.us')
      expect(forbidden.status).toBe(403)

      const res = await request(app).get('/api/admin/agents').set('X-Agent-Email', 'qa.lead@rlx.us')
      expect(res.status).toBe(200)
      const ids = res.body.agents.map((a: { id: string }) => a.id)
      expect(ids).toEqual(expect.arrayContaining(['agent.one@rlx.us', 'agent.two@rlx.us']))
      expect(res.body.agents[0].state).toHaveProperty('xp')
    })
  })
})
