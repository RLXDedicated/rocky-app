# Backend Foundation — Rocky (Phase 12)

This document describes the first implemented backend: a Node.js/TypeScript
Application/API boundary in front of the unchanged, platform-independent
Game Engine. It answers the question Phase 12 posed: **yes** — the Game
Engine can be exposed through a backend boundary without changing a single
business rule. No Azure, SharePoint, Teams, Graph, Power Automate, or real
authentication is implemented here — see `docs/MIGRATION_PLAN.md` for what
comes after this stage.

The frontend (`src/`) is completely unaffected. It still runs against
`localStorage` exactly as before; nothing in `backend/` is imported by it.

**Phase 13 update:** the backend now has a durable local persistence
option (SQLite, surviving process restart) alongside the in-memory one —
see §8a below and **`docs/PERSISTENCE_FOUNDATION.md`** for the full
detail. Everything else in this document is unchanged from Phase 12.

## 1. Technology decision

**Node.js + TypeScript + Express**, run directly via `tsx` (no build step
needed for local development; `npm run build` is a type-check only). This
was chosen because:

- It's the same language and type system as the existing Game Engine, so
  the backend imports those files directly (see §3) instead of
  reimplementing or code-generating anything.
- Express is the lightest widely-understood HTTP framework that still
  gives real routing, middleware, and error-handling primitives — nothing
  here needed a heavier framework's DI container, decorators, or ORM.
- `tsx` avoids a compile step during development while staying 100%
  TypeScript; `tsc --noEmit` is still run for type-checking (`npm run
  build`), matching the spirit of the frontend's own `tsc -b && vite
  build`.
- Both are trivially deployable to Azure App Service/Functions later
  (Phase 13+, not implemented here) without a technology change.

No ORM, no DI framework, no queue, no cache, no background worker — per
Phase 12 §24, this is a foundation, not a platform.

## 2. Backend structure

```
backend/
  src/
    api/             # Express routes, request validation, typed errors
    application/      # Application Services — orchestrate validate → repo → engine → persist → DTO
    domain/            # A barrel re-exporting the UNCHANGED frontend Game Engine/Services
    infrastructure/    # InMemoryRepository, IdempotencyStore, the localStorage shim
    middleware/        # requestId, devIdentity (NOT auth), errorHandler
    config/            # env.ts — environment-aware configuration
    types/             # DTOs
    app.ts             # Express app factory (testable, no listen())
    server.ts          # Entry point — calls app.listen()
  tests/               # Backend test suite (vitest + supertest)
  vitest.config.ts
  tsconfig.json
  package.json
  .env.example
