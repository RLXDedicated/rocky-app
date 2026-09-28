import { useEffect, useRef } from 'react'
import styles from './World.module.css'

interface Props {
  /** Where the ball lands, % of the stage width. */
  x: number
  /** 0 = just dropped; ±1 = Rocky kicked it toward the right/left. */
  kick: -1 | 0 | 1
  stageW: number
  stageH: number
  /** Floor line, px from the bottom of the stage. */
  floor: number
  animate: boolean
  onBounce: (strength: number) => void
  onDone: () => void
}

const SIZE = 34
const GRAVITY = 2600 // px/s²
const RESTITUTION = 0.58
const ROLL_FRICTION = 0.9 // velocity kept per second while rolling

/**
 * A real soccer ball: drops in with gravity and bounces that lose energy,
 * rolls with spin, and flies off when Rocky kicks it. Simulated per frame
 * and written straight to the DOM (no React re-render per frame).
 */
export function Ball({ x, kick, stageW, stageH, floor, animate, onBounce, onDone }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const shadowRef = useRef<HTMLSpanElement>(null)
  const sim = useRef({ px: (x / 100) * stageW, y: animate ? stageH * 0.6 : 0, vx: 0, vy: 0, spin: 0, kicked: false, t: 0 })
  const cb = useRef({ onBounce, onDone })
  cb.current = { onBounce, onDone }

  // Kick: launch the ball away from Rocky.
  useEffect(() => {
    if (kick === 0) return
    const s = sim.current
    s.kicked = true
    if (!animate) {
      const t = window.setTimeout(() => cb.current.onDone(), 500)
      return () => window.clearTimeout(t)
    }
    s.vx = kick * (420 + Math.random() * 160)
    s.vy = 820 + Math.random() * 180
  }, [kick, animate])

  useEffect(() => {
    const el = ref.current
    const shadow = shadowRef.current
    if (!el || !shadow) return
    const s = sim.current
    const draw = () => {
      const lift = Math.max(0, s.y)
      el.style.transform = `translate(${s.px - SIZE / 2}px, ${-lift}px) rotate(${s.spin}rad)`
      const k = Math.max(0.35, 1 - lift / 260)
      shadow.style.transform = `translateX(${s.px - SIZE / 2}px) scale(${k})`
      shadow.style.opacity = String(0.25 * k)
    }
    draw()
    if (!animate) return

    let raf = 0
    let last = performance.now()
    let doneAt = 0
    const step = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000)
      last = now
      s.vy -= GRAVITY * dt
      s.y += s.vy * dt
      s.px += s.vx * dt
      if (s.y <= 0) {
        s.y = 0
        if (s.vy < -140) {
          cb.current.onBounce(Math.min(1, -s.vy / 1400))
          s.vy = -s.vy * RESTITUTION
        } else {
          s.vy = 0
          s.vx *= Math.pow(ROLL_FRICTION, dt * 10)
        }
      }
      s.spin += (s.vx * dt) / (SIZE / 2)
      draw()
      const offStage = s.px < -SIZE * 2 || s.px > stageW + SIZE * 2
      const stopped = s.kicked && s.y === 0 && s.vy === 0 && Math.abs(s.vx) < 12
      if ((offStage || stopped) && !doneAt) doneAt = now
      if (doneAt) el.style.opacity = String(Math.max(0, 1 - (now - doneAt) / 400))
      if (doneAt && now - doneAt > 420) {
        cb.current.onDone()
        return
      }
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [animate, stageW])

  return (
    <>
      <span ref={shadowRef} className={styles.ballShadow} style={{ bottom: floor - 5, width: SIZE }} aria-hidden="true" />
      <div ref={ref} className={styles.ball} style={{ bottom: floor, width: SIZE, height: SIZE }} aria-hidden="true">
        <svg viewBox="-50 -50 100 100" width={SIZE} height={SIZE}>
          <defs>
            <radialGradient id="rocky-ball-shade" cx="-0.25" cy="-0.3" r="1.1">
              <stop offset="0.55" stopColor="#ffffff" stopOpacity="0" />
              <stop offset="1" stopColor="#0f2341" stopOpacity="0.35" />
            </radialGradient>
            <clipPath id="rocky-ball-clip">
              <circle r="47" />
            </clipPath>
          </defs>
          <circle r="47" fill="#ffffff" />
          <g clipPath="url(#rocky-ball-clip)" fill="#1b2433">
            <polygon points="0,-17 16,-5 10,14 -10,14 -16,-5" />
            {[0, 72, 144, 216, 288].map((a) => (
              <polygon key={a} points="0,-60 15,-49 9,-32 -9,-32 -15,-49" transform={`rotate(${a})`} />
            ))}
          </g>
          <g stroke="#1b2433" strokeWidth="2.2" fill="none" clipPath="url(#rocky-ball-clip)">
            {[0, 72, 144, 216, 288].map((a) => (
              <path key={a} d="M0,-17 L0,-32" transform={`rotate(${a})`} />
            ))}
          </g>
          <circle r="47" fill="url(#rocky-ball-shade)" />
          <circle r="47" fill="none" stroke="#1b2433" strokeWidth="2.5" />
        </svg>
      </div>
    </>
  )
}
