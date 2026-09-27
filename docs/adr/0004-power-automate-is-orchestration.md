# ADR-0004: Power Automate is orchestration, not business-rule execution

## Status
Accepted

## Context
Reminder delivery to Teams needs some scheduled/triggered mechanism, and
Power Automate is a natural, RLX-approved-ecosystem candidate for that
job. Power Automate flows are easy to extend with conditional logic
directly in the flow designer, which creates a temptation to implement
"if energy < 40, send a nudge" (or similar) as a flow condition instead of
calling back into the API — especially once a flow already has the
relevant data in front of it.

## Decision
Power Automate's role is strictly orchestration: triggering a scheduled
eligibility check against the API, and delivering whatever notification
payload the API returns to Teams. It never calculates XP, Level, Streak,
Energy, or Mood, and never decides Evolution or implements any
gamification rule itself. All eligibility logic (working hours, cooldown,
adaptive cooldown, daily cap, category priority) stays in
`reminderEngine.ts`/`GAME_CONFIG`, called through the API.

## Consequences
- A change to reminder rules (e.g. adjusting the cooldown) only ever
  requires touching `GAME_CONFIG`/`reminderEngine.ts` — never a Power
  Automate flow definition.
- Power Automate flows stay simple (trigger → call API → branch on
  "candidate returned or not" → deliver), which also makes them easier to
  review and to hand off operationally.
- Code/flow review for any Power Automate change should check it isn't
  quietly re-implementing a condition that already exists in the Engine.
