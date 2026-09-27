import { useEffect, useState } from 'react'
import { ACHIEVEMENT_CATALOG } from '../engine/gameEngine'
import { gameService, type AchievementProgress } from '../services/gameService'
import styles from './Achievements.module.css'
import { LoadingRocky } from './LoadingRocky'

const METRIC_LABEL: Record<string, string> = {
  checkins: 'Check-ins',
  qaPasses: 'QA Passes',
  streak: 'day streak',
}

export function Achievements() {
  const [progress, setProgress] = useState<AchievementProgress | null>(null)

  useEffect(() => {
    setProgress(gameService.getAchievementProgress())
  }, [])

  if (!progress) return <LoadingRocky />

  return (
    <div className={styles.page}>
      <div className={styles.layout}>
        <div>
          <h1 className={styles.title}>Achievements</h1>
          <p className={styles.subtitle}>
            {progress.unlocked.length} / {ACHIEVEMENT_CATALOG.length} unlocked
          </p>
        </div>

        <div className={styles.grid}>
          {ACHIEVEMENT_CATALOG.map((def) => {
            const unlocked = progress.unlocked.find((a) => a.id === def.id)
            const current = progress.metrics[def.metric]
            const percent = Math.min(100, Math.round((current / def.target) * 100))

            return (
              <div key={def.id} className={`${styles.card} ${unlocked ? styles.unlocked : styles.locked}`}>
                <div className={styles.cardHeader}>
                  <div className={`${styles.badge} ${unlocked ? styles.badgeUnlocked : styles.badgeLocked}`}>
                    {unlocked ? '🏅' : '🔒'}
                  </div>
                  <div>
                    <p className={styles.name}>{def.name}</p>
                    {unlocked && (
                      <span className={styles.unlockedDate}>
                        Unlocked {new Date(unlocked.unlockedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <p className={styles.description}>{def.description}</p>
                {!unlocked && (
                  <>
                    <div className={styles.progressTrack}>
                      <div className={styles.progressFill} style={{ width: `${percent}%` }} />
                    </div>
                    <span className={styles.progressLabel}>
                      {Math.min(current, def.target)} / {def.target} {METRIC_LABEL[def.metric]}
                    </span>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
