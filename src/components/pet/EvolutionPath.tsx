import { EVOLUTION_LEVELS } from '../../engine/petProgress'
import { evolutionRank } from '../../engine/levels'
import { rankName } from '../../engine/ranks'
import type { EvolutionStage, Mood } from '../../types/domain'
import { EVOLUTION_STAGE_ORDER } from '../rockyVisuals'
import styles from './Pet.module.css'

interface EvolutionPathProps {
  current: EvolutionStage
  /** Kept for callers; ranks don't change how Rocky looks. */
  mood?: Mood
}

const MEDAL: Record<EvolutionStage, string> = { Baby: '🥉', Young: '🥈', Advanced: '🥇', Elite: '🏆' }

/** The agent's four ranks (Rocky's look never changes — one official Rocky). */
export function EvolutionPath({ current }: EvolutionPathProps) {
  const rank = evolutionRank(current)
  return (
    <ol className={styles.path}>
      {EVOLUTION_STAGE_ORDER.map((stage, i) => {
        const reached = i <= rank
        const isCurrent = i === rank
        return (
          <li key={stage} className={`${styles.pathStep} ${reached ? styles.pathReached : ''} ${isCurrent ? styles.pathCurrent : ''}`}>
            <div className={`${styles.pathArt} ${reached ? '' : styles.silhouette}`} aria-hidden="true" style={{ display: 'grid', placeItems: 'center', fontSize: 40, height: 72 }}>
              {MEDAL[stage]}
            </div>
            <span className={styles.pathName}>{rankName(stage)}</span>
            <span className={styles.pathLevel}>{isCurrent ? 'Now' : reached ? 'Unlocked' : `Level ${EVOLUTION_LEVELS[stage]}`}</span>
          </li>
        )
      })}
    </ol>
  )
}
