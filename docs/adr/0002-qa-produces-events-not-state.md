# ADR-0002: QA creates domain events instead of directly modifying gamification state

## Status
Accepted

## Context
Production QA workflows need a way to record audit results (QA Pass,
Documentation Alert) and occasional corrections. The local MVP already
solves this correctly for its own QA Simulator: `GameService.qaPass()`/
`.documentationAlert()`/`.correction()` each call an Engine function that
derives the consequence and emits an immutable `GameEvent`; none of them
accept "set energy to X" as an instruction. A production QA Console could,
in theory, be built either the same way or as a form that directly edits
an agent's stored `GameState` — the latter would be faster to build and
strictly wrong.

## Decision
QA Console (and any future QA-facing surface) is an **event producer**,
never a state mutator. Its only three write operations against the system
are: record a QA Pass, record a Documentation Alert, record a Correction.
Each becomes exactly one domain event processed by the unchanged Engine
functions that already exist. QA can never directly set XP, Energy,
Streak, Mood, Evolution stage, or unlock an Achievement.

## Consequences
- Every QA-driven state change remains deterministic, auditable
  (`recalculateStateFromEvents` can reproduce it from history), and
  correctable (a wrong QA Pass becomes a `CORRECTION` event, not an
  overwritten field).
- If a future requirement seems to need QA to set something directly, the
  correct response is a new event type processed by the Engine — never a
  new direct-write endpoint.
- QA Console's implementation complexity moves from "a form with save
  buttons" to "a form that submits one of three well-defined events" —
  slightly more design work up front, in exchange for consistency with
  every other write path in the system.
