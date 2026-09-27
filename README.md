# Rocky — Documentation Companion (Local MVP)

A local, fully offline prototype of "Rocky," a documentation-habit
companion for Lowe's RLX agents. Built with React + TypeScript + Vite,
persisted entirely to `localStorage` — no backend, no external services, no
real employee data.

A separate, **not-yet-connected** backend foundation also exists at
`backend/` (Phase 12) — a Node/Express API in front of the same, unchanged
Game Engine, for local/dev use only. The frontend above does not call it;
see `docs/BACKEND_FOUNDATION.md`.

See **DEMO.md** for the stakeholder walkthrough script, and
**ARCHITECTURE.md** / **DOMAIN_RULES.md** / **DATA_MODEL.md** for how it's
built and why.

## What this is (and isn't)

This validates the product experience — Check-ins, QA Pass/Documentation
Alert feedback, Streaks, Achievements, Rocky's Evolution, an Individual and
Team Leaderboard, and contextual Reminders — before any of it is connected
to Microsoft Teams, SharePoint, Power Automate, or real organizational
data. It is **not** production infrastructure: there is no authentication,
no backend, and no real QA/employee data anywhere in this repository.

## Getting started

```bash
npm install
npm run dev      # start the local dev server
npm test         # run the test suite
npx tsc -b       # type-check
npm run build    # production build (still fully local/offline)
```

## Backend foundation (Phase 12-13, not connected to the frontend)

```bash
cd backend
npm install
npm run dev      # start the backend on http://localhost:4000
npm test         # run the backend test suite
npm run build    # type-check
```

Every request needs an `X-Dev-Agent-Id` header (and, for QA endpoints, an
`X-Dev-Role: QA` header) — this is a **development-only** stand-in for
identity, not authentication, and is force-disabled outside `NODE_ENV=development`/`test`.

By default the backend persists durably to a local SQLite file
(`backend/data/rocky.local.db`, gitignored) — it survives restarts. Set
`ROCKY_PERSISTENCE_DRIVER=memory` for a fast, throwaway store instead (the
default in tests). See `docs/BACKEND_FOUNDATION.md` and
`docs/PERSISTENCE_FOUNDATION.md`.

## Screens

- **Home** — Rocky, current Level/XP/Energy/Streak, the daily Check-in.
- **Achievements** — unlocked and locked achievements with progress.
- **Leaderboard** — individual ranking among fictitious agents.
- **Team** / **Team Leaderboard** — the agent's fictitious team's Rocky and
  score, and how all three fictitious teams rank.
- **QA Simulator** *(QA Tools only)* — an internal testing tool to simulate
  a QA Pass or Documentation Alert; not part of the everyday agent
  experience.
- **Dev Controls** *(development builds only)* — Level/Evolution/Reminder
  triggers and Reset Demo / Reset All Data, for testing and demos.

Turn on **QA Tools** (bottom-left corner) to reveal QA Simulator and Dev
Controls; both are visually distinct (dashed amber border) from the
agent's normal navigation.

## Key product decisions (see DOMAIN_RULES.md for the full list)

- Streak Milestones (3/7/14/30/60/90 days) grant XP only — never Energy.
- "First QA Pass" and "Getting Started" are the same achievement, not two.
- A Documentation Alert reduces Energy and breaks the Current Streak, but
  never reduces XP, Level, or Evolution stage — the system is built around
  recovery, not punishment.
- Team Score is a normalized blend of Participation / Average Streak / QA
  Pass Performance / Improvement / Engagement — never a sum of members' XP,
  so team size doesn't determine the winner.

## Project docs

| File | Covers |
|---|---|
| `DEMO.md` | The deterministic stakeholder demo script |
| `ARCHITECTURE.md` | Layering (UI → Services → Game Engine → Repository) and the future migration boundary |
| `DOMAIN_RULES.md` | Every approved game rule and number |
| `DATA_MODEL.md` | `Agent`/`GameState`/`GameEvent`/`Achievement`/`ReminderRecord` shapes and the `Repository` contract |
| `docs/PRODUCTION_ARCHITECTURE.md` | Target production architecture (Teams/API/SharePoint/Power Automate/Entra ID) — design only, nothing here is implemented |
| `docs/API_CONTRACTS.md` | Repository split, future API surface, QA integration boundary, event/reminder flow diagrams — design only |
| `docs/DATA_OWNERSHIP.md` | Source-of-truth/read-write/derived matrix for every field |
| `docs/SECURITY_BASELINE.md` | Target production security posture — design only |
| `docs/MIGRATION_PLAN.md` | Staged migration roadmap and blockers from local MVP to production |
| `docs/adr/` | Architecture Decision Records for the production design |
| `docs/BACKEND_FOUNDATION.md` | The first backend implementation (`backend/`) — Node/Express API in front of the unchanged Game Engine, local/dev only |
| `docs/PERSISTENCE_FOUNDATION.md` | The backend's durable local persistence (SQLite via `node:sqlite`) — schema, transactions, idempotency, migrations, concurrency guarantees, limitations |
