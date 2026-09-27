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

  it('never grants QA/ADMIN roles — QA-only routes stay unreachable via pilot identity', async () => {
    const app = createApp({ config: pilotConfig(), persistence: buildMemoryPersistence() })
    const res = await request(app)
      .post('/api/events/qa-pass')
      .set('X-Agent-Email', 'agent.one@rlx.us')
      .send({ agentId: 'agent.one@rlx.us', auditDate: '2026-09-08' })
    expect(res.status).toBe(403)
  })
})
