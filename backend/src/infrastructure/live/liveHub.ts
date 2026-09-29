// The live channel (docs/REALTIME_CHAT_PLAN.md §2): one WebSocket per open
// app at /api/live. It carries presence (who is online and where), live
// visits (everyone inside the same Rocky home sees each other's Rocky and
// actions) and pushes from the REST side (new chat messages) via LiveBus.
//
// Nothing that pays coins or XP happens here: rewards still go through the
// REST API, which validates and records them. The socket only relays.
//
// Protocol (JSON text frames):
//   client → server: auth {token} · room {host: friendKey | "me" | null}
//                    act {kind, emoji?} · move {x} · typing {channel} · ping
//   server → client: ready · presence · room.state · room.join · room.leave
//                    room.act · room.move · room.full · visit.arrived
//                    chat.message · chat.typing · chat.hidden · pong · error
import type { IncomingMessage, Server } from 'node:http'
import { WebSocketServer, type WebSocket } from 'ws'
import type { LiveContext } from '../../app'
import { friendKey } from '../../application/petApplicationService'
import type { LiveEvent } from '../../application/liveBus'

export const LIVE_PATH = '/api/live'
const AUTH_TIMEOUT_MS = 8_000
const HEARTBEAT_MS = 30_000
const MAX_GUESTS = 6
const BURST = 40
const BURST_WINDOW_MS = 10_000
export const ACTS = ['wave', 'pet', 'dance', 'cheer', 'treat', 'react'] as const
export const REACTIONS = ['❤️', '😂', '👏', '🎉', '👋', '😮', '🔥', '⭐'] as const

interface Conn {
  ws: WebSocket
  agentId: string | null
  key: string
  name: string
  /** The agent whose home this connection is in (its own id = at home), or null. */
  room: string | null
  x: number
  alive: boolean
  stamps: number[]
  strikes: number
}

export interface LiveHub {
  close(): void
  /** For tests and diagnostics. */
  onlineAgents(): string[]
}

const LOOKS_LIKE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export interface LiveHubOptions {
  allowedOrigins: string[]
  /** Pilot links (ROCKY_AUTH_MODE=pilot-header without required login): the socket may sign in with the address, like the REST API's X-Agent-Email. */
  acceptPilotEmail?: boolean
}

