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
    throw new Error(`Rocky API ${init.method ?? 'GET'} ${path} failed with ${res.status}`)
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
}
