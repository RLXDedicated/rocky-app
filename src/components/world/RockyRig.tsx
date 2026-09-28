import { useEffect, useRef, type RefObject } from 'react'
import type { Mood } from '../../types/domain'
import type { RockyRigPoints } from '../rockyRig'
import { createRigRenderer, RIG_MARGIN, type RigPose, type RigRenderer } from './rigRenderer'
import styles from './World.module.css'

export type RigAction = 'idle' | 'walk' | 'run' | 'pet' | 'eat' | 'hop'

interface Props {
  src: string
  rig: RockyRigPoints
  size: number
  mood: Mood
  action: RigAction
  animate: boolean
  /** -1 walking left, 1 right, 0 facing the viewer. */
  facing?: -1 | 0 | 1
  /** Something Rocky should watch (client px), e.g. the ball; otherwise he follows the pointer. */
  lookAt?: RefObject<{ x: number; y: number } | null>
  /** Head-worn items (hat, glasses) moved with the head each frame. */
  hatRef?: RefObject<SVGSVGElement | null>
  headRefs?: RefObject<SVGSVGElement | null>[]
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
const STILL: RigPose = { headAngle: 0, headX: 0, headY: 0, turn: 0, breath: 0.5, step: 0, stride: 0, facing: 0, lookX: 0, lookY: 0 }

/**
 * The 2.5D animated Rocky: the approved artwork, gently deformed on a mesh
 * so he breathes, sways his head, looks toward the pointer and
 * reacts to care — instead of a stiff image hopping around. Falls back to
 * the plain image (onFail) without WebGL.
 */
export function RockyRig({ src, rig, size, mood, action, animate, facing = 0, lookAt, hatRef, headRefs, onReady, onFail }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rendererRef = useRef<RigRenderer | null>(null)
  const state = useRef({ mood, action, actionSince: 0, rig, size, facing })
  const lastPose = useRef<RigPose>({ ...STILL, headY: PERSONALITY[mood].drop })
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
    s.facing = facing
  }, [mood, action, rig, size, facing])

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
          lastPose.current = { ...STILL, headY: PERSONALITY[state.current.mood].drop }
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
    let gazeX = 0
    let gazeY = 0
    let stride = 0
    let step = 0
    let last = performance.now()
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
        const target = lookAt?.current
        const active = Boolean(target) || now - pointer.at < 4000
        const tx = target ? target.x : pointer.x
        const ty = target ? target.y : pointer.y
        const targetTurn = active ? Math.max(-1, Math.min(1, (tx - cx) / (window.innerWidth * 0.35))) * 0.9 : Math.sin(t * 0.25) * 0.35
        const targetLookY = active ? Math.max(-1, Math.min(1, (ty - eyeY) / 400)) : 0
        turn += (targetTurn - turn) * 0.06
        lookY += (targetLookY - lookY) * 0.06
        // Eyes are quicker than the head, and glance around on their own when idle.
        const idleGlance = Math.sin(t * 0.7) * 0.5 + Math.sin(t * 1.9) * 0.2
        const wantEyeX = active ? Math.max(-1, Math.min(1, (tx - cx) / (rect.width * 1.2))) : idleGlance
        const wantEyeY = active ? Math.max(-1, Math.min(1, (ty - eyeY) / (rect.height * 1.2))) : Math.sin(t * 0.43) * 0.25
        gazeX += (wantEyeX - gazeX) * 0.18
        gazeY += (wantEyeY - gazeY) * 0.18

        // Walk cycle: stride eases in/out; running swings faster and wider.
        const dt = Math.min(0.05, (now - last) / 1000)
        last = now
        const wantStride = s.action === 'run' ? 1 : s.action === 'walk' ? 0.62 : 0
        stride += (wantStride - stride) * 0.2
        step += dt * (s.action === 'run' ? 17 : 11)

        const breathWave = Math.sin((t * 2 * Math.PI) / p.breath)
        const pose: RigPose = {
          headAngle: (Math.sin(t * p.speed) * p.sway + turn * 2.5) * DEG,
          headX: 0,
          headY: p.drop - breathWave * p.bob + lookY * 0.004,
          turn,
          breath: 0.5 + 0.5 * breathWave,
          step,
          stride,
          facing: s.facing,
          lookX: gazeX,
          lookY: gazeY,
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
            pose.headAngle += Math.sin(step) * 2.2 * DEG
            pose.headY += Math.abs(Math.sin(step)) * 0.004
            break
          case 'run':
            // Leaning into the run, head bobbing with each stride.
            pose.headAngle += (Math.sin(step) * 3 + s.facing * 4) * DEG
            pose.headY += Math.abs(Math.sin(step)) * 0.007
            break
          case 'hop':
            // The head lags a moment behind the body's jump.
            pose.headY += Math.sin(Math.min(1, since / 550) * Math.PI * 2) * 0.008
            break
        }
        r.draw(pose)
        lastPose.current = pose

        // Move the closet hat with the head (rotation about the neck pivot).
        for (const item of [hatRef?.current, ...(headRefs ?? []).map((r) => r.current)]) {
          if (!item) continue
          const px = s.rig.pivot.x * s.size - (parseFloat(item.style.left) || 0)
          const py = s.rig.pivot.y * s.size - (parseFloat(item.style.top) || 0)
          item.style.transformOrigin = `${px}px ${py}px`
          item.style.transform = `translate(${pose.headX * s.size + turn * 0.018 * s.size}px, ${pose.headY * s.size}px) rotate(${pose.headAngle / DEG}deg)`
        }
      }
      if (animate) raf = requestAnimationFrame(frame)
    }

    if (animate) raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onMove)
    }
  }, [animate, hatRef, headRefs, lookAt])

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
