import { useEffect, useState } from 'react'
import { setQaModeEnabled } from '../services/appModeService'
import { gameService } from '../services/gameService'
import { resetLeaderboardTracking } from '../services/leaderboardService'
import { resetOnboarding } from '../services/onboardingService'
import {
  devTriggerReminder,
  getReminderHistory,
  isForcingWorkingHours,
  resetReminderHistory,
  setForceWorkingHours,
} from '../services/reminderService'
import { resetTeamTracking } from '../services/teamService'
import type { GameState } from '../types/domain'
import type { ReminderCategory, ReminderRecord } from '../types/reminder'
import styles from './DevControls.module.css'

const REMINDER_CATEGORIES: ReminderCategory[] = ['Documentation', 'Streak', 'Progress', 'Celebration', 'Recovery']

// Developer Controls — exclusively for development/testing. Level/Evolution
// triggers landed in Phase 4; Reminder triggers in Phase 7. The full menu
// (Reset Rocky, Demo Scenarios, etc.) arrives in Phase 10. Never rendered in
// a production build (gated by import.meta.env.DEV where this is mounted).
export function DevControls() {
  const [state, setState] = useState<GameState | null>(null)
  const [reminderHistory, setReminderHistory] = useState<ReminderRecord[]>([])
  const [forcingHours, setForcingHours] = useState(false)

  useEffect(() => {
    setState(gameService.getSnapshot().gameState)
    setReminderHistory(getReminderHistory())
    setForcingHours(isForcingWorkingHours())
  }, [])

  if (!state) return null

  function triggerLevel(level: number) {
    const result = gameService.devTriggerLevel(level)
    setState(result.state)
  }

  function triggerEvolution() {
    const result = gameService.devTriggerNextEvolution()
    setState(result.state)
  }

  function triggerReminder(category: ReminderCategory) {
    devTriggerReminder(category)
    setReminderHistory(getReminderHistory())
    // A dev-triggered reminder is stored immediately; ReminderHost's own
    // polling interval (up to 60s) will pick it up and display it. For an
    // instant preview, reload isn't needed — the next poll tick shows it.
  }

  function resetReminders() {
    resetReminderHistory()
    setReminderHistory([])
  }

  function toggleWorkingHours() {
    const next = !forcingHours
    setForceWorkingHours(next)
    setForcingHours(next)
  }

  /** Restarts the gameplay demo from a known-clean state, keeping the agent's chosen name and QA Mode setting. */
  function resetDemo() {
    gameService.resetProgress(true)
    resetReminderHistory()
    resetLeaderboardTracking()
    resetTeamTracking()
    setState(gameService.getSnapshot().gameState)
    setReminderHistory([])
  }

  /** The nuclear option — wipes everything, including the agent's name and onboarding, back to a brand-new install. */
  function resetAllData() {
    if (!window.confirm('Reset ALL data, including Rocky\'s name and the first-time intro? This cannot be undone.')) return
    gameService.resetProgress(false)
    resetReminderHistory()
    resetLeaderboardTracking()
    resetTeamTracking()
    resetOnboarding()
    // A true first-run has QA Mode off and no dev-only overrides active —
    // "Reset All Data" should leave nothing dev-flavored behind either.
    setQaModeEnabled(false)
    setForceWorkingHours(false)
    window.location.reload()
  }

  return (
    <div className={styles.page}>
      <div className={styles.layout}>
        <div>
          <h1 className={styles.title}>Developer Controls</h1>
          <p className={styles.notice}>Development/testing only — never shown in a production build.</p>
        </div>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Level &amp; Evolution</h2>
          <div className={styles.buttonRow}>
            <button className={styles.devButton} onClick={() => triggerLevel(2)}>
              Trigger Level 2
            </button>
            <button className={styles.devButton} onClick={() => triggerLevel(5)}>
              Trigger Level 5
            </button>
            <button className={styles.devButton} onClick={() => triggerLevel(10)}>
              Trigger Level 10
            </button>
            <button className={styles.devButton} onClick={() => triggerLevel(20)}>
              Trigger Level 20
            </button>
            <button className={styles.devButton} onClick={triggerEvolution}>
              Trigger Evolution
            </button>
          </div>
          <p className={styles.state}>
            XP: {state.xp} · Level: {state.level} · Stage: {state.evolutionStage}
          </p>
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Reminders</h2>
          <div className={styles.buttonRow}>
            {REMINDER_CATEGORIES.map((category) => (
              <button key={category} className={styles.devButton} onClick={() => triggerReminder(category)}>
                Trigger {category} Reminder
              </button>
            ))}
            <button className={styles.devButton} onClick={resetReminders}>
              Reset Reminder History
            </button>
            <button className={styles.devButton} onClick={toggleWorkingHours}>
              {forcingHours ? '✓ ' : ''}Simulate Working Hours
            </button>
          </div>
          <p className={styles.state}>
            {forcingHours ? 'Working-hours check bypassed — reminders can fire any time. ' : ''}
            {reminderHistory.length} reminder{reminderHistory.length === 1 ? '' : 's'} in history.
          </p>
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Demo</h2>
          <div className={styles.buttonRow}>
            <button className={styles.devButton} onClick={resetDemo}>
              Reset Demo
            </button>
            <button className={styles.devButton} onClick={resetAllData}>
              Reset All Data
            </button>
          </div>
          <p className={styles.state}>
            Reset Demo clears progress but keeps Rocky's name and QA Mode. Reset All Data starts over completely,
            including the first-time intro.
          </p>
        </section>
      </div>
    </div>
  )
}
