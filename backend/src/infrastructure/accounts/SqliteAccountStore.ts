import type { DatabaseSync } from 'node:sqlite'
import type { CatalogOverrides } from '../../../../src/game/closet'
import type { AccountStore, AuditRow, CredentialRecord, LedgerRow, PetProfileRecord, SessionRecord, CatalogOverrideInput, AgentTitle } from './AccountStore'

interface LedgerDbRow {
  entry_id: number
  agent_id: string
  delta: number
  kind: string
  item_id: string | null
  note: string | null
  actor: string
  balance_after: number
  created_at: string
}

interface AuditDbRow {
  entry_id: number
  agent_id: string | null
  actor: string
  action: string
  detail_json: string | null
  source: string | null
  created_at: string
}

interface CredentialDbRow {
  agent_id: string
  pin_hash: string
  salt: string
  failed_attempts: number
  locked_until: string | null
  created_at: string
  updated_at: string
}

interface SessionDbRow {
  token_hash: string
  agent_id: string
  created_at: string
  expires_at: string
  last_seen_at: string
  user_agent: string | null
  revoked_at: string | null
}

const toLedger = (r: LedgerDbRow): LedgerRow => ({
  id: r.entry_id,
  agentId: r.agent_id,
  delta: r.delta,
  kind: r.kind,
  itemId: r.item_id,
  note: r.note,
  actor: r.actor,
  balanceAfter: r.balance_after,
  createdAt: r.created_at,
})

const toAudit = (r: AuditDbRow): AuditRow => ({
  id: r.entry_id,
  agentId: r.agent_id,
  actor: r.actor,
  action: r.action,
  detail: r.detail_json ? (JSON.parse(r.detail_json) as Record<string, unknown>) : null,
  source: r.source,
  createdAt: r.created_at,
})

const toSession = (r: SessionDbRow): SessionRecord => ({
  tokenHash: r.token_hash,
  agentId: r.agent_id,
  createdAt: r.created_at,
  expiresAt: r.expires_at,
  lastSeenAt: r.last_seen_at,
  userAgent: r.user_agent,
  revokedAt: r.revoked_at,
})

/**
 * Durable AccountStore. Shares the repository's SQLite connection, so its
 * writes join the same transactions (withTransaction) as the game data.
 */
export class SqliteAccountStore implements AccountStore {
  constructor(private readonly db: DatabaseSync) {}

  getPetProfile(agentId: string): PetProfileRecord | null {
    const row = this.db.prepare('SELECT state_json, revision, updated_at FROM pet_profiles WHERE agent_id = ?').get(agentId) as
      | { state_json: string; revision: number; updated_at: string }
      | undefined
    return row ? { state: JSON.parse(row.state_json), revision: row.revision, updatedAt: row.updated_at } : null
  }

  savePetProfile(agentId: string, state: unknown, updatedAt: string): PetProfileRecord {
    const json = JSON.stringify(state)
    this.db
      .prepare(
        `INSERT INTO pet_profiles (agent_id, state_json, revision, updated_at) VALUES (?, ?, 1, ?)
         ON CONFLICT(agent_id) DO UPDATE SET state_json = excluded.state_json, revision = pet_profiles.revision + 1, updated_at = excluded.updated_at`,
      )
      .run(agentId, json, updatedAt)
    return this.getPetProfile(agentId)!
  }

  deletePetProfile(agentId: string): void {
    this.db.prepare('DELETE FROM pet_profiles WHERE agent_id = ?').run(agentId)
  }

