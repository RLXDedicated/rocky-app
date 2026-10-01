// Minimal migration runner (Phase 13 §14) — no framework, just an ordered
// list and a tracking table. New migrations are added by appending a new
// { version, name, sql } entry with the next integer version; never
// editing a previously-shipped entry (same immutability principle as
// GameEvent — a shipped migration is a historical fact).
import type { DatabaseSync } from 'node:sqlite'
import { MIGRATION_001_INITIAL, MIGRATION_002_IDEMPOTENCY, MIGRATION_003_ACCOUNTS, MIGRATION_004_COLLECTION_WINDOWS, MIGRATION_005_CHAT, MIGRATION_006_PEOPLE, MIGRATION_007_DEV_QA, MIGRATION_008_TESTERS, MIGRATION_009_CHAT_MEDIA, MIGRATION_010_STREAK_SHIELDS, MIGRATION_011_EXTRAS, MIGRATION_012_TEAMS, MIGRATION_013_SCHEDULE_TZ, MIGRATION_014_QA_AUDITS, MIGRATION_015_CARD_UPDATES, MIGRATION_016_CHAT_GROUPS, MIGRATION_017_KUDOS, MIGRATION_018_TEAMS_FOR_ALL, MIGRATION_019_ENGAGEMENT } from './schema'

export interface Migration {
  version: number
  name: string
  sql: string
}

// To add a new migration: append `{ version: N, name: '...', sql: '...' }`
// here, where N is the next integer. Never assumes the database starts
// empty — runMigrations() below only applies versions not already
// recorded in schema_migrations, so it's safe to run against a database
// created by an earlier version of this backend.
export const MIGRATIONS: Migration[] = [
  { version: 1, name: 'initial', sql: MIGRATION_001_INITIAL },
  { version: 2, name: 'add_idempotency', sql: MIGRATION_002_IDEMPOTENCY },
  { version: 3, name: 'add_accounts_pet_audit', sql: MIGRATION_003_ACCOUNTS },
  { version: 4, name: 'add_collection_windows', sql: MIGRATION_004_COLLECTION_WINDOWS },
  { version: 5, name: 'add_chat', sql: MIGRATION_005_CHAT },
  { version: 6, name: 'add_people', sql: MIGRATION_006_PEOPLE },
  { version: 7, name: 'seed_dev_qa', sql: MIGRATION_007_DEV_QA },
  { version: 8, name: 'add_testers', sql: MIGRATION_008_TESTERS },
  { version: 9, name: 'add_chat_media', sql: MIGRATION_009_CHAT_MEDIA },
  { version: 10, name: 'add_streak_shields', sql: MIGRATION_010_STREAK_SHIELDS },
  { version: 11, name: 'add_pins_challenges_photos', sql: MIGRATION_011_EXTRAS },
  { version: 12, name: 'add_teams_integration', sql: MIGRATION_012_TEAMS },
  { version: 13, name: 'add_schedule_time_zone', sql: MIGRATION_013_SCHEDULE_TZ },
  { version: 14, name: 'add_qa_audits', sql: MIGRATION_014_QA_AUDITS },
  { version: 15, name: 'add_card_updates', sql: MIGRATION_015_CARD_UPDATES },
  { version: 16, name: 'add_chat_groups', sql: MIGRATION_016_CHAT_GROUPS },
  { version: 17, name: 'add_kudos', sql: MIGRATION_017_KUDOS },
  { version: 18, name: 'teams_for_all', sql: MIGRATION_018_TEAMS_FOR_ALL },
  { version: 19, name: 'add_duels_and_votes', sql: MIGRATION_019_ENGAGEMENT },
]

export function runMigrations(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version    INTEGER PRIMARY KEY,
      name       TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `)

  const appliedRows = db.prepare('SELECT version FROM schema_migrations').all() as { version: number }[]
  const applied = new Set(appliedRows.map((r) => r.version))

  const pending = [...MIGRATIONS].sort((a, b) => a.version - b.version).filter((m) => !applied.has(m.version))

  for (const migration of pending) {
    db.exec('BEGIN')
    try {
      db.exec(migration.sql)
      db.prepare('INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)').run(
        migration.version,
        migration.name,
        new Date().toISOString(),
      )
      db.exec('COMMIT')
    } catch (err) {
      db.exec('ROLLBACK')
      throw new Error(`Migration ${migration.version} ("${migration.name}") failed: ${err instanceof Error ? err.message : String(err)}`)
    }
  }
}

/** Test/diagnostic helper: which migrations have been applied. */
export function getAppliedMigrations(db: DatabaseSync): { version: number; name: string; appliedAt: string }[] {
  const rows = db.prepare('SELECT version, name, applied_at as appliedAt FROM schema_migrations ORDER BY version').all()
  return rows as { version: number; name: string; appliedAt: string }[]
}
