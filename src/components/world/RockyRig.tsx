import { useEffect, useRef, type RefObject } from 'react'
import type { Mood } from '../../types/domain'
import type { RockyRigPoints } from '../rockyRig'
import { createRigRenderer, RIG_MARGIN, type RigPose, type RigRenderer } from './rigRenderer'
import styles from './World.module.css'

export type RigAction = 'idle' | 'walk' | 'pet' | 'eat' | 'hop'

interface Props {
  src: string
  rig: RockyRigPoints
  size: number
  mood: Mood
  action: RigAction
  animate: boolean
  /** The closet hat, moved with the head each frame. */
  hatRef?: RefObject<SVGSVGElement | null>
  /** Called once the artwork is on the canvas (hide the still image then). */
  onReady: () => void
  onFail: () => void
}

// Idle personality per mood: breathing period (s), head sway (deg) and speed,
// how low the head sits, and how much it bobs with each breath.
const PERSONALITY: Record<Mood, { breath: number; sway: number; speed: number; drop: number; bob: number }> = {
  Happy: { breath: 2.8, sway: 4.5, speed: 1.3, drop: 0, bob: 0.006 },
  Motivated: { breath: 3.0, sway: 3.6, speed: 1.05, drop: 0, bob: 0.005 },
  Worried: { breath: 3.6, sway: 2.6, speed: 0.7, drop: 0.008, bob: 0.003 },
  Recovery: { breath: 4.6, sway: 1.8, speed: 0.5, drop: 0.004, bob: 0.004 },
}

const DEG = Math.PI / 180

/**
 * The 2.5D animated Rocky: the approved artwork, gently deformed on a mesh
 * so he breathes, sways his head, looks toward the pointer and
 * reacts to care — instead of a stiff image hopping around. Falls back to
 * the plain image (onFail) without WebGL.
 */
