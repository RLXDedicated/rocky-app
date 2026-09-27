// Minimal, dependency-free request validation (Phase 12 §12). Deliberately
// hand-rolled rather than pulling in a schema-validation library — the
// shapes here are small and few, and the brief explicitly asks not to
// over-engineer (§2, §24).
import { ApiError } from './errors'

export function requireNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw ApiError.validation(`"${field}" is required and must be a non-empty string.`)
  }
  return value.trim()
}

export function optionalString(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null) return undefined
  if (typeof value !== 'string') {
    throw ApiError.validation(`"${field}" must be a string if present.`)
  }
  return value
}

/** YYYY-MM-DD, and not a date in the future relative to `now`. */
export function requireAuditDate(value: unknown, now: Date, field = 'auditDate'): string {
  const raw = requireNonEmptyString(value, field)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    throw ApiError.validation(`"${field}" must be a YYYY-MM-DD date string.`)
  }
  const parsed = new Date(`${raw}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) {
    throw ApiError.validation(`"${field}" is not a valid date.`)
  }
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (parsed.getTime() > today.getTime()) {
    throw ApiError.validation(`"${field}" cannot be in the future.`)
  }
  return raw
}

export function requireEnum<T extends string>(value: unknown, allowed: readonly T[], field: string): T {
  if (typeof value !== 'string' || !(allowed as readonly string[]).includes(value)) {
    throw ApiError.validation(`"${field}" must be one of: ${allowed.join(', ')}.`)
  }
  return value as T
}

/**
 * Rejects a request body that tries to supply authoritative gamification
 * state directly (Phase 12 §7, §11). Any of these fields present on an
 * inbound request is a client attempting to author state the domain must
 * derive — always a validation failure, never silently ignored (silently
 * ignoring it would hide a client bug or a malicious attempt equally well
 * from whoever's debugging).
 */
const FORBIDDEN_STATE_FIELDS = ['xp', 'level', 'energy', 'streak', 'currentStreak', 'bestStreak', 'mood', 'evolution', 'evolutionStage', 'achievements'] as const

export function rejectClientAuthoredState(body: unknown): void {
  if (typeof body !== 'object' || body === null) return
  const present = FORBIDDEN_STATE_FIELDS.filter((field) => field in (body as Record<string, unknown>))
  if (present.length > 0) {
    throw ApiError.validation(
      `Request body may not include server/domain-controlled field(s): ${present.join(', ')}. These are derived by the Game Engine, never accepted from a client.`,
    )
  }
}

export function parseJsonBody(body: unknown): Record<string, unknown> {
  if (body === undefined || body === null) return {}
  if (typeof body !== 'object' || Array.isArray(body)) {
    throw ApiError.validation('Request body must be a JSON object.')
  }
  return body as Record<string, unknown>
}
