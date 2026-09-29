// A tiny in-process pub/sub between the REST side (a chat message was saved,
// a visit happened) and the live WebSocket hub (infrastructure/live), so
// application services never import the socket layer. One backend instance
// is enough for the pilot; with several instances this is where Redis
// pub/sub would plug in (docs/REALTIME_CHAT_PLAN.md §4).

export type LiveEvent = { t: string } & Record<string, unknown>

type Listener = (agentIds: string[], event: LiveEvent) => void

export interface LiveBus {
  /** Sends `event` to every open connection of these agents (a no-op for agents who are offline). */
  publish(agentIds: string[], event: LiveEvent): void
  subscribe(listener: Listener): () => void
  /** Filled in by the live hub: is this agent currently inside that host's home? */
  inRoom(agentId: string, hostId: string): boolean
  setRoomLookup(fn: (agentId: string, hostId: string) => boolean): void
  /** Filled in by the live hub: does this agent have the app open right now? */
  isOnline(agentId: string): boolean
  setOnlineLookup(fn: (agentId: string) => boolean): void
}

export function createLiveBus(): LiveBus {
  const listeners = new Set<Listener>()
  let lookup: (agentId: string, hostId: string) => boolean = () => false
  let online: (agentId: string) => boolean = () => false
  return {
    publish(agentIds, event) {
      if (agentIds.length === 0) return
      for (const l of listeners) l(agentIds, event)
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    inRoom: (agentId, hostId) => lookup(agentId, hostId),
    setRoomLookup(fn) {
      lookup = fn
    },
    isOnline: (agentId) => online(agentId),
    setOnlineLookup(fn) {
      online = fn
    },
  }
}
