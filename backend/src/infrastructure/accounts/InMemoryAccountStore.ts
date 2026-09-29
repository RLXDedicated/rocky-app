import type { CatalogOverrides } from '../../../../src/game/closet'
import type { AccountStore, AuditRow, CredentialRecord, LedgerRow, PetProfileRecord, SessionRecord, CatalogOverrideInput, AgentTitle } from './AccountStore'

const clone = <T>(v: T): T => (v === undefined || v === null ? v : (JSON.parse(JSON.stringify(v)) as T))
const newest = <T extends { id: number }>(rows: T[], limit: number) => [...rows].sort((a, b) => b.id - a.id).slice(0, limit)

/** Dev/test implementation of AccountStore (lost on restart). */
export class InMemoryAccountStore implements AccountStore {
  private pets = new Map<string, PetProfileRecord>()
  private ledger: LedgerRow[] = []
  private audit: AuditRow[] = []
  private catalog: CatalogOverrides = {}
  private credentials = new Map<string, CredentialRecord>()
  private sessions = new Map<string, SessionRecord>()
  private seq = 0

  getPetProfile(agentId: string) {
    return clone(this.pets.get(agentId) ?? null)
  }

  savePetProfile(agentId: string, state: unknown, updatedAt: string) {
    const record = { state: clone(state), revision: (this.pets.get(agentId)?.revision ?? 0) + 1, updatedAt }
    this.pets.set(agentId, record)
    return clone(record)
  }

  deletePetProfile(agentId: string) {
    this.pets.delete(agentId)
  }

  addLedger(entry: Omit<LedgerRow, 'id'>) {
    const row = { ...entry, id: ++this.seq }
    this.ledger.push(row)
    return { ...row }
  }

  listLedger(agentId: string | null, limit: number) {
    return newest(
      this.ledger.filter((r) => agentId === null || r.agentId === agentId),
      limit,
    ).map((r) => ({ ...r }))
  }

  addAudit(entry: Omit<AuditRow, 'id'>) {
    const row = { ...entry, detail: clone(entry.detail), id: ++this.seq }
    this.audit.push(row)
    return clone(row)
  }

  listAudit(agentId: string | null, limit: number) {
    return newest(
      this.audit.filter((r) => agentId === null || r.agentId === agentId),
      limit,
    ).map((r) => clone(r))
  }

  getCatalogOverrides() {
    return clone(this.catalog)
  }

  setCatalogOverride(itemId: string, value: CatalogOverrideInput) {
    const next: CatalogOverrides[string] = {}
    if (value.price !== null) next.price = value.price
    if (value.enabled !== null) next.enabled = value.enabled
    if (value.from) next.from = value.from
    if (value.until) next.until = value.until
    if (Object.keys(next).length === 0) delete this.catalog[itemId]
    else this.catalog[itemId] = next
  }

  getCredential(agentId: string) {
    return clone(this.credentials.get(agentId) ?? null)
  }

  saveCredential(record: CredentialRecord) {
    this.credentials.set(record.agentId, { ...record })
  }

  deleteCredential(agentId: string) {
    this.credentials.delete(agentId)
  }

  createSession(record: SessionRecord) {
    this.sessions.set(record.tokenHash, { ...record })
  }

  getSession(tokenHash: string) {
    return clone(this.sessions.get(tokenHash) ?? null)
  }

  touchSession(tokenHash: string, at: string) {
    const s = this.sessions.get(tokenHash)
    if (s) s.lastSeenAt = at
  }

  revokeSession(tokenHash: string, at: string) {
    const s = this.sessions.get(tokenHash)
    if (s && !s.revokedAt) s.revokedAt = at
  }

  revokeAgentSessions(agentId: string, at: string) {
    let n = 0
    for (const s of this.sessions.values()) {
      if (s.agentId === agentId && !s.revokedAt) {
        s.revokedAt = at
        n++
      }
    }
    return n
  }

  listSessions(agentId: string) {
    return [...this.sessions.values()].filter((s) => s.agentId === agentId).map((s) => ({ ...s }))
  }

  private titles = new Map<string, AgentTitle>([
    ['mcantillo@rlx.us', 'leader'],
    ['madiaz@rlx.us', 'qa'],
    ['kcolina@rlx.us', 'qa'],
    ['apereira@rlx.us', 'qa'],
  ])
  private teams = new Map<string, string>()

  getTitles() {
    return Object.fromEntries(this.titles)
  }
  setTitle(agentId: string, title: AgentTitle | null) {
    if (title) this.titles.set(agentId, title)
    else this.titles.delete(agentId)
  }
  private testers = new Set<string>()
  getTesters() {
    return [...this.testers]
  }
  setTester(agentId: string, on: boolean) {
    if (on) this.testers.add(agentId)
    else this.testers.delete(agentId)
  }
  getTeams() {
    return Object.fromEntries(this.teams)
  }
  setLeader(memberId: string, leaderId: string | null) {
    if (leaderId) this.teams.set(memberId, leaderId)
    else this.teams.delete(memberId)
  }

  deleteAgentData(agentId: string) {
    this.pets.delete(agentId)
    this.ledger = this.ledger.filter((r) => r.agentId !== agentId)
    this.credentials.delete(agentId)
    for (const [k, s] of this.sessions) if (s.agentId === agentId) this.sessions.delete(k)
  }
}
