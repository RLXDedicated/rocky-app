// Sign-in with work email + PIN, so an agent's Rocky follows them to any
// PC or phone. The first sign-in for an address creates its PIN; after
// that the PIN is required and verified against a salted scrypt hash.
// Successful sign-ins return a random session token (only its SHA-256 hash
// is stored) valid for SESSION_DAYS. Repeated wrong PINs lock the address
// for LOCK_MINUTES. Every sign-in, failure, lockout and sign-out is written
// to the audit trail.
//
// This is a pilot-grade account system, not SSO: the step after the pilot
// is Microsoft Entra ID (docs/MIGRATION_PLAN.md), which would replace the
// PIN check while keeping the sessions and audit trail.
import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { ApiError } from '../api/errors'
import type { AppConfig } from '../config/env'
import type { PersistenceContext } from '../infrastructure/persistenceContext'
import type { SessionRecord } from '../infrastructure/accounts/AccountStore'
import { GameService, systemClock, type Clock } from '../domain/rockyEngine'

export const SESSION_DAYS = 90
export const MAX_FAILED_ATTEMPTS = 5
export const LOCK_MINUTES = 15
const PIN_PATTERN = /^\d{4,8}$/
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
/** last_seen_at is only rewritten when older than this, to keep reads cheap. */
const TOUCH_EVERY_MS = 5 * 60_000

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

function hashPin(pin: string, salt: string): string {
  return scryptSync(pin, salt, 32).toString('hex')
}

export interface AuthApplicationServiceDeps {
  persistence: PersistenceContext
  config: Pick<AppConfig, 'adminEmails' | 'loginDomains'>
  clock?: Clock
}

export interface LoginInput {
  email: unknown
  pin: unknown
  userAgent?: string
}

