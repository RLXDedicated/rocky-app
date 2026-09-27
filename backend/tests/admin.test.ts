import { describe, expect, it } from 'vitest'
import request from 'supertest'
import { createApp } from '../src/app'
import { loadConfig } from '../src/config/env'
import { buildMemoryPersistence } from './testApp'
import { fixedClock } from '../../src/engine/clock'

const ADMIN = 'qa.lead@rlx.us'

function buildAdminApp() {
  const config = loadConfig({
    NODE_ENV: 'production',
    ROCKY_PERSISTENCE_DRIVER: 'sqlite',
    ROCKY_DB_PATH: '/tmp/rocky-admin-test.db',
    ROCKY_AUTH_MODE: 'pilot-header',
    ROCKY_ADMIN_EMAILS: ADMIN,
  })
  return createApp({ config, persistence: buildMemoryPersistence(), clock: fixedClock('2026-09-08T12:00:00.000Z') })
}

const as = (email: string) => ({ 'X-Agent-Email': email })

describe('Admin console API (QA/ADMIN only)', () => {
  it('rejects every admin route for a regular agent', async () => {
    const app = buildAdminApp()
    for (const [method, path] of [
      ['get', '/api/admin/overview'],
      ['get', '/api/admin/system'],
      ['get', '/api/admin/agents/x@rlx.us'],
      ['patch', '/api/admin/agents/x@rlx.us'],
      ['post', '/api/admin/agents/x@rlx.us/reset'],
      ['delete', '/api/admin/agents/x@rlx.us'],
    ] as const) {
      const res = await request(app)[method](path).set(as('agent.one@rlx.us')).send({})
      expect(res.status, `${method} ${path}`).toBe(403)
    }
  })

  it('returns 404 for an unknown agent and never creates it', async () => {
    const app = buildAdminApp()
    const res = await request(app).get('/api/admin/agents/ghost@rlx.us').set(as(ADMIN))
    expect(res.status).toBe(404)
    const list = await request(app).get('/api/admin/agents').set(as(ADMIN))
    expect(list.body.agents.map((a: { id: string }) => a.id)).not.toContain('ghost@rlx.us')
  })

  it('shows per-agent detail with metrics and the event timeline', async () => {
    const app = buildAdminApp()
    await request(app).post('/api/events/check-in').set(as('agent.one@rlx.us')).send({})
    await request(app).post('/api/events/qa-pass').set(as(ADMIN)).send({ agentId: 'agent.one@rlx.us', auditDate: '2026-09-08' })

    const res = await request(app).get('/api/admin/agents/agent.one@rlx.us').set(as(ADMIN))
    expect(res.status).toBe(200)
    expect(res.body.agent.metrics.checkIns).toBe(1)
    expect(res.body.agent.metrics.qaPasses).toBe(1)
    expect(res.body.agent.metrics.checkedInToday).toBe(true)
    expect(res.body.events.map((e: { type: string }) => e.type)).toEqual(expect.arrayContaining(['CHECK_IN', 'QA_PASS']))
  })

  it('computes pilot-wide overview analytics', async () => {
    const app = buildAdminApp()
    await request(app).post('/api/events/check-in').set(as('agent.one@rlx.us')).send({})
    await request(app).get('/api/agent/me').set(as('agent.two@rlx.us'))
    await request(app).post('/api/events/documentation-alert').set(as(ADMIN)).send({ agentId: 'agent.two@rlx.us', auditDate: '2026-09-08' })

    const res = await request(app).get('/api/admin/overview').set(as(ADMIN))
    expect(res.status).toBe(200)
    const { kpis, daily, recentActivity } = res.body
    expect(kpis.totalAgents).toBe(2)
    expect(kpis.checkedInToday).toBe(1)
    expect(kpis.checkInRateToday).toBe(50)
    expect(kpis.totalAlerts).toBe(1)
    expect(daily).toHaveLength(30)
    expect(daily.at(-1).checkIns).toBe(1)
    expect(recentActivity.length).toBeGreaterThanOrEqual(2)
    expect(res.body.atRiskAgents.map((a: { id: string }) => a.id)).toContain('agent.two@rlx.us')
  })

  it('renames, resets and deletes an agent', async () => {
    const app = buildAdminApp()
    await request(app).post('/api/events/check-in').set(as('demo@rlx.us')).send({})

    const renamed = await request(app).patch('/api/admin/agents/demo@rlx.us').set(as(ADMIN)).send({ name: 'Demo Agent' })
    expect(renamed.status).toBe(200)
    expect(renamed.body.name).toBe('Demo Agent')

    const reset = await request(app).post('/api/admin/agents/demo@rlx.us/reset').set(as(ADMIN)).send({})
    expect(reset.status).toBe(200)
    const afterReset = await request(app).get('/api/admin/agents/demo@rlx.us').set(as(ADMIN))
    expect(afterReset.body.agent.state.xp).toBe(0)
    expect(afterReset.body.events).toHaveLength(0)
    expect(afterReset.body.agent.name).toBe('Demo Agent')

    const del = await request(app).delete('/api/admin/agents/demo@rlx.us').set(as(ADMIN))
    expect(del.status).toBe(200)
    const list = await request(app).get('/api/admin/agents').set(as(ADMIN))
    expect(list.body.agents.map((a: { id: string }) => a.id)).not.toContain('demo@rlx.us')
  })

  it('reports system configuration', async () => {
    const app = buildAdminApp()
    const res = await request(app).get('/api/admin/system').set(as(ADMIN))
    expect(res.status).toBe(200)
    expect(res.body.timezone).toBe('America/Bogota')
    expect(res.body.adminEmails).toEqual([ADMIN])
  })
})

describe('ROCKY_TIMEZONE', () => {
  it('defaults to America/Bogota and rejects an invalid zone', () => {
    expect(loadConfig({}).timezone).toBe('America/Bogota')
    expect(loadConfig({ ROCKY_TIMEZONE: 'Europe/Madrid' }).timezone).toBe('Europe/Madrid')
    expect(() => loadConfig({ ROCKY_TIMEZONE: 'Not/AZone' })).toThrow(/ROCKY_TIMEZONE/)
  })
})
