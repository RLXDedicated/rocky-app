import { useMemo } from 'react'
import { energyLabel } from '../engine/energyLabel'
import { calculateMood } from '../engine/gameEngine'
import { checkInWeek, nextEvolution, nextStreakMilestone } from '../engine/petProgress'
import { COIN_RATES, coinsEarned } from '../game/economy'
import { buildProgressFacts } from '../game/progressFacts'
import { gameService } from '../services/gameService'
import type { Mood } from '../types/domain'
import { ActivityFeed } from './ActivityFeed'
import { EvolutionPath } from './pet/EvolutionPath'
import styles from './Progress.module.css'

function isToday(dateKey: string | null): boolean {
  if (!dateKey) return false
  const t = new Date()
  return dateKey === `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
}

// What each mood means in game terms. Rocky is calm by default; he only
// worries for a concrete reason, and the guide says what fixes it.
const MOOD_GUIDE: Record<Mood, string> = {
  Happy: 'Energy 70+ and a 7-day streak. Rocky is at their best.',
  Motivated: "Rocky's everyday mood: calm and ready. A 7-day streak with energy 70+ makes Rocky Happy.",
  Worried: 'Something needs attention: low energy or a QA alert without a check-in since. One check-in cheers Rocky up.',
  Recovery: 'Bouncing back after an alert. One more good day seals it.',
}

const ENERGY_CELLS = 10

/** Rocky's stats, goals, evolution, coin guide and diary — everything off the main pet screen. */
export function Progress() {
  const snapshot = useMemo(() => gameService.getSnapshot(), [])
  const { agent, gameState: state, events } = snapshot
  const mood = calculateMood(state)
  const week = checkInWeek(events)
  const recent = useMemo(() => gameService.getRecentEvents(10), [])
  const earned = coinsEarned(buildProgressFacts(state))
  const checkedIn = isToday(state.lastCheckInDate)
  const milestone = nextStreakMilestone(state.currentStreak)
  const evolution = nextEvolution(state.evolutionStage, state.xp)
  const litCells = Math.round((state.energy / 100) * ENERGY_CELLS)

  const goals = [
    { done: checkedIn, text: 'Check in with Rocky today', reward: checkedIn ? 'Done' : `+10 XP · +${COIN_RATES.checkIn} coins` },
    { done: state.energy >= 40, text: 'Keep energy at 40 or more', reward: `${state.energy} now` },
    milestone
      ? { done: false, text: `Reach a ${milestone.days}-day streak`, reward: `${milestone.daysToGo} to go · +${milestone.xp} XP` }
      : { done: true, text: 'Every streak milestone reached', reward: 'Legend' },
    evolution
      ? { done: false, text: `Evolve into ${evolution.stage} Rocky`, reward: `${evolution.xpToGo.toLocaleString()} XP to go` }
      : { done: true, text: 'Elite Rocky unlocked', reward: 'Max form' },
  ]

  const coinWays = [
    { what: 'Daily check-in', coins: COIN_RATES.checkIn },
    { what: 'Clean QA audit', coins: COIN_RATES.qaPass },
    { what: 'New badge', coins: COIN_RATES.badge },
    { what: 'Each level up', coins: COIN_RATES.level },
    { what: 'Each full week of streak', coins: COIN_RATES.streakWeek },
  ]

  return (
    <div className={styles.page}>
      <div className={styles.layout}>
        <header>
          <h1 className={styles.title}>{agent.rockyName}'s progress</h1>
          <p className={styles.lede}>How Rocky is doing, what's next, and how to earn coins for the shop.</p>
        </header>

        <section className={styles.needs} aria-label="Rocky's needs">
          <article className={styles.need}>
            <header className={styles.needHead}>
              <h2>Energy</h2>
              <span className={styles.needValue}>
                {state.energy}
                <small>/100</small>
              </span>
            </header>
            <div className={styles.cells} role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={state.energy} aria-label="Energy">
              {Array.from({ length: ENERGY_CELLS }, (_, i) => (
                <span key={i} className={`${styles.cell} ${i < litCells ? (state.energy < 40 ? styles.cellLow : styles.cellOn) : ''}`} />
              ))}
            </div>
            <p className={styles.needNote}>{energyLabel(state.energy)}. Check-ins add 5, QA passes add 10, alerts take some away.</p>
          </article>

          <article className={styles.need}>
            <header className={styles.needHead}>
              <h2>Streak</h2>
              <span className={`${styles.needValue} ${styles.streakValue}`}>
                <span aria-hidden="true">🔥</span>
                {state.currentStreak}
                <small>{state.currentStreak === 1 ? 'day' : 'days'}</small>
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
            <p className={styles.needNote}>
              Best streak: {state.bestStreak} {state.bestStreak === 1 ? 'day' : 'days'}.
            </p>
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
            <h2 className={styles.panelTitle}>Today's goals</h2>
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
            <EvolutionPath current={state.evolutionStage} mood={mood} />
            <p className={styles.panelNote}>
              {evolution
                ? `${agent.rockyName} evolves into ${evolution.stage} Rocky at level ${evolution.atLevel}.`
                : `${agent.rockyName} has reached the final form.`}
            </p>
          </section>
        </div>

        <div className={styles.split}>
          <section className={styles.panel}>
            <h2 className={styles.panelTitle}>Earning coins</h2>
            <ul className={styles.goals}>
              {coinWays.map((w) => (
                <li key={w.what}>
                  <span className={styles.coinDot} aria-hidden="true" />
                  <span className={styles.goalText}>{w.what}</span>
                  <span className={styles.goalReward}>+{w.coins}</span>
                </li>
              ))}
            </ul>
            <p className={styles.panelNote}>
              {earned.toLocaleString()} coins earned so far. Spend them in Rocky's shop — coins never change XP, energy or streaks.
            </p>
          </section>

          <section className={styles.panel}>
            <h2 className={styles.panelTitle}>{agent.rockyName}'s diary</h2>
            <ActivityFeed events={recent} />
          </section>
        </div>
      </div>
    </div>
  )
}
