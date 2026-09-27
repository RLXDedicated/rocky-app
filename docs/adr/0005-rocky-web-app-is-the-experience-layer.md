# ADR-0005: Rocky Web App remains the primary experience layer; Teams is the entry point, not the logic

## Status
Accepted

## Context
Microsoft Teams is the intended production entry point for agents — most
employees live in Teams day-to-day, and a Teams tab/personal app lowers
friction to check in. It would be possible to build gamification logic or
UI directly as a Teams app/bot instead of linking out to a web app, or to
duplicate parts of the Rocky experience as native Teams adaptive cards
with their own logic.

## Decision
The Rocky Web App (the existing React/TypeScript frontend) remains the
one place the full agent experience (Home, Achievements, Leaderboard,
Team, Team Leaderboard, Onboarding, reminders UI) is implemented. Teams is
a deep-linked entry point into that same web app, plus a delivery channel
for notifications (via Power Automate) — it is not a second, parallel
implementation of the product, and it does not host business logic.

## Consequences
- The product only needs to be built and maintained once. A Teams tab
  embeds the same web app that a direct browser visit would load.
- Notification content (via Power Automate → Teams) links back into the
  web app rather than trying to fully replicate a screen inside an
  adaptive card.
- If a future requirement pushes toward richer native-Teams UI (e.g. a
  bot conversation flow), that UI must still call the same
  Game/Application API and contain no business rules of its own — this
  ADR's boundary applies regardless of which surface renders the pixels.
