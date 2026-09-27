import type { EvolutionStage, Mood } from '../types/domain'
import type { ReminderRecord } from '../types/reminder'
import styles from './RockyReminder.module.css'
import { RockyAvatar } from './RockyAvatar'

interface RockyReminderProps {
  reminder: ReminderRecord
  mood: Mood
  evolutionStage: EvolutionStage
  onDismiss: () => void
  /** Present only when the reminder is actionable (Documentation/Streak/Recovery). */
  onAction?: () => void
  actionLabel?: string
}

/**
 * Reusable, compact reminder card — a toast, not a blocking popup. Rocky's
 * mood/evolution here are the REAL current ones (Home's own source of
 * truth): a reminder only ever reflects Rocky's current state, it never
 * changes it. The one exception is a brief celebration bounce for
 * Celebration reminders, matching the same transient Home already uses for
 * Level Up / Achievement moments.
 */
export function RockyReminder({ reminder, mood, evolutionStage, onDismiss, onAction, actionLabel }: RockyReminderProps) {
  return (
    <div className={styles.toast} role="status">
      <button className={styles.closeCorner} onClick={onDismiss} aria-label="Dismiss reminder">
        ×
      </button>
      <div className={styles.avatarWrap}>
        {/* Always Rocky's real current state — a reminder never invents a
            mood or borrows a reaction it didn't actually just have. */}
        <RockyAvatar mood={mood} evolutionStage={evolutionStage} size={56} />
      </div>
      <div className={styles.body}>
        <span className={styles.categoryBadge}>{reminder.category}</span>
        <p className={styles.message}>{reminder.message}</p>
        <div className={styles.actions}>
          {onAction && (
            <button className={styles.actionButton} onClick={onAction}>
              {actionLabel ?? 'CHECK IN WITH ROCKY'}
            </button>
          )}
          <button className={styles.dismissButton} onClick={onDismiss}>
            Dismiss
          </button>
        </div>
      </div>
    </div>
  )
}
