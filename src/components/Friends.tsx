import { useEffect, useState } from 'react'
import { apiClient, isRemoteModeEnabled, type FriendDetail, type FriendSummary } from '../services/apiClient'
import { fromView, loadPetCache, savePetCache } from '../game/petClient'
import { treatsAvailable } from '../game/pet'
import { buildProgressFacts } from '../game/progressFacts'
import { gameService } from '../services/gameService'
import { play as playSfx } from '../game/sfx'
import { getRockyAsset } from './rockyVisuals'
import { RockyWorld } from './world/RockyWorld'
import type { Guest } from './world/GuestRocky'
import { usePresence, type Presence } from '../services/liveClient'
import { useLiveRoom } from './live/useLiveRoom'
import { LivePanel } from './chat/LivePanel'
import { NameBadges } from './TitleBadge'
import { getAgentRole } from '../services/identityService'
import styles from './Friends.module.css'

const FEELING: Record<FriendSummary['feeling'], string> = {
  great: 'Feeling great',
  ok: 'Doing fine',
  sad: 'Could use a visit',
  dirty: 'Needs a bath',
  unwell: 'Not feeling well',
}

function lastSeen(at: string | null): string {
  if (!at) return 'New to Rocky'
  const days = Math.floor((Date.now() - Date.parse(at)) / 86_400_000)
  if (days <= 0) return 'Active today'
  if (days === 1) return 'Active yesterday'
  return `Active ${days} days ago`
}

/**
 * Friends: every Rocky in the pilot. Visit one to see their world, pet
 * their Rocky, wave, or give them one of your treats. The first visit to
 * each friend a day earns a couple of coins; the friend's Rocky cheers up
 * and they see who came by.
 */
function presenceLine(p: Presence | null): string | null {
  if (!p) return null
  if (p.where === 'visiting') return `Online · visiting ${p.hostName ?? 'a friend'}`
  if (p.where === 'home') return 'Online · at home with Rocky'
  return 'Online now'
}

export function Friends({
  onChat,
  openVisit,
  onVisitOpened,
}: { onChat?: (friendId: string) => void; openVisit?: string | null; onVisitOpened?: () => void } = {}) {
  const [friends, setFriends] = useState<FriendSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [visiting, setVisiting] = useState<FriendDetail | null>(null)
  const presenceOf = usePresence()

  async function load() {
    try {
      setFriends((await apiClient.listFriends()).friends)
      setError(null)
    } catch {
      setError('Friends could not be loaded right now. Try again in a moment.')
    }
  }

  useEffect(() => {
    if (isRemoteModeEnabled()) void load()
  }, [])

  // Opened from elsewhere (My team → Visit).
  useEffect(() => {
    if (!openVisit) return
    void visit(openVisit)
    onVisitOpened?.()
  }, [openVisit]) // eslint-disable-line react-hooks/exhaustive-deps

  async function visit(id: string) {
    try {
      setVisiting(await apiClient.getFriend(id))
      window.scrollTo({ top: 0 })
    } catch {
      setError('That Rocky could not be visited right now.')
    }
  }

  if (!isRemoteModeEnabled()) {
    return (
      <main className={styles.page}>
        <div className={styles.layout}>
          <h1 className={styles.title}>Friends</h1>
          <p className={styles.lede}>
            Visiting other Rockys needs the online pilot (sign in with your RLX email). This offline demo has only your Rocky.
          </p>
        </div>
      </main>
    )
  }

  if (visiting) {
    return (
      <Visit
        friend={visiting}
        onBack={() => {
          setVisiting(null)
          void load()
        }}
      />
    )
  }

  const shown = (friends ?? [])
    .filter((f) => `${f.name} ${f.rockyName}`.toLowerCase().includes(query.trim().toLowerCase()))
    // Online teammates first.
    .sort((a, b) => Number(!!presenceOf(b.id)) - Number(!!presenceOf(a.id)))
  const onlineCount = (friends ?? []).filter((f) => presenceOf(f.id)).length
  return (
    <main className={styles.page}>
      <div className={styles.layout}>
        <header className={styles.head}>
          <div>
            <h1 className={styles.title}>Friends</h1>
            <p className={styles.lede}>
              Every Rocky in the pilot. Visit a teammate’s Rocky: pet, wave or share a treat — your first visit to each friend today earns 2 coins.
              If they’re online, you’ll see each other live.
            </p>
            {onlineCount > 0 && <p className={styles.onlineNow}>● {onlineCount} online now</p>}
          </div>
          <input
            className={styles.search}
            type="search"
            placeholder="Find a teammate…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Find a teammate"
          />
        </header>
        {error && <p className={styles.error}>{error}</p>}
        {!friends && !error && <p className={styles.lede}>Loading friends…</p>}
        {friends && friends.length === 0 && <p className={styles.lede}>No other Rockys yet — invite your teammates to sign in!</p>}
        <ul className={styles.grid}>
          {shown.map((f) => (
            <li key={f.id} className={`${styles.card} ${presenceOf(f.id) ? styles.cardOnline : ''}`}>
              <span className={styles.avatarWrap}>
                <img src={getRockyAsset(f.stage, f.mood)} alt="" className={styles.avatar} />
                {presenceOf(f.id) && <i className={styles.onlineDot} aria-label="online" />}
              </span>
              <div className={styles.info}>
                <strong>{f.rockyName}</strong>
                <span>
                  {f.name} <NameBadges staff={f.staff} title={f.title} />
                </span>
                <small>
                  Level {f.level} · {f.stage} · 🔥 {f.streak}
                </small>
                <small className={styles.feeling} data-feeling={f.feeling}>
                  {FEELING[f.feeling]} · {presenceLine(presenceOf(f.id)) ?? lastSeen(f.lastActiveAt)}
                </small>
              </div>
              <div className={styles.cardActions}>
                <button type="button" className={styles.visit} onClick={() => void visit(f.id)}>
                  {presenceOf(f.id) ? 'Visit live' : f.visitedToday ? 'Visit again' : 'Visit'}
                </button>
                {onChat && (
                  <button type="button" className={styles.chatBtn} onClick={() => onChat(f.id)} aria-label={`Chat with ${f.name}`}>
                    💬
                  </button>
                )}
              </div>
              {f.visitedToday && <span className={styles.visited}>✓ Visited today</span>}
            </li>
          ))}
        </ul>
      </div>
    </main>
  )
}

