import { useEffect, useState } from 'react'
import { ACHIEVEMENT_CATALOG } from '../engine/gameEngine'
import type { AchievementDef } from '../engine/achievements'
import { gameService, type AchievementProgress } from '../services/gameService'
import styles from './Achievements.module.css'
import { LoadingRocky } from './LoadingRocky'
import { RockyAvatar } from './RockyAvatar'

const METRIC_UNIT: Record<string, [string, string]> = {
  checkins: ['check-in', 'check-ins'],
  qaPasses: ['QA pass', 'QA passes'],
  streak: ['day streak', 'day streak'],
}

// Medal glyphs per metric — what the badge is about, at a glance.
const GLYPH: Record<string, string> = {
  checkins: 'M7 12.5l3.2 3.2L17 9', // check mark
  qaPasses: 'M9 4h6v3H9zM7 6H5v14h14V6h-2M8.5 13l2.5 2.5 4.5-4.5', // clipboard
  streak: 'M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3 0-3-1-5 1-8.5z', // flame
}

function tierFor(def: AchievementDef): 'bronze' | 'silver' | 'gold' {
  if (def.metric === 'streak') return def.target >= 30 ? 'gold' : def.target >= 14 ? 'silver' : 'bronze'
  return def.target >= 10 ? 'silver' : 'bronze'
}

function Medal({ def, fraction, unlocked }: { def: AchievementDef; fraction: number; unlocked: boolean }) {
  const size = 92
  const stroke = 6
  const r = size / 2 - stroke
  const c = 2 * Math.PI * r
  return (
    <div className={`${styles.medal} ${styles[tierFor(def)]} ${unlocked ? styles.medalOn : ''}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} className={styles.medalTrack} strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          className={styles.medalFill}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - fraction)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <span className={styles.medalFace}>
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d={GLYPH[def.metric]} />
        </svg>
      </span>
    </div>
  )
}

export function Achievements() {
  const [progress, setProgress] = useState<AchievementProgress | null>(null)
  const [snapshot] = useState(() => gameService.getSnapshot())

  useEffect(() => {
    setProgress(gameService.getAchievementProgress())
  }, [])

  if (!progress) return <LoadingRocky />

  const total = ACHIEVEMENT_CATALOG.length
  const count = progress.unlocked.length
  const { gameState, agent } = snapshot

  return (
    <div className={styles.page}>
      <div className={styles.layout}>
        <header className={styles.hero}>
          <RockyAvatar mood={gameState.mood} evolutionStage={gameState.evolutionStage} size={120} bare />
          <div className={styles.heroText}>
            <h1 className={styles.title}>{agent.rockyName}'s badges</h1>
            <p className={styles.subtitle}>
              {count === 0
                ? 'No badges yet. Your first check-in earns one.'
                : count === total
                  ? 'Every badge collected. A true Elite habit.'
                  : `${count} of ${total} collected. Keep checking in to fill the shelf.`}
            </p>
            <div className={styles.shelfBar} role="meter" aria-valuemin={0} aria-valuemax={total} aria-valuenow={count} aria-label="Badges collected">
              {ACHIEVEMENT_CATALOG.map((def) => (
                <span key={def.id} className={progress.unlocked.some((a) => a.id === def.id) ? styles.shelfOn : ''} />
              ))}
            </div>
          </div>
        </header>

        <div className={styles.grid}>
          {ACHIEVEMENT_CATALOG.map((def) => {
            const unlocked = progress.unlocked.find((a) => a.id === def.id)
            const current = Math.min(progress.metrics[def.metric], def.target)
            const fraction = unlocked ? 1 : current / def.target
            const [one, many] = METRIC_UNIT[def.metric]!
            return (
              <article key={def.id} className={`${styles.card} ${unlocked ? styles.unlocked : styles.locked}`}>
                <Medal def={def} fraction={fraction} unlocked={Boolean(unlocked)} />
                <h2 className={styles.name}>{def.name}</h2>
                <p className={styles.description}>{def.description}</p>
                <div className={styles.footer}>
                  {unlocked ? (
                    <span className={styles.earned}>Earned {new Date(unlocked.unlockedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                  ) : (
                    <span className={styles.count}>
                      {current} / {def.target} {def.target === 1 ? one : many}
                    </span>
                  )}
                  <span className={styles.reward}>{def.rewardXp > 0 ? `+${def.rewardXp} XP` : 'Badge'}</span>
                </div>
              </article>
            )
          })}
        </div>
      </div>
    </div>
  )
}
