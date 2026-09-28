import type { CSSProperties } from 'react'
import styles from './World.module.css'

const KIND: Record<string, { className: string; count: number }> = {
  'fx-leaves': { className: styles.fxLeaf!, count: 12 },
  'fx-fireflies': { className: styles.fxFirefly!, count: 16 },
  'fx-confetti': { className: styles.fxConfetti!, count: 26 },
}

const COLORS = ['#1fbf68', '#f5b82e', '#ffffff', '#e2445c', '#9fc6e8']

/** A living ambience layer over Rocky's scene (bought in the shop). Pure CSS animation; hidden with reduced motion. */
export function FxLayer({ id }: { id: string | null }) {
  const kind = id ? KIND[id] : undefined
  if (!kind) return null
  return (
    <div className={styles.fx} aria-hidden="true">
      {Array.from({ length: kind.count }, (_, i) => {
        // Deterministic scatter so the layer doesn't reshuffle on re-render.
        const r = (n: number) => ((i * 9301 + n * 49297) % 233280) / 233280
        const style = {
          '--x': `${r(1) * 100}%`,
          '--y': `${10 + r(2) * 70}%`,
          '--dur': `${6 + r(3) * 8}s`,
          '--delay': `${-r(4) * 14}s`,
          '--s': `${0.6 + r(5) * 0.8}`,
          '--c': COLORS[i % COLORS.length],
        } as CSSProperties
        return <span key={i} className={kind.className} style={style} />
      })}
    </div>
  )
}
