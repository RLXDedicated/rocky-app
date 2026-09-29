import styles from './TitleBadge.module.css'
import { VipBadge } from './VipBadge'

export type Title = 'qa' | 'leader' | null | undefined

/**
 * A small glowing pill next to a name: "QA" (blue) for quality analysts,
 * "LEAD" (teal) for team leaders. Rocky admins get the crown instead.
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

/** Everything that goes next to someone's name: the admin crown, or their title. */
export function NameBadges({ staff, title, size = 'sm' }: { staff?: boolean; title?: Title; size?: 'sm' | 'md' }) {
  if (staff) return <VipBadge size={size} />
  return <TitleBadge title={title} size={size} />
}
