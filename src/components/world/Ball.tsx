import { forwardRef, useEffect, useImperativeHandle, useRef, type MutableRefObject } from 'react'
import styles from './World.module.css'

export interface BallHandle {
  /** Ball centre in stage px (x from the left, y above the floor). */
  position(): { x: number; y: number; vx: number; vy: number }
  /** Adds velocity (px/s) — a kick or a nudge. */
  push(vx: number, vy: number): void
  /** Kicks the ball away from a screen point (a tap on or near it). */
  kick(clientX: number, clientY: number): void
  /** Distance in px from a screen point to the ball's centre. */
  distanceTo(clientX: number, clientY: number): number
}

interface Props {
  /** Where the ball drops in, % of the stage width. */
  x: number
  stageW: number
  stageH: number
  /** Floor line, px from the bottom of the stage. */
  floor: number
  animate: boolean
  /** While playing the ball bounces off the stage edges; the final kick sends it away. */
  final: boolean
  /** Written every frame with the ball's position on screen (for Rocky's eyes). */
  track?: MutableRefObject<{ x: number; y: number } | null>
  stageRef: MutableRefObject<HTMLDivElement | null>
  onBounce: (strength: number) => void
  /** The agent tapped the ball. */
  onTap: () => void
  onDone: () => void
}

export const BALL_SIZE = 36
const R = BALL_SIZE / 2
const GRAVITY = 2600 // px/s²
const RESTITUTION = 0.6
const ROLL_FRICTION = 0.75 // share of rolling speed kept per second

/**
 * A real soccer ball: drops in with gravity, bounces off the floor and the
 * stage edges while Rocky and the agent play with it, rolls with spin, and
 * flies away on the final kick. Simulated per frame and written straight to
 * the DOM (no React re-render per frame).
 */
export const Ball = forwardRef<BallHandle, Props>(function Ball(
  { x, stageW, stageH, floor, animate, final, track, stageRef, onBounce, onTap, onDone },
  handle,
) {
  const ref = useRef<HTMLButtonElement>(null)
  const shadowRef = useRef<HTMLSpanElement>(null)
  const sim = useRef({ px: (x / 100) * stageW, y: animate ? stageH * 0.6 : 0, vx: 0, vy: 0, spin: 0 })
  const cb = useRef({ onBounce, onDone, final })
  cb.current = { onBounce, onDone, final }

  const center = () => {
    const rect = ref.current?.getBoundingClientRect()
    return rect ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : { x: 0, y: 0 }
  }
  const kick = (clientX: number, clientY: number) => {
    const c = center()
    // Kicked away from where it was tapped (a straight tap still goes somewhere), and up.
    const away = Math.max(-1, Math.min(1, (c.x - clientX) / R))
    const dir = Math.abs(away) < 0.15 ? (Math.random() < 0.5 ? -1 : 1) * 0.6 : away
    sim.current.vx = dir * 560 + (Math.random() - 0.5) * 140
    sim.current.vy = 760 + Math.random() * 220 + (clientY > c.y ? 120 : 0)
  }

  useImperativeHandle(handle, () => ({
    kick,
    distanceTo: (clientX, clientY) => {
      const c = center()
      return Math.hypot(c.x - clientX, c.y - clientY)
    },
    position: () => ({ x: sim.current.px, y: sim.current.y, vx: sim.current.vx, vy: sim.current.vy }),
    push: (vx, vy) => {
      sim.current.vx += vx
      sim.current.vy = Math.max(sim.current.vy, 0) + vy
    },
  }))

  useEffect(() => {
    const el = ref.current
    const shadow = shadowRef.current
    if (!el || !shadow) return
    const s = sim.current
    const draw = () => {
      const lift = Math.max(0, s.y)
      el.style.transform = `translate(${s.px - R}px, ${-lift}px) rotate(${s.spin}rad)`
      const k = Math.max(0.35, 1 - lift / 260)
      shadow.style.transform = `translateX(${s.px - R}px) scale(${k})`
      shadow.style.opacity = String(0.25 * k)
      const stage = stageRef.current?.getBoundingClientRect()
      if (track && stage) track.current = { x: stage.left + s.px, y: stage.bottom - floor - lift - R }
    }
    draw()

    let raf = 0
    let last = performance.now()
    let doneAt = 0
    const step = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000)
      last = now
      if (animate) {
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
            s.vx *= Math.pow(ROLL_FRICTION, dt)
            if (Math.abs(s.vx) < 4) s.vx = 0
          }
        }
        // Stage edges (and the sky) bounce the ball back while playing.
        if (!cb.current.final) {
          const ceiling = stageH - floor - BALL_SIZE - 8
          if (s.y > ceiling && s.vy > 0) {
            s.y = ceiling
            s.vy = -s.vy * 0.4
          }
          if (s.px < R + 4 && s.vx < 0) s.vx = -s.vx * 0.7
          if (s.px > stageW - R - 4 && s.vx > 0) s.vx = -s.vx * 0.7
          s.px = Math.max(R, Math.min(stageW - R, s.px))
        }
        s.spin += (s.vx * dt) / R
      }
      draw()
      if (cb.current.final) {
        const offStage = s.px < -BALL_SIZE * 2 || s.px > stageW + BALL_SIZE * 2
        const stopped = s.y === 0 && s.vy === 0 && Math.abs(s.vx) < 12
        if ((offStage || stopped || !animate) && !doneAt) doneAt = now
        if (doneAt) el.style.opacity = String(Math.max(0, 1 - (now - doneAt) / 400))
        if (doneAt && now - doneAt > 420) {
          if (track) track.current = null
          cb.current.onDone()
          return
        }
      }
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => {
      cancelAnimationFrame(raf)
      if (track) track.current = null
    }
  }, [animate, stageW, stageH, floor, stageRef, track])

  return (
    <>
      <span ref={shadowRef} className={styles.ballShadow} style={{ bottom: floor - 5, width: BALL_SIZE }} aria-hidden="true" />
      <button
        ref={ref}
        type="button"
        className={styles.ball}
        style={{ bottom: floor, width: BALL_SIZE, height: BALL_SIZE }}
        aria-label="Kick the ball"
        onPointerDown={(e) => {
          e.stopPropagation()
          kick(e.clientX, e.clientY)
          onTap()
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <svg viewBox="-50 -50 100 100" width={BALL_SIZE} height={BALL_SIZE} aria-hidden="true">
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
      </button>
    </>
  )
})
