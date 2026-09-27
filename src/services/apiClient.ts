// Thin HTTP client for the Rocky backend (backend/ — Phase 12/13). Every
// other service in this app talks to the local Repository directly and
// stays synchronous; this is the ONE seam that talks to the network, kept
// deliberately small so it's obvious exactly what leaves the browser.
//
// "Remote mode" is opt-in and self-contained: with no VITE_API_URL (the
// default — see README "What this is (and isn't)"), isRemoteModeEnabled()
// is always false and nothing here is ever called. Set at build time by
// the deployment that wires this frontend to a live backend.
import { getAgentEmail } from './identityService'

const API_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, '')

export function isRemoteModeEnabled(): boolean {
  return Boolean(API_BASE_URL) && Boolean(getAgentEmail())
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const email = getAgentEmail()
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-Agent-Email': email ?? '',
      ...init.headers,
    },
  })
  if (!res.ok) {
    // Surface the backend's own message (see backend/src/api/errors.ts) when there is one.
    let detail = ''
    try {
      const body = (await res.json()) as { error?: { message?: string } }
      detail = body.error?.message ? `: ${body.error.message}` : ''
    } catch {
      // non-JSON error body — keep the status-only message
    }
    throw new Error(`Rocky API ${init.method ?? 'GET'} ${path} failed with ${res.status}${detail}`)
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
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

// Shapes intentionally left as `unknown`-adjacent (import type from the
// domain where it matters) rather than redeclared here — see
// backend/src/types/dto.ts, which these responses match field-for-field.
export const apiClient = {
  getAgent: () => request<RemoteAgent>('/api/agent/me'),
  getGameState: () => request<import('../types/domain').GameState>('/api/game-state'),
  getAchievements: () =>
    request<{ unlocked: import('../types/domain').Achievement[] }>('/api/achievements'),
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
  resetAgent: (agentId: string) =>
    request<unknown>(`/api/admin/agents/${encodeURIComponent(agentId)}/reset`, { method: 'POST', body: '{}' }),
  deleteAgent: (agentId: string) =>
    request<unknown>(`/api/admin/agents/${encodeURIComponent(agentId)}`, { method: 'DELETE' }),
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
