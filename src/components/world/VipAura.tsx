import type { CSSProperties } from 'react'
import styles from './VipAura.module.css'

/** Deterministic scatter so the aura never reshuffles on re-render. */
const rnd = (i: number, n: number) => {
  const h = Math.sin(i * 127.1 + n * 311.7) * 43758.5453
  return h - Math.floor(h)
}

const ORBITS = Array.from({ length: 7 }, (_, i) => ({
  r: 30 + rnd(i, 1) * 16, // % of the box
  dur: 4 + rnd(i, 2) * 5,
  delay: -rnd(i, 3) * 8,
  dir: i % 2 ? 'reverse' : 'normal',
  tilt: -20 + rnd(i, 4) * 40,
  size: 6 + rnd(i, 5) * 6,
  hue: i % 3 === 2 ? '#d9c2ff' : '#fff3b0',
}))

const EMBERS = Array.from({ length: 16 }, (_, i) => ({
  x: 18 + rnd(i, 6) * 64,
  dur: 2.6 + rnd(i, 7) * 2.8,
  delay: -rnd(i, 8) * 5,
  size: 3 + rnd(i, 9) * 5,
  sway: -18 + rnd(i, 10) * 36,
}))

const FLARES = [
  { x: 14, y: 30, d: 0 },
  { x: 84, y: 22, d: 1.3 },
  { x: 76, y: 70, d: 2.6 },
  { x: 22, y: 76, d: 3.7 },
]

/**
 * The Rocky admin aura: a breathing golden glow, two counter-rotating
 * crowns of light rays, energy rings that pulse outwards, a rune circle
 * turning under the feet, sparkles in orbit with trails, embers rising and
 * lens-flare twinkles. Pure CSS; everything stops under "reduce motion".
 */
export function VipAura({ feet = 0 }: { feet?: number }) {
  return (
    <div className={styles.aura} aria-hidden="true">
      <span className={styles.glow} />
      <span className={styles.rays} />
      <span className={styles.raysViolet} />
      {[0, 1, 2].map((i) => (
        <span key={i} className={styles.ring} style={{ animationDelay: `${i * 1.2}s` }} />
      ))}
      <svg className={styles.circle} style={{ bottom: feet - 18 }} viewBox="0 0 200 200">
        <defs>
          <radialGradient id="va-disc" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#ffe89a" stopOpacity="0.55" />
            <stop offset="0.7" stopColor="#f5b82e" stopOpacity="0.18" />
            <stop offset="1" stopColor="#f5b82e" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="100" cy="100" r="98" fill="url(#va-disc)" />
        <g className={styles.spin}>
          <circle cx="100" cy="100" r="88" fill="none" stroke="#ffe27a" strokeWidth="3" />
          <circle cx="100" cy="100" r="78" fill="none" stroke="#fff3b0" strokeWidth="1.5" strokeDasharray="6 5" />
          <polygon points="100,22 168,139 32,139" fill="none" stroke="#ffd24a" strokeWidth="2" />
          <polygon points="100,178 32,61 168,61" fill="none" stroke="#ffd24a" strokeWidth="2" />
          {Array.from({ length: 12 }, (_, i) => (
            <rect key={i} x="97" y="6" width="6" height="10" rx="1" fill="#fff3b0" transform={`rotate(${i * 30} 100 100)`} />
          ))}
        </g>
        <g className={styles.spinBack}>
          <circle cx="100" cy="100" r="46" fill="none" stroke="#d9c2ff" strokeWidth="2" strokeDasharray="2 6" />
          {Array.from({ length: 6 }, (_, i) => (
            <circle key={i} cx="100" cy="54" r="4" fill="#ffffff" transform={`rotate(${i * 60} 100 100)`} />
          ))}
        </g>
      </svg>
      {ORBITS.map((o, i) => (
        <span
          key={i}
          className={styles.orbitPlane}
          style={{ transform: `translate(-50%, -50%) rotateZ(${o.tilt}deg) scaleY(0.55)` } as CSSProperties}
        >
          <span
            className={styles.orbit}
            style={
              {
                '--r': `${o.r}%`,
                animationDuration: `${o.dur}s`,
                animationDelay: `${o.delay}s`,
                animationDirection: o.dir,
              } as CSSProperties
            }
          >
            <i style={{ width: o.size, height: o.size, background: o.hue, boxShadow: `0 0 ${o.size * 1.6}px ${o.hue}` }} />
          </span>
        </span>
      ))}
      {EMBERS.map((e, i) => (
        <b
          key={i}
          className={styles.ember}
          style={
            {
              left: `${e.x}%`,
              bottom: feet,
              width: e.size,
              height: e.size,
              '--sway': `${e.sway}px`,
              animationDuration: `${e.dur}s`,
              animationDelay: `${e.delay}s`,
            } as CSSProperties
          }
        />
      ))}
      {FLARES.map((f, i) => (
        <em key={i} className={styles.flare} style={{ left: `${f.x}%`, top: `${f.y}%`, animationDelay: `${f.d}s` }} />
      ))}
    </div>
  )
}
