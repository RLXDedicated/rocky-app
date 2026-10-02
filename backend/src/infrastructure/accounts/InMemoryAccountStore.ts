import type { CatalogOverrides } from '../../../../src/game/closet'
import type { AccountStore, AuditRow, CredentialRecord, LedgerRow, PetProfileRecord, SessionRecord, CatalogOverrideInput, AgentTitle, ChallengeRecord, PhotoRecord, ScheduleRecord, DeliveryRecord, QaAuditRecord, KudosRecord, DuelRecord, UsageRecord } from './AccountStore'

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
  private qaAudits: QaAuditRecord[] = []
  addQaAudit(a: Omit<QaAuditRecord, 'id' | 'correctedAt' | 'correctedBy'>) {
    const rec: QaAuditRecord = { ...a, id: this.qaAudits.length + 1, correctedAt: null, correctedBy: null }
    this.qaAudits.push(rec)
    return { ...rec }
  }
  getQaAudit(id: number) {
    const r = this.qaAudits.find((x) => x.id === id)
    return r ? { ...r } : null
  }
  updateQaAudit(id: number, patch: Partial<Pick<QaAuditRecord, 'result' | 'eventId' | 'correctedAt' | 'correctedBy' | 'reason' | 'note'>>) {
    const r = this.qaAudits.find((x) => x.id === id)
    if (r) Object.assign(r, patch)
  }
  listQaAudits(q: { agentId?: string; auditor?: string; since?: string; limit?: number }) {
    return this.qaAudits
      .filter((r) => (!q.agentId || r.agentId === q.agentId) && (!q.auditor || r.auditor === q.auditor) && (!q.since || r.createdAt >= q.since))
      .sort((a, b) => (a.createdAt === b.createdAt ? b.id - a.id : b.createdAt.localeCompare(a.createdAt)))
      .slice(0, q.limit ?? 200)
      .map((r) => ({ ...r }))
  }

  private schedules = new Map<string, ScheduleRecord>()
  private deliveries: DeliveryRecord[] = []
  private usage = new Map<string, UsageRecord>()
  addUsageMinute(agentId: string, day: string, inShift: boolean, newSession: boolean) {
    const key = `${agentId}|${day}`
    const u = this.usage.get(key) ?? { agentId, day, minutes: 0, shiftMinutes: 0, sessions: 0 }
    this.usage.set(key, { ...u, minutes: u.minutes + 1, shiftMinutes: u.shiftMinutes + (inShift ? 1 : 0), sessions: u.sessions + (newSession ? 1 : 0) })
  }
  listUsage(sinceDay: string): UsageRecord[] {
    return [...this.usage.values()].filter((u) => u.day >= sinceDay).sort((a, b) => a.day.localeCompare(b.day))
  }

  getSchedules() {
    return Object.fromEntries([...this.schedules].map(([k, v]) => [k, { ...v, days: [...v.days] }]))
  }
  setSchedule(agentId: string, s: Omit<ScheduleRecord, 'agentId'> | null) {
    if (s) this.schedules.set(agentId, { ...s, agentId })
    else this.schedules.delete(agentId)
  }
  addDelivery(d: DeliveryRecord) {
    this.deliveries.push({ ...d })
  }
  getDelivery(id: string) {
    const d = this.deliveries.find((x) => x.id === id)
    return d ? { ...d } : null
  }
  updateDelivery(id: string, patch: Partial<Pick<DeliveryRecord, 'openedAt' | 'actedAt' | 'ignoredAt' | 'cardUpdatedAt'>>) {
    const d = this.deliveries.find((x) => x.id === id)
    if (!d) return
    if (patch.openedAt && !d.openedAt) d.openedAt = patch.openedAt
    if (patch.actedAt && !d.actedAt) d.actedAt = patch.actedAt
    if (patch.ignoredAt && !d.ignoredAt) d.ignoredAt = patch.ignoredAt
    if (patch.cardUpdatedAt) d.cardUpdatedAt = patch.cardUpdatedAt
  }
  listDeliveries(opts: { agentId?: string; since?: string; limit?: number }) {
    return this.deliveries
      .filter((d) => (!opts.agentId || d.agentId === opts.agentId) && (!opts.since || d.sentAt >= opts.since))
      .sort((a, b) => b.sentAt.localeCompare(a.sentAt))
      .slice(0, opts.limit ?? 500)
      .map((d) => ({ ...d }))
  }

  private kudos: KudosRecord[] = []
  addKudos(k: Omit<KudosRecord, 'id' | 'deliveredAt'>) {
    const row = { ...k, id: this.kudos.length + 1, deliveredAt: null }
    this.kudos.push(row)
    return { ...row }
  }
  listKudos(q: { toId?: string; fromId?: string; since?: string; undelivered?: boolean; limit?: number }) {
    return this.kudos
      .filter((k) => (!q.toId || k.toId === q.toId) && (!q.fromId || k.fromId === q.fromId) && (!q.since || k.createdAt >= q.since) && (!q.undelivered || !k.deliveredAt))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id)
      .slice(0, q.limit ?? 200)
      .map((k) => ({ ...k }))
  }
  markKudosDelivered(ids: number[], at: string) {
    for (const k of this.kudos) if (ids.includes(k.id) && !k.deliveredAt) k.deliveredAt = at
  }

  private duels: DuelRecord[] = []
  addDuel(d: Omit<DuelRecord, 'id' | 'toScore' | 'status' | 'answeredAt'>) {
    const row: DuelRecord = { ...d, id: this.duels.length + 1, toScore: null, status: 'open', answeredAt: null }
    this.duels.push(row)
    return { ...row }
  }
  getDuel(id: number) {
    const d = this.duels.find((x) => x.id === id)
    return d ? { ...d } : null
  }
  updateDuel(id: number, patch: Pick<DuelRecord, 'status'> & Partial<Pick<DuelRecord, 'toScore' | 'answeredAt'>>) {
    const d = this.duels.find((x) => x.id === id)
    if (!d) return
    d.status = patch.status
    if (patch.toScore !== undefined) d.toScore = patch.toScore
    if (patch.answeredAt !== undefined) d.answeredAt = patch.answeredAt
  }
  listDuels(q: { agentId: string; since?: string; limit?: number }) {
    return this.duels
      .filter((d) => (d.fromId === q.agentId || d.toId === q.agentId) && (!q.since || d.createdAt >= q.since))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id)
      .slice(0, q.limit ?? 50)
      .map((d) => ({ ...d }))
  }
  private votes = new Map<string, string>()
  setVote(week: string, voterId: string, targetId: string) {
    this.votes.set(`${week}|${voterId}`, targetId)
  }
  listVotes(week: string) {
    return [...this.votes].filter(([k]) => k.startsWith(`${week}|`)).map(([k, targetId]) => ({ voterId: k.split('|')[1]!, targetId }))
  }

  private challenges: ChallengeRecord[] = []
  private photos = new Map<string, PhotoRecord>()
  listChallenges() {
    return [...this.challenges].reverse().map((c) => ({ ...c }))
  }
  addChallenge(c: Omit<ChallengeRecord, 'id' | 'settledAt' | 'result' | 'finalScore'>) {
    const row: ChallengeRecord = { ...c, id: this.challenges.length + 1, settledAt: null, result: null, finalScore: null }
    this.challenges.push(row)
    return { ...row }
  }
  settleChallenge(id: number, result: 'won' | 'missed' | 'cancelled', finalScore: number | null, at: string) {
    const c = this.challenges.find((x) => x.id === id)
    if (c && !c.settledAt) Object.assign(c, { settledAt: at, result, finalScore })
  }
  listPhotos(agentId: string) {
    return [...this.photos.values()]
      .filter((p) => p.agentId === agentId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(({ data: _data, ...rest }) => rest)
  }
  getPhoto(id: string) {
    return this.photos.get(id) ?? null
  }
  addPhoto(p: PhotoRecord) {
    this.photos.set(p.id, { ...p })
  }
  deletePhoto(id: string) {
    this.photos.delete(id)
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
