import type { EvolutionStage, Mood } from '../types/domain'
import styles from './RockyAvatar.module.css'
import { getReactionAsset, getRockyAsset, ROCKY_VISUALS, type RockyReactionKey } from './rockyVisuals'

interface RockyAvatarProps {
  mood: Mood
  evolutionStage: EvolutionStage
  size?: number
  /**
   * A brief, transient reaction (Check-in / QA Pass / Alert / Level Up /
   * Evolution / Recovery) shown INSTEAD of the persistent mood/evolution
   * illustration. RockyAvatar has no timers of its own — the caller already
   * owns the moment's duration (existing setTimeout patterns in Home /
   * QASimulator) and clears this back to `null`/`undefined` when it ends,
   * at which point Rocky reverts to `getRockyAsset(evolutionStage, mood)`.
   */
  reaction?: RockyReactionKey | null
}

// Approved Rocky 2.5D artwork — resolved via rockyVisuals.ts's
// getRockyAsset()/getReactionAsset(), the single place that knows about
// concrete image paths. This component only ever asks for
// "Rocky = evolutionStage + mood" (or a named reaction); it never
// hardcodes a path itself.
export function RockyAvatar({ mood, evolutionStage, size = 220, reaction }: RockyAvatarProps) {
  const src = reaction ? getReactionAsset(reaction) : getRockyAsset(evolutionStage, mood)
  const label = reaction
    ? `${ROCKY_VISUALS[evolutionStage].label} reacting`
    : `${ROCKY_VISUALS[evolutionStage].label}, feeling ${mood.toLowerCase()}`

  return (
    <div className={styles.wrapper} style={{ width: size, height: size }}>
      <div className={styles.zoom}>
        {/* The `key` forces a fresh <img> (and its entrance animation) each
            time the resolved asset changes, whether that's a mood/evolution
            change or a reaction starting/ending. */}
        <img key={src} src={src} alt={label} className={styles.image} />
      </div>
    </div>
  )
}
