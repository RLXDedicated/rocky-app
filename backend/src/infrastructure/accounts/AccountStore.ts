// Storage for everything around the game that isn't the Game Engine's own
// event log: Rocky the pet, the coin ledger, the audit trail, shop edits,
// PIN credentials and sign-in sessions. No business rules here — the pet
// rules live in src/game/pet.ts and the sign-in rules in
// application/authApplicationService.ts.
import type { CatalogOverrides } from '../../../../src/game/closet'

export interface PetProfileRecord {
  state: unknown
  revision: number
  updatedAt: string
}

export interface LedgerRow {
  id: number
  agentId: string
  delta: number
  kind: string
  itemId: string | null
  note: string | null
  actor: string
  balanceAfter: number
  createdAt: string
}

export interface AuditRow {
  id: number
  agentId: string | null
  actor: string
  action: string
  detail: Record<string, unknown> | null
  source: string | null
  createdAt: string
}

export interface CredentialRecord {
  agentId: string
  pinHash: string
  salt: string
  failedAttempts: number
  lockedUntil: string | null
  createdAt: string
  updatedAt: string
}

export interface SessionRecord {
  tokenHash: string
  agentId: string
  createdAt: string
  expiresAt: string
  lastSeenAt: string
  userAgent: string | null
  revokedAt: string | null
}

export interface AccountStore {
  getPetProfile(agentId: string): PetProfileRecord | null
  savePetProfile(agentId: string, state: unknown, updatedAt: string): PetProfileRecord
  deletePetProfile(agentId: string): void

  addLedger(entry: Omit<LedgerRow, 'id'>): LedgerRow
  listLedger(agentId: string | null, limit: number): LedgerRow[]

  addAudit(entry: Omit<AuditRow, 'id'>): AuditRow
  listAudit(agentId: string | null, limit: number): AuditRow[]

  getCatalogOverrides(): CatalogOverrides
  setCatalogOverride(itemId: string, value: { price: number | null; enabled: boolean | null }, actor: string, at: string): void

  getCredential(agentId: string): CredentialRecord | null
  saveCredential(record: CredentialRecord): void
  deleteCredential(agentId: string): void

  createSession(record: SessionRecord): void
  getSession(tokenHash: string): SessionRecord | null
  touchSession(tokenHash: string, at: string): void
  revokeSession(tokenHash: string, at: string): void
  revokeAgentSessions(agentId: string, at: string): number
  listSessions(agentId: string): SessionRecord[]

  /** Removes the agent's pet, ledger, credential and sessions (audit entries are kept). */
  deleteAgentData(agentId: string): void
}
