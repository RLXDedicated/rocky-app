import { useEffect, useMemo, useState } from 'react'
import { energyLabel } from '../engine/energyLabel'
import { calculateMood } from '../engine/gameEngine'
import { achievementReaction, checkInReaction, evolutionReaction, levelUpReaction, moodMessage } from '../engine/moodMessages'
import { checkInWeek, levelProgress, nextEvolution, nextStreakMilestone } from '../engine/petProgress'
import type { CheckInResult } from '../engine/gameEngine'
import { repository } from '../repository/localStorageRepository'
import { gameService } from '../services/gameService'
import { performCheckIn } from '../services/checkInAction'
import type { Agent, GameEvent, GameState, Mood } from '../types/domain'
import { ActivityFeed } from './ActivityFeed'
import styles from './Home.module.css'
import { LoadingRocky } from './LoadingRocky'
import { Celebration, type CelebrationData } from './pet/Celebration'
import { EvolutionPath } from './pet/EvolutionPath'
import { NameTag } from './pet/NameTag'
import { type RockyReactionKey } from './rockyVisuals'
import { ClosetPanel } from './world/ClosetPanel'
import { RockyWorld } from './world/RockyWorld'
import { loadOutfit, sanitizeOutfit, saveOutfit, type Outfit, type ProgressFacts } from '../game/closet'
import { MAX_HEARTS, feed, loadCare, pet, play, treatsAvailable, type CareState } from '../game/care'

function isToday(dateKey: string | null): boolean {
  if (!dateKey) return false
  const today = new Date()
  const y = today.getFullYear()
  const m = String(today.getMonth() + 1).padStart(2, '0')
  const d = String(today.getDate()).padStart(2, '0')
  return dateKey === `${y}-${m}-${d}`
}

// What each mood means in game terms, so the agent knows how to cheer Rocky up.
const MOOD_GUIDE: Record<Mood, string> = {
  Happy: 'Energy 70+ and a 7-day streak. Rocky is at their best.',
  Motivated: 'Energy 40+ and a 3-day streak. Keep checking in to reach Happy.',
  Worried: 'Rocky wants a longer streak. Daily check-ins build it back up.',
  Recovery: 'Bouncing back after an alert. One more good day seals it.',
}

const ENERGY_CELLS = 10

