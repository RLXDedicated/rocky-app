// The app's live connection to the backend (/api/live — see
// backend/src/infrastructure/live/liveHub.ts). One WebSocket for the whole
// app: presence (who is online and where), live visits and chat pushes.
// Reconnects on its own (1 s, 2 s, 4 s… up to 30 s) and re-announces which
// home the agent is in, so a deploy or a wifi blip is invisible.
import { useEffect, useState, useSyncExternalStore } from 'react'
import { apiBaseUrl } from './apiClient'
import { getAgentEmail, getSessionToken } from './identityService'
import type { Outfit } from '../game/closet'
import type { EvolutionStage, Mood } from '../types/domain'

export type LiveEvent = { t: string } & Record<string, unknown>

export interface Presence {
  id: string
  online: boolean
  where: 'home' | 'visiting' | 'around' | 'offline'
  host?: string
  hostName?: string
}

export interface RoomMember {
  id: string
  name: string
  rockyName: string
  staff?: boolean
  title?: 'qa' | 'leader' | null
  tester?: boolean
  stage: EvolutionStage
  mood: Mood
  outfit: Outfit
  x: number
  host: boolean
}

type Listener = (e: LiveEvent) => void

let ws: WebSocket | null = null
let me: string | null = null
let room: string | null = null
let wanted = false
let retry = 0
let retryTimer: ReturnType<typeof setTimeout> | null = null
let pingTimer: ReturnType<typeof setInterval> | null = null
const listeners = new Set<Listener>()
const presence = new Map<string, Presence>()
let presenceVersion = 0
const presenceSubs = new Set<() => void>()
let connected = false

function emit(e: LiveEvent) {
  for (const l of [...listeners]) l(e)
}
function presenceChanged() {
  presenceVersion++
  for (const s of presenceSubs) s()
}

function url(): string | null {
  const base = apiBaseUrl()
  if (!base) return null
  return `${base.replace(/^http/, 'ws')}/api/live`
}

function connect() {
  const target = url()
  const token = getSessionToken()
  const email = getAgentEmail()
  if (!wanted || !target || (!token && !email) || typeof WebSocket === 'undefined') return
  const socket = new WebSocket(target)
  ws = socket
  socket.onopen = () => {
    // A PIN session when there is one; otherwise the pilot link's address (the backend decides whether it accepts that).
    socket.send(JSON.stringify(token ? { t: 'auth', token } : { t: 'auth', email }))
  }
  socket.onmessage = (msg) => {
    let e: LiveEvent
    try {
      e = JSON.parse(String(msg.data)) as LiveEvent
    } catch {
      return
    }
    if (e.t === 'ready') {
      connected = true
      retry = 0
      me = e.me as string
      presence.clear()
      for (const p of (e.online as Presence[]) ?? []) presence.set(p.id, p)
      presenceChanged()
      // Back where we were before a reconnect.
      if (room) socket.send(JSON.stringify({ t: 'room', host: room }))
    } else if (e.t === 'presence') {
      const p = e as unknown as Presence
      if (p.online) presence.set(p.id, p)
      else presence.delete(p.id)
      presenceChanged()
    }
    emit(e)
  }
  socket.onclose = (ev) => {
    if (ws === socket) ws = null
    connected = false
    presence.clear()
    presenceChanged()
    emit({ t: 'disconnected' })
    // 4001: the session ended — the REST side will send the agent to sign-in.
    if (!wanted || ev.code === 4001) return
    const delay = Math.min(30_000, 1000 * 2 ** retry)
    retry++
    retryTimer = setTimeout(connect, delay)
  }
  socket.onerror = () => socket.close()
}

export const live = {
  /** Opens the connection (once signed in with a backend). */
  start() {
    if (wanted) return
    wanted = true
    connect()
    pingTimer = setInterval(() => live.send({ t: 'ping' }), 25_000)
  },
  stop() {
    wanted = false
    if (retryTimer) clearTimeout(retryTimer)
    if (pingTimer) clearInterval(pingTimer)
    ws?.close()
    ws = null
  },
  send(m: Record<string, unknown>) {
    if (ws && ws.readyState === WebSocket.OPEN && connected) ws.send(JSON.stringify(m))
  },
  /** Which home the agent is in: "me", a friend's id, or null (elsewhere in the app). */
  setRoom(host: string | null) {
    room = host
    live.send({ t: 'room', host })
  },
  on(listener: Listener) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
  me: () => me,
  isConnected: () => connected,
  presenceOf: (id: string) => presence.get(id) ?? null,
  onlineCount: () => presence.size,
}

/** Re-renders when anyone's presence changes. */
export function usePresence(): (id: string) => Presence | null {
  useSyncExternalStore(
    (cb) => {
      presenceSubs.add(cb)
      return () => presenceSubs.delete(cb)
    },
    () => presenceVersion,
  )
  return live.presenceOf
}

/** Subscribes to live events for the component's lifetime. */
export function useLiveEvent(handler: Listener, deps: unknown[] = []) {
  useEffect(() => live.on(handler), deps) // eslint-disable-line react-hooks/exhaustive-deps
}

/** Whether the live channel is up (for "live" badges). */
export function useLiveConnected(): boolean {
  const [up, setUp] = useState(live.isConnected())
  useLiveEvent((e) => {
    if (e.t === 'ready') setUp(true)
    if (e.t === 'disconnected') setUp(false)
  })
  return up
}
