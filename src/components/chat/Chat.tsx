import { useEffect, useState } from 'react'
import { apiClient, chatApi, isRemoteModeEnabled, type ChatChannel, type ChatRules, type FriendSummary } from '../../services/apiClient'
import { useLiveEvent, usePresence } from '../../services/liveClient'
import { getRockyAsset } from '../rockyVisuals'
import { ChatThread } from './ChatThread'
import { RulesGate } from './ChatRules'
import { chatState } from './chatState'
import styles from './Chat.module.css'
import { NameBadges } from '../TitleBadge'
import { stickerOf } from './Stickers'
import { mediaPreview } from './Media'
import { notificationsOn, notificationsSupported, setNotifications } from '../../services/notify'
import { GroupAvatar, GroupSettings, NewGroup, Rooms } from './Groups'

function ago(at: string): string {
  const mins = Math.round((Date.now() - Date.parse(at)) / 60_000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  const h = Math.round(mins / 60)
  if (h < 24) return `${h}h`
  return `${Math.round(h / 24)}d`
}

/**
 * Rocky chat: the pilot-wide General channel, 1-to-1 conversations with
 * teammates and the chats from live visits. Personal between agents; Rocky
 * admins keep a copy for quality control (the rules say so up front).
 */
export function Chat({ openWith, onOpened }: { openWith?: string | null; onOpened?: () => void }) {
  const [rules, setRules] = useState<ChatRules | null>(null)
  const [channels, setChannels] = useState<ChatChannel[] | null>(null)
  const [mutedUntil, setMutedUntil] = useState<string | null>(null)
  const [active, setActive] = useState<string | null>(null)
  const [picking, setPicking] = useState(false)
  // The "+ New" menu: a 1-to-1, a new group, or browse open rooms.
  const [menu, setMenu] = useState(false)
  const [panel, setPanel] = useState<'group' | 'rooms' | null>(null)
  const [archived, setArchived] = useState<ChatChannel[]>([])
  const [showArchived, setShowArchived] = useState(false)
  const [settings, setSettings] = useState(false)
  const [friends, setFriends] = useState<FriendSummary[] | null>(null)
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  const presenceOf = usePresence()
  const [notifOn, setNotifOn] = useState(notificationsOn())

  async function loadChannels(select?: string) {
    try {
      const r = await chatApi.channels()
      setChannels(r.channels)
      setArchived(r.archived ?? [])
      setMutedUntil(r.mutedUntil)
      setActive((cur) => select ?? cur ?? (window.innerWidth > 760 ? (r.channels[0]?.id ?? null) : null))
    } catch {
      setError('Chat could not be loaded right now.')
    }
  }

  useEffect(() => {
    if (!isRemoteModeEnabled()) return
    chatApi
      .rules()
      .then(setRules)
      .catch(() => setError('Chat could not be loaded right now.'))
    void loadChannels()
  }, [])

  // Opening a chat from elsewhere (Friends → Chat).
  useEffect(() => {
    if (!openWith || !rules?.accepted) return
    chatApi
      .openDirect(openWith)
      .then((c) => {
        setChannels((list) => (list?.some((x) => x.id === c.id) ? list : [...(list ?? []), c]))
        setActive(c.id)
        onOpened?.()
      })
      .catch(() => setError('That conversation could not be opened.'))
  }, [openWith, rules?.accepted]) // eslint-disable-line react-hooks/exhaustive-deps

  useLiveEvent(
    (e) => {
      // Groups changed (created, renamed, someone added or removed).
      if (e.t === 'chat.channels') {
        void loadChannels()
        return
      }
      if (e.t !== 'chat.message') return
      const m = e.message as { channel: string; mine: boolean; name: string; body: string; at: string }
      setChannels((list) => {
        if (!list) return list
        if (!list.some((c) => c.id === m.channel)) {
          void loadChannels()
          return list
        }
        return list.map((c) =>
          c.id === m.channel
            ? { ...c, last: { name: m.name, body: m.body, at: m.at, mine: m.mine }, unread: m.mine || c.id === active ? 0 : c.unread + 1 }
            : c,
        )
      })
    },
    [active],
  )

  async function pick() {
    setPicking(true)
    if (!friends) setFriends((await apiClient.listFriends()).friends)
  }

  async function start(friend: string) {
    try {
      const c = await chatApi.openDirect(friend)
      setChannels((list) => (list?.some((x) => x.id === c.id) ? list : [...(list ?? []), c]))
      setActive(c.id)
      setPicking(false)
      setQuery('')
    } catch {
      setError('That conversation could not be opened.')
    }
  }

  async function archive(c: ChatChannel, on: boolean) {
    try {
      await chatApi.archive(c.id, on)
      if (on && active === c.id) setActive(null)
      await loadChannels(on ? undefined : c.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  function select(id: string) {
    setSettings(false)
    setActive(id)
    setChannels((list) => list?.map((c) => (c.id === id ? { ...c, unread: 0 } : c)) ?? list)
    void chatState.refresh()
  }

  if (!isRemoteModeEnabled()) {
    return (
      <main className={styles.page}>
        <div className={styles.shell}>
          <p className={styles.lede}>Chat needs the online pilot (sign in with your RLX email).</p>
        </div>
      </main>
    )
  }

  if (rules && !rules.accepted) {
    return (
      <main className={styles.page}>
        <div className={styles.rulesWrap}>
          <RulesGate rules={rules} onAccepted={setRules} />
        </div>
      </main>
    )
  }

  const current = channels?.find((c) => c.id === active) ?? null
  const shownFriends = (friends ?? []).filter((f) => `${f.name} ${f.rockyName}`.toLowerCase().includes(query.trim().toLowerCase()))
  return (
    <main className={styles.page}>
      <div className={`${styles.shell} ${active ? styles.threadOpen : ''}`}>
        <aside className={styles.sidebar} aria-label="Conversations">
          <div className={styles.sideHead}>
            <h1>Chat</h1>
            {notificationsSupported() && (
              <button
                type="button"
                className={styles.ghost}
                onClick={() => void setNotifications(!notifOn).then(setNotifOn)}
                title={notifOn ? 'Notifications are on — you’ll hear about messages, mentions and visitors while Rocky is in the background' : 'Get a notification for messages, @mentions and visitors'}
                aria-pressed={notifOn}
              >
                {notifOn ? '🔔' : '🔕'}
              </button>
            )}
            <div className={styles.newWrap}>
              <button type="button" className={styles.primary} onClick={() => setMenu((m) => !m)} aria-expanded={menu}>
                + New
              </button>
              {menu && (
                <div className={styles.newMenu} role="menu">
                  <button type="button" role="menuitem" onClick={() => (setMenu(false), setPanel(null), void pick())}>
                    💬 Chat with a teammate
                  </button>
                  <button type="button" role="menuitem" onClick={() => (setMenu(false), setPicking(false), setPanel('group'))}>
                    👥 New group
                  </button>
                  <button type="button" role="menuitem" onClick={() => (setMenu(false), setPicking(false), setPanel('rooms'))}>
                    🧭 Browse rooms
                  </button>
                </div>
              )}
            </div>
          </div>
          {error && <p className={styles.error}>{error}</p>}
          {picking && (
            <div className={styles.picker}>
              <input type="search" autoFocus placeholder="Find a teammate…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Find a teammate" />
              <ul>
                {!friends && <li className={styles.empty}>Loading…</li>}
                {shownFriends.map((f) => {
                  const p = presenceOf(f.id)
                  return (
                    <li key={f.id}>
                      <button type="button" onClick={() => void start(f.id)}>
                        <img src={getRockyAsset(f.stage, f.mood)} alt="" />
                        <span>
                          <strong>{f.name}</strong>
                          <small>{p ? 'Online now' : f.rockyName}</small>
                        </span>
                        {p && <i className={styles.dot} aria-label="online" />}
                      </button>
                    </li>
                  )
                })}
              </ul>
              <button type="button" className={styles.ghost} onClick={() => setPicking(false)}>
                Cancel
              </button>
            </div>
          )}
          {panel === 'group' && <NewGroup onCancel={() => setPanel(null)} onCreated={(id) => (setPanel(null), void loadChannels(id))} />}
          {panel === 'rooms' && <Rooms onCancel={() => setPanel(null)} onJoined={(id) => (setPanel(null), void loadChannels(id))} />}
          <ul className={styles.channels}>
            {(showArchived ? archived : channels)?.map((c) => {
              const online = c.with ? presenceOf(c.with.id) : null
              return (
                <li key={c.id}>
                  <button type="button" className={`${styles.channel} ${c.id === active ? styles.channelActive : ''}`} onClick={() => select(c.id)}>
                    <span className={styles.channelIcon}>
                      {c.with ? (
                        <img src={getRockyAsset(c.with.stage, c.with.mood)} alt="" />
                      ) : c.kind === 'group' ? (
                        <GroupAvatar avatar={c.avatar} />
                      ) : c.kind === 'general' ? (
                        '💬'
                      ) : (
                        '🏠'
                      )}
                      {online && <i className={styles.dot} aria-label="online" />}
                    </span>
                    <span className={styles.channelText}>
                      <strong>
                        {c.kind === 'general' ? 'General — everyone' : c.title} <NameBadges staff={c.with?.staff} title={c.with?.title} tester={c.with?.tester} />
                      </strong>
                      <small>{c.last ? `${c.last.mine ? 'You' : c.last.name}: ${(stickerOf(c.last.body) ? `🐂 ${stickerOf(c.last.body)!.label}` : (mediaPreview(c.last.body) ?? c.last.body)) || 'message hidden'}` : 'No messages yet'}</small>
                    </span>
                    <span className={styles.channelMeta}>
                      {c.last && <small>{ago(c.last.at)}</small>}
                      {c.unread > 0 && <b className={styles.badge}>{c.unread}</b>}
                    </span>
                  </button>
                  {c.kind !== 'general' && (
                    <button
                      type="button"
                      className={styles.archiveBtn}
                      onClick={() => void archive(c, !showArchived)}
                      title={showArchived ? 'Move back to chats' : 'Archive (it comes back with the next message)'}
                      aria-label={showArchived ? `Unarchive ${c.title}` : `Archive ${c.title}`}
                    >
                      {showArchived ? '↩' : '🗄'}
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
          {(archived.length > 0 || showArchived) && (
            <button type="button" className={styles.archivedToggle} onClick={() => setShowArchived((v) => !v)}>
              {showArchived ? '← Back to chats' : `🗄 Archived (${archived.length})`}
            </button>
          )}
          <p className={styles.footnote}>Chats are between agents — supervisors can’t read them. Rocky admins keep a copy for quality control; messages are kept 90 days.</p>
        </aside>
        <section className={styles.main} aria-label={current?.title ?? 'Conversation'}>
          {current ? (
            <>
              <header className={styles.threadHead}>
                <button type="button" className={styles.back} onClick={() => setActive(null)} aria-label="Back to conversations">
                  ←
                </button>
                <strong>
                  {current.kind === 'group' && (
                    <span className={styles.headAvatar}>
                      <GroupAvatar avatar={current.avatar} size={28} />
                    </span>
                  )}
                  {current.kind === 'general' ? 'General — everyone in the pilot' : current.title} <NameBadges staff={current.with?.staff} title={current.with?.title} tester={current.with?.tester} />
                </strong>
                {current.with && <small>{presenceOf(current.with.id) ? '● Online now' : `${current.with.rockyName}’s human`}</small>}
                {current.kind === 'group' && (
                  <button type="button" className={styles.ghost} onClick={() => setSettings((v) => !v)} aria-expanded={settings}>
                    👥 {current.memberCount} · ⚙️
                  </button>
                )}
              </header>
              {settings && current.kind === 'group' && (
                <GroupSettings
                  id={current.id}
                  onChanged={() => void loadChannels(current.id)}
                  onLeft={() => (setSettings(false), setActive(null), void loadChannels())}
                  onClose={() => setSettings(false)}
                />
              )}
              <ChatThread
                channelId={current.id}
                mutedUntil={mutedUntil}
                onNeedRules={() => setRules((r) => (r ? { ...r, accepted: false } : r))}
                placeholder={current.kind === 'general' ? 'Message everyone…' : `Message ${current.title}…`}
              />
            </>
          ) : (
            <p className={styles.pickOne}>Pick a conversation, or start a new one: a teammate, a group, or an open room.</p>
          )}
        </section>
      </div>
    </main>
  )
}
