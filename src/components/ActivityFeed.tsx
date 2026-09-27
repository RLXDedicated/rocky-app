import { labelForEvent } from '../engine/eventLabels'
import type { GameEvent } from '../types/domain'
import styles from './ActivityFeed.module.css'

interface ActivityFeedProps {
  events: GameEvent[]
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function ActivityFeed({ events }: ActivityFeedProps) {
  if (events.length === 0) {
    return <p className={styles.empty}>Your Rocky journey starts here.</p>
  }

  return (
    <ul className={styles.list}>
      {events.map((event) => (
        <li key={event.id} className={styles.item}>
          <span>{labelForEvent(event)}</span>
          <span className={styles.time}>{formatTime(event.timestamp)}</span>
        </li>
      ))}
    </ul>
  )
}