```

This mirrors the structure Phase 12 sketched, adapted slightly: `domain/`
is a thin re-export barrel rather than a place with its own code — see §3
for why that's deliberate, not a shortcut.

## 3. Game Engine integration

**The existing Game Engine is not copied.** `backend/src/domain/rockyEngine.ts`
re-exports, unchanged:

- `GameService` (from `src/services/gameService.ts`) — already the exact
  shape Phase 12 §5 asked for as an "Application Service"
  (validate → repository → Game Engine → persistence → response), just
  running in the browser today. The backend constructs
  `new GameService(inMemoryRepo, clock)` per request instead of using its
  browser-`localStorage`-backed default.
- `reminderService.ts`'s functions (`checkForReminder`,
  `markReminder{Opened,Acted,Dismissed}`, `getReminderHistory`).
- `teamService.ts`'s functions (`getTeamDetail`, `getTeamLeaderboard`,
  `getCurrentUserTeamId`).
- `leaderboardService.ts`'s `getIndividualLeaderboardWithRankChange`.
- Domain types (`GameState`, `GameEvent`, `Achievement`, `Agent`,
  `QAOutcome`, the `Repository` interface) and the `Clock` abstraction.

Backend `application/*.ts` files call these directly. **Zero business
logic was written in `backend/src/`** — confirmed by grep (§Architecture
quality check, below): no `xp +=`, `energy -=`, `level =`, `streak =`,
`mood =`, `evolution =`, or achievement-unlock logic exists anywhere
under `backend/src/api/`, `backend/src/application/`, or
`backend/src/infrastructure/`.

### The one wrinkle: `window.localStorage`

`teamService.ts`/`leaderboardService.ts`/`reminderService.ts` keep a few
small, non-economy UI bookkeeping values (last-seen rank, a team's
Evolution high-water mark, a dev-only working-hours override) directly
under `window.localStorage` keys, **outside** the `Repository` interface
(`DATA_MODEL.md`'s "non-economy bookkeeping" section). Reusing those
files unmodified under Node required a minimal, in-memory,
Web-Storage-shaped polyfill for `window.localStorage`
(`backend/src/infrastructure/browserGlobalsShim.ts`). It contains no
business logic — only `getItem`/`setItem`/`removeItem` semantics — and
exists purely so the exact same frontend files run correctly outside a
browser. This is documented in that file's own header and referenced here
so it's never mistaken for anything more.

## 4. Application Services

`backend/src/application/`:

| File | Responsibility |
|---|---|
| `gameApplicationService.ts` | Agent, GameState, Check-in, Achievements |
| `qaApplicationService.ts` | QA Pass, Documentation Alert, Correction — see §7 |
| `reminderApplicationService.ts` | Reminder retrieval + lifecycle (opened/acted/dismissed) |
| `leaderboardApplicationService.ts` | Individual Leaderboard |
| `teamApplicationService.ts` | Team + Team Leaderboard |

Each is a small factory function (`createXApplicationService(deps)`)
taking its dependencies (an `InMemoryRepositoryStore`, optionally an
`IdempotencyStore`, optionally a `Clock`) explicitly — no service
constructs its own dependency, matching the same DI discipline
`GameService` itself already uses.

## 5. API endpoints implemented

All under `/api`, exactly as designed in `docs/API_CONTRACTS.md`:

| Method | Path | Auth |
|---|---|---|
| GET | `/agent/me` | any identity |
| GET | `/game-state` | any identity |
| POST | `/events/check-in` | any identity (acts as itself) |
| POST | `/events/qa-pass` | QA or ADMIN |
| POST | `/events/documentation-alert` | QA or ADMIN |
| POST | `/events/correction` | QA or ADMIN |
| GET | `/achievements` | any identity |
| GET | `/leaderboard` | any identity |
| GET | `/team` | any identity |
| GET | `/team-leaderboard` | any identity |
| GET | `/reminders` | any identity |
| POST | `/reminders/:id/opened` \| `/acted` \| `/dismissed` | any identity |

Plus `GET /health` (unauthenticated liveness check, no domain data).

No endpoint beyond this list was added — the Phase 11 contract was
implemented as designed, no corrections were needed.

## 6. DTOs

`backend/src/types/dto.ts` defines every request/response shape used
above. Request DTOs for `qa-pass`/`documentation-alert`/`correction`
carry exactly: `agentId`, `auditDate` (or `originalEventId`/`correctedTo`
for corrections), and an optional idempotency reference — **never** a
gamification value. `rejectClientAuthoredState()`
(`backend/src/api/validation.ts`) additionally rejects any request body
that includes `xp`, `level`, `energy`, `streak`, `currentStreak`,
`bestStreak`, `mood`, `evolution`, `evolutionStage`, or `achievements` as
a top-level field, with a `422 VALIDATION_FAILED` — regardless of which
endpoint receives it. This is enforced code, not a convention: see
`tests/qa.test.ts`'s "client attempting to manipulate XP/Energy/Level"
cases and `tests/checkIn.test.ts`'s equivalent.

## 7. QA integration boundary (implemented)

`qaApplicationService.ts` has exactly three methods: `qaPass`,
`documentationAlert`, `correction`. Each calls the corresponding
`GameService` method (which calls the unchanged `processQAPass`/
`processDocumentationAlert`/`processCorrection` Engine functions) for the
**audited** agent (`request.agentId`), never the calling QA reviewer's own
state. `POST /api/events/qa-pass` and `/documentation-alert` are
route-guarded with `requireRole('QA', 'ADMIN')` — an AGENT-role request is
rejected with `403 FORBIDDEN` before the application service is ever
called (verified in `tests/qa.test.ts`'s "authorization boundary" cases).

A `processCorrection` call against an unknown/ineligible event id throws
a plain `Error` at the domain layer; `qaApplicationService.correction()`
catches that specific failure and translates it to `404 NOT_FOUND`
instead of leaking a raw exception as a `500`.

## 8. Repository boundary

`backend/src/infrastructure/repositories/InMemoryRepository.ts` implements
the **exact same `Repository` interface** (`src/repository/repository.ts`)
the frontend's `LocalStorageRepository` already does — imported, not
redeclared. It holds one record per `agentId` in a `Map` and hands out a
`Repository`-shaped view scoped to one agent per call
(`store.forAgent(agentId)`), which is what lets the existing,
single-agent-shaped `GameService`/Services be reused unmodified for a
multi-agent backend. Idempotency-by-id on `saveEvent`/`saveAchievement`/
`saveReminder`, and the "terminal reminder status is never downgraded"
rule, are reproduced exactly (this is a Repository *contract*
requirement, not an implementation detail free to vary).

No SharePoint or database implementation exists — per Phase 12 §9/§21,
that's explicitly out of scope. Swapping this for one later means writing
a new class satisfying `Repository` and changing which instance
`InMemoryRepositoryStore.forAgent()`-equivalent hands to the Application
Services — nothing above that line changes (ADR-0003).

## 8a. Production Persistence Foundation *(Phase 13)*

The paragraph above is no longer the whole story: a second `Repository`
implementation now exists, `SqliteRepositoryStore`
(`backend/src/infrastructure/persistence/sqliteRepository.ts`), backed by
`node:sqlite` — **durable, survives a process restart**, verified directly
in `tests/durability.test.ts`. Full detail (schema, migrations,
transactions, concurrency guarantees, idempotency durability, limitations)
is in **`docs/PERSISTENCE_FOUNDATION.md`** — this section only summarizes
what changed structurally:

- A new `RepositoryStore` interface
  (`infrastructure/repositories/RepositoryStore.ts`) both
  `InMemoryRepositoryStore` and `SqliteRepositoryStore` implement, adding
  `withTransaction(fn)` to the plain `forAgent(agentId)` Phase 12 already
  had.
- A `PersistenceContext` (`infrastructure/persistenceContext.ts`) bundles a
  `RepositoryStore` with its paired `IdempotencyPort` (below) and is now
  the ONE thing every Application Service depends on
  (`createXApplicationService({ persistence, ... })`) — never a concrete
  class. `createPersistenceContext(config)` picks the driver.
- `config/env.ts` gained `ROCKY_PERSISTENCE_DRIVER` (`memory` | `sqlite`)
  and `ROCKY_DB_PATH`, plus a fail-fast guard: `NODE_ENV=production` with
  anything other than a real `sqlite` path refuses to start.
- Check-in/QA Pass/Documentation Alert/Correction now run inside a real
  SQL transaction (`persistence.withTransaction(...)`) — their several
  repository writes (state + event(s) + achievement(s)) commit or roll
  back together.
- The HTTP idempotency layer (§11 below) is now durable too, with
  same-key-different-payload detection returning `409 CONFLICT`.

**Nothing in this section changes anything §1-§7 above already said** —
the Game Engine, DTOs, QA boundary, and API surface are exactly as Phase
12 built them. This is additive persistence work behind the same
Repository Boundary that made it possible without touching them.

## 9. Development identity — NOT authentication

**`X-Dev-Agent-Id`** (required) and **`X-Dev-Role`** (optional, defaults
to `AGENT`; one of `AGENT`/`QA`/`SUPERVISOR`/`ADMIN`) headers identify the
caller. This is implemented in `backend/src/middleware/devIdentity.ts`,
whose file header states in capital letters that it is not authentication
— there is no credential, no token, no verification, just a header value
trusted at face value for local development and testing.

**Hard rule, enforced in code, not by convention:**
`config.devIdentityEnabled` (`backend/src/config/env.ts`) is `false`
whenever `NODE_ENV=production`, and cannot be overridden back on by any
other environment variable. When disabled, **every** request is rejected
with `401 UNAUTHORIZED` — there is no fallback identity and no path by
which this mechanism could accidentally become the production auth story.
A production deployment with no real identity provider wired up yet
correctly has *no working API access at all*, which is the safe failure
mode. Verified in `tests/devIdentity.test.ts`.

Real authentication (Microsoft Entra ID, Phase 11's Stage 3) is not
implemented.

## 10. Error handling

Every thrown `ApiError` (`backend/src/api/errors.ts`) carries an HTTP
status and a machine-readable `code`; `backend/src/middleware/errorHandler.ts`
renders it as `{ error: { code, message, requestId } }` and logs
5xx-level failures server-side with the request's correlation id. Any
*unexpected* error (a bug, a thrown non-`ApiError`) is logged in full
server-side but rendered to the client as a generic `500 INTERNAL_ERROR`
with no stack trace or internal detail — verified in
`tests/repositoryFailure.test.ts` by simulating a repository outage and
asserting the response body never contains the underlying error message.
Malformed JSON bodies are caught and mapped to `400 BAD_REQUEST` rather
than propagating as an unhandled `SyntaxError`.

Status codes in use: `400` (malformed body), `401` (no/disabled
identity), `403` (wrong role), `404` (not found — unknown reminder,
unknown correction target), `409` (Phase 13: an `Idempotency-Key` reused
with a different request payload — see §11), `422` (validation failure,
including client-authored-state rejection), `500` (unexpected/repository
failure).

## 11. Idempotency

Two independent layers, matching Phase 12 §8's request to document both:

1. **Already existed, unchanged**: `Repository.saveEvent`/
   `saveAchievement`/`saveReminder` dedupe by the event's own id
   (`DOMAIN_RULES.md` §Idempotency); Check-in additionally has the
   same-calendar-day guard (`alreadyCheckedInToday`). This guards against
   the same already-constructed event/achievement/reminder being
   persisted twice.
2. **New at this layer**: an `IdempotencyPort` (
   `backend/src/infrastructure/idempotency/IdempotencyPort.ts`), used by
   `qaApplicationService.ts`. QA Pass/Documentation Alert/Correction each
   construct a **new** event with a fresh id on every call — the existing
   per-event dedup does *not* protect against an HTTP client retrying the
   *same real-world audit* (a network timeout, a double-click), which
   would otherwise double-grant. A client-supplied `Idempotency-Key`
   header, scoped to the agent and route, is checked before calling the
   Engine; a repeated key with the **same** request body returns the exact
   cached response instead of re-running it. Verified in
   `tests/idempotency.test.ts`, including the case where **no** key is
   supplied (documented as a real second submission, by design — QA
   Console *must* send one for genuine retry-safety).

**Phase 13**: this layer is now **durable** — `SqliteIdempotencyStore`
backs it with the `idempotency_records` table (shares the same DB
connection as the domain writes, inside the same transaction — see
`docs/PERSISTENCE_FOUNDATION.md` §5/§7), so a retried request after a real
process restart still finds its prior record. It also now detects a
reused key with a **different** request body (compared via a stable
SHA-256 hash) and rejects it with `409 CONFLICT` rather than either
silently replaying the old response or silently re-executing — verified
in `tests/idempotencyConflict.test.ts` and, across a restart, in
`tests/durability.test.ts`.

## 12. Configuration

`backend/src/config/env.ts` is the single place reading `process.env`.
`NODE_ENV` selects `development`/`test`/`production`; `PORT` sets the
listen port. No secret, port, or environment-specific value is
hard-coded anywhere else in the backend. `backend/.env.example` documents
the (currently empty) shape a real deployment's secrets would take —
no real secret exists in this phase to commit, and none was committed.

**Phase 13** added `ROCKY_PERSISTENCE_DRIVER` (`memory`/`sqlite`) and
`ROCKY_DB_PATH`, plus `assertProductionSafety()`: `NODE_ENV=production`
refuses to start with the in-memory driver or a `:memory:` path — see
`docs/PERSISTENCE_FOUNDATION.md` §10.

## 13. Testing

`backend/tests/` (vitest + supertest, `node` environment — separate from
the frontend's `jsdom` environment):

| File | Covers |
|---|---|
| `checkIn.test.ts` | Check-in API, invalid payload, unauthorized, malformed JSON |
| `qa.test.ts` | QA Pass/Documentation Alert/Correction APIs, authorization boundary, client XP/Energy/Level manipulation attempts, invalid payloads |
| `idempotency.test.ts` | Duplicate/idempotent request (with and without a key) |
| `stateConsistency.test.ts` | State consistency across reads, per-agent isolation, event persistence, response DTO correctness |
| `repositoryFailure.test.ts` | Repository failure → 500 with no leaked detail |
| `readEndpoints.test.ts` | Team/Team Leaderboard/Reminders contract smoke coverage + universal 401-without-identity check |
| `devIdentity.test.ts` | Dev identity is force-disabled in a production-configured environment |
| `sqliteRepository.test.ts` *(Phase 13)* | Direct repository-level save/read for every collection, conflict detection, multi-agent isolation, transaction commit/rollback, replay consistency, migrations |
| `durability.test.ts` *(Phase 13)* | Check-in/events/achievements/Idempotency-Key/Correction all survive a real close-and-reopen of the SQLite file |
| `idempotencyConflict.test.ts` *(Phase 13)* | Same Idempotency-Key + different payload → `409`, on all three QA endpoints |
| `concurrency.test.ts` *(Phase 13)* | Concurrent Check-in/QA Pass/Alert never double-reward; concurrent different-agent requests don't interfere |
| `configGuards.test.ts` *(Phase 13)* | Default driver per environment, custom `ROCKY_DB_PATH`, production fail-fast guards |
| `integrity.test.ts` *(Phase 13)* | Idempotency table UNIQUE constraint, malformed stored JSON fails explicitly, forward-compatible schema reads |

**78/78 backend tests passing** (40 from Phase 12 + 38 new this phase).
All frontend tests continue to run separately and were re-verified:
**262/262 passing**, unchanged from the Phase 11 baseline.

A real bug was caught by this suite before it shipped: `env.ts`'s
`loadConfig()` accepted an injectable `env` parameter for testability but
its internal `readNodeEnv()` helper ignored it and always read the global
`process.env` — meaning a test asserting `NODE_ENV=production` behavior
was actually still reading whatever `process.env.NODE_ENV` happened to be
at test-run time. Fixed by threading the parameter through; see
`tests/devIdentity.test.ts`.

A second real bug surfaced during Phase 13: that same test mocks
`config/env.ts` to simulate `NODE_ENV=production`, then called
`createApp()` with no explicit persistence override — which, now that
`createApp()`'s default falls back to `createPersistenceContext(defaultConfig)`,
meant the test was silently creating a **real** SQLite file at
`backend/data/rocky.local.db` on every test run (the mocked "production"
config validly defaulted to the durable driver at its default path).
Fixed by having that test inject an explicit in-memory `PersistenceContext`
— it's testing the identity middleware, not persistence. A useful
reminder that any test overriding `config` needs to think about every
consumer of that config, not just the one it's aimed at.

## 14. Frontend/backend test isolation

Adding `backend/tests/*.test.ts` initially caused the **frontend's**
`npm test` to pick them up too (vitest's default include glob has no
directory boundary), running them under `jsdom` instead of the backend's
own `node` environment. Fixed by scoping the frontend's `vite.config.ts`
test `include` to `src/**/*.{test,spec}.{ts,tsx}`. Confirmed afterward:
`npm test` at the repo root is exactly the pre-Phase-12 262 tests again;
`backend`'s own `npm test` is exactly its own 40.

## 15. Future production integration points

**Phase 13 proved the persistence swap point**: `SqliteRepositoryStore`
is a second, real `Repository` implementation existing side-by-side with
`InMemoryRepositoryStore`, selected purely by configuration
(`createPersistenceContext`) with zero changes above the Repository
Boundary. A future SharePoint/database adapter is the same exercise again.

Everything below is still a placeholder, not implemented:

- Swap `InMemoryRepositoryStore` for a SharePoint-/database-backed
  `Repository` implementation (Migration Plan Stage 2).
- Replace `devIdentity` middleware with real Entra ID authentication
  (Stage 3) — the `DevIdentity`/`req.identity` shape (`agentId`, `role`)
  is intentionally close to what a real identity-derived value would look
  like, to keep that swap mechanical.
- QA Console (Stage 4) becomes the real caller of `/api/events/qa-pass`,
  `/documentation-alert`, `/correction` — the contract doesn't change.
- Teams/Power Automate (Stage 5) call this same API — see
  `docs/PRODUCTION_ARCHITECTURE.md` §5-6.
