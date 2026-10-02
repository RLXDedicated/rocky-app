import { useCallback, useEffect, useState } from 'react'
import { focusApi, isBackendConfigured, type FocusStatus } from '../../services/apiClient'
import styles from './Focus.module.css'

const hhmm = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

/** Focus mode for me (and, for a leader, my team), refreshed every minute. */
export function useFocus() {
  const [status, setStatus] = useState<FocusStatus | null>(null)
  const reload = useCallback(() => {
    if (!isBackendConfigured()) return
    focusApi
      .status()
      .then(setStatus)
      .catch(() => {})
  }, [])
  useEffect(() => {
    reload()
    const t = window.setInterval(reload, 60_000)
    return () => window.clearInterval(t)
  }, [reload])
  // Ends on its own at "until" without waiting for the next poll.
  const now = Date.now()
  const active = (iso: string | null) => (iso && Date.parse(iso) > now ? iso : null)
  return {
    mine: active(status?.mine ?? null),
    team: active(status?.team ?? null),
    all: active(status?.all ?? null),
    leads: status?.leads ?? false,
    minutes: status?.minutes ?? [30, 60, 120],
    set: async (minutes: number, team?: string) => setStatus(await focusApi.set(minutes, team)),
    reload,
  }
}

/** "Focus mode is on until 3:30 PM": shown where the paused things are (Arcade, chat). */
export function FocusBanner({ until, what }: { until: string; what: string }) {
  return (
    <div className={styles.banner} role="status">
      <span aria-hidden="true">🎧</span>
      <p>
        <b>Focus mode until {hhmm(until)}.</b> Your leader paused {what} for a busy moment — Rocky will be right here when it ends.
      </p>
    </div>
  )
}

/** A leader's switch (or an admin's, for everyone): pause the Arcade and chat for a while. */
export function FocusControl({ focus, team, label }: { focus: ReturnType<typeof useFocus>; team?: string; label: string }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const until = team === 'all' ? focus.all : focus.team
  async function go(minutes: number) {
    setBusy(true)
    setError(null)
    try {
      await focus.set(minutes, team)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className={styles.control} aria-label="Focus mode">
      <div>
        <strong>🎧 Focus mode {until ? <span className={styles.on}>on until {hhmm(until)}</span> : null}</strong>
        <p>{label}</p>
      </div>
      <div className={styles.buttons}>
        {focus.minutes.map((m) => (
          <button key={m} type="button" disabled={busy} onClick={() => void go(m)}>
            {m < 60 ? `${m} min` : `${m / 60} h`}
          </button>
        ))}
        {until && (
          <button type="button" className={styles.end} disabled={busy} onClick={() => void go(0)}>
            End now
          </button>
        )}
      </div>
      {error && <p className={styles.error}>{error}</p>}
    </section>
  )
}
