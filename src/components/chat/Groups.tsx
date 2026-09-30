import { useEffect, useRef, useState } from 'react'
import { apiClient, chatApi, type ChatGroupInfo, type ChatRoom, type FriendSummary } from '../../services/apiClient'
import { getAgentRole } from '../../services/identityService'
import { getRockyAsset } from '../rockyVisuals'
import { NameBadges } from '../TitleBadge'
import styles from './Chat.module.css'

const GROUP_EMOJI = ['💬', '👥', '🔥', '⭐', '🎯', '📝', '☕', '🎮', '🎉', '🌙', '🚚', '🐂', '💡', '🏆', '❤️', '🌮']

/** A group's picture: its emoji, or the uploaded image. */
export function GroupAvatar({ avatar, size = 40 }: { avatar?: string | null; size?: number }) {
  const [src, setSrc] = useState<string | null>(null)
  const id = avatar?.startsWith('img:') ? avatar.slice(4) : null
  useEffect(() => {
    if (!id) return setSrc(null)
    let url: string | null = null
    chatApi
      .attachment(id)
      .then((b) => setSrc((url = URL.createObjectURL(b))))
      .catch(() => setSrc(null))
    return () => {
      if (url) URL.revokeObjectURL(url)
    }
  }, [id])
  if (id && src) return <img className={styles.groupPic} src={src} alt="" style={{ width: size, height: size }} />
  return <span style={{ fontSize: size * 0.55 }}>{id ? '👥' : (avatar ?? '👥')}</span>
}

/** Teammates to pick from (with a search box), several at once. */
function PeoplePicker({ picked, onToggle, exclude = [] }: { picked: Set<string>; onToggle: (id: string) => void; exclude?: string[] }) {
  const [friends, setFriends] = useState<FriendSummary[] | null>(null)
  const [q, setQ] = useState('')
  useEffect(() => {
    apiClient
      .listFriends()
      .then((r) => setFriends(r.friends))
      .catch(() => setFriends([]))
  }, [])
  const shown = (friends ?? []).filter((f) => !exclude.includes(f.id) && f.name.toLowerCase().includes(q.trim().toLowerCase()))
  return (
    <>
      <input type="search" placeholder="Find teammates…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Find teammates" />
      <ul>
        {!friends && <li className={styles.empty}>Loading…</li>}
        {shown.map((f) => (
          <li key={f.id}>
            <button type="button" onClick={() => onToggle(f.id)} aria-pressed={picked.has(f.id)}>
              <img src={getRockyAsset(f.stage, f.mood)} alt="" />
              <span>
                <strong>{f.name}</strong>
                <small>{f.rockyName}</small>
              </span>
              <i className={styles.check}>{picked.has(f.id) ? '✓' : ''}</i>
            </button>
          </li>
        ))}
      </ul>
    </>
  )
}

