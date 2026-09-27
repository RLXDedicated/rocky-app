import { useEffect, useRef, useState } from 'react'
import { calculateMood } from '../engine/gameEngine'
import { gameService } from '../services/gameService'
import { performCheckIn } from '../services/checkInAction'
import {
  checkForReminder,
  markReminderActed,
  markReminderDismissed,
  markReminderOpened,
  REMINDER_DEV_EVENT,
} from '../services/reminderService'
import type { GameState } from '../types/domain'
import type { ReminderRecord } from '../types/reminder'
import { RockyReminder } from './RockyReminder'

const POLL_INTERVAL_MS = 60_000

/**
 * Mounted once, globally (App.tsx) — Rocky can nudge the user from any
 * screen, the way a real ambient companion would, without every page
 * re-implementing the polling logic. Purely a presentation + polling
 * concern: all the actual rules live in reminderEngine/reminderService.
 */
export function ReminderHost() {
  const [active, setActive] = useState<ReminderRecord | null>(null)
  const [gameState, setGameState] = useState<GameState | null>(null)
  // See Leaderboard.tsx / TeamPage.tsx for the same rationale: guard the
  // very first check so React 18 StrictMode's dev-only double effect
  // invocation can't send two reminders for one real mount. (In practice the
  // 90-minute cooldown would also self-suppress the second call, but this
  // guard makes it correct on purpose rather than by coincidence.)
  const hasCheckedRef = useRef(false)

  useEffect(() => {
    function poll() {
      const record = checkForReminder()
      if (!record) return
      markReminderOpened(record.id)
      setActive(record)
      setGameState(gameService.getSnapshot().gameState)
    }

    if (!hasCheckedRef.current) {
      hasCheckedRef.current = true
      poll()
    }

    const interval = window.setInterval(poll, POLL_INTERVAL_MS)

    function onDevReminder(e: Event) {
      const record = (e as CustomEvent<ReminderRecord>).detail
      markReminderOpened(record.id)
      setActive(record)
      setGameState(gameService.getSnapshot().gameState)
    }
    window.addEventListener(REMINDER_DEV_EVENT, onDevReminder)

    return () => {
      window.clearInterval(interval)
      window.removeEventListener(REMINDER_DEV_EVENT, onDevReminder)
    }
  }, [])

  if (!active || !gameState) return null

  function handleDismiss() {
    if (!active) return
    markReminderDismissed(active.id)
    setActive(null)
  }

  function handleAction() {
    if (!active) return
    // The reminder never grants anything itself — it calls the exact same
    // check-in path Home uses (local engine, or the backend in remote mode),
    // which is the only place XP/Energy/Streak ever change (Phase 7 §11,
    // §25). Fire-and-forget here: the reminder card closes immediately,
    // same as before; a failure is logged rather than surfaced, since this
    // ambient nudge has no error UI of its own.
    performCheckIn().catch((err) => console.error('Check-in from reminder failed:', err))
    markReminderActed(active.id)
    setActive(null)
  }

  const mood = calculateMood(gameState)

  return (
    <RockyReminder
      reminder={active}
      mood={mood}
      evolutionStage={gameState.evolutionStage}
      onDismiss={handleDismiss}
      onAction={active.actionable ? handleAction : undefined}
    />
  )
}