export function createAuthApplicationService({ persistence, config, clock = systemClock }: AuthApplicationServiceDeps) {
  const accounts = persistence.accounts
  const admins = new Set(config.adminEmails)
  const roleFor = (email: string) => (admins.has(email) ? 'ADMIN' : 'AGENT') as 'ADMIN' | 'AGENT'

  function normalizeEmail(raw: unknown): string {
    const email = typeof raw === 'string' ? raw.trim().toLowerCase() : ''
    if (!EMAIL_PATTERN.test(email) || email.length > 200) throw ApiError.validation('Enter a valid work email.')
    if (config.loginDomains.length > 0 && !config.loginDomains.some((d) => email.endsWith(`@${d}`))) {
      throw ApiError.validation(`Use your work email (${config.loginDomains.map((d) => `@${d}`).join(', ')}).`)
    }
    return email
  }

  function audit(agentId: string, action: string, detail: Record<string, unknown> | null, userAgent?: string) {
    accounts.addAudit({
      agentId,
      actor: agentId,
      action,
      detail: { ...detail, ...(userAgent ? { device: userAgent.slice(0, 160) } : {}) },
      source: 'login',
      createdAt: clock.now().toISOString(),
    })
  }

  return {
    status(rawEmail: unknown) {
      const email = normalizeEmail(rawEmail)
      return { email, hasPin: accounts.getCredential(email) !== null }
    },

    login({ email: rawEmail, pin: rawPin, userAgent }: LoginInput) {
      const email = normalizeEmail(rawEmail)
      const pin = typeof rawPin === 'string' ? rawPin.trim() : ''
      if (!PIN_PATTERN.test(pin)) throw ApiError.validation('The PIN must be 4 to 8 digits.')

      return persistence.withTransaction(() => {
        const now = clock.now()
        const iso = now.toISOString()
        const existing = accounts.getCredential(email)
        let firstLogin = false

        if (!existing) {
          const salt = randomBytes(16).toString('hex')
          accounts.saveCredential({
            agentId: email,
            pinHash: hashPin(pin, salt),
            salt,
            failedAttempts: 0,
            lockedUntil: null,
            createdAt: iso,
            updatedAt: iso,
          })
          firstLogin = true
          audit(email, 'auth.pin-created', null, userAgent)
        } else {
          if (existing.lockedUntil && existing.lockedUntil > iso) {
            audit(email, 'auth.locked-attempt', null, userAgent)
            throw new ApiError(
              429,
              'LOCKED',
              `Too many wrong PINs. Try again after ${new Date(existing.lockedUntil).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}, or ask QA to reset your PIN.`,
            )
          }
          const expected = Buffer.from(existing.pinHash, 'hex')
          const actual = Buffer.from(hashPin(pin, existing.salt), 'hex')
          if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
            const failed = existing.failedAttempts + 1
            const lock = failed >= MAX_FAILED_ATTEMPTS
            accounts.saveCredential({
              ...existing,
              failedAttempts: lock ? 0 : failed,
              lockedUntil: lock ? new Date(now.getTime() + LOCK_MINUTES * 60_000).toISOString() : existing.lockedUntil,
              updatedAt: iso,
            })
            audit(email, lock ? 'auth.locked' : 'auth.failed', { attempt: failed }, userAgent)
            // Committed on purpose: the failed attempt must count even though we answer with an error.
            return {
              error: lock
                ? `Too many wrong PINs — sign-in is locked for ${LOCK_MINUTES} minutes.`
                : `Wrong PIN. ${MAX_FAILED_ATTEMPTS - failed} attempts left.`,
            }
          }
          if (existing.failedAttempts > 0 || existing.lockedUntil)
            accounts.saveCredential({ ...existing, failedAttempts: 0, lockedUntil: null, updatedAt: iso })
        }

        const token = randomBytes(32).toString('base64url')
        const expiresAt = new Date(now.getTime() + SESSION_DAYS * 86_400_000).toISOString()
        accounts.createSession({
          tokenHash: hashToken(token),
          agentId: email,
          createdAt: iso,
          expiresAt,
          lastSeenAt: iso,
          userAgent: userAgent?.slice(0, 200) ?? null,
          revokedAt: null,
        })
        audit(email, 'auth.login', { firstLogin }, userAgent)

        // Creates the agent's record on first sign-in, same as their first Teams link.
        const agent = new GameService(persistence.repoStore.forAgent(email), clock).getSnapshot().agent
        return { token, expiresAt, firstLogin, agent: { ...agent, role: roleFor(email) } }
      })
    },

    /** Resolves a bearer token to the signed-in agent, or null when it is unknown, expired or revoked. */
    resolve(token: string): { agentId: string; role: 'ADMIN' | 'AGENT' } | null {
      const tokenHash = hashToken(token)
      const session: SessionRecord | null = accounts.getSession(tokenHash)
      const now = clock.now()
      if (!session || session.revokedAt || session.expiresAt <= now.toISOString()) return null
      if (now.getTime() - Date.parse(session.lastSeenAt) > TOUCH_EVERY_MS) accounts.touchSession(tokenHash, now.toISOString())
      return { agentId: session.agentId, role: roleFor(session.agentId) }
    },

    logout(token: string) {
      const session = accounts.getSession(hashToken(token))
      if (!session) return { ok: true }
      accounts.revokeSession(session.tokenHash, clock.now().toISOString())
      audit(session.agentId, 'auth.logout', null)
      return { ok: true }
    },

    /** Admin: forget the agent's PIN (they choose a new one at next sign-in) and sign them out everywhere. */
    resetPin(agentId: string, actorId: string) {
      return persistence.withTransaction(() => {
        const iso = clock.now().toISOString()
        accounts.deleteCredential(agentId)
        const revoked = accounts.revokeAgentSessions(agentId, iso)
        accounts.addAudit({
          agentId,
          actor: actorId,
          action: 'admin.pin-reset',
          detail: { sessionsRevoked: revoked },
          source: 'admin',
          createdAt: iso,
        })
        return { ok: true, sessionsRevoked: revoked }
      })
    },

    /** Admin: sign the agent out of every device. */
    revokeSessions(agentId: string, actorId: string) {
      return persistence.withTransaction(() => {
        const iso = clock.now().toISOString()
        const revoked = accounts.revokeAgentSessions(agentId, iso)
        accounts.addAudit({
          agentId,
          actor: actorId,
          action: 'admin.sessions-revoked',
          detail: { sessionsRevoked: revoked },
          source: 'admin',
          createdAt: iso,
        })
        return { ok: true, sessionsRevoked: revoked }
      })
    },
  }
}

export type AuthApplicationService = ReturnType<typeof createAuthApplicationService>