/** A new private group (or, for admins, an open room anyone can join). */
export function NewGroup({ onCreated, onCancel }: { onCreated: (id: string) => void; onCancel: () => void }) {
  const [title, setTitle] = useState('')
  const [avatar, setAvatar] = useState('💬')
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const admin = getAgentRole() === 'ADMIN'
  const toggle = (id: string) => setPicked((s) => (s.has(id) ? new Set([...s].filter((x) => x !== id)) : new Set([...s, id])))

  async function create() {
    setBusy(true)
    setError(null)
    try {
      const c = await chatApi.createGroup({ title: title.trim(), members: [...picked], avatar, open })
      onCreated(c.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={styles.picker}>
      <strong>{open ? 'New room' : 'New group'}</strong>
      <input value={title} maxLength={40} onChange={(e) => setTitle(e.target.value)} placeholder={open ? 'Room name (e.g. Notes tips)' : 'Group name'} autoFocus aria-label="Name" />
      <div className={styles.emojiRow} role="radiogroup" aria-label="Group emoji">
        {GROUP_EMOJI.map((e) => (
          <button key={e} type="button" aria-pressed={avatar === e} onClick={() => setAvatar(e)}>
            {e}
          </button>
        ))}
      </div>
      {admin && (
        <label className={styles.toggleLine}>
          <input type="checkbox" checked={open} onChange={(e) => setOpen(e.target.checked)} /> Open room — anyone in the pilot can find and join it
        </label>
      )}
      <PeoplePicker picked={picked} onToggle={toggle} />
      {error && <p className={styles.error}>{error}</p>}
      <div className={styles.pickerActions}>
        <button type="button" className={styles.primary} disabled={busy || !title.trim() || (!open && picked.size === 0)} onClick={() => void create()}>
          Create{picked.size ? ` with ${picked.size}` : ''}
        </button>
        <button type="button" className={styles.ghost} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  )
}

/** Open rooms to discover and join. */
export function Rooms({ onJoined, onCancel }: { onJoined: (id: string) => void; onCancel: () => void }) {
  const [rooms, setRooms] = useState<ChatRoom[] | null>(null)
  useEffect(() => {
    chatApi
      .rooms()
      .then((r) => setRooms(r.rooms))
      .catch(() => setRooms([]))
  }, [])
  return (
    <div className={styles.picker}>
      <strong>Rooms</strong>
      <ul>
        {rooms === null && <li className={styles.empty}>Loading…</li>}
        {rooms?.length === 0 && <li className={styles.empty}>No new rooms to join right now.</li>}
        {rooms?.map((r) => (
          <li key={r.id}>
            <button type="button" onClick={() => void chatApi.joinRoom(r.id).then(() => onJoined(r.id))}>
              <span className={styles.roomIcon}>
                <GroupAvatar avatar={r.avatar} size={34} />
              </span>
              <span>
                <strong>{r.title}</strong>
                <small>
                  {r.memberCount} {r.memberCount === 1 ? 'member' : 'members'} · tap to join
                </small>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <button type="button" className={styles.ghost} onClick={onCancel}>
        Close
      </button>
    </div>
  )
}

/** Group settings: name, picture, people, leave. */
export function GroupSettings({ id, onChanged, onLeft, onClose }: { id: string; onChanged: () => void; onLeft: () => void; onClose: () => void }) {
  const [info, setInfo] = useState<ChatGroupInfo | null>(null)
  const [title, setTitle] = useState('')
  const [adding, setAdding] = useState<Set<string> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const load = () =>
    chatApi
      .group(id)
      .then((g) => (setInfo(g), setTitle(g.title)))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
  useEffect(() => {
    void load()
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function act(fn: () => Promise<unknown>) {
    setError(null)
    try {
      await fn()
      await load()
      onChanged()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  if (!info) return <div className={styles.groupPanel}>{error ? <p className={styles.error}>{error}</p> : <p className={styles.empty}>Loading…</p>}</div>
  const manage = !!info.canManage
  return (
    <div className={styles.groupPanel}>
      <div className={styles.groupHead}>
        <button type="button" className={styles.groupPicBtn} disabled={!manage} onClick={() => fileRef.current?.click()} title={manage ? 'Change picture' : undefined}>
          <GroupAvatar avatar={info.avatar} size={56} />
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void act(() => chatApi.groupPicture(id, f))
            e.target.value = ''
          }}
        />
        {manage ? (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (title.trim() && title.trim() !== info.title) void act(() => chatApi.updateGroup(id, { title: title.trim() }))
            }}
          >
            <input value={title} maxLength={40} onChange={(e) => setTitle(e.target.value)} aria-label="Group name" />
            <button type="submit" className={styles.ghost} disabled={!title.trim() || title.trim() === info.title}>
              Rename
            </button>
          </form>
        ) : (
          <strong>{info.title}</strong>
        )}
        <button type="button" className={styles.ghost} onClick={onClose} aria-label="Close settings">
          ✕
        </button>
      </div>
      {manage && (
        <div className={styles.emojiRow} aria-label="Group emoji">
          {GROUP_EMOJI.map((e) => (
            <button key={e} type="button" aria-pressed={info.avatar === e} onClick={() => void act(() => chatApi.updateGroup(id, { avatar: e }))}>
              {e}
            </button>
          ))}
        </div>
      )}
      <p className={styles.groupMeta}>
        {info.open ? 'Open room — anyone can join' : 'Private group'} · {info.members.length} {info.members.length === 1 ? 'member' : 'members'}
      </p>
      <ul className={styles.memberList}>
        {info.members.map((m) => (
          <li key={m.id}>
            <img src={getRockyAsset(m.stage, m.mood)} alt="" />
            <span>
              {m.name} <NameBadges staff={m.staff} title={m.title} tester={m.tester} /> {m.owner && <small>· creator</small>}
            </span>
            {manage && !m.owner && (
              <button type="button" className={styles.linkBtn} onClick={() => void act(() => chatApi.removeFromGroup(id, m.id))}>
                Remove
              </button>
            )}
          </li>
        ))}
      </ul>
      {manage &&
        (adding ? (
          <div className={styles.picker}>
            <PeoplePicker
              picked={adding}
              exclude={info.members.map((m) => m.id)}
              onToggle={(k) => setAdding((s) => (s!.has(k) ? new Set([...s!].filter((x) => x !== k)) : new Set([...s!, k])))}
            />
            <div className={styles.pickerActions}>
              <button type="button" className={styles.primary} disabled={!adding.size} onClick={() => void act(() => chatApi.addToGroup(id, [...adding])).then(() => setAdding(null))}>
                Add {adding.size || ''}
              </button>
              <button type="button" className={styles.ghost} onClick={() => setAdding(null)}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button type="button" className={styles.ghost} onClick={() => setAdding(new Set())}>
            + Add people
          </button>
        ))}
      {error && <p className={styles.error}>{error}</p>}
      <button
        type="button"
        className={styles.danger}
        onClick={() => {
          if (window.confirm(`Leave “${info.title}”?`)) void chatApi.removeFromGroup(id, 'me').then(onLeft)
        }}
      >
        Leave {info.open ? 'room' : 'group'}
      </button>
    </div>
  )
}
