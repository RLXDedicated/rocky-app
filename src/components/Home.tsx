import { useCallback, useEffect, useMemo, useState } from 'react'
import { calculateMood } from '../engine/gameEngine'
import { achievementReaction, checkInReaction, evolutionReaction, levelUpReaction, moodMessage } from '../engine/moodMessages'
import { levelProgress } from '../engine/petProgress'
import type { CheckInResult } from '../engine/gameEngine'
import { repository } from '../repository/localStorageRepository'
import { gameService } from '../services/gameService'
import { performCheckIn } from '../services/checkInAction'
import type { Agent, GameState } from '../types/domain'
import styles from './Home.module.css'
import { LoadingRocky } from './LoadingRocky'
import { Celebration, type CelebrationData } from './pet/Celebration'
import { NameTag } from './pet/NameTag'
import { type RockyReactionKey } from './rockyVisuals'
import { Coin } from './world/Coin'
import { RockyWorld } from './world/RockyWorld'
import { ShopPanel } from './world/ShopPanel'
import { loadOutfit, sanitizeOutfit, saveOutfit, type Outfit, type ProgressFacts } from '../game/closet'
import { MAX_HEARTS, feed, loadCare, pet, play, treatsAvailable, type CareState } from '../game/care'
import { balance, buyItem, buyTreatBag, loadWallet, type Wallet } from '../game/economy'
import { buildProgressFacts } from '../game/progressFacts'

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
}

/** The pet screen: Rocky's world is the whole page. Stats live in Progress, looks in the shop. */
export function Home({ onOpenProgress }: Props) {
  const [agent, setAgent] = useState<Agent | null>(null)
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [isCheckingIn, setIsCheckingIn] = useState(false)
  const [reaction, setReaction] = useState<string | null>(null)
  const [rockyReaction, setRockyReaction] = useState<RockyReactionKey | null>(null)
  const [xpBurst, setXpBurst] = useState<number | null>(null)
  const [celebration, setCelebration] = useState<CelebrationData | null>(null)
  const [facts, setFacts] = useState<ProgressFacts | null>(null)
  const [outfit, setOutfit] = useState<Outfit>(() => loadOutfit())
  const [care, setCare] = useState<CareState>(() => loadCare())
  const [wallet, setWallet] = useState<Wallet>(() => loadWallet())
  const [shopOpen, setShopOpen] = useState(false)
  const [coinBurst, setCoinBurst] = useState<number | null>(null)

  function refreshFacts(state: GameState) {
    const next = buildProgressFacts(state)
    setFacts(next)
    setOutfit((o) => sanitizeOutfit(o, next, loadWallet().owned))
  }

  function changeOutfit(next: Outfit) {
    setOutfit(next)
    saveOutfit(next)
  }

  useEffect(() => {
    const snapshot = gameService.getSnapshot()
    setAgent(snapshot.agent)
    setGameState(snapshot.gameState)
    refreshFacts(snapshot.gameState)
  }, [])

  const alreadyCheckedInToday = useMemo(() => (gameState ? isToday(gameState.lastCheckInDate) : false), [gameState])

  // Mood is derived, not just cached: it also depends on time elapsed since
  // the last alert (Recovery window), so it's recomputed rather than trusted
  // from the last-saved state.mood snapshot.
  const mood = useMemo(() => (gameState ? calculateMood(gameState) : 'Motivated'), [gameState])
  // Picked once per mood so the line doesn't reshuffle on every re-render.
  const moodLine = useMemo(() => moodMessage(mood), [mood])
  const closeShop = useCallback(() => setShopOpen(false), [])

  if (!agent || !gameState || !facts) return <LoadingRocky />

  function handleRename(name: string) {
    const current = repository.getAgent()
    const next = { ...current, rockyName: name }
    repository.saveAgent(next)
    setAgent(next)
  }

  function handleCheckIn() {
    if (isCheckingIn || alreadyCheckedInToday || !gameState) return
    setIsCheckingIn(true)
    setReaction(null)

    const previousLevel = gameState.level
    const previousStage = gameState.evolutionStage
    const previousMood = mood
    const previousXp = gameState.xp
    const previousCoins = facts ? balance(wallet, facts) : 0

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
      const coinsGained = balance(wallet, buildProgressFacts(result.state)) - previousCoins
      if (coinsGained > 0) {
        setCoinBurst(coinsGained)
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
  const treats = treatsAvailable(care, facts.checkIns, facts.qaPasses, wallet.bonusTreats)
  const coins = balance(wallet, facts)

  function handleBuy(id: string): boolean {
    const r = buyItem(wallet, facts!, id)
    if (r.ok) setWallet(r.wallet)
    return r.ok
  }

  function handleBuyTreats() {
    const r = buyTreatBag(wallet, facts!)
    if (r.ok) setWallet(r.wallet)
  }

  return (
    <div className={styles.page}>
      <div className={styles.layout}>
        <RockyWorld
          mood={mood}
          stage={gameState.evolutionStage}
          reaction={rockyReaction}
          outfit={outfit}
          speech={reaction ?? moodLine}
          treats={treats}
          hearts={care.hearts}
          maxHearts={MAX_HEARTS}
          onPet={() => setCare((c) => pet(c))}
          onFeed={() => setCare((c) => feed(c, treats))}
          onPlay={() => setCare((c) => play(c))}
          hud={
            <>
              <NameTag name={agent.rockyName} subtitle={`${gameState.evolutionStage} Rocky`} onRename={handleRename} />
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
                <button type="button" className={styles.shopButton} onClick={() => setShopOpen(true)}>
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
        owned={wallet.owned}
        coins={coins}
        treats={treats}
        onChange={changeOutfit}
        onBuy={handleBuy}
        onBuyTreats={handleBuyTreats}
      />

      {celebration && <Celebration data={celebration} mood={mood} evolutionStage={gameState.evolutionStage} onClose={() => setCelebration(null)} />}
    </div>
  )
}
