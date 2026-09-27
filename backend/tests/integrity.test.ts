import { afterEach, describe, expect, it } from 'vitest'
import { SqliteRepositoryStore } from '../src/infrastructure/persistence/sqliteRepository'
import { SqliteIdempotencyStore } from '../src/infrastructure/idempotency/SqliteIdempotencyStore'
import { tempSqlitePath } from './testApp'

describe('Data integrity (Phase 13 §13, §17.H)', () => {
  let cleanup: () => void
  afterEach(() => cleanup?.())

  it('the idempotency_records UNIQUE(agent_id, route, idempotency_key) constraint prevents duplicate rows even with a raw double-write', () => {
    const temp = tempSqlitePath()
    cleanup = temp.cleanup
    const store = new SqliteRepositoryStore(temp.path)
    const idem = new SqliteIdempotencyStore(store.connection)

    idem.record('agent-1', 'qa-pass', 'key-1', 'hash-a', { ok: true })
    // A second, raw `record()` call for the exact same (agent, route, key)
    // — INSERT OR IGNORE means the row is not duplicated, and the FIRST
    // response wins (the row is never overwritten either).
    idem.record('agent-1', 'qa-pass', 'key-1', 'hash-a', { ok: false, different: true })

    const rows = store.connection.prepare('SELECT COUNT(*) as count FROM idempotency_records WHERE agent_id = ? AND route = ? AND idempotency_key = ?').get('agent-1', 'qa-pass', 'key-1') as { count: number }
    expect(rows.count).toBe(1)

    const check = idem.check('agent-1', 'qa-pass', 'key-1', 'hash-a')
    expect(check).toEqual({ kind: 'duplicate', response: { ok: true } }) // first write wins
    store.close()
  })

  it('a malformed stored event payload (invalid JSON) surfaces as an explicit error, not silent corruption or a crash', () => {
    const temp = tempSqlitePath()
    cleanup = temp.cleanup
    const store = new SqliteRepositoryStore(temp.path)
    store.forAgent('agent-1') // ensure the agent row exists

    // Simulate a corrupted row by writing invalid JSON directly — bypassing
    // this backend's own saveEvent (which always writes valid JSON), the
    // same way a hand-edited or externally-corrupted database file might.
    store.connection
      .prepare('INSERT INTO events (event_id, agent_id, type, event_date, timestamp, payload_json) VALUES (?, ?, ?, ?, ?, ?)')
      .run('evt_corrupt', 'agent-1', 'CHECK_IN', '2026-09-08', '2026-09-08T12:00:00.000Z', '{not valid json')

    // Reading it throws (JSON.parse fails) rather than returning a
    // half-parsed or silently-defaulted event — this is intentionally
    // NOT swallowed into a fallback, per Phase 13 §12 ("no esconder
    // errores con fallback silencioso").
    expect(() => store.forAgent('agent-1').getEvents()).toThrow()
    store.close()
  })

  it('re-opening a database file with an unexpected extra (forward-compatible) column does not break reads', () => {
    const temp = tempSqlitePath()
    cleanup = temp.cleanup
    const store = new SqliteRepositoryStore(temp.path)
    store.forAgent('agent-1').saveAgent({ id: 'agent-1', name: 'Test', rockyName: 'Rocky' })
    // Simulate a future migration having added a column this version of
    // the code doesn't know about — SELECT * still works; only code that
    // assumed a fixed column COUNT (rather than named columns) would break,
    // and this repository never does that.
    store.connection.exec('ALTER TABLE agents ADD COLUMN future_field TEXT')
    store.close()

    const reopened = new SqliteRepositoryStore(temp.path)
    expect(reopened.forAgent('agent-1').getAgent()).toEqual({ id: 'agent-1', name: 'Test', rockyName: 'Rocky' })
    reopened.close()
  })
})
