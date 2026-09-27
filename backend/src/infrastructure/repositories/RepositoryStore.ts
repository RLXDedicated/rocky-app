// The common capability both repository implementations (InMemory and
// Sqlite) provide to the Application Services layer. Application Services
// depend on THIS interface only — never on `InMemoryRepositoryStore` or
// `SqliteRepositoryStore` by name — so swapping which one backs a running
// backend (dev/test vs. durable local vs., eventually, a production
// adapter behind this same seam) never touches application/domain code
// (Phase 13 §2, §16; ADR-0003).
import type { Repository } from '../../../../src/repository/repository'

export interface RepositoryStore {
  /** A Repository view scoped to exactly one agent's data. */
  forAgent(agentId: string): Repository

  /**
   * Every agent id this store holds a record for, sorted. Read-only — used
   * by the QA/ADMIN roster view (GET /api/admin/agents). An agent only
   * appears here once something has touched their record (they opened the
   * app via their Teams link, or QA recorded an event for them).
   */
  listAgentIds(): string[]

  /** Whether this store holds a record for `agentId` — never creates one (unlike forAgent). */
  hasAgent(agentId: string): boolean

  /**
   * Permanently removes every record this store holds for `agentId`
   * (profile, state, events, achievements, reminders, idempotency records).
   * QA/ADMIN only — used to clean test/demo agents out of the pilot roster.
   * If the same address opens the app again, it simply starts fresh.
   */
  deleteAgent(agentId: string): void

  /**
   * Runs `fn` as one atomic unit of work. For the Sqlite store this opens
   * a real SQL transaction (BEGIN/COMMIT, ROLLBACK on throw) so a Check-in/
   * QA Pass/Alert/Correction's several repository writes (state + event(s)
   * + achievement(s)) either all land or none do (Phase 13 §7). For the
   * in-memory store it's a direct call — an in-memory Map mutation from a
   * single synchronous JS call has no partial-failure mode to guard
   * against, so there is nothing extra to do, but the signature stays
   * identical so callers never need to know which store they're using.
   */
  withTransaction<T>(fn: () => T): T
}
