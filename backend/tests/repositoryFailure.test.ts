import { describe, expect, it } from 'vitest'
import request from 'supertest'
import type { PersistenceContext } from '../src/infrastructure/persistenceContext'
import { AGENT_HEADER, buildTestApp } from './testApp'
import { InMemoryAccountStore } from '../src/infrastructure/accounts/InMemoryAccountStore'

/** A persistence context whose repository always throws — simulates a durable-store outage. */
function brokenPersistence(): PersistenceContext {
  return {
    repoStore: {
      forAgent() {
        throw new Error('simulated repository outage: connection refused')
      },
      hasAgent() {
        throw new Error('simulated repository outage: connection refused')
      },
      deleteAgent() {
        throw new Error('simulated repository outage: connection refused')
      },
      listAgentIds() {
        throw new Error('simulated repository outage: connection refused')
      },
      withTransaction<T>(fn: () => T): T {
        return fn()
      },
    },
    idempotency: {
      check: () => ({ kind: 'new' }),
      record: () => {},
    },
    accounts: new InMemoryAccountStore(),
    withTransaction<T>(fn: () => T): T {
      return fn()
    },
    close: () => {},
  }
}

describe('Repository failure handling', () => {
  it('a repository failure returns 500 with no internal detail leaked to the client', async () => {
    const app = buildTestApp({ persistence: brokenPersistence() })
    const res = await request(app).get('/api/game-state').set(AGENT_HEADER, 'agent-x')

    expect(res.status).toBe(500)
    expect(res.body.error.code).toBe('INTERNAL_ERROR')
    expect(res.body.error.message).not.toMatch(/simulated repository outage/)
    expect(res.body.error.message).not.toMatch(/connection refused/)
    expect(res.body.error.requestId).toBeTruthy()
  })

  it('a repository failure on Check-in is also handled without a raw stack trace', async () => {
    const app = buildTestApp({ persistence: brokenPersistence() })
    const res = await request(app).post('/api/events/check-in').set(AGENT_HEADER, 'agent-x').send({})

    expect(res.status).toBe(500)
    expect(res.body.error.code).toBe('INTERNAL_ERROR')
  })
})