export function Home() {
  const [agent, setAgent] = useState<Agent | null>(null)
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [events, setEvents] = useState<GameEvent[]>([])
  const [allEvents, setAllEvents] = useState<GameEvent[]>([])
  const [isCheckingIn, setIsCheckingIn] = useState(false)
  const [reaction, setReaction] = useState<string | null>(null)
  const [rockyReaction, setRockyReaction] = useState<RockyReactionKey | null>(null)
  const [xpBurst, setXpBurst] = useState<number | null>(null)
  const [celebration, setCelebration] = useState<CelebrationData | null>(null)
  const [facts, setFacts] = useState<ProgressFacts | null>(null)
  const [outfit, setOutfit] = useState<Outfit>(() => loadOutfit())
  const [care, setCare] = useState<CareState>(() => loadCare())

  function refreshFacts(state: GameState) {
    const progress = gameService.getAchievementProgress()
    const next: ProgressFacts = {
      level: state.level,
      stage: state.evolutionStage,
      bestStreak: state.bestStreak,
      checkIns: progress.metrics.checkins,
      qaPasses: progress.metrics.qaPasses,
      badgeIds: progress.unlocked.map((a) => a.id),
    }
    setFacts(next)
    setOutfit((o) => sanitizeOutfit(o, next))
  }

  function changeOutfit(next: Outfit) {
    setOutfit(next)
    saveOutfit(next)
  }

  function refreshEvents() {
    setEvents(gameService.getRecentEvents(6))
    setAllEvents(gameService.getSnapshot().events)
  }

  useEffect(() => {
    const snapshot = gameService.getSnapshot()
    setAgent(snapshot.agent)
    setGameState(snapshot.gameState)
    refreshEvents()
    refreshFacts(snapshot.gameState)
  }, [])

  const alreadyCheckedInToday = useMemo(() => (gameState ? isToday(gameState.lastCheckInDate) : false), [gameState])

  // Mood is derived, not just cached: it also depends on time elapsed since
  // the last alert (Recovery window), so it's recomputed rather than trusted
  // from the last-saved state.mood snapshot.
  const mood = useMemo(() => (gameState ? calculateMood(gameState) : 'Motivated'), [gameState])
  // Picked once per mood so the line doesn't reshuffle on every re-render.
  const moodLine = useMemo(() => moodMessage(mood), [mood])
  const week = useMemo(() => checkInWeek(allEvents), [allEvents])

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
      refreshEvents()
      refreshFacts(result.state)

      const gained = result.state.xp - previousXp
      if (gained > 0) {
        setXpBurst(gained)
        window.setTimeout(() => setXpBurst(null), 1800)
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
        setCelebration({ kind: 'level-up', title: `Level ${result.state.level}`, body: `${agent!.rockyName} grew from level ${previousLevel} to ${result.state.level}.` })
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
  const milestone = nextStreakMilestone(gameState.currentStreak)
  const evolution = nextEvolution(gameState.evolutionStage, gameState.xp)
  const energyTier = energyLabel(gameState.energy)
  const litCells = Math.round((gameState.energy / 100) * ENERGY_CELLS)
  const treats = treatsAvailable(care, facts.checkIns, facts.qaPasses)

  const goals = [
    { done: alreadyCheckedInToday, text: 'Check in with Rocky today', reward: alreadyCheckedInToday ? 'Done' : '+10 XP' },
    { done: gameState.energy >= 40, text: 'Keep energy at 40 or more', reward: `${gameState.energy} now` },
    milestone
      ? { done: false, text: `Reach a ${milestone.days}-day streak`, reward: `${milestone.daysToGo} to go · +${milestone.xp} XP` }
      : { done: true, text: 'Every streak milestone reached', reward: 'Legend' },
    evolution
      ? { done: false, text: `Evolve into ${evolution.stage} Rocky`, reward: `${evolution.xpToGo.toLocaleString()} XP to go` }
      : { done: true, text: 'Elite Rocky unlocked', reward: 'Max form' },
  ]

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
              <div className={styles.levelCard}>
                <div className={styles.levelTop}>
                  <span className={styles.levelNum}>
                    <small>Level</small> {gameState.level}
                  </span>
                  <a className={styles.dressUp} href="#closet">
                    Dress up
                  </a>
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
                <span className={styles.xpText}>
                  {progress.isMax ? `${gameState.xp.toLocaleString()} XP · max level` : `${progress.toNext} XP to level ${gameState.level + 1}`}
                </span>
                {xpBurst !== null && (
                  <span className={styles.xpBurst} aria-live="polite">
                    +{xpBurst} XP
                  </span>
                )}
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

        <ClosetPanel outfit={outfit} facts={facts} onChange={changeOutfit} />

        <section className={styles.needs} aria-label="Rocky's needs">
          <article className={styles.need}>
            <header className={styles.needHead}>
              <h2>Energy</h2>
              <span className={styles.needValue}>
                {gameState.energy}
                <small>/100</small>
              </span>
            </header>
            <div className={styles.cells} role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={gameState.energy} aria-label="Energy">
              {Array.from({ length: ENERGY_CELLS }, (_, i) => (
                <span key={i} className={`${styles.cell} ${i < litCells ? (gameState.energy < 40 ? styles.cellLow : styles.cellOn) : ''}`} />
              ))}
            </div>
            <p className={styles.needNote}>
              {energyTier}. Check-ins add 5, QA passes add 10, alerts take some away.
            </p>
          </article>

          <article className={styles.need}>
            <header className={styles.needHead}>
              <h2>Streak</h2>
              <span className={`${styles.needValue} ${styles.streakValue}`}>
                <span aria-hidden="true">🔥</span>
                {gameState.currentStreak}
                <small>{gameState.currentStreak === 1 ? 'day' : 'days'}</small>
              </span>
            </header>
            <ol className={styles.week} aria-label="Check-ins in the last 7 days">
              {week.map((d) => (
                <li key={d.key} className={`${styles.day} ${d.checkedIn ? styles.dayDone : ''} ${d.isToday ? styles.dayToday : ''}`}>
                  <span className={styles.dayDot} aria-hidden="true">
                    {d.checkedIn ? '✓' : ''}
                  </span>
                  <span className={styles.dayLabel}>{d.isToday ? 'Today' : d.label}</span>
                  <span className="sr-only">{d.checkedIn ? 'checked in' : 'no check-in'}</span>
                </li>
              ))}
            </ol>
            <p className={styles.needNote}>Best streak: {gameState.bestStreak} {gameState.bestStreak === 1 ? 'day' : 'days'}.</p>
          </article>

          <article className={styles.need}>
            <header className={styles.needHead}>
              <h2>Mood</h2>
              <span className={`${styles.moodChip} ${styles[`mood${mood}`]}`}>{mood}</span>
            </header>
            <p className={styles.moodGuide}>{MOOD_GUIDE[mood]}</p>
          </article>
        </section>

        <div className={styles.split}>
          <section className={styles.panel}>
            <h2 className={styles.panelTitle}>Today's care</h2>
            <ul className={styles.goals}>
              {goals.map((g) => (
                <li key={g.text} className={g.done ? styles.goalDone : ''}>
                  <span className={styles.goalCheck} aria-hidden="true">
                    {g.done ? '✓' : ''}
                  </span>
                  <span className={styles.goalText}>{g.text}</span>
                  <span className={styles.goalReward}>{g.reward}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className={styles.panel}>
            <h2 className={styles.panelTitle}>Evolution</h2>
            <EvolutionPath current={gameState.evolutionStage} mood={mood} />
            <p className={styles.panelNote}>
              {evolution
                ? `${agent.rockyName} evolves into ${evolution.stage} Rocky at level ${evolution.atLevel}.`
                : `${agent.rockyName} has reached the final form.`}
            </p>
          </section>
        </div>

        <section className={styles.panel}>
          <h2 className={styles.panelTitle}>{agent.rockyName}'s diary</h2>
          <ActivityFeed events={events} />
        </section>
      </div>

      {celebration && (
        <Celebration data={celebration} mood={mood} evolutionStage={gameState.evolutionStage} onClose={() => setCelebration(null)} />
      )}
    </div>
  )
}
