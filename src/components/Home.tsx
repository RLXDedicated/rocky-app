import { useEffect, useMemo, useState } from 'react'
import { energyLabel } from '../engine/energyLabel'
import { calculateMood } from '../engine/gameEngine'
import { xpForNextLevel } from '../engine/levels'
import { achievementReaction, checkInReaction, evolutionReaction, levelUpReaction, moodMessage } from '../engine/moodMessages'
import type { CheckInResult } from '../engine/gameEngine'
import { gameService } from '../services/gameService'
import { performCheckIn } from '../services/checkInAction'
import type { Agent, GameEvent, GameState } from '../types/domain'
import { ActivityFeed } from './ActivityFeed'
import { EvolutionTracker } from './EvolutionTracker'
import styles from './Home.module.css'
import { RockyAvatar } from './RockyAvatar'
import { LoadingRocky } from './LoadingRocky'
import { ROCKY_VISUALS, type RockyReactionKey } from './rockyVisuals'
import { StatCard } from './StatCard'
import { XPBar } from './XPBar'

function isToday(dateKey: string | null): boolean {
  if (!dateKey) return false
  const today = new Date()
  const y = today.getFullYear()
  const m = String(today.getMonth() + 1).padStart(2, '0')
  const d = String(today.getDate()).padStart(2, '0')
  return dateKey === `${y}-${m}-${d}`
}

export function Home() {
  const [agent, setAgent] = useState<Agent | null>(null)
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [events, setEvents] = useState<GameEvent[]>([])
  const [isCheckingIn, setIsCheckingIn] = useState(false)
  const [reaction, setReaction] = useState<string | null>(null)
  const [rockyReaction, setRockyReaction] = useState<RockyReactionKey | null>(null)

  useEffect(() => {
    const snapshot = gameService.getSnapshot()
    setAgent(snapshot.agent)
    setGameState(snapshot.gameState)
    setEvents(gameService.getRecentEvents())
  }, [])

  const alreadyCheckedInToday = useMemo(
    () => (gameState ? isToday(gameState.lastCheckInDate) : false),
    [gameState],
  )

  // Mood is derived, not just cached: it also depends on time elapsed since
  // the last alert (Recovery window), so it's recomputed on every render
  // rather than trusted from the last-saved state.mood snapshot.
  const mood = useMemo(() => (gameState ? calculateMood(gameState) : 'Motivated'), [gameState])

  if (!agent || !gameState) return <LoadingRocky />

  function handleCheckIn() {
    if (isCheckingIn || alreadyCheckedInToday || !gameState) return
    setIsCheckingIn(true)
    setReaction(null)

    const previousLevel = gameState.level
    const previousStage = gameState.evolutionStage
    const previousMood = mood

    // Small delay so the check-in reads as a moment shared with Rocky,
    // not an instant state flip.
    window.setTimeout(async () => {
      let result: CheckInResult
      try {
        result = await performCheckIn()
      } catch (err) {
        // A friendly message for the agent; the real error stays in the
        // dev console for whoever's debugging (Phase 8 §18). In remote mode
        // this also covers the backend being unreachable.
        console.error('Check-in failed:', err)
        setReaction("Rocky couldn't save that action. Try again.")
        setIsCheckingIn(false)
        return
      }
      setGameState(result.state)
      setEvents(gameService.getRecentEvents())

      // Priority: Evolution is the biggest possible moment (bigger, longer
      // celebration than a normal Level Up), then an unlocked Achievement,
      // then a Level Up, then the everyday check-in reaction.
      if (result.evolved) {
        setReaction(evolutionReaction(previousStage, result.state.evolutionStage))
      } else if (result.newAchievements.length > 0) {
        setReaction(achievementReaction(result.newAchievements[0].name))
      } else if (result.leveledUp) {
        setReaction(levelUpReaction(previousLevel, result.state.level))
      } else {
        setReaction(checkInReaction())
      }

      // Rocky's transient reaction illustration — separate from the text
      // reaction above. A comeback out of Worried into Recovery gets its
      // own dedicated art; otherwise Level Up / Evolution win over the
      // everyday check-in reaction, matching the text-reaction priority.
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

  const buttonLabel = alreadyCheckedInToday
    ? 'SEE YOU TOMORROW!'
    : isCheckingIn
      ? 'CHECKING IN…'
      : 'CHECK IN WITH ROCKY'

  const stageLabel = ROCKY_VISUALS[gameState.evolutionStage].label
  const nextThreshold = xpForNextLevel(gameState.level)

  return (
    <div className={styles.page}>
      <div className={styles.layout}>
        <section className={styles.heroCard}>
          <RockyAvatar mood={mood} evolutionStage={gameState.evolutionStage} reaction={rockyReaction} />
          <div className={styles.heroInfo}>
            <h1 className={styles.rockyName}>{agent.rockyName}</h1>
            <p className={styles.stageLine}>
              {stageLabel} · Level {gameState.level}
              <span className={styles.stageXp}>
                {' '}
                · {nextThreshold !== null ? `${gameState.xp.toLocaleString()} / ${nextThreshold.toLocaleString()} XP` : 'MAX'}
              </span>
            </p>
            <p className={styles.moodLine}>{reaction ?? moodMessage(mood)}</p>
            <button className={styles.checkInButton} onClick={handleCheckIn} disabled={isCheckingIn || alreadyCheckedInToday}>
              {buttonLabel}
            </button>
          </div>
        </section>

        <section className={styles.xpSection}>
          <XPBar xp={gameState.xp} level={gameState.level} />
          <div className={styles.evolutionRow}>
            <EvolutionTracker currentStage={gameState.evolutionStage} />
          </div>
        </section>

        <section className={styles.statsGrid}>
          <StatCard label="Energy" value={`${gameState.energy} · ${energyLabel(gameState.energy)}`} accent="#2fae63" />
          <StatCard label="Mood" value={mood} accent="#f2b705" />
          <StatCard label="Current Streak" value={`${gameState.currentStreak} 🔥`} accent="#e8590c" />
          <StatCard label="Best Streak" value={`${gameState.bestStreak} 🏆`} accent="#3b5bdb" />
        </section>

        <section className={styles.activitySection}>
          <h2 className={styles.sectionTitle}>Recent Activity</h2>
          <ActivityFeed events={events} />
        </section>
      </div>
    </div>
  )
}
