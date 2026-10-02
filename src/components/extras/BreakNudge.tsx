import { useEffect, useState } from 'react'
import { todayKey } from '../../engine/dateUtils'
import styles from './Focus.module.css'

const KEY = 'rocky.usage.today'
const GOAL_MINUTES = 5

/**
 * Rocky is a 3–5 minute break: after 5 minutes in front today, Rocky says so
 * once (a friendly nudge back to work — nothing is blocked).
 */
export function BreakNudge() {
  const [show, setShow] = useState(false)
  useEffect(() => {
    const t = window.setInterval(() => {
      if (document.visibilityState !== 'visible' || !document.hasFocus()) return
      try {
        const today = todayKey()
        const raw = JSON.parse(window.localStorage.getItem(KEY) ?? 'null') as { date: string; minutes: number; nudged: boolean } | null
        const u = raw && raw.date === today ? raw : { date: today, minutes: 0, nudged: false }
        u.minutes += 1
        if (u.minutes >= GOAL_MINUTES && !u.nudged) {
          u.nudged = true
          setShow(true)
        }
        window.localStorage.setItem(KEY, JSON.stringify(u))
      } catch {
        /* storage blocked: no nudge */
      }
    }, 60_000)
    return () => window.clearInterval(t)
  }, [])
  if (!show) return null
  return (
    <div className={styles.nudge} role="status">
      <span aria-hidden="true">🐂</span>
      <p>
        <b>That’s a great Rocky break!</b> You’ve spent {GOAL_MINUTES} minutes with Rocky today — time to get back to great notes. He’ll be right here later.
      </p>
      <button type="button" onClick={() => setShow(false)}>
        Got it
      </button>
    </div>
  )
}
