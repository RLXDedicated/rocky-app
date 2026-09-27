import styles from './LoadingRocky.module.css'
import { RockyAvatar } from './RockyAvatar'

/**
 * Shown instead of a blank white screen while a page's first snapshot loads
 * (Phase 8 §19). Rocky idle — same idle Motivated animation as everywhere
 * else, nothing new to build or maintain.
 */
export function LoadingRocky() {
  return (
    <div className={styles.page}>
      <RockyAvatar mood="Motivated" evolutionStage="Baby" size={110} bare />
    </div>
  )
}
