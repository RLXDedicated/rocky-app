import { useEffect, useState } from 'react'
import { peopleApi, type TeamMember, type TeamSpirit } from '../services/apiClient'
import { useLiveEvent } from '../services/liveClient'
import { getRockyAsset } from './rockyVisuals'
import { RetryImg } from './assetRecovery'
import styles from './MyTeam.module.css'
import { FocusControl, useFocus } from './extras/Focus'

/** The backend's risk reasons are written for the (Spanish) admin console. */
function reasonEn(r: string): string {
  return r
    .replace('Nunca ha hecho check-in', 'Never checked in')
    .replace(/(\d+) días hábiles sin check-in/, '$1 working days without a check-in')
    .replace(/(\d+) alertas en (\d+) días/, '$1 alerts in $2 days')
    .replace('Energía <', 'Energy below')
}

function lastCheckIn(m: TeamMember): string {
  if (m.checkedInToday) return 'Checked in today'
  if (m.daysSinceCheckIn === null) return 'Never checked in'
  if (m.daysSinceCheckIn === 1) return 'Last check-in yesterday'
  return `Last check-in ${m.daysSinceCheckIn} days ago`
}

const SPIRIT: Record<TeamSpirit['mood'], { label: string; tone: string }> = {
  Happy: { label: 'Thriving', tone: 'good' },
  Motivated: { label: 'On track', tone: 'ok' },
  Worried: { label: 'Needs attention', tone: 'warn' },
  Recovery: { label: 'Needs a boost', tone: 'bad' },
}

/**
 * A team leader's view of her team: how the team is doing today (the
 * "team spirit" her own Rocky mirrors), and every member's Rocky, check-in,
 * streak and QA results. Leaders see only their own team, and never chats.
 */
export function MyTeam({ onVisit }: { onVisit?: (friendId: string) => void }) {
  const [data, setData] = useState<{ spirit: TeamSpirit | null; members: TeamMember[] } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const focus = useFocus()

  const load = () =>
    peopleApi
      .myTeam()
      .then((d) => {
        setData(d)
        setError(null)
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Your team could not be loaded.'))

  useEffect(() => {
    void load()
    const t = window.setInterval(() => void load(), 60_000)
    return () => window.clearInterval(t)
  }, [])
  // Refresh when someone comes online or goes offline.
  useLiveEvent((e) => {
    if (e.t === 'presence' && data?.members.some((m) => m.id === e.id)) void load()
  }, [data])

  const s = data?.spirit ?? null
  const tone = s ? SPIRIT[s.mood] : null
  return (
    <main className={styles.page}>
      <div className={styles.layout}>
        <header className={styles.head}>
          <div>
            <h1 className={styles.title}>My team</h1>
            <p className={styles.lede}>How your team is doing today. Your Rocky’s mood follows your team’s spirit — cheer them on!</p>
          </div>
        </header>
        {focus.leads && (
          <FocusControl
            focus={focus}
            label="Busy moment? Pause the Arcade and the chat for your team for a while. Check-ins, Note Check and Rocky stay on."
          />
        )}
        {error && <p className={styles.error}>{error}</p>}
        {!data && !error && <p className={styles.lede}>Loading your team…</p>}
        {data && data.members.length === 0 && (
          <p className={styles.empty}>No one is on your team yet. The QA team assigns teammates from the Admin console.</p>
        )}
        {s && tone && (
          <section className={styles.spirit} data-tone={tone.tone} aria-label="Team spirit">
            <div className={styles.gauge} style={{ ['--p' as string]: `${s.score}%` }}>
              <b>{s.score}%</b>
              <small>team spirit</small>
            </div>
            <div className={styles.spiritText}>
              <strong>{tone.label}</strong>
              <ul>
                <li>
                  <b>
                    {s.checkedIn}/{s.total}
                  </b>{' '}
                  checked in today
                </li>
                <li>
                  <b>{s.qaRate === null ? '—' : `${s.qaRate}%`}</b> QA pass rate
                </li>
                <li>
                  <b>{s.atRisk}</b> need{s.atRisk === 1 ? 's' : ''} attention
                </li>
              </ul>
              <small>Spirit = 40% today’s check-ins + 35% QA pass rate + 25% teammates not at risk.</small>
            </div>
          </section>
        )}
        {data && data.members.length > 0 && (
          <ul className={styles.grid}>
            {data.members.map((m) => (
              <li key={m.id} className={styles.card} data-risk={m.atRisk || undefined}>
                <span className={styles.avatar}>
                  <RetryImg src={getRockyAsset(m.stage, m.mood)} alt="" />
                  {m.online && <i className={styles.dot} aria-label="online" />}
                </span>
                <div className={styles.info}>
                  <strong>{m.name}</strong>
                  <span>
                    {m.rockyName} · Level {m.level} {m.stage}
                  </span>
                  <span className={m.checkedInToday ? styles.ok : styles.warn}>
                    {m.checkedInToday ? '✓ ' : ''}
                    {lastCheckIn(m)}
                  </span>
                  <span className={styles.stats}>
                    🔥 {m.streak} <small>(best {m.bestStreak})</small> · ✅ {m.qaPasses} QA pass · ⚠️ {m.alerts} alert{m.alerts === 1 ? '' : 's'}
                  </span>
                  {m.atRisk && <span className={styles.risk}>Needs attention: {m.riskReasons.map(reasonEn).join(' · ')}</span>}
                </div>
                {onVisit && (
                  <button type="button" className={styles.visit} onClick={() => onVisit(m.id)}>
                    {m.online ? 'Visit live' : 'Visit'}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  )
}