function Visit({ friend, onBack }: { friend: FriendDetail; onBack: () => void }) {
  const [mine, setMine] = useState(() => loadPetCache())
  const [needs, setNeeds] = useState(friend.needs)
  const [toast, setToast] = useState<string | null>(null)
  const facts = buildProgressFacts(gameService.getSnapshot().gameState)
  const myTreats = treatsAvailable(mine.state, facts)
  const [sent, setSent] = useState<Set<string>>(new Set())
  const room = useLiveRoom(friend.id)
  const presenceOf = usePresence()
  // My own Rocky walks in too (others see it the same way).
  const self: Guest = {
    id: 'me',
    name: 'You',
    rockyName: 'You',
    stage: gameService.getSnapshot().gameState.evolutionStage,
    mood: gameService.getSnapshot().gameState.mood,
    outfit: mine.state.outfit,
    x: 22,
    hop: 0,
    staff: getAgentRole() === 'ADMIN',
  }
  useEffect(() => {
    const t = window.setTimeout(() => room.move(22), 800)
    return () => window.clearTimeout(t)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function show(text: string) {
    setToast(text)
    window.setTimeout(() => setToast((t) => (t === text ? null : t)), 3000)
  }

  function send(kind: 'pet' | 'wave' | 'treat'): boolean {
    // One pet and one wave are recorded per visit; treats every time (they cost one).
    if (kind !== 'treat' && sent.has(kind)) return true
    if (kind === 'treat' && myTreats <= 0) {
      show('You have no treats left to share — check-ins earn more.')
      return false
    }
    setSent((s) => new Set(s).add(kind))
    room.act(kind === 'treat' ? 'treat' : kind === 'wave' ? 'wave' : 'pet')
    void apiClient
      .visitFriend(friend.id, kind)
      .then((res) => {
        const cache = fromView(res)
        savePetCache(cache)
        setMine(cache)
        if (!res.ok) {
          show(res.reason === 'no-treats' ? 'You have no treats left to share.' : 'That didn’t go through.')
          return
        }
        setNeeds((n) => ({ ...n, happiness: Math.min(100, n.happiness + 3) }))
        const coins = res.reward?.coins ?? 0
        if (coins) playSfx('coin')
        show(
          kind === 'treat'
            ? `You gave ${friend.rockyName} a treat!${coins ? ` +${coins} coins` : ''}`
            : kind === 'wave'
              ? `${friend.rockyName} waves back! 👋${coins ? ` +${coins} coins` : ''}`
              : `${friend.name} will see you visited.${coins ? ` +${coins} coins` : ''}`,
        )
      })
      .catch(() => show('That didn’t go through — try again.'))
    return true
  }

  return (
    <main className={styles.visitPage}>
      <div className={styles.visitLayout}>
        <RockyWorld
          mood={friend.mood}
          stage={friend.stage}
          reaction={null}
          outfit={friend.outfit}
          speech={`Hi! I’m ${friend.rockyName}, ${friend.name}’s Rocky. Thanks for visiting!`}
          treats={myTreats}
          needs={needs}
          visitor
          vip={!!friend.outfit.aura}
          guests={[self, ...room.guests]}
          floatReacts={room.floatReacts}
          onPet={() => send('pet')}
          onFeed={() => send('treat')}
          onPlay={() => true}
          onBath={() => send('wave')}
          hud={
            <div className={styles.visitHud}>
              <button type="button" className={styles.back} onClick={onBack}>
                ← Friends
              </button>
              <div className={styles.visitTag}>
                <strong>
                  {friend.rockyName} <NameBadges staff={friend.staff} title={friend.title} />
                </strong>
                <span>
                  {friend.name} · Level {friend.level} {friend.stage} · 🔥 {friend.streak} · 🏅 {friend.badges}
                  {room.hostHere ? ' · ● here live' : presenceOf(friend.id) ? ' · ● online' : ''}
                </span>
              </div>
            </div>
          }
          action={
            <div className={styles.visitAction}>
              {toast && (
                <p className={styles.toast} role="status">
                  {toast}
                </p>
              )}
              {friend.visitors.length > 0 && (
                <p className={styles.guestbook}>
                  Recent visitors:{' '}
                  {friend.visitors
                    .map((v) => v.text.replace(/ (visited|stopped).*/, ''))
                    .slice(0, 3)
                    .join(', ')}
                </p>
              )}
            </div>
          }
        />
        <LivePanel host={friend.id} hostName={friend.name} visitors={room.visitors} hostHere={room.hostHere} onAct={(kind, emoji) => room.act(kind, emoji)} />
      </div>
    </main>
  )
}
