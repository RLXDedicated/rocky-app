// In-memory IdempotencyPort — used with InMemoryRepositoryStore (dev/test
// only, per config.persistenceDriver). Lost on restart, same as the
// repository it pairs with; see SqliteIdempotencyStore for the durable
// equivalent (Phase 13 §6).
import type { IdempotencyCheckResult, IdempotencyPort } from './IdempotencyPort'

interface Record_ {
  requestHash: string
  response: unknown
}

export class InMemoryIdempotencyStore implements IdempotencyPort {
  private records = new Map<string, Record_>()

  private keyFor(agentId: string, route: string, key: string): string {
    return `${agentId}::${route}::${key}`
  }

  check(agentId: string, route: string, key: string, requestHash: string): IdempotencyCheckResult {
    const existing = this.records.get(this.keyFor(agentId, route, key))
    if (!existing) return { kind: 'new' }
    if (existing.requestHash !== requestHash) return { kind: 'conflict' }
    return { kind: 'duplicate', response: existing.response }
  }

  record(agentId: string, route: string, key: string, requestHash: string, response: unknown): void {
    this.records.set(this.keyFor(agentId, route, key), { requestHash, response })
  }

  /** Test-only. */
  clear(): void {
    this.records.clear()
  }
}
