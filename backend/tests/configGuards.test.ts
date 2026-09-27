import { describe, expect, it } from 'vitest'
import { loadConfig } from '../src/config/env'

describe('Configuration & production safety guards (Phase 13 §15)', () => {
  it('defaults to the durable sqlite driver in development', () => {
    const cfg = loadConfig({ NODE_ENV: 'development' })
    expect(cfg.persistenceDriver).toBe('sqlite')
    expect(cfg.dbPath).not.toBe(':memory:')
    expect(cfg.dbPath).toMatch(/rocky\.local\.db$/)
  })

  it('defaults to the fast in-memory driver in test', () => {
    const cfg = loadConfig({ NODE_ENV: 'test' })
    expect(cfg.persistenceDriver).toBe('memory')
  })

  it('honors a custom ROCKY_DB_PATH', () => {
    const cfg = loadConfig({ NODE_ENV: 'development', ROCKY_DB_PATH: 'somewhere/custom.db' })
    expect(cfg.dbPath).toMatch(/somewhere[\\/]custom\.db$/)
  })

  it('honors an explicit ROCKY_PERSISTENCE_DRIVER override', () => {
    const cfg = loadConfig({ NODE_ENV: 'development', ROCKY_PERSISTENCE_DRIVER: 'memory' })
    expect(cfg.persistenceDriver).toBe('memory')
  })

  it('PRODUCTION GUARD: refuses to start with the in-memory driver', () => {
    expect(() => loadConfig({ NODE_ENV: 'production', ROCKY_PERSISTENCE_DRIVER: 'memory' })).toThrow(/in-memory repository/i)
  })

  it('PRODUCTION GUARD: refuses to start with ROCKY_DB_PATH=:memory:', () => {
    expect(() =>
      loadConfig({ NODE_ENV: 'production', ROCKY_PERSISTENCE_DRIVER: 'sqlite', ROCKY_DB_PATH: ':memory:' }),
    ).toThrow(/not durable storage/i)
  })

  it('PRODUCTION GUARD: dev identity is force-disabled regardless of driver', () => {
    const cfg = loadConfig({ NODE_ENV: 'production', ROCKY_PERSISTENCE_DRIVER: 'sqlite', ROCKY_DB_PATH: '/tmp/prod.db' })
    expect(cfg.devIdentityEnabled).toBe(false)
  })

  it('a correctly configured production environment loads without throwing', () => {
    expect(() =>
      loadConfig({ NODE_ENV: 'production', ROCKY_PERSISTENCE_DRIVER: 'sqlite', ROCKY_DB_PATH: '/tmp/rocky-prod-test.db' }),
    ).not.toThrow()
  })
})
