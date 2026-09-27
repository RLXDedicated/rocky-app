import { useEffect } from 'react'
import { RockyAvatar } from '../RockyAvatar'
import type { RockyReactionKey } from '../rockyVisuals'
import type { EvolutionStage, Mood } from '../../types/domain'
import styles from './Pet.module.css'

export interface CelebrationData {
  kind: 'level-up' | 'evolution' | 'achievement'
  title: string
  body: string
  xpGained?: number
}

interface Props {
  data: CelebrationData
  mood: Mood
  evolutionStage: EvolutionStage
  onClose: () => void
}

const REACTION: Record<CelebrationData['kind'], RockyReactionKey> = {
  'level-up': 'level-up',
  evolution: 'evolution',
  achievement: 'qa-pass',
}

/** The one big moment: a level up, an evolution or a new badge. */
export function Celebration({ data, mood, evolutionStage, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className={styles.celebrateBackdrop} role="dialog" aria-modal="true" aria-labelledby="celebrate-title" onClick={onClose}>
      <div className={`${styles.celebrate} ${styles[`celebrate-${data.kind}`] ?? ''}`} onClick={(e) => e.stopPropagation()}>
        <div className={styles.confetti} aria-hidden="true">
          {Array.from({ length: 14 }, (_, i) => (
            <span key={i} style={{ ['--i' as string]: i }} />
          ))}
        </div>
        <RockyAvatar mood={mood} evolutionStage={evolutionStage} reaction={REACTION[data.kind]} size={200} bare />
        <h2 id="celebrate-title" className={styles.celebrateTitle}>
          {data.title}
        </h2>
        <p className={styles.celebrateBody}>{data.body}</p>
        <button className={styles.celebrateButton} onClick={onClose} autoFocus>
          Keep going
        </button>
      </div>
    </div>
  )
}
