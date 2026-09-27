# ADR-0003: Repository abstraction separates localStorage from production persistence

## Status
Accepted (the abstraction already exists; this ADR records why it stays
as-is rather than being redesigned for production)

## Context
The local MVP's `Repository` interface (`src/repository/repository.ts`)
is already the only thing between the Game Engine/Services and
`localStorage`. Phase 11 considered whether production needs a different
or split interface (per-collection `AgentRepository`/`GameStateRepository`/
etc., as the Fase 11 brief sketches) before any SharePoint/API
implementation is built.

## Decision
Keep the existing single `Repository` interface as the code-level
contract; document the per-collection responsibility split
(`API_CONTRACTS.md` §1) as a *design grouping* for whoever implements
production persistence, not as a required code change. No production
Repository implementation (SharePoint- or API-backed) is built in this
phase.

## Consequences
- Migrating to a production store means writing one new class that
  satisfies the existing `Repository` interface and swapping which
  instance `GameService`/`reminderService`/`teamService`/
  `leaderboardService` are constructed with — they already accept a
  `Repository` as a parameter with a `LocalStorageRepository` default,
  never construct one internally at the type level.
- The Game Engine and every UI component need zero changes for this
  swap — they only ever talk to the Repository interface and the
  Services, never to `localStorage` directly (unchanged from
  `ARCHITECTURE.md`'s existing migration boundary section).
- If a future implementer finds the single interface awkward once a real
  SharePoint/API implementation exists, splitting it at that point is a
  mechanical refactor, not a redesign — the responsibility boundaries are
  already documented (`API_CONTRACTS.md` §1).
