# ADR-0001: The Game Engine remains platform-independent

## Status
Accepted

## Context
Rocky's local MVP already isolates business rules (`src/engine/`) from UI,
persistence, and any framework concern. Phase 11 designs a production
architecture that adds Microsoft Teams, Power Automate, SharePoint/an API,
and Entra ID identity around the product. There is a real risk that any of
these integrations quietly grows its own copy of a rule (e.g. a Power
Automate flow that decides reminder eligibility itself, or an API endpoint
that computes XP inline) — at which point the Engine stops being the
single source of truth.

## Decision
The Game Engine (`src/engine/`) must never depend on, or be duplicated by,
Microsoft 365 integration code. It has no dependency on React, `window`,
`localStorage`, Teams, SharePoint, Power Automate, or an identity provider
today, and this must remain true through every migration stage.

Concretely: React components, Teams integration, SharePoint integration,
Power Automate, the authentication provider, notification transport, and
the Repository implementation must never contain business rules. Every
number and decision (XP, Level, Energy, Mood, Streak, Achievements,
Evolution, Recovery, reminder eligibility) is computed by an Engine
function.

## Consequences
- The Engine can move from running in the browser (today) to running
  server-side inside a Game/Application API (production) with zero
  changes to its own code — only who calls it changes.
- Every integration layer becomes a thin adapter: it can call the Engine
  forward (get a result) or feed it an event backward (report something
  happened), but it can never decide what an event does.
- Code review for any future PR touching Teams/Power Automate/SharePoint/
  auth code should explicitly check for rule leakage against this ADR.
