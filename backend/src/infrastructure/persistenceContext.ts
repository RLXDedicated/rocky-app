// The single place that decides WHICH concrete Repository + Idempotency
// implementation this process uses, based on config (Phase 13 §2, §16).
// Everything above this file — Application Services, API routes — depends
// only on `PersistenceContext`'s shape, never on `InMemoryRepositoryStore`/
// `SqliteRepositoryStore` by name. Swapping the driver is a one-line config
// change (`ROCKY_PERSISTENCE_DRIVER`), never a code change elsewhere.
import type { AppConfig } from '../config/env'
import { InMemoryIdempotencyStore } from './idempotency/InMemoryIdempotencyStore'
import type { IdempotencyPort } from './idempotency/IdempotencyPort'
import { SqliteIdempotencyStore } from './idempotency/SqliteIdempotencyStore'
import { InMemoryRepositoryStore } from './repositories/InMemoryRepository'
import type { RepositoryStore } from './repositories/RepositoryStore'
import { SqliteRepositoryStore } from './persistence/sqliteRepository'
import type { AccountStore } from './accounts/AccountStore'
import { InMemoryAccountStore } from './accounts/InMemoryAccountStore'
import { SqliteAccountStore } from './accounts/SqliteAccountStore'
import type { ChatStore } from './chat/ChatStore'
import { InMemoryChatStore } from './chat/InMemoryChatStore'
import { SqliteChatStore } from './chat/SqliteChatStore'

export interface PersistenceContext {
  repoStore: RepositoryStore
  idempotency: IdempotencyPort
  /** Pet, coin ledger, audit trail, shop edits, PIN credentials and sessions. */
  accounts: AccountStore
  /** Internal chat: channels, messages, reports, consents and mutes. */
  chat: ChatStore
  /** One atomic unit of work spanning both the repository and idempotency writes — see RepositoryStore.withTransaction. */
  withTransaction<T>(fn: () => T): T
  /** Releases the underlying resource (a no-op for the in-memory driver; closes the SQLite connection otherwise). Call on graceful shutdown and always in tests. */
  close(): void
}

export function createPersistenceContext(config: Pick<AppConfig, 'persistenceDriver' | 'dbPath'>): PersistenceContext {
  if (config.persistenceDriver === 'sqlite') {
    const store = new SqliteRepositoryStore(config.dbPath)
    const idempotency = new SqliteIdempotencyStore(store.connection)
    return {
      repoStore: store,
      idempotency,
      accounts: new SqliteAccountStore(store.connection),
      chat: new SqliteChatStore(store.connection),
      withTransaction: (fn) => store.withTransaction(fn),
      close: () => store.close(),
    }
  }

  const store = new InMemoryRepositoryStore()
  const idempotency = new InMemoryIdempotencyStore()
  return {
    repoStore: store,
    idempotency,
    accounts: new InMemoryAccountStore(),
    chat: new InMemoryChatStore(),
    withTransaction: (fn) => store.withTransaction(fn),
    close: () => {},
  }
}
