// Storage for everything around the game that isn't the Game Engine's own
// event log: Rocky the pet, the coin ledger, the audit trail, shop edits,
// PIN credentials and sign-in sessions. No business rules here — the pet
// rules live in src/game/pet.ts and the sign-in rules in
// application/authApplicationService.ts.
import type { CatalogOverrides } from '../../../../src/game/closet'

/** An admin edit: null clears that field. `from`/`until` are only used by collections. */
export interface CatalogOverrideInput {
  price: number | null
  enabled: boolean | null
  from?: string | null
  until?: string | null
}

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

/** A title shown next to the name. Grants no permissions. */
export type AgentTitle = 'qa' | 'leader'

export interface ChallengeRecord {
  id: number
  title: string
  /** The team (its leader), or null for everyone in the pilot. */
  leaderId: string | null
  metric: 'checkins' | 'qa'
  /** Percent to reach (check-in rate or QA pass rate). */
  target: number
  startDay: string
  endDay: string
  rewardItem: string | null
  rewardCoins: number
  createdBy: string
  createdAt: string
  settledAt: string | null
  result: 'won' | 'missed' | 'cancelled' | null
  finalScore: number | null
}

export interface ScheduleRecord {
  agentId: string
  name: string | null
  days: number[]
  start: string
  end: string
  /** IANA zone the shift is written in (e.g. "America/New_York"); null = the server's zone. */
  timeZone: string | null
  /** Gets Rocky's cards in Teams (SharePoint "Active"). The shift still applies in the app either way. */
  teams: boolean
  /** "import" (roster paste), "admin" (edited by hand). */
  source: string
  updatedAt: string
  updatedBy: string
}

export interface QaAuditRecord {
  id: number
  agentId: string
  auditDate: string
  result: 'pass' | 'fail'
  ticket: string | null
  reason: string | null
  note: string | null
  auditor: string
  eventId: string | null
  createdAt: string
  correctedAt: string | null
  correctedBy: string | null
}

export interface DeliveryRecord {
  id: string
  agentId: string
  reminderId: string | null
  /** "reminder" | "test" | "shift-summary" … */
  kind: string
  category: string | null
  sentAt: string
  ok: boolean
  error: string | null
  openedAt: string | null
  actedAt: string | null
  ignoredAt: string | null
}

export interface PhotoRecord {
  id: string
  agentId: string
  mime: string
  data: Uint8Array
  caption: string | null
  createdAt: string
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
  setCatalogOverride(itemId: string, value: CatalogOverrideInput, actor: string, at: string): void

  getCredential(agentId: string): CredentialRecord | null
  saveCredential(record: CredentialRecord): void
  deleteCredential(agentId: string): void

  createSession(record: SessionRecord): void
  getSession(tokenHash: string): SessionRecord | null
  touchSession(tokenHash: string, at: string): void
  revokeSession(tokenHash: string, at: string): void
  revokeAgentSessions(agentId: string, at: string): number
  listSessions(agentId: string): SessionRecord[]

  /** Titles by agent (qa analysts, team leaders). */
  getTitles(): Record<string, AgentTitle>
  setTitle(agentId: string, title: AgentTitle | null, by: string, at: string): void
  addQaAudit(a: Omit<QaAuditRecord, 'id' | 'correctedAt' | 'correctedBy'>): QaAuditRecord
  getQaAudit(id: number): QaAuditRecord | null
  updateQaAudit(id: number, patch: Partial<Pick<QaAuditRecord, 'result' | 'eventId' | 'correctedAt' | 'correctedBy' | 'reason' | 'note'>>): void
  /** Newest first. */
  listQaAudits(q: { agentId?: string; auditor?: string; since?: string; limit?: number }): QaAuditRecord[]
  getSchedules(): Record<string, ScheduleRecord>
  setSchedule(agentId: string, s: Omit<ScheduleRecord, 'agentId'> | null): void

  addDelivery(d: DeliveryRecord): void
  getDelivery(id: string): DeliveryRecord | null
  updateDelivery(id: string, patch: Partial<Pick<DeliveryRecord, 'openedAt' | 'actedAt' | 'ignoredAt'>>): void
  /** Newest first. */
  listDeliveries(opts: { agentId?: string; since?: string; limit?: number }): DeliveryRecord[]

  listChallenges(): ChallengeRecord[]
  addChallenge(c: Omit<ChallengeRecord, 'id' | 'settledAt' | 'result' | 'finalScore'>): ChallengeRecord
  settleChallenge(id: number, result: 'won' | 'missed' | 'cancelled', finalScore: number | null, at: string): void

  listPhotos(agentId: string): Omit<PhotoRecord, 'data'>[]
  getPhoto(id: string): PhotoRecord | null
  addPhoto(p: PhotoRecord): void
  deletePhoto(id: string): void

  /** Agents with the "Tester" badge. */
  getTesters(): string[]
  setTester(agentId: string, on: boolean, by: string, at: string): void
  /** Which leader each agent reports to (member → leader). */
  getTeams(): Record<string, string>
  setLeader(memberId: string, leaderId: string | null, by: string, at: string): void

  /** Removes the agent's pet, ledger, credential and sessions (audit entries are kept). */
  deleteAgentData(agentId: string): void
}
