// Opens (creating if needed) the local SQLite database and brings its
// schema up to date. See docs/PERSISTENCE_FOUNDATION.md for the
// technology decision (`node:sqlite`, built into Node.js — no native
// module compilation, no extra dependency).
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { runMigrations } from './migrations'

export function openDatabase(path: string): DatabaseSync {
  if (path !== ':memory:') {
    mkdirSync(dirname(path), { recursive: true })
  }

  const db = new DatabaseSync(path)
  // WAL improves durability/concurrency characteristics for a
  // single-process local server; irrelevant for :memory: (no file to
  // journal). Foreign keys are OFF by default in SQLite — turn them on
  // since the schema declares a couple (game_state -> agents).
  if (path !== ':memory:') {
    db.exec('PRAGMA journal_mode = WAL;')
  }
  db.exec('PRAGMA foreign_keys = ON;')

  runMigrations(db)
  return db
}