  addLedger(e: Omit<LedgerRow, 'id'>): LedgerRow {
    const res = this.db
      .prepare('INSERT INTO coin_ledger (agent_id, delta, kind, item_id, note, actor, balance_after, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(e.agentId, e.delta, e.kind, e.itemId, e.note, e.actor, e.balanceAfter, e.createdAt)
    return { ...e, id: Number(res.lastInsertRowid) }
  }

  listLedger(agentId: string | null, limit: number): LedgerRow[] {
    const rows = (agentId === null
      ? this.db.prepare('SELECT * FROM coin_ledger ORDER BY entry_id DESC LIMIT ?').all(limit)
      : this.db
          .prepare('SELECT * FROM coin_ledger WHERE agent_id = ? ORDER BY entry_id DESC LIMIT ?')
          .all(agentId, limit)) as unknown as LedgerDbRow[]
    return rows.map(toLedger)
  }

  addAudit(e: Omit<AuditRow, 'id'>): AuditRow {
    const res = this.db
      .prepare('INSERT INTO audit_log (agent_id, actor, action, detail_json, source, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(e.agentId, e.actor, e.action, e.detail ? JSON.stringify(e.detail) : null, e.source, e.createdAt)
    return { ...e, id: Number(res.lastInsertRowid) }
  }

  listAudit(agentId: string | null, limit: number): AuditRow[] {
    const rows = (agentId === null
      ? this.db.prepare('SELECT * FROM audit_log ORDER BY entry_id DESC LIMIT ?').all(limit)
      : this.db.prepare('SELECT * FROM audit_log WHERE agent_id = ? ORDER BY entry_id DESC LIMIT ?').all(agentId, limit)) as unknown as AuditDbRow[]
    return rows.map(toAudit)
  }

  getCatalogOverrides(): CatalogOverrides {
    const rows = this.db.prepare('SELECT item_id, price, enabled, starts_on, ends_on FROM catalog_overrides').all() as {
      item_id: string
      price: number | null
      enabled: number | null
      starts_on: string | null
      ends_on: string | null
    }[]
    const out: CatalogOverrides = {}
    for (const r of rows) {
      const o: CatalogOverrides[string] = {}
      if (r.price !== null) o.price = r.price
      if (r.enabled !== null) o.enabled = r.enabled === 1
      if (r.starts_on) o.from = r.starts_on
      if (r.ends_on) o.until = r.ends_on
      out[r.item_id] = o
    }
    return out
  }

  setCatalogOverride(itemId: string, value: CatalogOverrideInput, actor: string, at: string): void {
    const from = value.from ?? null
    const until = value.until ?? null
    if (value.price === null && value.enabled === null && from === null && until === null) {
      this.db.prepare('DELETE FROM catalog_overrides WHERE item_id = ?').run(itemId)
      return
    }
    this.db
      .prepare(
        `INSERT INTO catalog_overrides (item_id, price, enabled, starts_on, ends_on, updated_by, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(item_id) DO UPDATE SET price = excluded.price, enabled = excluded.enabled, starts_on = excluded.starts_on,
           ends_on = excluded.ends_on, updated_by = excluded.updated_by, updated_at = excluded.updated_at`,
      )
      .run(itemId, value.price, value.enabled === null ? null : value.enabled ? 1 : 0, from, until, actor, at)
  }

  getCredential(agentId: string): CredentialRecord | null {
    const r = this.db.prepare('SELECT * FROM agent_credentials WHERE agent_id = ?').get(agentId) as CredentialDbRow | undefined
    return r
      ? {
          agentId: r.agent_id,
          pinHash: r.pin_hash,
          salt: r.salt,
          failedAttempts: r.failed_attempts,
          lockedUntil: r.locked_until,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        }
      : null
  }

  saveCredential(c: CredentialRecord): void {
    this.db
      .prepare(
        `INSERT INTO agent_credentials (agent_id, pin_hash, salt, failed_attempts, locked_until, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(agent_id) DO UPDATE SET pin_hash = excluded.pin_hash, salt = excluded.salt, failed_attempts = excluded.failed_attempts,
           locked_until = excluded.locked_until, updated_at = excluded.updated_at`,
      )
      .run(c.agentId, c.pinHash, c.salt, c.failedAttempts, c.lockedUntil, c.createdAt, c.updatedAt)
  }

  deleteCredential(agentId: string): void {
    this.db.prepare('DELETE FROM agent_credentials WHERE agent_id = ?').run(agentId)
  }

  createSession(s: SessionRecord): void {
    this.db
      .prepare(
        'INSERT INTO sessions (token_hash, agent_id, created_at, expires_at, last_seen_at, user_agent, revoked_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      )
      .run(s.tokenHash, s.agentId, s.createdAt, s.expiresAt, s.lastSeenAt, s.userAgent, s.revokedAt)
  }

  getSession(tokenHash: string): SessionRecord | null {
    const r = this.db.prepare('SELECT * FROM sessions WHERE token_hash = ?').get(tokenHash) as SessionDbRow | undefined
    return r ? toSession(r) : null
  }

  touchSession(tokenHash: string, at: string): void {
    this.db.prepare('UPDATE sessions SET last_seen_at = ? WHERE token_hash = ?').run(at, tokenHash)
  }

  revokeSession(tokenHash: string, at: string): void {
    this.db.prepare('UPDATE sessions SET revoked_at = ? WHERE token_hash = ? AND revoked_at IS NULL').run(at, tokenHash)
  }

  revokeAgentSessions(agentId: string, at: string): number {
    const res = this.db.prepare('UPDATE sessions SET revoked_at = ? WHERE agent_id = ? AND revoked_at IS NULL').run(at, agentId)
    return Number(res.changes)
  }

  listSessions(agentId: string): SessionRecord[] {
    const rows = this.db.prepare('SELECT * FROM sessions WHERE agent_id = ? ORDER BY created_at DESC').all(agentId) as unknown as SessionDbRow[]
    return rows.map(toSession)
  }

  getTitles(): Record<string, AgentTitle> {
    const rows = this.db.prepare('SELECT agent_id, title FROM agent_titles').all() as { agent_id: string; title: AgentTitle }[]
    return Object.fromEntries(rows.map((r) => [r.agent_id, r.title]))
  }

  setTitle(agentId: string, title: AgentTitle | null, by: string, at: string): void {
    if (!title) {
      this.db.prepare('DELETE FROM agent_titles WHERE agent_id = ?').run(agentId)
      return
    }
    this.db
      .prepare(
        'INSERT INTO agent_titles (agent_id, title, updated_at, updated_by) VALUES (?, ?, ?, ?) ON CONFLICT(agent_id) DO UPDATE SET title = excluded.title, updated_at = excluded.updated_at, updated_by = excluded.updated_by',
      )
      .run(agentId, title, at, by)
  }

  getTesters(): string[] {
    return (this.db.prepare('SELECT agent_id FROM agent_testers').all() as { agent_id: string }[]).map((r) => r.agent_id)
  }

  setTester(agentId: string, on: boolean, by: string, at: string): void {
    if (!on) this.db.prepare('DELETE FROM agent_testers WHERE agent_id = ?').run(agentId)
    else this.db.prepare('INSERT OR IGNORE INTO agent_testers (agent_id, added_at, added_by) VALUES (?, ?, ?)').run(agentId, at, by)
  }

  getTeams(): Record<string, string> {
    const rows = this.db.prepare('SELECT member_id, leader_id FROM team_members').all() as { member_id: string; leader_id: string }[]
    return Object.fromEntries(rows.map((r) => [r.member_id, r.leader_id]))
  }

  setLeader(memberId: string, leaderId: string | null, by: string, at: string): void {
    if (!leaderId) {
      this.db.prepare('DELETE FROM team_members WHERE member_id = ?').run(memberId)
      return
    }
    this.db
      .prepare(
        'INSERT INTO team_members (member_id, leader_id, added_at, added_by) VALUES (?, ?, ?, ?) ON CONFLICT(member_id) DO UPDATE SET leader_id = excluded.leader_id, added_at = excluded.added_at, added_by = excluded.added_by',
      )
      .run(memberId, leaderId, at, by)
  }

  deleteAgentData(agentId: string): void {
    this.db.prepare('DELETE FROM pet_profiles WHERE agent_id = ?').run(agentId)
    this.db.prepare('DELETE FROM coin_ledger WHERE agent_id = ?').run(agentId)
    this.db.prepare('DELETE FROM agent_credentials WHERE agent_id = ?').run(agentId)
    this.db.prepare('DELETE FROM sessions WHERE agent_id = ?').run(agentId)
  }
}
