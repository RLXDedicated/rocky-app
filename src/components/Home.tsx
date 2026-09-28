import { useCallback, useEffect, useMemo, useState } from 'react'
import { calculateMood } from '../engine/gameEngine'
import { achievementReaction, checkInReaction, evolutionReaction, levelUpReaction, moodMessage } from '../engine/moodMessages'
import { levelProgress } from '../engine/petProgress'
import type { CheckInResult } from '../engine/gameEngine'
import { gameService } from '../services/gameService'
import { CHECKED_IN_EVENT, performCheckIn } from '../services/checkInAction'
import { refreshFromServer } from '../services/remoteSync'
import { EVOLUTION_LEVELS } from '../engine/petProgress'
import type { Agent, GameState } from '../types/domain'
import styles from './Home.module.css'
import { LoadingRocky } from './LoadingRocky'
import { Celebration, type CelebrationData } from './pet/Celebration'
import { NameTag } from './pet/NameTag'
import { type RockyReactionKey } from './rockyVisuals'
import { Coin } from './world/Coin'
import { RockyWorld } from './world/RockyWorld'
import { ShopPanel, type ShopTab } from './world/ShopPanel'
import type { Outfit, ProgressFacts } from '../game/closet'
import { canUse, coinBalance, refreshPetState, treatsAvailable, unreadInbox, type PetAction, type PetResult } from '../game/pet'
import { catalogFor, fetchPet, loadPetCache, performPetAction, type PetCache } from '../game/petClient'
import { play as playSfx } from '../game/sfx'
import { buildProgressFacts } from '../game/progressFacts'
import { saveRockyName } from '../services/agentProfile'
import { NOTE_TIPS, QUIZ_REWARD, QUIZ_ROUND_SIZE } from '../game/notesQuiz'
import { todayKey } from '../engine/dateUtils'

function isToday(dateKey: string | null): boolean {
  if (!dateKey) return false
  const today = new Date()
  const y = today.getFullYear()
  const m = String(today.getMonth() + 1).padStart(2, '0')
  const d = String(today.getDate()).padStart(2, '0')
  return dateKey === `${y}-${m}-${d}`
}

interface Props {
  /** Opens the Progress view (stats, goals, evolution, diary). */
  onOpenProgress?: () => void
  /** Opens Note Check, the daily notes mini-game. */
  onOpenNotes?: () => void
}

