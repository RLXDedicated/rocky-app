// Shared by every Repository implementation (Phase 13 §5): a duplicate
// write of an event/achievement id that already exists is normal
// idempotent-replay behavior (silently ignored, per DOMAIN_RULES.md
// §Idempotency) ONLY when its content matches what's already stored. An
// incoming record with the SAME id but DIFFERENT content is never
// idempotent replay — it's either a real id collision or a bug — and must
// never silently overwrite the original (events/achievements are
// immutable) or be silently dropped (that would hide the problem). It's
// reported as a conflict instead.
export class RepositoryConflictError extends Error {
  constructor(kind: 'event' | 'achievement', id: string) {
    super(`A different ${kind} with id "${id}" already exists — refusing to overwrite an immutable record.`)
    this.name = 'RepositoryConflictError'
  }
}

/** Recursively sorts object keys so key order never affects the comparison. */
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

/** Compares two records field-by-field (order-independent, deep) for equality. */
export function sameContent<T extends object>(a: T, b: T): boolean {
  return JSON.stringify(canonicalize(a)) === JSON.stringify(canonicalize(b))
}
