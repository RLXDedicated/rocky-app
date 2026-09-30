import { useEffect, useState } from 'react'
import { kudosApi, type Kudos, type KudosTag } from '../../services/apiClient'
import { useLiveEvent } from '../../services/liveClient'
import { play as playSfx } from '../../game/sfx'
import styles from './Kudos.module.css'

export type KudosMine = Awaited<ReturnType<typeof kudosApi.mine>>

function ago(at: string): string {
  const min = Math.floor((Date.now() - Date.parse(at)) / 60_000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min} min ago`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h} h ago`
  return `${Math.floor(h / 24)} d ago`
}

/** My kudos (what I can still give today, what I got) and the pilot's kudos wall. */
export function useKudos() {
  const [mine, setMine] = useState<KudosMine | null>(null)
  const [wall, setWall] = useState<Kudos[]>([])
  const load = () => {
    kudosApi.mine().then(setMine).catch(() => undefined)
    kudosApi
      .wall()
      .then((r) => setWall(r.kudos))
      .catch(() => undefined)
  }
  useEffect(load, [])
  useLiveEvent((e) => {
    if (e.t === 'kudos') load()
  }, [])
  return { mine, wall, reload: load }
}

function KudosLine({ k }: { k: Kudos }) {
  return (
    <li>
      <span className={styles.tagEmoji} aria-hidden>
        {k.emoji}
      </span>
      <span>
        <b>{k.from}</b> → <b>{k.to}</b> · {k.label}
        {k.message && <q>{k.message}</q>}
        <small>{ago(k.at)}</small>
      </span>
    </li>
  )
}

/** The Kudos strip on the Friends page. */
export function KudosPanel({ mine, wall, focus }: { mine: KudosMine | null; wall: Kudos[]; focus?: boolean }) {
  const [tab, setTab] = useState<'received' | 'wall'>(focus ? 'received' : 'wall')
  const list = tab === 'received' ? (mine?.received ?? []) : wall
  return (
    <section className={`${styles.panel} ${focus ? styles.focus : ''}`} aria-label="Kudos">
      <header>
        <strong>🙌 Kudos</strong>
        <span className={styles.left}>
          {mine ? (mine.left > 0 ? `You can send ${mine.left} more today — tap 🙌 on a teammate` : 'All 3 kudos sent today — more tomorrow!') : ''}
        </span>
        <div className={styles.tabs} role="tablist">
          <button type="button" role="tab" aria-selected={tab === 'wall'} onClick={() => setTab('wall')}>
            Team wall
          </button>
          <button type="button" role="tab" aria-selected={tab === 'received'} onClick={() => setTab('received')}>
            For me{mine?.received.length ? ` (${mine.received.length})` : ''}
          </button>
        </div>
      </header>
      {list.length === 0 ? (
        <p className={styles.empty}>{tab === 'wall' ? 'No kudos yet — be the first to thank a teammate!' : 'Nothing yet. Kudos from teammates will show up here (and in Teams).'}</p>
      ) : (
        <ul className={styles.list}>
          {list.slice(0, 8).map((k) => (
            <KudosLine key={k.id} k={k} />
          ))}
        </ul>
      )}
    </section>
  )
}

/** Pick why, add a few words, send. */
export function KudosDialog({ to, name, tags, onClose, onSent }: { to: string; name: string; tags: KudosTag[]; onClose: () => void; onSent: () => void }) {
  const [tag, setTag] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function send() {
    if (!tag) return
    setBusy(true)
    setError(null)
    try {
      await kudosApi.give(to, tag, message.trim() || undefined)
      playSfx('coin')
      onSent()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setBusy(false)
    }
  }
  return (
    <div className={styles.backdrop} role="dialog" aria-modal="true" aria-label={`Send kudos to ${name}`} onClick={onClose}>
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <strong>🙌 Kudos for {name}</strong>
        <p>Why? Their Rocky gets a little happier (+4 ❤️, 3 coins) and they’ll see it here and in Teams.</p>
        <div className={styles.tagRow}>
          {tags.map((t) => (
            <button key={t.id} type="button" aria-pressed={tag === t.id} onClick={() => setTag(t.id)}>
              <span aria-hidden>{t.emoji}</span> {t.label}
            </button>
          ))}
        </div>
        <input value={message} maxLength={140} onChange={(e) => setMessage(e.target.value)} placeholder="Add a few words (optional)" aria-label="Message" />
        <small className={styles.hint}>No customer information, please.</small>
        {error && <p className={styles.error}>{error}</p>}
        <div className={styles.actions}>
          <button type="button" className={styles.primary} disabled={!tag || busy} onClick={() => void send()}>
            Send kudos
          </button>
          <button type="button" className={styles.ghost} onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
