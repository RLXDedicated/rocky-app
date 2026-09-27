// The idempotency contract both implementations (in-memory and SQLite)
// satisfy. Application services depend on this interface only (Phase 13
// §6, §16) — never on a concrete class.
import { createHash } from 'node:crypto'

export type IdempotencyCheckResult =
  | { kind: 'new' }
  | { kind: 'duplicate'; response: unknown }
  /** Same (agentId, route, key) but a DIFFERENT request payload — never silently replayed or re-executed. */
  | { kind: 'conflict' }

export interface IdempotencyPort {
  check(agentId: string, route: string, key: string, requestHash: string): IdempotencyCheckResult
  record(agentId: string, route: string, key: string, requestHash: string, response: unknown): void
}

/** Recursively sorts object keys so key order never affects the hash. */
function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize)
  if (value !== null && typeof value === 'object') {
    const sorted: Record<string, unknown> = {}
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      sorted[key] = canonicalize((value as Record<string, unknown>)[key])
    }
    return sorted
  }
  return value
}

/** A stable hash of a request payload, used to detect "same Idempotency-Key, different body" (Phase 13 §6). */
export function hashRequest(payload: unknown): string {
  return createHash('sha256').update(JSON.stringify(canonicalize(payload))).digest('hex')
}
