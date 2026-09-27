import type { ReactNode } from 'react'
import styles from './Pet.module.css'

interface XpRingProps {
  /** 0..1 progress through the current level. */
  fraction: number
  size: number
  children: ReactNode
  label: string
}

/** A circular XP meter that wraps Rocky: the ring fills as the level fills. */
export function XpRing({ fraction, size, children, label }: XpRingProps) {
  const stroke = 10
  const r = size / 2 - stroke
  const c = 2 * Math.PI * r
  const clamped = Math.max(0, Math.min(1, fraction))
  return (
    <div className={styles.ring} style={{ width: size, height: size }}>
      <svg width={size} height={size} role="img" aria-label={label} className={styles.ringSvg}>
        <circle cx={size / 2} cy={size / 2} r={r} className={styles.ringTrack} strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          className={styles.ringFill}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - clamped)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className={styles.ringInner}>{children}</div>
    </div>
  )
}
