// Durable IdempotencyPort backed by the `idempotency_records` table
// (Phase 13 §6). Takes the SAME DatabaseSync connection the
// SqliteRepositoryStore it's paired with uses (see
// application/persistenceContext.ts) — a `record()` call made inside a
// `withTransaction(...)` block therefore commits or rolls back together
// with the Game Engine's state/event writes, exactly like Phase 13 §7
// asks: the idempotency record and the domain change are one atomic unit,
// never split by a crash between them.
import type { DatabaseSync } from 'node:sqlite'
import type { IdempotencyCheckResult, IdempotencyPort } from './IdempotencyPort'

export class SqliteIdempotencyStore implements IdempotencyPort {
  constructor(private db: DatabaseSync) {}

  check(agentId: string, route: string, key: string, requestHash: string): IdempotencyCheckResult {
    const row = this.db
      .prepare('SELECT request_hash, response_json FROM idempotency_records WHERE agent_id = ? AND route = ? AND idempotency_key = ?')
      .get(agentId, route, key) as { request_hash: string; response_json: string } | undefined

    if (!row) return { kind: 'new' }
    if (row.request_hash !== requestHash) return { kind: 'conflict' }
    return { kind: 'duplicate', response: JSON.parse(row.response_json) }
  }

  record(agentId: string, route: string, key: string, requestHash: string, response: unknown): void {
    // INSERT OR IGNORE: if two concurrent callers somehow raced to record
    // the same key (shouldn't happen given this backend's synchronous,
    // single-threaded request handling — see docs/PERSISTENCE_FOUNDATION.md
    // §Concurrency — but this is cheap insurance), the first write wins and
    // the PRIMARY KEY constraint silently absorbs the second rather than
    // throwing.
    this.db
      .prepare(
        `INSERT OR IGNORE INTO idempotency_records (agent_id, route, idempotency_key, request_hash, response_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(agentId, route, key, requestHash, JSON.stringify(response), new Date().toISOString())
  }
}
