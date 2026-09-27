// ============================================================================
// PILOT IDENTITY. THIS IS NOT AUTHENTICATION EITHER — see the header on
// ./devIdentity.ts for the general policy this follows.
// ============================================================================
//
// The Teams reminder pilot (Phase 1, live) hands each agent a link with
// their own address on it — Power Automate builds that link from the
// SharePoint pilot roster, never from anything the agent typed. This
// middleware trusts whatever arrives in X-Agent-Email as "who this request
// acts as": no password, no signature, no verification that the caller is
// really that person.
//
// That is only acceptable because the frontend is not publicly discoverable
// (nobody reaches it except via that Teams link) and the pilot roster is a
// small, known set of agents with nothing sensitive at stake if one of them
// were to open a link meant for a teammate. It must never be treated as a
// stand-in for real authentication once this goes beyond that closed pilot
// — see docs/SECURITY_BASELINE.md and docs/MIGRATION_PLAN.md for the plan
// to replace it with Entra ID/SSO.
//
// Enabled only when config.authMode === 'pilot-header' (see
// ../config/env.ts) — an explicit opt-in via ROCKY_AUTH_MODE, never a
// default, so a deployment that forgets to configure identity still fails
// closed (401 via devIdentity) rather than silently trusting a header.
import type { NextFunction, Request, Response } from 'express'
import { ApiError } from '../api/errors'
import type { AppConfig } from '../config/env'

// Deliberately loose: this only needs to reject obvious garbage (blank
// strings, values with no "@"), not fully validate RFC 5322 email syntax —
// the roster it's ultimately compared against does that job downstream.
const LOOKS_LIKE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function createPilotIdentity(config: Pick<AppConfig, 'adminEmails'>) {
  const adminEmails = new Set(config.adminEmails)

  return function pilotIdentity(req: Request, _res: Response, next: NextFunction): void {
    const rawEmail = req.header('X-Agent-Email')
    const email = rawEmail?.trim().toLowerCase()

    if (!email || !LOOKS_LIKE_EMAIL.test(email)) {
      next(ApiError.unauthorized('X-Agent-Email header is required and must look like an email address.'))
      return
    }

    // Every pilot request acts as an AGENT unless its address is on the
    // explicit ROCKY_ADMIN_EMAILS allowlist (see AppConfig.adminEmails),
    // which acts as ADMIN — the pilot's QA coordinators. With no allowlist
    // configured, QA/ADMIN-only routes stay unreachable, as before.
    req.identity = { agentId: email, role: adminEmails.has(email) ? 'ADMIN' : 'AGENT' }
    next()
  }
}
