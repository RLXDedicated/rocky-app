import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createApp, type CreateAppOptions } from '../src/app'
import { fixedClock } from '../../src/engine/clock'
import { createPersistenceContext, type PersistenceContext } from '../src/infrastructure/persistenceContext'

/** A deterministic app for tests — fixed clock unless overridden. */
export function buildTestApp(options: CreateAppOptions = {}) {
  return createApp({ clock: fixedClock('2026-09-08T12:00:00.000Z'), ...options })
}

export const AGENT_HEADER = 'X-Dev-Agent-Id'
export const ROLE_HEADER = 'X-Dev-Role'

/**
 * A fresh temp-directory SQLite file per call, plus a `cleanup()` to
 * remove it. Used by durability tests, which need a REAL file on disk —
 * a `:memory:` database doesn't survive being closed and reopened, so it
 * can't stand in for "the backend restarted."
 */
export function tempSqlitePath(): { path: string; cleanup: () => void } {
  const dir = mkdtempSync(join(tmpdir(), 'rocky-sqlite-test-'))
  return {
    path: join(dir, 'rocky.test.db'),
    cleanup: () => rmSync(dir, { recursive: true, force: true }),
  }
}

export function buildSqlitePersistence(dbPath: string): PersistenceContext {
  return createPersistenceContext({ persistenceDriver: 'sqlite', dbPath })
}

export function buildMemoryPersistence(): PersistenceContext {
  return createPersistenceContext({ persistenceDriver: 'memory', dbPath: ':memory:' })
}
