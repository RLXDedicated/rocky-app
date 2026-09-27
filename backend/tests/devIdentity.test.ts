import { afterEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import { AGENT_HEADER, buildMemoryPersistence } from './testApp'

// This test exercises env.ts's hard rule directly (NODE_ENV=production ⇒
// devIdentityEnabled is false, unconditionally) rather than mutating
// process.env for the whole suite — see config/env.ts's loadConfig(env)
// overload.
describe('Development identity — disabled in production', () => {
  afterEach(() => {
    vi.resetModules()
  })

  it('config.devIdentityEnabled is false whenever NODE_ENV=production, regardless of other flags', async () => {
    const { loadConfig } = await import('../src/config/env')
    const prodConfig = loadConfig({ NODE_ENV: 'production' })
    expect(prodConfig.devIdentityEnabled).toBe(false)

    const devConfig = loadConfig({ NODE_ENV: 'development' })
    expect(devConfig.devIdentityEnabled).toBe(true)
  })

  it('every request is rejected with 401 when dev identity is disabled — even with a valid-looking header', async () => {
    vi.resetModules()
    vi.doMock('../src/config/env', async () => {
      const actual = await vi.importActual<typeof import('../src/config/env')>('../src/config/env')
      return { ...actual, config: { ...actual.loadConfig({ NODE_ENV: 'production' }) } }
    })
    const { createApp } = await import('../src/app')
    // This test is only about the identity middleware, not persistence —
    // inject an in-memory context explicitly so it never touches a real
    // SQLite file on disk (createApp()'s no-argument default would
    // otherwise build a real durable store from the mocked "production"
    // config above, since that config is itself validly configured for
    // sqlite at its default path).
    const app = createApp({ persistence: buildMemoryPersistence() })

    const res = await request(app).get('/api/game-state').set(AGENT_HEADER, 'someone')
    expect(res.status).toBe(401)
  })
})
