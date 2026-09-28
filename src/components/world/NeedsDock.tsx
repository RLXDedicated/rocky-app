import type { ReactNode } from 'react'
import { NEEDS_RATES, type Needs } from '../../game/pet'
import styles from './World.module.css'

interface Props {
  needs: Needs
  treats: number
  busy: boolean
  onPet: () => void
  onFeed: () => void
  onPlay: () => void
  onBath: () => void
}

const ICON = {
  health: <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />,
  happiness: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M8.5 13.5a4 4 0 0 0 7 0M9.5 9.5h.01M14.5 9.5h.01" />
    </>
  ),
  clean: <path d="M12 3.5s-5.5 6-5.5 10a5.5 5.5 0 0 0 11 0c0-4-5.5-10-5.5-10z" />,
  pet: (
    <path d="M8 13V6.5a1.5 1.5 0 0 1 3 0V12m0-6.5V5a1.5 1.5 0 0 1 3 0v7m0-5.5a1.5 1.5 0 0 1 3 0V14a6 6 0 0 1-6 6h-.5a6 6 0 0 1-4.9-2.6L4.4 14.9a1.5 1.5 0 0 1 2.4-1.8L8 14.5" />
  ),
  treat: (
    <>
      <path d="M12 7c-2-1.8-6-1.4-6.6 2.6C4.8 13.8 7.5 20 10 20c.9 0 1.2-.5 2-.5s1.1.5 2 .5c2.5 0 5.2-6.2 4.6-10.4C18 5.6 14 5.2 12 7z" />
      <path d="M12 7c0-1.8.8-3 2.4-3.6" />
    </>
  ),
  play: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8.2l3.2 2.3-1.2 3.8h-4l-1.2-3.8zM12 4v4.2M20 10.5l-4.8 0M16.8 18.5l-2.8-4.2M7.2 18.5l2.8-4.2M4 10.5l4.8 0" />
    </>
  ),
  bath: (
    <>
      <path d="M4 12h16v2a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z" />
      <path d="M6 12V6a2 2 0 0 1 3.8-.8M7 19l-1 2M17 19l1 2" />
      <circle cx="14" cy="7" r="1.2" />
      <circle cx="17" cy="9" r="0.9" />
    </>
  ),
}

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

function level(value: number): 'good' | 'mid' | 'low' {
  return value >= 60 ? 'good' : value >= 30 ? 'mid' : 'low'
}

/** Rocky's needs at a glance, plus the four ways to care for him. */
export function NeedsDock({ needs, treats, busy, onPet, onFeed, onPlay, onBath }: Props) {
  const clean = Math.round(100 - needs.dirt)
  const meters = [
    { key: 'health', label: 'Health', value: Math.round(needs.health), icon: ICON.health },
    { key: 'happiness', label: 'Happiness', value: Math.round(needs.happiness), icon: ICON.happiness },
    { key: 'clean', label: 'Clean', value: clean, icon: ICON.clean },
  ] as const
  const dirty = needs.dirt >= NEEDS_RATES.dirtyThreshold

  return (
    <div className={styles.care}>
      <ul className={styles.meters} aria-label="Rocky's needs">
        {meters.map((m) => (
          <li key={m.key} className={styles.meter} data-level={level(m.value)} data-need={m.key}>
            <Icon>{m.icon}</Icon>
            <span className={styles.meterBody}>
              <span className={styles.meterLabel}>
                {m.label}
                <b>{m.value}</b>
              </span>
              <span className={styles.meterTrack} role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={m.value} aria-label={m.label}>
                <span style={{ width: `${m.value}%` }} />
              </span>
            </span>
          </li>
        ))}
      </ul>
      <div className={styles.careButtons}>
        <button type="button" className={styles.careBtn} onClick={onPet} disabled={busy}>
          <Icon>{ICON.pet}</Icon> Pet
        </button>
        <button type="button" className={styles.careBtn} onClick={onFeed} disabled={busy} aria-label={`Give a treat (${treats} left)`}>
          <Icon>{ICON.treat}</Icon> Treat <b className={styles.count}>{treats}</b>
        </button>
        <button type="button" className={styles.careBtn} onClick={onPlay} disabled={busy}>
          <Icon>{ICON.play}</Icon> Play
        </button>
        <button type="button" className={`${styles.careBtn} ${dirty ? styles.careBtnNudge : ''}`} onClick={onBath} disabled={busy}>
          <Icon>{ICON.bath}</Icon> Bath
        </button>
      </div>
    </div>
  )
}
