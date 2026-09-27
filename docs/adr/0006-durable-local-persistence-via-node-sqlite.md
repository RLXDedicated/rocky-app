# ADR-0006: Durable local persistence via `node:sqlite`, behind the unchanged Repository interface

## Status
Accepted

## Context
Phase 13 needed a Repository implementation that survives a process
restart, to prove the local backend foundation (Phase 12) can hold real
durable data before any SharePoint/production database integration
exists. Candidates considered: `better-sqlite3` (native module, requires
compilation/prebuilt binaries per platform), a full external database
(Postgres, etc. — explicitly out of scope for a "local, no cloud service"
phase), flat JSON files (would still need transactions, indexing, and
constraint-checking hand-rolled), and Node's own built-in `node:sqlite`
module.

## Decision
Use `node:sqlite` (`DatabaseSync`) — no new npm dependency, no native
compilation, a synchronous API matching this backend's fully-synchronous
design, and real transactions/constraints/indexes. Implement
`SqliteRepositoryStore` against the exact same `Repository` interface
`InMemoryRepositoryStore` (Phase 12) and the frontend's
`LocalStorageRepository` already satisfy — imported, never redeclared —
selected via a new `RepositoryStore`/`PersistenceContext` seam
(`createPersistenceContext(config)`) that Application Services depend on
instead of any concrete class (extends ADR-0003's direction).

## Consequences
- Any developer can run the backend durably with zero setup beyond
  `npm install` — no database server, no native build step, no
  platform-specific binary concerns.
- The schema (`backend/src/infrastructure/persistence/schema.ts`) is
  small and directly informed by `DATA_MODEL.md` — it was designed to
  translate cleanly to a real production database or SharePoint lists
  later (`docs/PERSISTENCE_FOUNDATION.md` §Future production adapter
  strategy), not as a permanent production answer.
- Concurrency guarantees are scoped to a single Node process (documented
  explicitly in `docs/PERSISTENCE_FOUNDATION.md` §7) — a real multi-instance
  production deployment will need its own concurrency design at whatever
  database it eventually uses; this ADR does not claim otherwise.
- Production is guarded (fail-fast at startup) against ever silently
  running on the in-memory driver — see `config/env.ts`'s
  `assertProductionSafety()`.