/** The pet screen: Rocky's world is the whole page. Stats live in Progress, looks in the shop. */
export function Home({ onOpenProgress, onOpenNotes }: Props) {
  const [agent, setAgent] = useState<Agent | null>(null)
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [isCheckingIn, setIsCheckingIn] = useState(false)
  const [reaction, setReaction] = useState<string | null>(null)
  const [rockyReaction, setRockyReaction] = useState<RockyReactionKey | null>(null)
  const [xpBurst, setXpBurst] = useState<number | null>(null)
  const [celebration, setCelebration] = useState<CelebrationData | null>(null)
  const [facts, setFacts] = useState<ProgressFacts | null>(null)
  const [pet, setPet] = useState<PetCache>(() => loadPetCache())
  const [shopOpen, setShopOpen] = useState(false)
  const [arranging, setArranging] = useState(false)
  const [shopTab, setShopTab] = useState<ShopTab>('hat')
  const [inboxOpen, setInboxOpen] = useState(false)
  const [coinBurst, setCoinBurst] = useState<number | null>(null)

  function refreshFacts(state: GameState) {
    setFacts(buildProgressFacts(state))
  }

  /** Runs a care/shop action: applied instantly, confirmed by the server in remote mode. */
  function act(action: PetAction): boolean {
    return run(action).ok
  }

  /** Like act, but returns the full result (rewards, XP) — used by the mini-games. */
  function run(action: PetAction): PetResult {
    if (!facts) return { ok: false, reason: 'invalid', state: pet.state }
    const result = performPetAction(pet, action, facts, (fresh) => {
      setPet(fresh)
      // XP from a mini-game: adopt the server's event log (it recorded its own copy).
      if (result.ok && result.xp) void refreshGame()
    })
    if (!result.ok) return result
    setPet((p) => ({ ...p, state: result.state }))
    if (result.reward?.coins) {
      setCoinBurst(result.reward.coins)
      window.setTimeout(() => setCoinBurst(null), 1600)
    }
    if (result.xp) {
      // Shown right away; in remote mode the server's copy replaces it.
      const before = gameService.getSnapshot().gameState
      const granted = gameService.grantGameXp(result.xp.xp, result.xp.reason)
      setGameState(granted.state)
      refreshFacts(granted.state)
      setXpBurst(result.xp.xp)
      window.setTimeout(() => setXpBurst(null), 1600)
      celebrateGrowth(before, granted.state)
    }
    return result
  }

  async function refreshGame() {
    const fresh = await refreshFromServer()
    if (!fresh) return
    setGameState(fresh.gameState)
    refreshFacts(fresh.gameState)
    setPet(loadPetCache())
  }

  function celebrateGrowth(before: GameState, next: GameState) {
    if (next.evolutionStage !== before.evolutionStage) {
      setCelebration({ kind: 'evolution', title: `Rocky evolved`, body: `${before.evolutionStage} Rocky is now ${next.evolutionStage} Rocky.` })
    } else if (next.level > before.level) {
      setCelebration({ kind: 'level-up', title: `Level ${next.level}`, body: `Rocky grew from level ${before.level} to ${next.level}.` })
    }
  }

  function changeOutfit(next: Outfit) {
    act({ type: 'equip', outfit: next })
  }

  useEffect(() => {
    const snapshot = gameService.getSnapshot()
    setAgent(snapshot.agent)
    setGameState(snapshot.gameState)
    refreshFacts(snapshot.gameState)
    // The server's copy of Rocky wins (another device may have changed him).
    void fetchPet().then((fresh) => fresh && setPet(fresh))
  }, [])

  // A check-in made elsewhere (the reminder card) updates this screen too.
  useEffect(() => {
    const onCheckedIn = () => {
      const snapshot = gameService.getSnapshot()
      setGameState(snapshot.gameState)
      refreshFacts(snapshot.gameState)
    }
    window.addEventListener(CHECKED_IN_EVENT, onCheckedIn)
    return () => window.removeEventListener(CHECKED_IN_EVENT, onCheckedIn)
  }, [])

  // Coming back to the tab (or every few minutes) picks up changes made
  // elsewhere — another device, or QA granting XP or an evolution — and
  // celebrates them.
  useEffect(() => {
    let alive = true
    const sync = async () => {
      if (document.visibilityState !== 'visible') return
      const before = gameService.getSnapshot().gameState
      const fresh = await refreshFromServer()
      if (!alive || !fresh) return
      const next = fresh.gameState
      setGameState(next)
      refreshFacts(next)
      setPet(loadPetCache())
      if (next.evolutionStage !== before.evolutionStage) {
        setCelebration({ kind: 'evolution', title: `Rocky evolved`, body: `${before.evolutionStage} Rocky is now ${next.evolutionStage} Rocky.` })
      } else if (next.level > before.level) {
        setCelebration({ kind: 'level-up', title: `Level ${next.level}`, body: `Rocky grew from level ${before.level} to ${next.level}.` })
      }
    }
    document.addEventListener('visibilitychange', sync)
    const t = window.setInterval(sync, 3 * 60_000)
    return () => {
      alive = false
      document.removeEventListener('visibilitychange', sync)
      window.clearInterval(t)
    }
  }, [])

  // Needs drift with real time: bring them up to date every minute.
  useEffect(() => {
    const t = window.setInterval(() => setPet((p) => ({ ...p, state: refreshPetState(p.state, new Date()) })), 60_000)
    return () => window.clearInterval(t)
  }, [])

  const alreadyCheckedInToday = useMemo(() => (gameState ? isToday(gameState.lastCheckInDate) : false), [gameState])

  // Mood is derived, not just cached: it also depends on time elapsed since
  // the last alert (Recovery window), so it's recomputed rather than trusted
  // from the last-saved state.mood snapshot.
  const mood = useMemo(() => (gameState ? calculateMood(gameState) : 'Motivated'), [gameState])
  // Picked once per mood so the line doesn't reshuffle on every re-render.
  const moodLine = useMemo(() => moodMessage(mood), [mood])
  // Rocky's core message: every so often his line becomes a note tip.
  const [tipIndex, setTipIndex] = useState(-1)
  useEffect(() => {
    const t = window.setInterval(() => setTipIndex((i) => (i >= 0 ? -1 : Math.floor(Math.random() * NOTE_TIPS.length))), 20_000)
    return () => window.clearInterval(t)
  }, [])
  const idleLine = tipIndex >= 0 ? NOTE_TIPS[tipIndex]! : moodLine
  const closeShop = useCallback(() => setShopOpen(false), [])
  const startArrange = useCallback(() => {
    setShopOpen(false)
    setArranging(true)
  }, [])

  if (!agent || !gameState || !facts) return <LoadingRocky />

  function handleRename(name: string) {
    setAgent(saveRockyName(name))
  }

  function handleCheckIn() {
    if (isCheckingIn || alreadyCheckedInToday || !gameState) return
    setIsCheckingIn(true)
    setReaction(null)

    const previousLevel = gameState.level
    const previousStage = gameState.evolutionStage
    const previousMood = mood
    const previousXp = gameState.xp
    const previousCoins = facts ? coinBalance(pet.state, facts) : 0

    // Small delay so the check-in reads as a moment shared with Rocky,
    // not an instant state flip.
    window.setTimeout(async () => {
      let result: CheckInResult
      try {
        result = await performCheckIn()
      } catch (err) {
        // A friendly message for the agent; the real error stays in the
        // dev console. In remote mode this also covers the backend being
        // unreachable.
        console.error('Check-in failed:', err)
        setReaction("Rocky couldn't save that check-in. Try again in a moment.")
        setIsCheckingIn(false)
        return
      }
      setGameState(result.state)
      refreshFacts(result.state)

      const gained = result.state.xp - previousXp
      if (gained > 0) {
        setXpBurst(gained)
        window.setTimeout(() => setXpBurst(null), 1800)
      }
      const coinsGained = coinBalance(loadPetCache().state, buildProgressFacts(result.state)) - previousCoins
      if (coinsGained > 0) {
        setCoinBurst(coinsGained)
        window.setTimeout(() => playSfx('coin'), 600)
        window.setTimeout(() => setCoinBurst(null), 2000)
      }

      // Priority: Evolution is the biggest possible moment, then an
      // unlocked Achievement, then a Level Up, then the everyday reaction.
      if (result.evolved) {
        setReaction(evolutionReaction(previousStage, result.state.evolutionStage))
      } else if (result.newAchievements.length > 0) {
        setReaction(achievementReaction(result.newAchievements[0]!.name))
      } else if (result.leveledUp) {
        setReaction(levelUpReaction(previousLevel, result.state.level))
      } else {
        setReaction(checkInReaction())
      }

      if (result.evolved) {
        setCelebration({
          kind: 'evolution',
          title: `${agent!.rockyName} evolved`,
          body: `${previousStage} Rocky is now ${result.state.evolutionStage} Rocky. A new look, earned one check-in at a time.`,
        })
      } else if (result.leveledUp) {
        setCelebration({
          kind: 'level-up',
          title: `Level ${result.state.level}`,
          body: `${agent!.rockyName} grew from level ${previousLevel} to ${result.state.level}.`,
        })
      } else if (result.newAchievements.length > 0) {
        const a = result.newAchievements[0]!
        setCelebration({ kind: 'achievement', title: `New badge: ${a.name}`, body: a.description })
      }

      // Rocky's transient reaction illustration. A comeback out of Worried
      // into Recovery gets its own art; otherwise Level Up / Evolution win
      // over the everyday check-in reaction.
      const newMood = calculateMood(result.state)
      const rockyReactionKey: RockyReactionKey = result.evolved
        ? 'evolution'
        : result.leveledUp
          ? 'level-up'
          : previousMood === 'Worried' && newMood === 'Recovery'
            ? 'recovery'
            : 'check-in'
      setRockyReaction(rockyReactionKey)
      window.setTimeout(() => setRockyReaction(null), result.evolved ? 4200 : 2600)
      window.setTimeout(() => setIsCheckingIn(false), result.evolved ? 4200 : 2600)
    }, 900)
  }

  const buttonLabel = alreadyCheckedInToday ? 'Checked in today' : isCheckingIn ? 'Checking in…' : 'Check in with Rocky'
  const progress = levelProgress(gameState.xp, gameState.level)
  const treats = treatsAvailable(pet.state, facts)
  const coins = coinBalance(pet.state, facts)
  const catalog = catalogFor(pet)
  const unread = unreadInbox(pet.state)
  // A fresh message from QA is the first thing Rocky says.
  const qaNote = unread.find((e) => e.kind === 'message')
  // Only what the agent can actually use is shown on Rocky.
  const outfit = pet.state.outfit
  const usable = (id: string | null) => Boolean(id && catalog.some((i) => i.id === id && canUse(pet.state, i, facts)))
  const visibleOutfit: Outfit = {
    hat: usable(outfit.hat) ? outfit.hat : null,
    glasses: usable(outfit.glasses) ? outfit.glasses : null,
    neck: usable(outfit.neck) ? outfit.neck : null,
    back: usable(outfit.back) ? outfit.back : null,
    scene: usable(outfit.scene) ? outfit.scene : 'scene-route',
    decor: outfit.decor.filter(usable),
    spots: outfit.spots ?? {},
    fx: usable(outfit.fx) ? outfit.fx : null,
  }

  function handleBuy(id: string): boolean {
    const ok = act({ type: 'buy', itemId: id })
    playSfx(ok ? 'coin' : 'nope')
    return ok
  }

  function handleBuyTreats() {
    playSfx(act({ type: 'buyTreats' }) ? 'coin' : 'nope')
  }

  return (
    <div className={styles.page}>
      <div className={styles.layout}>
        <RockyWorld
          mood={mood}
          stage={gameState.evolutionStage}
          reaction={rockyReaction}
          outfit={visibleOutfit}
          speech={reaction ?? (qaNote ? `📣 ${qaNote.from}: ${qaNote.text}` : idleLine)}
          treats={treats}
          needs={pet.state.needs}
          onPet={() => act({ type: 'pet' })}
          onFeed={(food) => act({ type: 'feed', food })}
          onPlay={() => act({ type: 'play' })}
          onBath={(soap) => act({ type: 'bath', soap })}
          inventory={pet.state.inventory}
          litter={pet.state.litter.items}
          onKeepy={(touches) => {
            const r = run({ type: 'keepy', touches })
            return r.ok ? (r.reward ?? null) : null
          }}
          onLitter={(id) => {
            const r = run({ type: 'litter', id })
            return r.ok ? (r.reward ?? null) : null
          }}
          onOpenPantry={(tab) => {
            setShopTab(tab === 'food' ? 'food' : 'soap')
            setShopOpen(true)
          }}
          arranging={arranging}
          onStartArrange={startArrange}
          onArrangeDone={(layout) => {
            setArranging(false)
            if (layout) changeOutfit({ ...outfit, decor: layout.decor, spots: { ...outfit.spots, ...layout.spots } })
          }}
          hud={
            <>
              <div className={styles.hudLeft}>
                <NameTag name={agent.rockyName} subtitle={`${gameState.evolutionStage} Rocky`} onRename={handleRename} />
                {onOpenNotes && !(pet.state.quiz.date === todayKey() && pet.state.quiz.rewarded) && (
                  <button type="button" className={styles.notesChip} onClick={onOpenNotes}>
                    <span aria-hidden="true">📝</span> Today’s Note Check
                    <b>+{QUIZ_ROUND_SIZE * QUIZ_REWARD.perCorrect + QUIZ_REWARD.perfectBonus}</b>
                  </button>
                )}
                {(unread.length > 0 || inboxOpen) && (
                  <button
                    type="button"
                    className={`${styles.notesChip} ${styles.inboxChip}`}
                    onClick={() => {
                      setInboxOpen((o) => !o)
                      if (unread.length) act({ type: 'readInbox' })
                    }}
                    aria-expanded={inboxOpen}
                  >
                    <span aria-hidden="true">✉️</span> {unread.length ? `${unread.length} new` : 'Messages'}
                  </button>
                )}
                {inboxOpen && (
                  <div className={styles.inbox} role="dialog" aria-label="Messages">
                    <ul>
                      {pet.state.inbox.slice(0, 8).map((e) => (
                        <li key={e.id} data-kind={e.kind}>
                          <span aria-hidden="true">{e.kind === 'visit' ? '👋' : e.kind === 'gift' ? '🎁' : '📣'}</span>
                          <div>
                            <p>{e.text}</p>
                            <small>
                              {e.from} · {new Date(e.at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </small>
                          </div>
                        </li>
                      ))}
                    </ul>
                    <button type="button" onClick={() => setInboxOpen(false)}>
                      Close
                    </button>
                  </div>
                )}
              </div>
              <div className={styles.hudRight}>
                <div className={styles.levelCard}>
                  <div className={styles.levelTop}>
                    <span className={styles.levelNum}>
                      <small>Level</small> {gameState.level}
                    </span>
                    <span className={styles.xpText}>{progress.isMax ? 'Max level' : `${progress.toNext} XP to go`}</span>
                  </div>
                  <div
                    className={styles.xpTrack}
                    role="meter"
                    aria-valuemin={0}
                    aria-valuemax={progress.levelSpan || 1}
                    aria-valuenow={progress.intoLevel}
                    aria-label="XP to next level"
                  >
                    <span style={{ width: `${progress.fraction * 100}%` }} />
                  </div>
                  <ol className={styles.stages} aria-label={`Evolution: ${gameState.evolutionStage} Rocky`}>
                    {(['Baby', 'Young', 'Advanced', 'Elite'] as const).map((st) => {
                      const order = ['Baby', 'Young', 'Advanced', 'Elite']
                      const reached = order.indexOf(st) <= order.indexOf(gameState.evolutionStage)
                      return (
                        <li
                          key={st}
                          className={`${styles.stage} ${reached ? styles.stageOn : ''} ${st === gameState.evolutionStage ? styles.stageNow : ''}`}
                          title={`${st} · level ${EVOLUTION_LEVELS[st]}`}
                        >
                          <span>{st}</span>
                        </li>
                      )
                    })}
                  </ol>
                  <button type="button" className={styles.stats} onClick={onOpenProgress} aria-label="Energy and streak — open Progress">
                    <span className={gameState.energy < 40 ? styles.statLow : undefined}>
                      <span aria-hidden="true">⚡</span> {gameState.energy}
                    </span>
                    <span>
                      <span aria-hidden="true">🔥</span> {gameState.currentStreak} {gameState.currentStreak === 1 ? 'day' : 'days'}
                    </span>
                    <span className={styles.statMore}>Progress ›</span>
                  </button>
                  {xpBurst !== null && (
                    <span className={styles.xpBurst} aria-live="polite">
                      +{xpBurst} XP
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  className={styles.shopButton}
                  onClick={() => {
                    setShopTab('hat')
                    setShopOpen(true)
                  }}
                >
                  <Coin size={20} />
                  <b>{coins.toLocaleString()}</b>
                  <span>Shop</span>
                  {coinBurst !== null && (
                    <span className={styles.coinBurst} aria-live="polite">
                      +{coinBurst}
                    </span>
                  )}
                </button>
              </div>
            </>
          }
          action={
            <button className={styles.checkInButton} onClick={handleCheckIn} disabled={isCheckingIn || alreadyCheckedInToday}>
              {alreadyCheckedInToday && <span aria-hidden="true">✓ </span>}
              {buttonLabel}
            </button>
          }
        />
      </div>

      <ShopPanel
        open={shopOpen}
        onClose={closeShop}
        outfit={outfit}
        facts={facts}
        owned={pet.state.owned}
        granted={pet.state.granted}
        catalog={catalog}
        coins={coins}
        treats={treats}
        onChange={changeOutfit}
        onBuy={handleBuy}
        onBuyTreats={handleBuyTreats}
        onArrange={startArrange}
        initialTab={shopTab}
        inventory={pet.state.inventory}
        pantryOverrides={pet.overrides}
        onBuyFood={(id: string) => {
          const ok = act({ type: 'buyFood', foodId: id })
          playSfx(ok ? 'coin' : 'nope')
        }}
        onBuySoap={(id: string) => {
          const ok = act({ type: 'buySoap', soapId: id })
          playSfx(ok ? 'coin' : 'nope')
        }}
      />

      {celebration && <Celebration data={celebration} mood={mood} evolutionStage={gameState.evolutionStage} onClose={() => setCelebration(null)} />}
    </div>
  )
}
