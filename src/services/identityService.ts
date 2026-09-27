// Captures "which agent is this" for the Teams-reminder pilot, without any
// login flow (ADR: decoupled Rocky architecture, pilot speed over building
// real SSO now — see docs/adr/). The Adaptive Card's "Ver mi progreso"
// button opens this app with `?agente=<email>` on the URL; we read that
// once, remember it for the rest of this browser's sessions, and use it as
// the identity header for every backend call (see apiClient.ts /
// pilotIdentity.ts on the backend). Nobody types a password anywhere.
//
// If the app is ever opened with no `agente` param (e.g. a bookmark, or a
// teammate's link is unavailable) and nothing was captured before, there is
// simply no known agent — remoteSync/apiClient treat that as "stay fully
// local", the same offline-first experience this MVP has always had.
const AGENT_EMAIL_KEY = 'rocky.identity.agentEmail'

export function captureIdentityFromUrl(location: Pick<Location, 'search'> = window.location): void {
  const params = new URLSearchParams(location.search)
  const email = params.get('agente')?.trim().toLowerCase()
  if (email && email.length > 0) {
    window.localStorage.setItem(AGENT_EMAIL_KEY, email)
  }
}

export function getAgentEmail(): string | null {
  return window.localStorage.getItem(AGENT_EMAIL_KEY)
}

// The role the backend reported for this agent on the last successful sync
// (GET /api/agent/me — decided server-side from ROCKY_ADMIN_EMAILS, see
// backend/src/middleware/pilotIdentity.ts). Only used to decide whether to
// SHOW QA/admin tooling; every QA/admin action is re-authorized by the
// backend, so tampering with this value unlocks nothing that matters.
const AGENT_ROLE_KEY = 'rocky.identity.role'

export type AgentRole = 'AGENT' | 'QA' | 'SUPERVISOR' | 'ADMIN'

export function setAgentRole(role: AgentRole | null): void {
  if (role) window.localStorage.setItem(AGENT_ROLE_KEY, role)
  else window.localStorage.removeItem(AGENT_ROLE_KEY)
}

export function getAgentRole(): AgentRole | null {
  return window.localStorage.getItem(AGENT_ROLE_KEY) as AgentRole | null
}

/** True for the pilot's QA coordinators (QA or ADMIN role) — gates QA Tools and the Admin panel. */
export function isQaStaff(): boolean {
  const role = getAgentRole()
  return role === 'QA' || role === 'ADMIN'
}
