// Thin HTTP client for the Rocky backend (backend/ — Phase 12/13). Every
// other service in this app talks to the local Repository directly and
// stays synchronous; this is the ONE seam that talks to the network, kept
// deliberately small so it's obvious exactly what leaves the browser.
//
// "Remote mode" is opt-in and self-contained: with no VITE_API_URL (the
// default — see README "What this is (and isn't)"), isRemoteModeEnabled()
// is always false and nothing here is ever called. Set at build time by
// the deployment that wires this frontend to a live backend.
import { getAgentEmail, getSessionToken } from './identityService'
import type { PetAction, PetFailure, PetState } from '../game/pet'
import type { CatalogOverrides, ProgressFacts } from '../game/closet'
import type { CoinBreakdown } from '../game/economy'

// Read defensively: the backend's type-check also compiles this file (via
// shared services) outside Vite, where import.meta.env does not exist.
const API_BASE_URL = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.VITE_API_URL?.replace(/\/+$/, '')

/** Whether this build talks to a backend at all (sign-in is offered only then). */
export function isBackendConfigured(): boolean {
  return Boolean(API_BASE_URL)
}

export function isRemoteModeEnabled(): boolean {
  return Boolean(API_BASE_URL) && Boolean(getAgentEmail())
}

/** Thrown for 401s so the app can send the agent back to the sign-in screen. */
export class AuthRequiredError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuthRequiredError'
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const email = getAgentEmail()
  const token = getSessionToken()
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-Agent-Email': email ?? '',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  })
  if (!res.ok) {
    // Surface the backend's own message (see backend/src/api/errors.ts) when there is one.
    let message = ''
    let code = ''
    try {
      const body = (await res.json()) as { error?: { message?: string; code?: string } }
      message = body.error?.message ?? ''
      code = body.error?.code ?? ''
    } catch {
      // non-JSON error body — keep the status-only message
    }
    if (res.status === 401 && !path.startsWith('/api/auth/')) {
      window.dispatchEvent(new CustomEvent('rocky:auth-required', { detail: message }))
      throw new AuthRequiredError(message || 'Please sign in again.')
    }
    const error = new Error(message || `Rocky API ${init.method ?? 'GET'} ${path} failed with ${res.status}`)
    ;(error as Error & { status?: number; code?: string }).status = res.status
    ;(error as Error & { status?: number; code?: string }).code = code
    throw error
  }
  // 204s and similar never occur on this API today, but guard anyway rather
  // than call res.json() on an empty body.
  const text = await res.text()
  return (text ? JSON.parse(text) : undefined) as T
}

export interface RemoteAgent {
  id: string
  name: string
  rockyName: string
  role: import('./identityService').AgentRole
  via?: 'session' | 'pilot-link' | 'dev' | null
}

/** Rocky the pet as the server sees it — mirrors backend petApplicationService PetView. */
export interface PetView {
  state: PetState
  coins: number
  treats: number
  earned: CoinBreakdown
  facts: ProgressFacts
  catalog: CatalogOverrides
  revision: number
  serverTime: string
}

/** A friend's Rocky as listed (mirrors backend listFriends). */
export interface FriendSummary {
  id: string
  name: string
  rockyName: string
  /** A Rocky admin (VIP badge). */
  staff?: boolean
  level: number
  stage: import('../types/domain').EvolutionStage
  mood: import('../types/domain').Mood
  streak: number
  feeling: 'dirty' | 'sad' | 'unwell' | 'great' | 'ok'
  scene: string
  lastActiveAt: string | null
  visitedToday: boolean
}

export interface FriendDetail {
  id: string
  name: string
  rockyName: string
  staff?: boolean
  level: number
  stage: import('../types/domain').EvolutionStage
  mood: import('../types/domain').Mood
  streak: number
  badges: number
  needs: import('../game/pet').Needs
  outfit: import('../game/closet').Outfit
  visitors: Array<{ text: string; at: string }>
}

export type BulkOp =
  | { kind: 'coins'; delta: number; note: string }
  | { kind: 'xp'; xp: number; reason: string }
  | { kind: 'treats'; delta: number }
  | { kind: 'item'; itemId: string }
  | { kind: 'inventory'; itemId: string; qty: number }
  | { kind: 'needs' }
  | { kind: 'message'; text: string }
  | { kind: 'litter' }
  | { kind: 'games' }

