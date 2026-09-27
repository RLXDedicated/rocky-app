import { EVOLUTION_LEVELS } from '../../engine/petProgress'
import { evolutionRank } from '../../engine/levels'
import type { EvolutionStage, Mood } from '../../types/domain'
import { RockyAvatar } from '../RockyAvatar'
import { EVOLUTION_STAGE_ORDER } from '../rockyVisuals'
import styles from './Pet.module.css'

interface EvolutionPathProps {
  current: EvolutionStage
  mood: Mood
}

/** Rocky's four forms. Forms not reached yet show as a silhouette, pet-game style. */
export function EvolutionPath({ current, mood }: EvolutionPathProps) {
  const rank = evolutionRank(current)
  return (
    <ol className={styles.path}>
      {EVOLUTION_STAGE_ORDER.map((stage, i) => {
        const reached = i <= rank
        const isCurrent = i === rank
        return (
          <li key={stage} className={`${styles.pathStep} ${reached ? styles.pathReached : ''} ${isCurrent ? styles.pathCurrent : ''}`}>
            <div className={`${styles.pathArt} ${reached ? '' : styles.silhouette}`}>
              <RockyAvatar mood={isCurrent ? mood : 'Happy'} evolutionStage={stage} size={72} bare />
            </div>
            <span className={styles.pathName}>{reached ? stage : '???'}</span>
            <span className={styles.pathLevel}>{isCurrent ? 'Now' : reached ? 'Unlocked' : `Level ${EVOLUTION_LEVELS[stage]}`}</span>
          </li>
        )
      })}
    </ol>
  )
}