export function RockyRig({ src, rig, size, mood, action, animate, hatRef, onReady, onFail }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rendererRef = useRef<RigRenderer | null>(null)
  const state = useRef({ mood, action, actionSince: 0, rig, size })
  const lastPose = useRef<RigPose>({ headAngle: 0, headX: 0, headY: PERSONALITY[mood].drop, turn: 0, breath: 0.5 })
  const failRef = useRef(onFail)
  const readyRef = useRef(onReady)
  const animateRef = useRef(animate)
  failRef.current = onFail
  readyRef.current = onReady
  animateRef.current = animate

  // Keep the loop's view of props current without restarting it.
  useEffect(() => {
    const s = state.current
    if (s.action !== action) s.actionSince = performance.now()
    s.mood = mood
    s.action = action
    s.rig = rig
    s.size = size
  }, [mood, action, rig, size])

  // Renderer lifetime.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let renderer: RigRenderer | null = null
    try {
      renderer = createRigRenderer(canvas)
    } catch (err) {
      console.warn('[rocky] animated Rocky unavailable, using the still art:', err)
    }
    if (!renderer) {
      failRef.current()
      return
    }
    rendererRef.current = renderer
    return () => {
      renderer?.dispose()
      rendererRef.current = null
    }
  }, [])

  // Canvas resolution follows the displayed size.
  useEffect(() => {
    const r = rendererRef.current
    if (!r) return
    r.resize(size * (1 + 2 * RIG_MARGIN))
    // Resizing clears the canvas; without the animation loop, redraw now.
    r.draw(lastPose.current)
  }, [size])

  // Artwork (texture) follows the current stage/mood image.
  useEffect(() => {
    let alive = true
    const img = new Image()
    img.src = src
    img
      .decode()
      .then(() => {
        const r = rendererRef.current
        if (!alive || !r) return
        r.setImage(img, rig)
        // Reduced motion never runs the loop — draw one relaxed still frame.
        if (!animateRef.current) {
          lastPose.current = { headAngle: 0, headX: 0, headY: PERSONALITY[state.current.mood].drop, turn: 0, breath: 0.5 }
          r.draw(lastPose.current)
        }
        readyRef.current()
      })
      .catch(() => alive && failRef.current())
    return () => {
      alive = false
    }
  }, [src, rig])

  // Animation loop.
  useEffect(() => {
    const pointer = { x: 0, y: 0, at: -1e9 }
    const onMove = (e: PointerEvent) => {
      pointer.x = e.clientX
      pointer.y = e.clientY
      pointer.at = performance.now()
    }
    window.addEventListener('pointermove', onMove, { passive: true })

    let raf = 0
    let turn = 0
    let lookY = 0
    const start = performance.now()

    const frame = () => {
      const r = rendererRef.current
      const canvas = canvasRef.current
      const s = state.current
      if (r && canvas) {
        const now = performance.now()
        const t = (now - start) / 1000
        const p = PERSONALITY[s.mood]
        const since = now - s.actionSince

        // Look toward the pointer while it's moving; otherwise drift.
        const rect = canvas.getBoundingClientRect()
        const cx = rect.left + rect.width / 2
        const eyeY = rect.top + rect.height * 0.3
        const active = now - pointer.at < 4000
        const targetTurn = active ? Math.max(-1, Math.min(1, (pointer.x - cx) / (window.innerWidth * 0.35))) * 0.9 : Math.sin(t * 0.25) * 0.35
        const targetLookY = active ? Math.max(-1, Math.min(1, (pointer.y - eyeY) / 400)) : 0
        turn += (targetTurn - turn) * 0.06
        lookY += (targetLookY - lookY) * 0.06

        const breathWave = Math.sin((t * 2 * Math.PI) / p.breath)
        const pose: RigPose = {
          headAngle: (Math.sin(t * p.speed) * p.sway + turn * 2.5) * DEG,
          headX: 0,
          headY: p.drop - breathWave * p.bob + lookY * 0.004,
          turn,
          breath: 0.5 + 0.5 * breathWave,
        }

        switch (s.action) {
          case 'pet': {
            // The head leans into the scratch and nuzzles back up.
            const k = Math.min(1, since / 180) * (since < 900 ? 1 : 0)
            pose.headAngle += Math.sin(Math.min(1, since / 700) * Math.PI) * 8 * DEG
            pose.headY -= 0.005 * k
            break
          }
          case 'eat':
            // Chewing nods.
            pose.headY += 0.007 * Math.abs(Math.sin((since / 1000) * 13))
            pose.headAngle += Math.sin((since / 1000) * 6.5) * 1.5 * DEG
            break
          case 'walk':
            pose.headAngle += Math.sin(t * 9) * 2.5 * DEG
            pose.headY += Math.abs(Math.sin(t * 9)) * 0.004
            break
          case 'hop':
            // The head lags a moment behind the body's jump.
            pose.headY += Math.sin(Math.min(1, since / 550) * Math.PI * 2) * 0.008
            break
        }
        r.draw(pose)
        lastPose.current = pose

        // Move the closet hat with the head (rotation about the neck pivot).
        const hat = hatRef?.current
        if (hat) {
          const px = s.rig.pivot.x * s.size - (parseFloat(hat.style.left) || 0)
          const py = s.rig.pivot.y * s.size - (parseFloat(hat.style.top) || 0)
          hat.style.transformOrigin = `${px}px ${py}px`
          hat.style.transform = `translate(${pose.headX * s.size + turn * 0.018 * s.size}px, ${pose.headY * s.size}px) rotate(${pose.headAngle / DEG}deg)`
        }
      }
      if (animate) raf = requestAnimationFrame(frame)
    }

    if (animate) raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onMove)
    }
  }, [animate, hatRef])

  const canvasPx = size * (1 + 2 * RIG_MARGIN)
  return (
    <canvas
      ref={canvasRef}
      className={styles.rigCanvas}
      style={{ width: canvasPx, height: canvasPx, left: -RIG_MARGIN * size, top: -RIG_MARGIN * size }}
      aria-hidden="true"
    />
  )
}
