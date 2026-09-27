# Security Baseline — Rocky (Design Only)

Phase 11 deliverable. Describes the production security posture Rocky
should be built toward. **No authentication, authorization, or security
control is implemented by this document or this phase.**

## 1. Identity

- Microsoft Entra ID is the intended sole authentication source for every
  production human actor (AGENT, QA, SUPERVISOR, ADMIN).
- The local MVP's `Agent.id` becomes, in production, a value derived from
  the authenticated identity (e.g. the Entra object id, or an internal
  agent id mapped 1:1 from it) — never a value the client is trusted to
  supply on its own.
- DEVELOPER tooling (QA Simulator, Developer Controls) has no production
  identity at all, because it has no production presence (§4 of
  `PRODUCTION_ARCHITECTURE.md`).

## 2. Authorization

- **Role-based**, enforced **server-side only**, in the Game/Application
  API layer — never trusted from a client-supplied role claim in a
  request body, and never inferred solely from which UI surface made the
  call.
- **Least privilege**: AGENT can act only as themselves; QA can submit
  audit events but never read another agent's full event history without
  a defined business need; SUPERVISOR gets team-level aggregates, not raw
  per-agent event streams; ADMIN gets configuration access, not a
  backdoor around domain rules.
- Every authorization decision is a **server-side** check on the
  authenticated identity's role and scope — the same request made by two
  different roles must be authorized (or rejected) identically regardless
  of which client sent it.

## 3. Input & event validation

- All values that feed the Game Engine are validated at the API boundary
  before the Engine ever sees them: agent id resolves to a real agent,
  audit dates are valid and not in the future, correction references an
  event id that actually exists.
- **No client-controlled XP, Energy, Level, or Achievements** — every
  numeric consequence is computed by the Engine from an event, never
  accepted as a number in a request body. A `POST /api/events/check-in`
  request carries no XP value; the Engine decides it.
- Event payloads follow the existing `GameEvent.payload` shape
  (`Record<string, unknown>`) — the API layer should validate the fields
  it expects for that `EventType` before persisting, the same discipline
  `sanitize.ts` already applies on read for local storage.

## 4. Idempotency & replay protection

- Every event-creating endpoint must be idempotent by the underlying
  event id, exactly as `Repository.saveEvent`/`saveAchievement`/
  `saveReminder` already guarantee locally (`DOMAIN_RULES.md`
  §Idempotency) — a retried request must never double-grant.
- **Replay protection**: a captured/replayed Check-in or QA Pass request
  must not be able to re-grant its reward. The same-day guard
  (`alreadyCheckedInToday`) and dedup-by-id already provide this locally;
  production should additionally consider standard replay defenses at the
  transport layer (short-lived tokens, nonce/timestamp validation on
  sensitive mutations) as a defense-in-depth measure, not a replacement
  for the domain-level idempotency that already exists.
- **Duplicate submission protection**: QA Console submitting the same
  audit result twice (e.g. a double-click, or a retried network request)
  must not create two events — the API should derive a stable id for the
  underlying event from the audit system's own record reference where
  possible, so a retry is naturally idempotent rather than needing a
  separate dedup mechanism.

## 5. Audit logging

- Every event that changes `GameState` is, by construction, already an
  immutable, timestamped `GameEvent` — this **is** the audit trail for
  gamification consequences and should remain the primary one; a
  production logging/observability stack supplements it, it doesn't
  replace it.
- QA actions (Pass, Alert, Correction) should log who performed the
  action (QA reviewer identity) and when, in addition to the resulting
  event — this is separate from the event log itself, which records *what
  happened to the agent's state*, not *who caused it*. Both matter for a
  real audit trail.
- Corrections in particular need clear before/after visibility — since a
  correction triggers a full replay (`recalculateStateFromEvents`), the
  audit record should capture the original event, the correction event,
  and ideally the state delta it produced.

## 6. Secrets & transport

- Secrets management: none of this project's current code holds a
  secret; production API credentials, Entra app registration secrets,
  and any Power Automate connection secrets must live in an approved
  secrets store (e.g. Azure Key Vault, or whatever RLX's approved
  standard is) — never in source control or client-side code.
- **HTTPS everywhere**, no exceptions, for every environment above LOCAL.
- Environment separation: DEV/TEST/PROD credentials and data must never
  share a tenant/store in a way that lets a DEV-environment bug touch
  PROD data (§8, Environments, in `PRODUCTION_ARCHITECTURE.md`).

## 7. Logging hygiene

- Application/API logs correlate by `agentId`/`eventId`/a request
  correlation id — not by employee name, email, or other PII, unless a
  specific, justified operational need requires it and that need has
  been reviewed.
- QA audit *content* (what was reviewed, why it passed/failed) should be
  logged with the same care as any other employee-performance-adjacent
  data — this is a privacy/data-governance question that needs RLX
  confirmation (§24 Q9-scale decision), not an assumption made here.

## 8. What this phase explicitly does NOT do

- No authentication is implemented.
- No authorization middleware is written.
- No secrets are provisioned.
- No logging pipeline is stood up.
- This document is the target baseline a future implementation phase
  should be measured against, not a claim that any of it exists yet.