export function attachLiveHub(server: Server, live: LiveContext, opts: LiveHubOptions): LiveHub {
  const wss = new WebSocketServer({ noServer: true, maxPayload: 16 * 1024 })
  const conns = new Set<Conn>()

  const send = (c: Conn, event: LiveEvent) => {
    if (c.ws.readyState === c.ws.OPEN) c.ws.send(JSON.stringify(event))
  }
  const ofAgent = (agentId: string) => [...conns].filter((c) => c.agentId === agentId)
  const inRoom = (hostId: string) => [...conns].filter((c) => c.agentId && c.room === hostId)
  const online = () => [...new Set([...conns].map((c) => c.agentId).filter((a): a is string => !!a))]

  live.bus.setOnlineLookup((agentId) => ofAgent(agentId).length > 0)
  live.bus.setRoomLookup((agentId, hostId) => ofAgent(agentId).some((c) => c.room === hostId))
  const unsubscribe = live.bus.subscribe((agentIds, event) => {
    for (const id of agentIds) for (const c of ofAgent(id)) send(c, event)
  })

  function whereOf(agentId: string) {
    const mine = ofAgent(agentId)
    const c = mine.find((x) => x.room && x.room !== agentId) ?? mine.find((x) => x.room === agentId)
    if (!c?.room) return { where: 'around' as const }
    if (c.room === agentId) return { where: 'home' as const }
    return { where: 'visiting' as const, host: friendKey(c.room), hostName: nameOf(c.room) }
  }
  function nameOf(agentId: string) {
    try {
      return live.pet.publicProfile(agentId).name
    } catch {
      return agentId.split('@')[0] ?? 'Agent'
    }
  }
  function broadcastPresence(agentId: string) {
    const isOnline = ofAgent(agentId).length > 0
    const event = { t: 'presence', id: friendKey(agentId), online: isOnline, ...(isOnline ? whereOf(agentId) : { where: 'offline' }) }
    for (const c of conns) if (c.agentId && c.agentId !== agentId) send(c, event)
  }
  function member(c: Conn) {
    const p = live.pet.publicProfile(c.agentId!)
    return { id: p.id, name: p.name, rockyName: p.rockyName, staff: p.staff, title: p.title, stage: p.stage, mood: p.mood, outfit: p.outfit, x: c.x, host: c.room === c.agentId }
  }
  /** One entry per agent inside a home (an agent may have two tabs open). */
  function members(hostId: string) {
    const seen = new Set<string>()
    return inRoom(hostId)
      .filter((c) => (seen.has(c.agentId!) ? false : (seen.add(c.agentId!), true)))
      .map(member)
  }

  function leaveRoom(c: Conn) {
    const hostId = c.room
    if (!hostId) return
    c.room = null
    const stillThere = ofAgent(c.agentId!).some((x) => x.room === hostId)
    if (!stillThere) for (const other of inRoom(hostId)) send(other, { t: 'room.leave', id: c.key })
  }

  function enterRoom(c: Conn, hostId: string) {
    if (c.room === hostId) return
    leaveRoom(c)
    const guests = new Set(inRoom(hostId).map((x) => x.agentId).filter((a) => a !== hostId))
    if (hostId !== c.agentId && !guests.has(c.agentId) && guests.size >= MAX_GUESTS) {
      send(c, { t: 'room.full', host: friendKey(hostId) })
      return
    }
    const wasThere = ofAgent(c.agentId!).some((x) => x.room === hostId)
    c.room = hostId
    c.x = hostId === c.agentId ? 50 : 20 + Math.round(Math.random() * 60)
    send(c, { t: 'room.state', host: friendKey(hostId), members: members(hostId).filter((m) => m.id !== c.key) })
    if (!wasThere) {
      const me = member(c)
      for (const other of inRoom(hostId)) if (other.agentId !== c.agentId) send(other, { t: 'room.join', member: me })
      // The host hears about a visitor even when they are somewhere else in the app.
      if (hostId !== c.agentId && !ofAgent(hostId).some((x) => x.room === hostId)) {
        for (const h of ofAgent(hostId)) send(h, { t: 'visit.arrived', from: { id: c.key, name: c.name } })
      }
    }
  }

  function toRoom(c: Conn, event: LiveEvent) {
    if (!c.room) return
    for (const other of inRoom(c.room)) if (other.agentId !== c.agentId) send(other, event)
  }

  function limited(c: Conn): boolean {
    const now = Date.now()
    c.stamps = c.stamps.filter((t) => now - t < BURST_WINDOW_MS)
    c.stamps.push(now)
    if (c.stamps.length <= BURST) return false
    c.strikes += 1
    if (c.strikes > 3) c.ws.close(4008, 'Too many messages')
    return true
  }

  function handle(c: Conn, raw: string) {
    let msg: Record<string, unknown>
    try {
      msg = JSON.parse(raw) as Record<string, unknown>
    } catch {
      return
    }
    if (!c.agentId) {
      if (msg.t !== 'auth') return c.ws.close(4001, 'Sign in first')
      const pilot = typeof msg.email === 'string' ? msg.email.trim().toLowerCase() : ''
      const who =
        typeof msg.token === 'string' && msg.token
          ? live.auth.resolve(msg.token)
          : opts.acceptPilotEmail && LOOKS_LIKE_EMAIL.test(pilot)
            ? { agentId: pilot }
            : null
      if (!who) return c.ws.close(4001, 'Session ended')
      c.agentId = who.agentId
      c.key = friendKey(who.agentId)
      c.name = nameOf(who.agentId)
      const others = online().filter((a) => a !== who.agentId)
      send(c, { t: 'ready', me: c.key, online: others.map((a) => ({ id: friendKey(a), online: true, ...whereOf(a) })) })
      if (ofAgent(who.agentId).length === 1) broadcastPresence(who.agentId)
      return
    }
    if (limited(c)) return
    const agentId = c.agentId
    switch (msg.t) {
      case 'ping':
        send(c, { t: 'pong' })
        return
      case 'room': {
        if (msg.host === null || msg.host === undefined) leaveRoom(c)
        else if (msg.host === 'me') enterRoom(c, agentId)
        else if (typeof msg.host === 'string') {
          const hostId = live.pet.resolveFriend(agentId, msg.host)
          if (hostId) enterRoom(c, hostId)
          else send(c, { t: 'error', code: 'NOT_FOUND' })
        }
        broadcastPresence(agentId)
        return
      }
      case 'act': {
        const kind = ACTS.find((k) => k === msg.kind)
        if (!kind) return
        const emoji = kind === 'react' ? REACTIONS.find((e) => e === msg.emoji) : undefined
        if (kind === 'react' && !emoji) return
        toRoom(c, { t: 'room.act', from: c.key, name: c.name, kind, ...(emoji ? { emoji } : {}) })
        return
      }
      case 'move': {
        const x = Number(msg.x)
        if (!Number.isFinite(x)) return
        c.x = Math.max(3, Math.min(97, Math.round(x)))
        toRoom(c, { t: 'room.move', from: c.key, x: c.x })
        return
      }
      case 'typing':
        if (typeof msg.channel === 'string') live.chat.typing(agentId, msg.channel)
        return
      default:
        return
    }
  }

  wss.on('connection', (ws: WebSocket) => {
    const c: Conn = { ws, agentId: null, key: '', name: '', room: null, x: 50, alive: true, stamps: [], strikes: 0 }
    conns.add(c)
    const timer = setTimeout(() => {
      if (!c.agentId) ws.close(4001, 'Sign in first')
    }, AUTH_TIMEOUT_MS)
    ws.on('pong', () => {
      c.alive = true
    })
    ws.on('message', (data) => {
      try {
        handle(c, data.toString())
      } catch (err) {
        send(c, { t: 'error', code: 'SERVER', message: err instanceof Error ? err.message : 'error' })
      }
    })
    ws.on('close', () => {
      clearTimeout(timer)
      leaveRoom(c)
      conns.delete(c)
      if (c.agentId && ofAgent(c.agentId).length === 0) broadcastPresence(c.agentId)
    })
  })

  const heartbeat = setInterval(() => {
    for (const c of conns) {
      if (!c.alive) {
        c.ws.terminate()
        continue
      }
      c.alive = false
      c.ws.ping()
    }
  }, HEARTBEAT_MS)
  heartbeat.unref?.()

  const onUpgrade = (req: IncomingMessage, socket: import('node:stream').Duplex, head: Buffer) => {
    const url = new URL(req.url ?? '/', 'http://localhost')
    if (url.pathname !== LIVE_PATH) return socket.destroy()
    const origin = req.headers.origin
    if (origin && opts.allowedOrigins.length > 0 && !opts.allowedOrigins.includes(origin)) {
      socket.write('HTTP/1.1 403 Forbidden\r\n\r\n')
      return socket.destroy()
    }
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req))
  }
  server.on('upgrade', onUpgrade)

  return {
    close() {
      clearInterval(heartbeat)
      unsubscribe()
      server.off('upgrade', onUpgrade)
      for (const c of conns) c.ws.terminate()
      wss.close()
    },
    onlineAgents: online,
  }
}
