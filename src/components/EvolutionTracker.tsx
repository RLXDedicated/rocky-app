import { evolutionRank } from '../engine/levels'
import type { EvolutionStage } from '../types/domain'
import styles from './EvolutionTracker.module.css'
import { EVOLUTION_STAGE_ORDER, ROCKY_VISUALS } from './rockyVisuals'

interface EvolutionTrackerProps {
  currentStage: EvolutionStage
}

export function EvolutionTracker({ currentStage }: EvolutionTrackerProps) {
  const currentRank = evolutionRank(currentStage)

  return (
    <div className={styles.track}>
      {EVOLUTION_STAGE_ORDER.map((stage) => {
        const reached = evolutionRank(stage) <= currentRank
        return (
          <span key={stage} className={`${styles.item} ${reached ? styles.reached : ''}`}>
            <span className={styles.mark}>{reached ? '✓' : '○'}</span>
            {ROCKY_VISUALS[stage].label}
          </span>
        )
      })}
    </div>
  )
}
