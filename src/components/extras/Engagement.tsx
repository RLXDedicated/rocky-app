// Engagement UI: daily missions + chest and collection sets (Home), duels
// and the monthly tournament (Arcade), and "Rocky of the week" (Friends).
import { useCallback, useEffect, useState } from 'react'
import { apiClient, engagementApi, isRemoteModeEnabled, type Duel, type FriendSummary, type RotwEntry, type TournamentRow } from '../../services/apiClient'
import { loadPetCache, performPetAction, type PetCache } from '../../game/petClient'
import { refreshPetState } from '../../game/pet'
import { buildProgressFacts } from '../../game/progressFacts'
import { chestReward, COLLECTION_SETS, missionStatus, setProgress } from '../../game/engagement'
import { findItem } from '../../game/closet'
import { gameService } from '../../services/gameService'
import { useLiveEvent } from '../../services/liveClient'
import { play as playSfx } from '../../game/sfx'
import { getRockyAsset } from '../rockyVisuals'
import { Coin } from '../world/Coin'
import styles from './Engagement.module.css'

// ---------------------------------------------------------------------------
// Missions & collections (Home chip)
// ---------------------------------------------------------------------------
export function MissionsChip() {
  const [pet, setPet] = useState<PetCache>(() => loadPetCache())
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'missions' | 'sets'>('missions')
  const [toast, setToast] = useState<string | null>(null)
  // The pet cache changes with every care action: re-read it while open.
  useEffect(() => {
    const t = window.setInterval(() => setPet(loadPetCache()), open ? 2000 : 15000)
    return () => window.clearInterval(t)
  }, [open])

  const now = new Date()
  const state = refreshPetState(pet.state, now)
  const missions = missionStatus(state, now)
  const done = missions.filter((m) => m.done).length
  const ready = done === missions.length && !state.missions.claimed
  const owned = new Set([...state.owned, ...state.granted])
  const setsReady = COLLECTION_SETS.filter((c) => setProgress(owned, c).complete && !state.sets.includes(c.id)).length

  function act(action: { type: 'claimChest' } | { type: 'claimSet'; setId: string }, label: string) {
    const facts = buildProgressFacts(gameService.getSnapshot().gameState)
    const res = performPetAction(pet, action, facts, setPet)
    if (!res.ok) return setToast('That didn’t go through — try again.')
    setPet((p) => ({ ...p, state: res.state }))
    playSfx('fanfare')
    setToast(`${label} +${res.reward?.coins ?? 0} coins!`)
    window.setTimeout(() => setToast(null), 3500)
  }

  return (
    <div className={styles.chipWrap}>
      <button type="button" className={`${styles.chip} ${ready || setsReady ? styles.chipReady : ''}`} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span aria-hidden="true">{ready ? '🎁' : '🎯'}</span> Missions <b>{done}/{missions.length}</b>
        {setsReady > 0 && <b className={styles.dot}>📚 {setsReady}</b>}
      </button>
      {open && (
        <div className={styles.pop} role="dialog" aria-label="Daily missions and collections">
          <div className={styles.tabs} role="tablist">
            <button type="button" role="tab" aria-selected={tab === 'missions'} onClick={() => setTab('missions')}>
              🎯 Today’s missions
            </button>
            <button type="button" role="tab" aria-selected={tab === 'sets'} onClick={() => setTab('sets')}>
              📚 Collections{setsReady ? ` (${setsReady})` : ''}
            </button>
          </div>
          {tab === 'missions' ? (
            <>
              <ul className={styles.missions}>
                {missions.map((m) => (
                  <li key={m.id} data-done={m.done || undefined}>
                    <span className={styles.mEmoji}>{m.done ? '✅' : m.emoji}</span>
                    <span>{m.label}</span>
                    <small>
                      {m.progress}/{m.target}
                    </small>
                  </li>
                ))}
              </ul>
              <div className={styles.chest} data-ready={ready || undefined}>
                <span className={styles.chestIcon} aria-hidden="true">
                  {state.missions.claimed ? '📭' : '🎁'}
                </span>
                <div>
                  <strong>{state.missions.claimed ? 'Chest opened — new missions tomorrow!' : ready ? 'Your chest is ready!' : 'Finish all three to open today’s chest'}</strong>
                  <small>Surprise coins{chestReward(now, state.missions.chests).treats ? ' and a treat' : ''} inside.</small>
                </div>
                {ready && (
                  <button type="button" className={styles.primary} onClick={() => act({ type: 'claimChest' }, '🎁 Chest opened!')}>
                    Open
                  </button>
                )}
              </div>
            </>
          ) : (
            <ul className={styles.sets}>
              {COLLECTION_SETS.map((c) => {
                const p = setProgress(owned, c)
                const claimed = state.sets.includes(c.id)
                return (
                  <li key={c.id} data-done={claimed || undefined}>
                    <div className={styles.setHead}>
                      <strong>
                        {c.emoji} {c.name}
                      </strong>
                      <span>
                        {p.have}/{p.total} · <Coin /> {c.coins}
                      </span>
                    </div>
                    <div className={styles.setItems}>
                      {c.items.map((id) => (
                        <span key={id} data-have={owned.has(id) || undefined} title={findItem(id)?.name ?? id}>
                          {findItem(id)?.name ?? id}
                        </span>
                      ))}
                    </div>
                    {claimed ? (
                      <small className={styles.claimed}>✓ Bonus claimed</small>
                    ) : p.complete ? (
                      <button type="button" className={styles.primary} onClick={() => act({ type: 'claimSet', setId: c.id }, `${c.emoji} ${c.name} complete!`)}>
                        Claim bonus
                      </button>
                    ) : (
                      <small>Buy the missing pieces in Rocky’s shop.</small>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
          {toast && <p className={styles.toast}>{toast}</p>}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Arcade: duels and the monthly tournament
// ---------------------------------------------------------------------------
export function useDuels() {
  const [duels, setDuels] = useState<Awaited<ReturnType<typeof engagementApi.duels>> | null>(null)
  const load = useCallback(() => {
    if (!isRemoteModeEnabled()) return
    engagementApi
      .duels()
      .then(setDuels)
      .catch(() => {})
  }, [])
  useEffect(load, [load])
  useLiveEvent((e) => {
    if (e.t === 'duel') load()
  }, [])
  return { duels, reload: load }
}

const RESULT: Record<Duel['result'], string> = { open: '⏳', won: '🏆 Won', lost: 'Lost', tied: '🤝 Tie', expired: '⌛ Expired' }

export function DuelsPanel({ duels, onPlay }: { duels: Awaited<ReturnType<typeof engagementApi.duels>> | null; onPlay: (duel: Duel) => void }) {
  if (!duels || (!duels.incoming.length && !duels.outgoing.length && !duels.recent.length)) return null
  return (
    <section className={styles.panel} aria-label="Duels">
      <strong>⚔️ Duels</strong>
      {duels.incoming.map((d) => (
        <div key={d.id} className={styles.duelRow} data-incoming="">
          <span>
            <b>{d.with}</b> challenged you: beat <b>{d.theirScore}</b> in {d.gameName}
          </span>
          <button type="button" className={styles.primary} onClick={() => onPlay(d)}>
            Play
          </button>
        </div>
      ))}
      {duels.outgoing.map((d) => (
        <div key={d.id} className={styles.duelRow}>
          <span>
            Waiting for <b>{d.with}</b> to beat your {d.myScore} in {d.gameName}
          </span>
          <small>⏳</small>
        </div>
      ))}
      {duels.recent.slice(0, 4).map((d) => (
        <div key={d.id} className={styles.duelRow} data-result={d.result}>
          <span>
            {d.gameName} vs {d.with}: {d.myScore ?? '—'} – {d.theirScore ?? '—'}
          </span>
          <small>{RESULT[d.result]}</small>
        </div>
      ))}
    </section>
  )
}

/** After a round: send the score to a teammate as a duel. */
export function ChallengeFriend({ game, score, left }: { game: string; score: number; left: number }) {
  const [open, setOpen] = useState(false)
  const [friends, setFriends] = useState<FriendSummary[] | null>(null)
  const [q, setQ] = useState('')
  const [sent, setSent] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (open && !friends)
      apiClient
        .listFriends()
        .then((r) => setFriends(r.friends))
        .catch(() => setFriends([]))
  }, [open, friends])
  if (score <= 0 || !isRemoteModeEnabled()) return null
  if (sent) return <p className={styles.sent}>⚔️ Duel sent to {sent}! They have 48 h to beat {score}.</p>
  return (
    <div className={styles.challengeWrap}>
      <button type="button" className={styles.ghost} onClick={() => setOpen((o) => !o)} disabled={left === 0} title={left === 0 ? 'No duels left today' : undefined}>
        ⚔️ Challenge a friend{left < 3 ? ` (${left} left today)` : ''}
      </button>
      {open && (
        <div className={styles.pickPop}>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a teammate…" aria-label="Find a teammate" autoFocus />
          <ul>
            {(friends ?? [])
              .filter((f) => f.name.toLowerCase().includes(q.trim().toLowerCase()))
              .slice(0, 8)
              .map((f) => (
                <li key={f.id}>
                  <button
                    type="button"
                    onClick={() =>
                      void engagementApi
                        .challenge(f.id, game, score)
                        .then(() => setSent(f.name))
                        .catch((e) => setError(e instanceof Error ? e.message : String(e)))
                    }
                  >
                    <img src={getRockyAsset(f.stage, f.mood)} alt="" /> {f.name}
                  </button>
                </li>
              ))}
          </ul>
          {error && <p className={styles.error}>{error}</p>}
        </div>
      )}
    </div>
  )
}

export function TournamentPanel({ refreshKey }: { refreshKey: number }) {
  const [t, setT] = useState<Awaited<ReturnType<typeof engagementApi.tournament>> | null>(null)
  useEffect(() => {
    if (!isRemoteModeEnabled()) return
    engagementApi
      .tournament()
      .then(setT)
      .catch(() => {})
  }, [refreshKey])
  if (!t) return null
  const monthName = new Date(`${t.month}-15T12:00:00`).toLocaleDateString('en-US', { month: 'long' })
  const row = (r: TournamentRow) => (
    <li key={r.id} data-me={r.me || undefined}>
      <span>{r.rank <= 3 ? ['🥇', '🥈', '🥉'][r.rank - 1] : `#${r.rank}`}</span>
      <b>{r.name}</b>
      <small>{r.points} pts</small>
    </li>
  )
  return (
    <section className={styles.panel} aria-label="Monthly tournament">
      <strong>🏆 {monthName} tournament</strong>
      <small className={styles.muted}>
        Points from your best score of the month in every game. Top 3 win a cup for Rocky’s home and {t.prizes.map((p) => p.coins).join('/')} coins.
      </small>
      {t.top.length === 0 ? <small className={styles.muted}>No scores yet this month — be the first!</small> : <ol className={styles.board}>{t.top.slice(0, 5).map(row)}</ol>}
      {t.me && t.me.rank > 5 && <ol className={styles.board}>{row(t.me)}</ol>}
    </section>
  )
}

// ---------------------------------------------------------------------------
// Friends: Rocky of the week
// ---------------------------------------------------------------------------
export function useRotw() {
  const [data, setData] = useState<Awaited<ReturnType<typeof engagementApi.rotw>> | null>(null)
  useEffect(() => {
    if (!isRemoteModeEnabled()) return
    engagementApi
      .rotw()
      .then(setData)
      .catch(() => {})
  }, [])
  const vote = (to: string) =>
    engagementApi
      .vote(to)
      .then((d) => (setData(d), playSfx('chime')))
      .catch(() => {})
  return { data, vote }
}

export function RotwPanel({ data }: { data: Awaited<ReturnType<typeof engagementApi.rotw>> | null }) {
  if (!data) return null
  const card = (r: RotwEntry, label?: string) => (
    <li key={r.id}>
      <img src={getRockyAsset(r.stage, r.mood)} alt="" />
      <span>
        <b>{r.rockyName}</b>
        <small>
          {label ?? `#${r.rank}`} · {r.name} · {r.votes} {r.votes === 1 ? 'vote' : 'votes'}
        </small>
      </span>
    </li>
  )
  return (
    <section className={`${styles.panel} ${styles.rotw}`} aria-label="Rocky of the week">
      <strong>👑 Rocky of the week</strong>
      <small className={styles.muted}>
        Vote for the best-dressed Rocky with ⭐ on a teammate’s card (one vote a week, you can change it). The winner gets the 👑 badge for a week and {data.prize} coins.
      </small>
      <ul className={styles.rotwList}>
        {data.lastWinner && card(data.lastWinner, '👑 Last week')}
        {data.top.length === 0 ? <li className={styles.muted}>No votes yet this week.</li> : data.top.map((r) => card(r))}
      </ul>
    </section>
  )
}

export function VoteStar({ id, name, myVote, onVote, className }: { id: string; name: string; myVote: string | null; onVote: (id: string) => void; className?: string }) {
  const mine = myVote === id
  return (
    <button type="button" className={className} onClick={() => onVote(id)} aria-pressed={mine} title={mine ? 'Your Rocky of the week vote' : `Vote ${name}’s Rocky as Rocky of the week`} aria-label={`Vote for ${name}`}>
      {mine ? '🌟' : '⭐'}
    </button>
  )
}

/** The tournament points (shared with the board). */
export type { TournamentRow }
