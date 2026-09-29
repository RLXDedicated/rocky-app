import styles from './TitleBadge.module.css'

export type Title = 'qa' | 'leader' | null | undefined

/**
 * A small glowing pill next to a name: "QA" (blue) for quality analysts,
 * "LEAD" (teal) for team leaders.
 */
export function TitleBadge({ title, size = 'sm' }: { title: Title; size?: 'sm' | 'md' }) {
  if (title !== 'qa' && title !== 'leader') return null
  const label = title === 'qa' ? 'QA' : 'LEAD'
  const name = title === 'qa' ? 'Quality analyst' : 'Team leader'
  return (
    <span className={`${styles.badge} ${styles[title]} ${styles[size]}`} title={name} aria-label={name}>
      {label}
    </span>
  )
}

/** "DEV": the people who build Rocky (the Rocky admins) — a code chip with a blinking cursor. */
export function DevBadge({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  return (
    <span className={`${styles.badge} ${styles.dev} ${styles[size]}`} title="Rocky developer" aria-label="Rocky developer">
      <span className={styles.devCode} aria-hidden="true">
        {'</>'}
      </span>
      DEV
      <span className={styles.devCursor} aria-hidden="true" />
    </span>
  )
}

/** Everything that goes next to someone's name: their title, and DEV for the Rocky admins. */
export function NameBadges({ staff, title, size = 'sm' }: { staff?: boolean; title?: Title; size?: 'sm' | 'md' }) {
  if (!staff) return <TitleBadge title={title} size={size} />
  return (
    <span className={styles.group}>
      <TitleBadge title={title} size={size} />
      <DevBadge size={size} />
    </span>
  )
}
