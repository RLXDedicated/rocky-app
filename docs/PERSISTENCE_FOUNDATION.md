# Persistence Foundation — Rocky (Phase 13)

This document describes the first **durable** local persistence layer for
the backend (`backend/`): a SQLite-backed `Repository` implementation that
survives process restarts, sitting behind the exact same `Repository`
interface the frontend's `LocalStorageRepository` and the backend's
Phase 12 `InMemoryRepositoryStore` already implement. No Azure, SharePoint,
or production database is implemented here — this is the local durable
foundation the Repository Boundary was always designed to make possible
(`ARCHITECTURE.md`'s migration boundary; ADR-0003).

## 1. Technology decision

**`node:sqlite`** — Node.js's built-in SQLite module (stable in the Node
version this project runs, no experimental flag required).

Why, over the alternatives considered:

- **Zero new dependencies.** It ships with Node itself — no native module
  to compile (avoiding `better-sqlite3`'s node-gyp/prebuilt-binary
  concerns on an arbitrary developer machine), no version to pin, nothing
  to audit.
- **Synchronous API**, matching the rest of this backend's design
  (`GameService` and every Engine function are synchronous) — no
  `async`/`await` needed anywhere in the persistence layer, which also
  means Node's single-threaded execution model gives useful concurrency
  guarantees for free (see §7).
- Real transactions (`BEGIN`/`COMMIT`/`ROLLBACK` via `db.exec`), real
  constraints (`PRIMARY KEY`, `UNIQUE`), real indexes — everything this
  phase's durability/atomicity/integrity requirements need.
- A real file on disk that genuinely survives a process exit — verified
  directly (`tests/durability.test.ts`), not assumed.

JSON files were explicitly avoided per the phase brief once a reasonable
SQLite path existed — a JSON store would still need to reinvent
transactions, indexing, and constraint checking by hand.

## 2. Architecture

```
Application Service
        ↓
Repository interface        (unchanged — src/repository/repository.ts)
        ↓
RepositoryStore interface   (backend/src/infrastructure/repositories/RepositoryStore.ts — Phase 13)
        ↓
SqliteRepositoryStore        (backend/src/infrastructure/persistence/sqliteRepository.ts)
        ↓
node:sqlite (DatabaseSync)
        ↓
backend/data/rocky.local.db (default; ROCKY_DB_PATH-configurable)
```

Never:

```
Application Service ↓ SQLite directly     — never happens; grep-verified, see §Architectural check below
Game Engine ↓ SQLite directly              — never happens; the Engine has no I/O of any kind
```

`RepositoryStore` (new this phase) is the seam `InMemoryRepositoryStore`
and `SqliteRepositoryStore` both implement:

```ts
interface RepositoryStore {
  forAgent(agentId: string): Repository
  withTransaction<T>(fn: () => T): T
}
```

`PersistenceContext` (`backend/src/infrastructure/persistenceContext.ts`)
bundles a `RepositoryStore` with its paired `IdempotencyPort` (§5) and is
the ONE thing every Application Service depends on
(`createXApplicationService({ persistence, ... })`) — never a concrete
class. `createPersistenceContext(config)` is the single place that picks
`sqlite` vs. `memory` based on `config.persistenceDriver`.

### Repository Boundary direction (Phase 13 §2)

The single `Repository` interface remains the code-level contract — see
ADR-0003 and its Phase 13 addendum below. It is **not** split into
`AgentRepository`/`GameStateRepository`/`EventRepository`/
`AchievementRepository`/`ReminderRepository` as separate TypeScript
interfaces in this phase, because doing so today would be a large,
low-value refactor: every current implementation (frontend
`LocalStorageRepository`, backend `InMemoryRepositoryStore` and
`SqliteRepositoryStore`) already organizes its internals exactly along
those lines (see `sqliteRepository.ts`'s per-table methods) — the split is
already real *inside* each implementation, just not yet reflected as
separate exported interfaces. `docs/API_CONTRACTS.md` §1 already documents
this conceptual grouping. Splitting the interface is a mechanical,
low-risk change to make *whenever* it's actually needed (e.g. a future
production adapter that genuinely wants to depend on only one of the six)
— not before.

