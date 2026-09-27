# Architecture — Rocky Local MVP

This document describes the layering of the local prototype and the
boundary a future migration to Teams + a Rocky Web App + SharePoint/API +
Power Automate would cross. Nothing here changes local behavior — it exists
to make the existing separation explicit and to keep it from eroding.

## Layers

```
UI (React components)
    ↓ reads/calls
Services (application layer)
    ↓ calls
Game Engine (pure domain logic)
    ↓ (Engine never calls this directly — Services do, on the Engine's behalf)
Repository (persistence contract)
    ↓
localStorage (today) — SharePoint/API/DB (future)
```

### UI layer — `src/components/`, `src/App.tsx`

React components. They call a Service method, render the result, and manage
purely presentational state (which screen is showing, an in-progress
animation, a form field's current value). They never:

- compute XP/Energy/Level/Mood/Evolution/Achievement rules themselves,
- read or write `localStorage` directly,
- decide reminder eligibility.

Components that read-and-record something in the same call (e.g. the
Leaderboard's rank-change signal) guard their effect with a `useRef` so
React 18 StrictMode's dev-only double effect invocation can't send the
signal twice — see `Leaderboard.tsx`, `TeamPage.tsx`, `TeamLeaderboard.tsx`,
`ReminderHost.tsx` for the pattern.

### Services — `src/services/`

The application layer: `gameService`, `reminderService`, `teamService`,
`leaderboardService`, `onboardingService`, `appModeService`. A Service:

- reads current state from the `Repository`,
- calls one or more pure Game Engine functions to compute the next state,
- persists the result back through the `Repository`,
- returns a plain result object for the UI to render.

Services accept their `Repository` (and, where time matters, their `Clock`)
as constructor/parameter dependencies with sensible production defaults —
this is what makes them swappable and testable without touching the Engine.

### Game Engine — `src/engine/`

Pure domain logic. No React, no `window`/`document`, no direct
`localStorage` access, and (per Phase 9 hardening) no *implicit* current-time
lookups — every function that needs "now" takes it as an explicit `Date`
parameter. `gameEngine.ts` is the center of this layer:
`processCheckIn`, `processQAPass`, `processDocumentationAlert`,
`processCorrection`, `recalculateStateFromEvents`, `calculateMood`, and the
supporting pure calculators. Sibling files own one concern each:
`levels.ts` (thresholds), `achievements.ts` (catalog + evaluation),
`streakMilestones.ts`, `reminderEngine.ts`, `teamScore.ts`,
`leaderboard.ts`. `gameConfig.ts` centralizes the approved numeric constants
these files use (see DOMAIN_RULES.md).

A small `Clock` interface (`clock.ts`) exists for the one place true
non-determinism could leak in: a Service method's default `now` parameter.
`systemClock` is the production implementation; tests inject `fixedClock(...)`.

### Repository — `src/repository/`

`Repository` (interface) + `LocalStorageRepository` (today's only
implementation) + `sanitize.ts` (defensive parsing/validation). The
Repository's job is persistence and retrieval only — it never contains game
rules. Every write to a collection (events, achievements, reminders) is
idempotent by id: saving an event/achievement/reminder whose id already
exists is a silent no-op, not a duplicate insert.

Reads never throw on corrupted data. `sanitize.ts` validates field-by-field
(wrong type, out-of-range number, unrecognized enum value) and repairs what
it can, falling back to `INITIAL_GAME_STATE` defaults only for the fields
that are actually invalid — not the whole record. A `rocky.schemaVersion`
key is written alongside every save so a future migration has something to
branch on; there is only one schema version today, so nothing reads it yet.

## Event flow

1. UI calls a Service method (e.g. `gameService.checkIn()`).
2. Service reads `GameState` + event history from the Repository.
3. Service calls the matching Engine function, which returns a new
   `GameState` plus zero or more new `GameEvent`s (and, where relevant, new
   `Achievement` records) — the Engine never persists anything itself.
4. Service persists the new state and appends the new events/achievements
   through the Repository (each save is idempotent by id).
5. Service returns a result object; the UI renders it and (for Home)
   chooses a Rocky reaction from that result.

Events are immutable and are the durable source of truth for progression.
`recalculateStateFromEvents(events)` replays the full history — deduplicated
by event id — from `INITIAL_GAME_STATE` and reproduces the same `GameState`
a live sequence of calls would have produced. A `CORRECTION` event never
edits the event it corrects; it references it, and the whole state is
recomputed from the corrected history (see DOMAIN_RULES.md §Corrections).

## Reminder flow

`ReminderHost` (mounted once, globally) polls `reminderService.checkForReminder()`
on an interval and once on mount (guarded against StrictMode's double
invocation). That function reads `GameState`/events/reminder history from
the Repository, asks the pure `evaluateReminderOpportunity` (in
`reminderEngine.ts`) whether a reminder is due right now, and — only if
so — persists it as `sent` and returns it. A reminder's optional action
(e.g. "CHECK IN WITH ROCKY") calls the exact same `gameService.checkIn()`
Home uses; reminders never grant XP/Energy/Streak themselves.

## Future migration boundary

Everything below the Repository line is meant to change; nothing above it
should have to. To move to SharePoint/an API:

1. Implement a new class satisfying the `Repository` interface
   (`SharePointRepository` / `ApiRepository`), reading/writing the same
   shapes (`GameState`, `GameEvent[]`, `Achievement[]`, `ReminderRecord[]`,
   `Agent`).
2. Pass it into `GameService`/`reminderService` in place of
   `LocalStorageRepository` (they already accept a `Repository` as a
   parameter, never construct one internally at the type level).
3. The Game Engine, and every UI component, needs zero changes — they only
   ever talked to the Repository interface and the Services, never to
   `localStorage` directly.

This phase deliberately does **not** implement that repository, add
authentication, or introduce Azure/SharePoint/Teams/Power Automate — see the
Phase 9 Completion Report for what's still open.

**Phase 11** designed the full target production architecture around this
boundary — see `docs/PRODUCTION_ARCHITECTURE.md`, `docs/API_CONTRACTS.md`,
`docs/DATA_OWNERSHIP.md`, `docs/SECURITY_BASELINE.md`, `docs/MIGRATION_PLAN.md`,
and `docs/adr/` — again design/documentation only, nothing described there is
implemented.
