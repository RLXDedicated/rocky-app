import { useEffect, useState } from 'react'
import { chatApi, type ChatRules } from '../../services/apiClient'
import { useLiveConnected } from '../../services/liveClient'
import type { Guest } from '../world/GuestRocky'
import { ChatThread } from './ChatThread'
import { RulesGate } from './ChatRules'
import styles from './Chat.module.css'

export const REACTIONS = ['❤️', '😂', '👏', '🎉', '👋', '😮', '🔥', '⭐'] as const

/**
 * Beside a Rocky home while someone is there live: who's here, quick
 * reactions and dances, and the home's chat.
 */
export function LivePanel({
  host,
  hostName,
  visitors,
  hostHere,
  onAct,
}: {
  host: 'me' | string
  hostName?: string
  visitors: Guest[]
  hostHere: boolean
  onAct: (kind: 'wave' | 'dance' | 'cheer' | 'react', emoji?: string) => void
}) {
  const connected = useLiveConnected()
  const [rules, setRules] = useState<ChatRules | null>(null)
  const [channel, setChannel] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const someoneHere = visitors.length > 0 || hostHere

  useEffect(() => {
    chatApi.rules().then(setRules).catch(() => {})
  }, [])

  // The home chat opens once the live channel has placed us in the room.
  useEffect(() => {
    if (!connected || !rules?.accepted || channel) return
    const t = window.setTimeout(() => {
      chatApi
        .openVisit(host === 'me' ? null : host)
        .then((c) => setChannel(c.id))
        .catch(() => setError('The home chat is not available right now.'))
    }, 400)
    return () => window.clearTimeout(t)
  }, [connected, rules?.accepted, host, channel])

  const names = [...(hostHere && hostName ? [`${hostName} (home)`] : []), ...visitors.map((v) => v.name)]
  return (
    <aside className={styles.livePanel} aria-label="Live visit">
      <div className={styles.livePanelHead}>
        <strong>{host === 'me' ? 'Visitors at your home' : `At ${hostName ?? 'your friend'}’s home`}</strong>
        {connected ? <span className={styles.liveBadge}>Live</span> : <small>Connecting…</small>}
      </div>
      <p className={styles.notice} style={{ margin: '8px 14px 0' }}>
        {someoneHere ? `Here now: ${names.join(', ')}` : host === 'me' ? 'No one is visiting right now.' : `${hostName ?? 'Your friend'} isn’t online — leave a message!`}
      </p>
      {rules && !rules.accepted ? (
        <div style={{ overflowY: 'auto', padding: 8 }}>
          <RulesGate rules={rules} onAccepted={setRules} />
        </div>
      ) : channel ? (
        <ChatThread channelId={channel} compact placeholder="Say something to everyone here…" onNeedRules={() => setRules((r) => (r ? { ...r, accepted: false } : r))} />
      ) : (
        <p className={styles.empty}>{error ?? 'Opening the home chat…'}</p>
      )}
      <div className={styles.reactions} aria-label="Reactions">
        {REACTIONS.map((e) => (
          <button key={e} type="button" onClick={() => onAct('react', e)} aria-label={`React ${e}`}>
            {e}
          </button>
        ))}
        <button type="button" className={styles.actBtn} onClick={() => onAct('wave')}>
          👋 Wave
        </button>
        <button type="button" className={styles.actBtn} onClick={() => onAct('dance')}>
          💃 Dance
        </button>
        <button type="button" className={styles.actBtn} onClick={() => onAct('cheer')}>
          🎉 Cheer
        </button>
      </div>
    </aside>
  )
}
