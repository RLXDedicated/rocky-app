// ============================================================================
// DEVELOPMENT-ONLY IDENTITY. THIS IS NOT AUTHENTICATION.
// ============================================================================
//
// Real production identity (Microsoft Entra ID) is explicitly out of scope
// for Phase 12 (see docs/SECURITY_BASELINE.md, docs/MIGRATION_PLAN.md Stage
// 3). Every route in this backend still needs *some* notion of "who is
// calling" to exercise the Game Engine's per-agent behavior and to prove
// the QA-vs-AGENT authorization boundary (docs/API_CONTRACTS.md §3) — this
// middleware provides that, and nothing more, for development and testing.
//
// Requests carry:
//   X-Dev-Agent-Id  — which agent this request acts as (required)
//   X-Dev-Role      — AGENT (default) | QA | SUPERVISOR | ADMIN
//
// Hard rules:
//   - `config.devIdentityEnabled` is FALSE whenever NODE_ENV=production
//     (env.ts enforces this — it cannot be toggled back on by an env var).
//   - When disabled, EVERY request is rejected with 401. There is no
//     fallback "trust nobody" identity, and no path by which this
//     mechanism can accidentally become the production auth story — a
//     disabled dev-identity middleware means a backend with no working
//     identity at all, which is the correct (safe) state for a system
//     that hasn't implemented real auth yet.
//   - Nothing here performs authentication (there is no credential, no
//     token, no verification) — it is a development convenience, clearly
//     named and isolated so nobody mistakes it for the real thing.
import type { NextFunction, Request, Response } from 'express'
import { config } from '../config/env'
import { ApiError } from '../api/errors'

export type DevRole = 'AGENT' | 'QA' | 'SUPERVISOR' | 'ADMIN'

const VALID_ROLES: readonly DevRole[] = ['AGENT', 'QA', 'SUPERVISOR', 'ADMIN']

export interface DevIdentity {
  agentId: string
  role: DevRole
}

declare module 'express-serve-static-core' {
  interface Request {
    identity?: DevIdentity
  }
}

function isDevRole(value: string): value is DevRole {
  return (VALID_ROLES as readonly string[]).includes(value)
}

export function devIdentity(req: Request, _res: Response, next: NextFunction): void {
  if (!config.devIdentityEnabled) {
    // Production has no working identity path yet — reject outright
    // rather than falling back to a default agent. See file header.
    next(ApiError.unauthorized('No authentication mechanism is configured for this environment.'))
    return
  }

  const agentId = req.header('X-Dev-Agent-Id')
  if (!agentId || agentId.trim().length === 0) {
    next(ApiError.unauthorized('X-Dev-Agent-Id header is required in development/test.'))
    return
  }

  const roleHeader = req.header('X-Dev-Role') ?? 'AGENT'
  if (!isDevRole(roleHeader)) {
    next(ApiError.badRequest(`X-Dev-Role must be one of ${VALID_ROLES.join(', ')}.`))
    return
  }

  req.identity = { agentId: agentId.trim(), role: roleHeader }
  next()
}

/** Route guard: only the given roles may proceed. */
export function requireRole(...roles: DevRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.identity) {
      next(ApiError.unauthorized())
      return
    }
    if (!roles.includes(req.identity.role)) {
      next(ApiError.forbidden(`This operation requires one of: ${roles.join(', ')}.`))
      return
    }
    next()
  }
}
