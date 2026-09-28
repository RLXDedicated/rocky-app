import { useEffect, useRef } from 'react'
import type { HatArt } from './art'
import { webglAvailable } from './rocky3dModels'
import type { HeadPose, RockyClip, RockyStage3D } from './rocky3dRuntime'
import styles from './World.module.css'

export interface ClipRequest {
  clip: RockyClip
  /** Changes on every request so the same clip can be replayed. */
  nonce: number
}

interface Props {
  url: string
  size: number
  walking: boolean
  facing: -1 | 0 | 1
  request: ClipRequest | null
  hat?: HatArt
  animate: boolean
  onReady: () => void
  onFail: () => void
}

/**
 * The 3D Rocky (three.js). Plays a looping Idle/Walk underneath one-shot
 * clips (Wave, Eat, Celebrate, mood emotes) and keeps the closet hat glued
 * to the head bone every frame. Any failure falls back to the 2.5D art via
 * `onFail` — the agent never sees an empty spot.
 */
export function Rocky3D({ url, size, walking, facing, request, hat, animate, onReady, onFail }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const hatRef = useRef<SVGSVGElement>(null)
  const stageRef = useRef<RockyStage3D | null>(null)
  const walkingRef = useRef(walking)
  const oneShotRef = useRef(false)
  const hatArtRef = useRef(hat)
  const sizeRef = useRef(size)
  const readyRef = useRef(onReady)
  const failRef = useRef(onFail)
  hatArtRef.current = hat
  readyRef.current = onReady
  failRef.current = onFail

  function placeHat(pose: HeadPose) {
    const el = hatRef.current
    const art = hatArtRef.current
    if (!el) return
    if (!art) {
      el.style.display = 'none'
      return
    }
    const width = pose.faceWidth * art.width
    const height = width * 0.6
    const brim = pose.y + pose.faceWidth * art.sink
    el.style.display = 'block'
    el.style.width = `${width}px`
    el.style.height = `${height}px`
    el.style.left = `${pose.x - width / 2}px`
    el.style.top = `${brim - height}px`
    el.style.transform = `rotate(${pose.roll}deg)`
  }

  function backToBase() {
    oneShotRef.current = false
    stageRef.current?.play(walkingRef.current ? 'Walk' : 'Idle')
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    if (!webglAvailable()) {
      failRef.current()
      return
    }
    let alive = true
    let stage: RockyStage3D | null = null
    import('./rocky3dRuntime')
      .then((m) => m.createRockyStage({ canvas, url, size: sizeRef.current, animate, onHead: placeHat }))
      .then((s) => {
        if (!alive) {
          s.dispose()
          return
        }
        stage = s
        stageRef.current = s
        oneShotRef.current = true
        s.play('Wave', { loop: false, onDone: backToBase })
        readyRef.current()
      })
      .catch((err) => {
        console.warn('[rocky] 3D Rocky unavailable, keeping the 2.5D art:', err)
        if (alive) failRef.current()
      })
    return () => {
      alive = false
      stage?.dispose()
      stageRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- (re)load only when the model changes
  }, [url, animate])

  useEffect(() => {
    sizeRef.current = size
    stageRef.current?.setSize(size)
  }, [size])

  useEffect(() => {
    walkingRef.current = walking
    if (!oneShotRef.current) stageRef.current?.play(walking ? 'Walk' : 'Idle')
  }, [walking])

  useEffect(() => {
    stageRef.current?.setFacing(facing)
  }, [facing])

  useEffect(() => {
    if (!request || !stageRef.current) return
    oneShotRef.current = true
    stageRef.current.play(request.clip, { loop: false, onDone: backToBase })
  }, [request])

  return (
    <span className={styles.rocky3d}>
      <canvas ref={canvasRef} className={styles.canvas3d} style={{ width: size, height: size }} aria-hidden="true" />
      <svg ref={hatRef} className={`${styles.hat} ${styles.hat3d}`} viewBox="0 0 100 60" style={{ display: 'none' }} aria-hidden="true">
        {hat?.svg}
      </svg>
    </span>
  )
}
