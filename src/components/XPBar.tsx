import { xpForCurrentLevel, xpForNextLevel } from '../engine/levels'
import styles from './XPBar.module.css'

interface XPBarProps {
  xp: number
  level: number
}

export function XPBar({ xp, level }: XPBarProps) {
  const floor = xpForCurrentLevel(level)
  const ceiling = xpForNextLevel(level)

  if (ceiling === null) {
    return (
      <div className={styles.container}>
        <div className={styles.labels}>
          <span>LEVEL {level} · MAX</span>
          <span>{xp.toLocaleString()} XP</span>
        </div>
        <div className={styles.track}>
          <div className={styles.fill} style={{ width: '100%' }} />
        </div>
      </div>
    )
  }

  const progress = Math.min(100, Math.max(0, ((xp - floor) / (ceiling - floor)) * 100))

  return (
    <div className={styles.container}>
      <div className={styles.labels}>
        <span>Level {level}</span>
        <span>
          {xp.toLocaleString()} / {ceiling.toLocaleString()} XP
        </span>
      </div>
      <div className={styles.track}>
        <div className={styles.fill} style={{ width: `${progress}%` }} />
      </div>
    </div>
  )
}