export interface BulkResult {
  done: number
  total: number
  failed: Array<{ agentId: string; error?: string }>
}

export interface PetActionResponse extends PetView {
  ok: boolean
  reason: PetFailure | null
  reward?: { coins: number; xp: number } | null
  leveledUp?: boolean
}

export interface LoginResponse {
  token: string
  expiresAt: string
  firstLogin: boolean
  agent: RemoteAgent
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

export interface AdminPetDetail {
  pet: PetView
  ledger: LedgerRow[]
  audit: AuditRow[]
  sessions: { createdAt: string; lastSeenAt: string; expiresAt: string; userAgent: string | null; revokedAt: string | null; active: boolean }[]
  hasPin: boolean
}

export interface AdminCatalogItem {
  id: string
  slot: string
  name: string
  requirement: string
  price: number
  basePrice: number
  enabled: boolean
  /** Limited collection the item belongs to (seasonal specials), if any. */
  collection?: string | null
}

export interface AdminCollection {
  id: 'spooky' | 'holiday'
  name: string
  emoji: string
  blurb: string
  /** The admin switch, and the optional window (YYYY-MM-DD). */
  enabled: boolean
  from: string | null
  until: string | null
  /** Open right now (switched on and inside the window). */
  open: boolean
}

export interface AdminEconomy {
  totals: { earned: number; spent: number; adjustments: number; balance: number }
  needs: { health: number; happiness: number; dirt: number }
  agents: {
    agentId: string
    earned: number
    spent: number
    adjust: number
    balance: number
    items: number
    needs: { health: number; happiness: number; dirt: number }
  }[]
  ledger: LedgerRow[]
}

// Admin console shapes — mirror backend/src/types/dto.ts (Admin section).
export interface AdminAgentMetrics {
  checkIns: number
  qaPasses: number
  alerts: number
  corrections: number
  achievements: number
  totalEvents: number
  checkedInToday: boolean
  daysSinceCheckIn: number | null
  firstSeenAt: string | null
  atRisk: boolean
  riskReasons: string[]
}

export interface AdminAgentSummary {
  id: string
  name: string
  rockyName: string
  state: import('../types/domain').GameState
  metrics: AdminAgentMetrics
}

export interface AdminEventRow {
  id: string
  agentId: string
  type: import('../types/domain').EventType
  date: string
  timestamp: string
  payload: Record<string, unknown> | null
  correctsEventId: string | null
  correctedTo: 'PASS' | 'ALERT' | null
}

export interface AdminAgentDetail {
  agent: AdminAgentSummary
  events: AdminEventRow[]
  achievements: import('../types/domain').Achievement[]
  reminders: import('../types/reminder').ReminderRecord[]
}

export interface AdminOverview {
  generatedAt: string
  today: string
  timezone: string
  kpis: {
    totalAgents: number
    checkedInToday: number
    checkInRateToday: number
    active7d: number
    atRisk: number
    totalCheckIns: number
    totalQaPasses: number
    totalAlerts: number
    qaPassRate: number | null
    totalAchievements: number
    avgLevel: number
    avgXp: number
    avgEnergy: number
    avgStreak: number
    bestStreak: { agentId: string; days: number } | null
  }
  moodDistribution: { key: string; count: number }[]
  evolutionDistribution: { key: string; count: number }[]
  daily: { date: string; checkIns: number; qaPasses: number; alerts: number; activeAgents: number }[]
  hourlyCheckIns: { hour: number; checkIns: number }[]
  weekdayCheckIns: { day: number; checkIns: number }[]
  topAgents: AdminAgentSummary[]
  atRiskAgents: AdminAgentSummary[]
  recentActivity: AdminEventRow[]
}

export interface AdminSystem {
  serverTime: string
  serverLocalTime: string
  today: string
  timezone: string
  processTz: string | null
  nodeEnv: string
  nodeVersion: string
  authMode: string
  adminEmails: string[]
  allowedOrigins: string[]
  persistenceDriver: string
  uptimeSeconds: number
  deployment: {
    commitSha: string | null
    commitMessage: string | null
    branch: string | null
    environment: string | null
    deploymentId: string | null
  }
  agentCount: number
}

function newIdempotencyKey(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

// Shapes intentionally left as `unknown`-adjacent (import type from the
// domain where it matters) rather than redeclared here — see
// backend/src/types/dto.ts, which these responses match field-for-field.
const post = (body: unknown = {}): RequestInit => ({ method: 'POST', body: JSON.stringify(body) })
const agentPath = (agentId: string, rest = '') => `/api/admin/agents/${encodeURIComponent(agentId)}${rest}`

/** The backend's origin, for the live WebSocket (null offline). */
export function apiBaseUrl(): string | null {
  return API_BASE_URL ?? null
}

// ---- Chat (mirrors backend chatApplicationService) ----
export interface ChatPerson {
  id: string
  name: string
  staff?: boolean
  rockyName: string
  stage: import('../types/domain').EvolutionStage
  mood: import('../types/domain').Mood
}
export interface ChatChannel {
  id: string
  kind: 'general' | 'dm' | 'visit'
  title: string
  with: ChatPerson | null
  unread: number
  last: { name: string; body: string; at: string; mine: boolean } | null
}
export interface ChatMessage {
  id: number
  channel: string
  from: string
  name: string
  staff?: boolean
  mine: boolean
  body: string
  hidden: boolean
  at: string
}
export interface ChatRules {
  version: string
  accepted: boolean
  acceptedAt: string | null
  retentionDays: number
}
export interface AdminChatChannel {
  id: string
  kind: 'general' | 'dm' | 'visit'
  title: string
  members: { email: string; name: string }[]
  lastAt: string | null
}
export interface AdminChatMessage {
  id: number
  email: string
  name: string
  body: string
  flagged: boolean
  hidden: boolean
  hiddenBy: string | null
  at: string
}
export interface AdminChatReport {
  id: number
  reason: string | null
  reporter: { email: string; name: string }
  at: string
  resolution: string | null
  resolvedBy: string | null
  message: { id: number; channel: string; email: string; name: string; body: string; hidden: boolean; at: string } | null
}
export interface ChatBackupStatus {
  target: { local: boolean; bucket: boolean; encrypted: boolean }
  last: { day: string; at: string; count: number; uploaded: boolean; encrypted: boolean; error?: string } | null
  lastPurge: { at: string; removed: number } | null
}

const chatPath = (id: string) => `/api/chat/channels/${encodeURIComponent(id)}`

export const chatApi = {
  rules: () => request<ChatRules>('/api/chat/rules'),
  acceptRules: (version: string) => request<ChatRules>('/api/chat/rules', post({ version })),
  channels: () => request<{ channels: ChatChannel[]; mutedUntil: string | null }>('/api/chat/channels'),
  openDirect: (friend: string) => request<ChatChannel>('/api/chat/direct', post({ friend })),
  openVisit: (host: string | null) => request<ChatChannel>('/api/chat/visit', post({ host })),
  messages: (id: string, opts: { before?: number; after?: number } = {}) => {
    const q = new URLSearchParams()
    if (opts.before !== undefined) q.set('before', String(opts.before))
    if (opts.after !== undefined) q.set('after', String(opts.after))
    return request<{ channel: string; messages: ChatMessage[]; more: boolean }>(`${chatPath(id)}/messages${q.size ? `?${q}` : ''}`)
  },
  send: (id: string, text: string, confirm = false) => request<ChatMessage>(`${chatPath(id)}/messages`, post({ text, confirm })),
  markRead: (id: string, messageId: number) => request<{ ok: boolean }>(`${chatPath(id)}/read`, post({ id: messageId })),
  report: (messageId: number, reason: string) => request<{ ok: boolean }>(`/api/chat/messages/${messageId}/report`, post({ reason })),

  // Rocky admins only (quality-control copy; every read is audited).
  adminChannels: () => request<{ channels: AdminChatChannel[] }>('/api/admin/chat/channels'),
  adminRead: (id: string, before?: number) =>
    request<{ channel: string; messages: AdminChatMessage[]; more: boolean }>(
      `/api/admin/chat/channels/${encodeURIComponent(id)}${before !== undefined ? `?before=${before}` : ''}`,
    ),
  adminReports: (all = false) => request<{ reports: AdminChatReport[] }>(`/api/admin/chat/reports${all ? '?all=1' : ''}`),
  adminResolve: (id: number, action: 'hide' | 'dismiss') => request<{ ok: boolean }>(`/api/admin/chat/reports/${id}`, post({ action })),
  adminHide: (messageId: number) => request<{ ok: boolean }>(`/api/admin/chat/messages/${messageId}/hide`, post()),
  adminMute: (email: string, hours: number, reason: string) => request<{ mutedUntil: string | null }>('/api/admin/chat/mute', post({ email, hours, reason })),
  adminExport: (from: string, to: string) => request<{ from: string; to: string; exportedAt: string; messages: unknown[] }>(`/api/admin/chat/export?from=${from}&to=${to}`),
  adminBackups: () => request<ChatBackupStatus>('/api/admin/chat/backups'),
  adminBackupNow: (day: string) => request<{ count: number; uploaded: boolean; encrypted: boolean; file: string | null; error?: string }>('/api/admin/chat/backups', post({ day })),
}

export const apiClient = {
  // Sign-in (no identity needed).
  authStatus: (email: string) => request<{ email: string; hasPin: boolean }>('/api/auth/status', post({ email })),
  login: (email: string, pin: string) => request<LoginResponse>('/api/auth/login', post({ email, pin })),
  logout: () => request<{ ok: boolean }>('/api/auth/logout', post()),

  getAgent: () => request<RemoteAgent>('/api/agent/me'),
  renameRocky: (rockyName: string) => request<RemoteAgent>('/api/agent/me', { method: 'PATCH', body: JSON.stringify({ rockyName }) }),
  markOnboarded: () => request<PetView>('/api/agent/onboarded', post()),
  getEvents: () => request<{ events: import('../types/domain').GameEvent[] }>('/api/events'),
  getPet: () => request<PetView>('/api/pet'),
  getLeaderboard: () => request<{ entries: import('../types/leaderboard').LeaderboardEntry[] }>('/api/leaderboard'),
  petAction: (action: PetAction) => request<PetActionResponse>('/api/pet/actions', post(action)),

  // Friends: every Rocky in the pilot.
  listFriends: () => request<{ friends: FriendSummary[] }>('/api/friends'),
  getFriend: (id: string) => request<FriendDetail>(`/api/friends/${encodeURIComponent(id)}`),
  visitFriend: (id: string, kind: 'pet' | 'wave' | 'treat') =>
    request<PetActionResponse>(`/api/friends/${encodeURIComponent(id)}/visit`, post({ kind })),

  // Admin: progress (XP bonus, raise level, unlock evolution — always forward).
  grantXp: (agentId: string, xp: number, reason: string) =>
    request<{ state: import('../types/domain').GameState }>(agentPath(agentId, '/xp'), post({ xp, reason })),
  raiseLevel: (agentId: string, level: number) =>
    request<{ state: import('../types/domain').GameState }>(agentPath(agentId, '/level'), post({ level })),
  unlockEvolution: (agentId: string, stage: 'Young' | 'Advanced' | 'Elite') =>
    request<{ state: import('../types/domain').GameState }>(agentPath(agentId, '/level'), post({ stage })),

  // Admin: pet, coins, items, sign-in, catalogue, economy, audit.
  getAdminPet: (agentId: string) => request<AdminPetDetail>(agentPath(agentId, '/pet')),
  adjustCoins: (agentId: string, delta: number, note: string) => request<PetView>(agentPath(agentId, '/coins'), post({ delta, note })),
  adjustTreats: (agentId: string, delta: number) => request<PetView>(agentPath(agentId, '/treats'), post({ delta })),
  setItem: (agentId: string, itemId: string, action: 'grant' | 'revoke') => request<PetView>(agentPath(agentId, '/items'), post({ itemId, action })),
  restoreNeeds: (agentId: string) => request<PetView>(agentPath(agentId, '/needs/restore'), post()),
  giveInventory: (agentId: string, itemId: string, qty: number) => request<PetView>(agentPath(agentId, '/inventory'), post({ itemId, qty })),
  sendMessage: (agentId: string, text: string) => request<PetView>(agentPath(agentId, '/message'), post({ text })),
  clearLitter: (agentId: string) => request<PetView>(agentPath(agentId, '/litter/clear'), post()),
  resetGameCaps: (agentId: string) => request<PetView>(agentPath(agentId, '/games/reset'), post()),
  bulk: (agentIds: string[] | 'all', op: BulkOp) => request<BulkResult>('/api/admin/bulk', post({ agentIds, op })),
  resetPet: (agentId: string) => request<PetView>(agentPath(agentId, '/pet/reset'), post()),
  resetPin: (agentId: string) => request<{ ok: boolean; sessionsRevoked: number }>(agentPath(agentId, '/pin-reset'), post()),
  revokeSessions: (agentId: string) => request<{ ok: boolean; sessionsRevoked: number }>(agentPath(agentId, '/sessions/revoke'), post()),
  getCatalog: () => request<{ items: AdminCatalogItem[]; overrides: CatalogOverrides; collections: AdminCollection[] }>('/api/admin/catalog'),
  setCollection: (id: string, value: { enabled: boolean; from?: string | null; until?: string | null }) =>
    request<{ items: AdminCatalogItem[]; overrides: CatalogOverrides; collections: AdminCollection[] }>(
      `/api/admin/collections/${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(value),
      },
    ),
  setCatalogItem: (itemId: string, value: { price?: number | null; enabled?: boolean | null }) =>
    request<{ items: AdminCatalogItem[]; overrides: CatalogOverrides }>(`/api/admin/catalog/${encodeURIComponent(itemId)}`, {
      method: 'PATCH',
      body: JSON.stringify(value),
    }),
  getEconomy: () => request<AdminEconomy>('/api/admin/economy'),
  getAudit: () => request<{ entries: AuditRow[] }>('/api/admin/audit'),

  getGameState: () => request<import('../types/domain').GameState>('/api/game-state'),
  getAchievements: () => request<{ unlocked: import('../types/domain').Achievement[] }>('/api/achievements'),
  checkIn: () =>
    request<import('../engine/gameEngine').CheckInResult>('/api/events/check-in', {
      method: 'POST',
      body: JSON.stringify({}),
    }),
  // QA/ADMIN only — the backend returns 403 for anyone else.
  listAdminAgents: () => request<{ agents: AdminAgentSummary[] }>('/api/admin/agents'),
  getAdminOverview: () => request<AdminOverview>('/api/admin/overview'),
  getAdminSystem: () => request<AdminSystem>('/api/admin/system'),
  getAdminAgent: (agentId: string) => request<AdminAgentDetail>(`/api/admin/agents/${encodeURIComponent(agentId)}`),
  renameAgent: (agentId: string, name: string) =>
    request<AdminAgentSummary>(`/api/admin/agents/${encodeURIComponent(agentId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    }),
  resetAgent: (agentId: string) => request<unknown>(`/api/admin/agents/${encodeURIComponent(agentId)}/reset`, { method: 'POST', body: '{}' }),
  deleteAgent: (agentId: string) => request<unknown>(`/api/admin/agents/${encodeURIComponent(agentId)}`, { method: 'DELETE' }),
  correction: (agentId: string, originalEventId: string, correctedTo: 'PASS' | 'ALERT', reason?: string) =>
    request<unknown>('/api/events/correction', {
      method: 'POST',
      headers: { 'Idempotency-Key': newIdempotencyKey() },
      body: JSON.stringify({ agentId, originalEventId, correctedTo, reason }),
    }),
  qaPass: (agentId: string, auditDate: string) =>
    request<unknown>('/api/events/qa-pass', {
      method: 'POST',
      headers: { 'Idempotency-Key': newIdempotencyKey() },
      body: JSON.stringify({ agentId, auditDate }),
    }),
  documentationAlert: (agentId: string, auditDate: string) =>
    request<unknown>('/api/events/documentation-alert', {
      method: 'POST',
      headers: { 'Idempotency-Key': newIdempotencyKey() },
      body: JSON.stringify({ agentId, auditDate }),
    }),
}
