import { useCallback, useEffect, useRef, useState } from 'react'
import { live, useLiveEvent, type RoomMember } from '../../services/liveClient'
import type { Guest } from '../world/GuestRocky'

const ACT_BUBBLE: Record<string, string> = {
  wave: '👋',
  pet: '🤗',
  dance: '💃',
  cheer: '🎉',
  treat: '🍎',
}

/**
 * Being inside a Rocky home live. `host` is "me" (my own home) or a
 * friend's id (visiting). Returns the other agents' Rockys to draw, the
 * reactions to float over the main Rocky, and senders for acts and moves.
 */
export function useLiveRoom(host: 'me' | string | null) {
  const [members, setMembers] = useState<Guest[]>([])
  const [floatReacts, setFloatReacts] = useState<{ id: number; emoji: string }[]>([])
  const [arrivals, setArrivals] = useState<string[]>([])
  const seq = useRef(0)
  const lastMove = useRef(0)

  useEffect(() => {
    if (!host) return
    live.setRoom(host)
    setMembers([])
    return () => {
      live.setRoom(null)
      setMembers([])
    }
  }, [host])

  const floatUp = useCallback((emoji: string) => {
    const id = ++seq.current
    setFloatReacts((list) => [...list.slice(-8), { id, emoji }])
    window.setTimeout(() => setFloatReacts((list) => list.filter((r) => r.id !== id)), 2300)
  }, [])

  useLiveEvent(
    (e) => {
      if (e.t === 'room.state') setMembers((e.members as RoomMember[]).map((m) => ({ ...m, bubble: null, hop: 0 })))
      else if (e.t === 'room.join') {
        const m = e.member as RoomMember
        setMembers((list) => [...list.filter((g) => g.id !== m.id), { ...m, bubble: '👋', hop: 1 }])
        if (!m.host) setArrivals((a) => [...a.slice(-3), m.name])
      } else if (e.t === 'room.leave') setMembers((list) => list.filter((g) => g.id !== e.id))
      else if (e.t === 'room.move') setMembers((list) => list.map((g) => (g.id === e.from ? { ...g, x: e.x as number } : g)))
      else if (e.t === 'room.act') {
        const emoji = (e.emoji as string | undefined) ?? ACT_BUBBLE[e.kind as string] ?? '✨'
        setMembers((list) => list.map((g) => (g.id === e.from ? { ...g, bubble: emoji, hop: (g.hop ?? 0) + 1 } : g)))
        // A host acting in their own home, or anyone petting the host's Rocky: it shows over the main Rocky.
        const fromHost = members.find((g) => g.id === e.from)?.host
        if (fromHost || e.kind === 'pet' || e.kind === 'treat') floatUp(emoji)
      } else if (e.t === 'disconnected') setMembers([])
    },
    [members, floatUp],
  )

  const act = useCallback(
    (kind: 'wave' | 'pet' | 'dance' | 'cheer' | 'treat' | 'react', emoji?: string) => {
      live.send({ t: 'act', kind, ...(emoji ? { emoji } : {}) })
      if (host === 'me' || kind === 'pet' || kind === 'treat' || kind === 'react') floatUp(emoji ?? ACT_BUBBLE[kind] ?? '✨')
    },
    [host, floatUp],
  )

  const trailing = useRef<ReturnType<typeof setTimeout> | null>(null)
  const move = useCallback((x: number) => {
    const now = Date.now()
    if (trailing.current) clearTimeout(trailing.current)
    if (now - lastMove.current < 250) {
      // Too soon: send the latest position a moment later so the last move is never lost.
      trailing.current = setTimeout(() => {
        lastMove.current = Date.now()
        live.send({ t: 'move', x })
      }, 260)
      return
    }
    lastMove.current = now
    live.send({ t: 'move', x })
  }, [])

  const hostMember = members.find((m) => m.host) ?? null
  return {
    /** Visiting: the host is the world's own Rocky, so only other visitors are drawn. */
    guests: host === 'me' ? members : members.filter((m) => !m.host),
    hostHere: host !== 'me' && !!hostMember,
    /** Where the host has put their Rocky (visiting, while they are home). */
    hostX: host !== 'me' && hostMember ? hostMember.x : null,
    visitors: members.filter((m) => !m.host),
    floatReacts,
    arrivals,
    act,
    move,
  }
}