## 3. Database schema

See `backend/src/infrastructure/persistence/schema.ts` for the full DDL
with per-table rationale comments. Summary:

| Table | Purpose | Key constraints |
|---|---|---|
| `agents` | `Agent` (id, name, rockyName) | `agent_id` PRIMARY KEY |
| `game_state` | `GameState` — one row per agent, the derived cache (§4 below) | `agent_id` PRIMARY KEY, `REFERENCES agents` |
| `events` | The durable event log — the actual source of truth | `event_id` PRIMARY KEY (UNIQUE); indexed on `agent_id`, `timestamp`, `type` |
| `achievements` | Denormalized unlocked-achievement records | `(agent_id, achievement_id)` PRIMARY KEY |
| `reminders` | `ReminderRecord`s and their lifecycle status | `reminder_id` PRIMARY KEY; indexed on `agent_id` |
| `idempotency_records` | Durable HTTP idempotency (§5) | `(agent_id, route, idempotency_key)` PRIMARY KEY |
| `schema_migrations` | Which migrations have run (§6) | `version` PRIMARY KEY |

**No `teams` table.** Team membership/roster is a fixed constant in this
architecture today (`teamService.ts`'s `TEAMS`/`CURRENT_USER_TEAM_ID`,
generalized from `mockAgents.ts`) — it was never a persisted collection in
the frontend, Phase 12's `InMemoryRepositoryStore`, or `DATA_MODEL.md`.
Adding a `teams` table here would be inventing a parallel data model the
phase brief explicitly warned against (§4: "no crear un modelo paralelo
incompatible"). Team Score itself is never stored — it's recomputed live
from members' `game_state` rows on every read, exactly as
`teamService.ts` already does.

**Mood is not a second source of truth.** `game_state.mood` stores exactly
whatever value the Game Engine computed and included in the `GameState`
object passed to `saveGameState(state)` — this table never computes Mood
itself, the same way `InMemoryRepositoryStore`/`LocalStorageRepository`
never did either. See `DATA_MODEL.md`'s updated persistence section for
the full authoritative/derived breakdown.

## 4. Authoritative vs. derived vs. event-derived (persistence view)

Restating `DATA_OWNERSHIP.md`'s classification against the actual SQLite
columns:

| Data | Class | Where it lives |
|---|---|---|
| `events.*` | **The one source of truth** | Every column is written once, never updated, never deleted (except `resetAll`, a full per-agent wipe used only by test/dev tooling — not exposed via any API endpoint) |
| `game_state.*` | Derived cache | Overwritten (`UPDATE`) on every Check-in/QA Pass/Alert/Correction; `recalculateStateFromEvents(events)` can always reproduce it — verified directly in `tests/sqliteRepository.test.ts`'s replay-consistency test |
| `achievements.*` | Denormalized derived | Also reproducible from `ACHIEVEMENT` events in `events`; kept as its own table purely for cheap reads, same as before this phase |
| `reminders.status` | Direct user/lifecycle action | Not event-sourced — a reminder's `opened`/`acted`/`dismissed` transition is authoritative in the `reminders` row itself, same as `LocalStorageRepository` |
| `idempotency_records.*` | Infrastructure bookkeeping | Not domain data at all — exists purely so a retried HTTP request can be answered without re-invoking the Engine (§5) |

## 5. Idempotency persistence

Phase 12 had two layers (event/achievement/reminder dedup-by-id in the
Repository; an in-memory `IdempotencyStore` for HTTP retries). Phase 13
makes the second layer durable and adds conflict detection:

```ts
interface IdempotencyPort {
  check(agentId, route, key, requestHash): 'new' | { kind: 'duplicate'; response } | { kind: 'conflict' }
  record(agentId, route, key, requestHash, response): void
}
```

`SqliteIdempotencyStore` backs this with the `idempotency_records` table,
`UNIQUE(agent_id, route, idempotency_key)`. A request whose
`(agentId, route, key)` has been seen before with the **same** request
body (compared via a SHA-256 hash of its canonicalized JSON) gets back the
exact cached response — the Game Engine is never re-invoked. A request
with the same key but a **different** body gets `409 CONFLICT` — never
silently replayed, never silently executed as if new (Phase 13 §6).

Critically, `SqliteIdempotencyStore` shares the **same** `DatabaseSync`
connection as `SqliteRepositoryStore` — so recording the idempotency row
happens inside the exact same SQL transaction as the Game Engine's
state/event writes (§7). No key can end up "recorded" while its
corresponding state change didn't happen, or vice versa.

## 6. Migration strategy

`backend/src/infrastructure/persistence/migrations.ts`: an ordered array
of `{ version, name, sql }`, tracked in a `schema_migrations` table.
`runMigrations(db)` applies only the versions not yet recorded, each
inside its own transaction (a failed migration rolls back cleanly and
throws rather than leaving a half-applied schema). It does **not** assume
a fresh/empty database — reopening an already-migrated file is a no-op
(verified in `tests/sqliteRepository.test.ts`).

Current migrations:

1. `001_initial` — `agents`, `game_state`, `events`, `achievements`, `reminders`
2. `002_add_idempotency` — `idempotency_records`

**To add a new migration**: append a new `{ version: 3, name: '...', sql: '...' }`
entry to the `MIGRATIONS` array — never edit an existing entry (a shipped
migration is a historical fact, same immutability principle as a
`GameEvent`). `runMigrations` picks it up automatically on the next
`openDatabase()` call.

## 7. Transaction & concurrency guarantees

**Atomicity**: `RepositoryStore.withTransaction(fn)` wraps `fn` in a real
`BEGIN`/`COMMIT`, with `ROLLBACK` on any thrown error. Check-in, QA Pass,
Documentation Alert, and Correction — the four flows that make multiple
related writes (state + event(s) + achievement(s)) — are each wrapped by
their Application Service (`gameApplicationService.checkIn`,
`qaApplicationService.*`). Verified directly:
`tests/sqliteRepository.test.ts`'s "withTransaction rolls back ALL writes
when the callback throws" test simulates a mid-operation failure and
confirms **neither** the event nor the state change survives.

**Concurrency**: this backend makes **no** claim about multi-process or
multi-instance concurrency — that's explicitly future production scope
(§Production adapter strategy below). What it does guarantee, and what
`tests/concurrency.test.ts` verifies against the real SQLite-backed app:
every route handler in this backend is fully synchronous (no `await`
between reading and writing state — `GameService` and the Game Engine
never do I/O), and Node's single-threaded event loop never interleaves
two synchronous callbacks. Two "concurrent" HTTP requests (sent together
via `Promise.all`) are therefore still handled one-at-a-time by this
single Node process, in whatever order the runtime schedules their
callbacks — which is what makes "no double reward" a deterministic
outcome locally, not a race. This is a real, useful guarantee for a
single-instance local/dev/pilot deployment; it is **not** a substitute for
whatever a real production concurrency story needs once there's more than
one backend instance running (a database-level `UNIQUE` constraint plus
optimistic concurrency on `game_state` updates would be the natural next
step — not implemented here).

## 8. Corrections & reconstruction

Corrections remain exactly as `DOMAIN_RULES.md` §Corrections describes —
an original `QA_PASS`/`DOCUMENTATION_ALERT` event is never edited; a
`CORRECTION` event is appended, and the Game Engine's own
`recalculateStateFromEvents` recomputes the full `GameState` from the
corrected history. Nothing in the persistence layer participates in that
logic — it only stores the resulting new event and new state (`§7`'s
transaction guarantee applies here too).

`tests/durability.test.ts`'s "a Correction remains consistent across
restart" test applies a correction, closes the database, reopens it, and
confirms the persisted state after restart still matches the corrected
state — not just immediately after the correction, but after a real
close/reopen cycle.

**Replay validation**: `tests/sqliteRepository.test.ts`'s replay-consistency
test independently calls the Game Engine's own `recalculateStateFromEvents`
against the persisted event history and confirms it produces the exact
same `GameState` the Repository has cached — proving the cache and the
event log never silently diverge for the scenarios this phase exercises.
This reuses the Engine's existing, already-tested replay function; nothing
new was built or reimplemented for it.

## 9. Data integrity

- `PRIMARY KEY`/`UNIQUE` constraints on every table (§3).
- `game_state.agent_id REFERENCES agents(agent_id)`, with `PRAGMA foreign_keys = ON`.
- A duplicate `event_id`/`achievement_id` with **identical** content is a
  silent idempotent no-op (unchanged Repository contract). A duplicate
  with **different** content throws `RepositoryConflictError` — it is
  never silently dropped and never overwrites the original (Phase 13 §5;
  `tests/sqliteRepository.test.ts`, `tests/integrity.test.ts`). This same
  guard was added to `InMemoryRepositoryStore` too, so switching drivers
  never silently changes this behavior.
- A malformed stored value (e.g. corrupted `payload_json`) throws
  explicitly on read rather than being silently coerced into a default —
  verified in `tests/integrity.test.ts`. This backend does **not** attempt
  the frontend's `sanitize.ts`-style "repair what's repairable" behavior
  for the SQLite store in this phase: the frontend's sanitization exists
  because `localStorage` can be edited by arbitrary browser extensions or
  hand-editing; a server-managed SQLite file has a much smaller
  corruption surface, and Phase 13 §12 explicitly asks for explicit
  failure over silent fallback here. This is a deliberate scope
  boundary, not an oversight — revisit if real-world corruption patterns
  ever justify it.

## 10. Production safety guards

`backend/src/config/env.ts`'s `assertProductionSafety()` refuses to start
(throws synchronously at config-load time — before any server socket
opens) when:

- `NODE_ENV=production` and `persistenceDriver !== 'sqlite'` — production
  must never silently run on the in-memory store.
- `NODE_ENV=production` and `dbPath === ':memory:'` — closes the loophole
  of a "sqlite" driver pointed at a non-durable path.
- (Defensive, currently unreachable) `NODE_ENV=production` and
  `devIdentityEnabled` — kept as an explicit assertion in case a future
  refactor changes how that flag is computed.

Verified directly in `tests/configGuards.test.ts` and manually (§Manual
validation in the Phase 13 completion report) by actually starting the
process with an unsafe combination and observing the immediate crash with
a clear message — not a lint rule, a runtime guard.

## 11. Limitations & future production adapter strategy

- **Single-file, single-process only.** No replication, no clustering, no
  read replicas. Fine for local/dev/pilot; a real production deployment
  with multiple backend instances needs a real database (Postgres/Azure
  SQL/Dataverse) or a managed SQLite-compatible service — see
  `docs/PRODUCTION_ARCHITECTURE.md` §Storage strategy for the
  SharePoint-vs-database discussion, which this phase's schema was
  deliberately kept simple enough to translate directly.
- **No cross-process locking.** Concurrency guarantees (§7) hold only
  because this is one Node process. A future multi-instance deployment
  needs its own concurrency design at the database layer.
- **No backup/retention policy.** Out of scope for a local dev foundation;
  a real production store needs one.
- **The migration to SharePoint or an approved database happens entirely
  behind `RepositoryStore`/`Repository`** — write a new class satisfying
  those interfaces, wire it into `createPersistenceContext`'s driver
  switch (adding a third case), and nothing in `application/`, `api/`, or
  `domain/` changes. This phase's `SqliteRepositoryStore` is the proof
  this seam works, not the last implementation it will ever have.
