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
