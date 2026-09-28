// Unread counts for the nav badge, refreshed from the server and bumped by
// live pushes. Tiny external store so App and the Chat page share it.
import { useSyncExternalStore } from 'react'
import { chatApi, isRemoteModeEnabled } from '../../services/apiClient'
import { live } from '../../services/liveClient'

let unread = 0
let open: string | null = null
const subs = new Set<() => void>()
const notify = () => subs.forEach((s) => s())

export const chatState = {
  async refresh() {
    if (!isRemoteModeEnabled()) return
    try {
      const { channels } = await chatApi.channels()
      unread = channels.reduce((n, c) => n + (c.id === open ? 0 : c.unread), 0)
      notify()
    } catch {
      // offline or signed out — keep the last count
    }
  },
  /** The conversation on screen (its messages don't count as unread). */
  setOpen(id: string | null) {
    open = id
    void chatState.refresh()
  },
  isOpen: (id: string) => open === id,
}

let started = false
/** Starts listening for pushed messages (once). */
export function startChatBadge() {
  if (started) return
  started = true
  void chatState.refresh()
  live.on((e) => {
    if (e.t === 'chat.message') {
      const m = e.message as { mine: boolean; channel: string }
      if (!m.mine && m.channel !== open) {
        unread++
        notify()
      }
    }
    if (e.t === 'ready') void chatState.refresh()
  })
}

export function useChatUnread(): number {
  return useSyncExternalStore(
    (cb) => {
      subs.add(cb)
      return () => subs.delete(cb)
    },
    () => unread,
  )
}
