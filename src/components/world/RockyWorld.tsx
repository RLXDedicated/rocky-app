import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import type { EvolutionStage, Mood } from '../../types/domain'
import type { Outfit } from '../../game/closet'
import { ROCKY_HEAD_ANCHORS } from '../rockyAnchors'
import { getReactionAsset, getRockyAsset, ROCKY_VISUALS, type RockyReactionKey } from '../rockyVisuals'
import { DECOR_ART, HAT_ART, SceneArt, hatPlacement } from './art'
import { Rocky3D, type ClipRequest } from './Rocky3D'
import { ROCKY_3D_MODELS, rocky3dEnabled } from './rocky3dModels'
import type { RockyClip } from './rocky3dRuntime'
import styles from './World.module.css'

type Pose = 'idle' | 'walk' | 'pet' | 'eat' | 'hop'

interface Particle {
  id: number
  x: number
  kind: 'heart' | 'crumb'
}

interface Props {
  mood: Mood
  stage: EvolutionStage
  reaction: RockyReactionKey | null
  outfit: Outfit
  /** What Rocky says (mood line or a check-in reaction). */
  speech: string
  treats: number
  hearts: number
  maxHearts: number
  onPet: () => void
  onFeed: () => void
  onPlay: () => void
  /** Top-left overlay (name tag, level). */
  hud: ReactNode
  /** The primary action (check-in). */
  action: ReactNode
}

const FLOOR = 15 // % from the bottom of the world where Rocky's feet rest
const PET_LINES = ['Hehe, that tickles!', 'Rocky loves that.', 'More scratches, please!', 'Best teammate ever.']
const FEED_LINES = ['Nom nom nom!', 'Delicious. Thank you!', 'Crunchy! Rocky approves.']
const PLAY_LINES = ['Got it!', 'Again! Again!', 'Rocky is a natural.']

// 3D: which clip expresses each mood, and each check-in reaction.
const MOOD_CLIP: Record<Mood, RockyClip> = { Happy: 'Happy', Motivated: 'Motivated', Worried: 'Worried', Recovery: 'Recovery' }
const REACTION_CLIP: Record<RockyReactionKey, RockyClip> = {
  'check-in': 'Celebrate',
  'qa-pass': 'Happy',
  alert: 'Worried',
  'level-up': 'Celebrate',
  evolution: 'Celebrate',
  recovery: 'Recovery',
}
/** In the 3D camera framing, Rocky's feet sit at this fraction of the canvas height. */
const FEET_3D = 0.945

function pick<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)]!
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
}

/**
 * Rocky's world: a scene with Rocky walking around in his outfit. Tap him
 * to pet, give a treat, or throw a ball. All of this is for fun and
 * connection — nothing here changes XP, Energy or Streak.
 */
export function RockyWorld({ mood, stage, reaction, outfit, speech, treats, hearts, maxHearts, onPet, onFeed, onPlay, hud, action }: Props) {
  const [x, setX] = useState(50)
  const [pose, setPose] = useState<Pose>('idle')
  const [walkMs, setWalkMs] = useState(0)
  const [facingLeft, setFacingLeft] = useState(false)
  const [localLine, setLocalLine] = useState<string | null>(null)
  const [particles, setParticles] = useState<Particle[]>([])
  const [ball, setBall] = useState<{ x: number; kicked: boolean } | null>(null)
  const [treatFlying, setTreatFlying] = useState(false)
  const busyRef = useRef(false)
  const idRef = useRef(0)
  const worldRef = useRef<HTMLDivElement>(null)
  const [worldH, setWorldH] = useState(420)
  const model3d = ROCKY_3D_MODELS[stage]
  const [mode3d, setMode3d] = useState<'loading' | 'ready' | 'off'>(() => (model3d && rocky3dEnabled() ? 'loading' : 'off'))
  const [clipRequest, setClipRequest] = useState<ClipRequest | null>(null)
  const nonceRef = useRef(0)
  const is3d = mode3d === 'ready'
  const is3dRef = useRef(false)
  is3dRef.current = is3d

  // Evolving into a stage with (or without) a 3D model switches renderer.
  // Only on a real change: on mount this must not undo a failure Rocky3D
  // already reported (child effects run before the parent's).
  const lastModelRef = useRef(model3d)
  useEffect(() => {
    if (lastModelRef.current === model3d) return
    lastModelRef.current = model3d
    setMode3d(model3d && rocky3dEnabled() ? 'loading' : 'off')
  }, [model3d])

  const playClip = useCallback((clip: RockyClip) => {
    if (!is3dRef.current) return
    setClipRequest({ clip, nonce: ++nonceRef.current })
  }, [])

  // Check-in reactions become animations in 3D.
  useEffect(() => {
    if (reaction) playClip(REACTION_CLIP[reaction])
  }, [reaction, playClip])

  useEffect(() => {
    const el = worldRef.current
    if (!el) return
    const measure = () => setWorldH(el.clientHeight)
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const say = useCallback((line: string, ms = 2600) => {
    setLocalLine(line)
    window.setTimeout(() => setLocalLine((cur) => (cur === line ? null : cur)), ms)
  }, [])

  const burst = useCallback((kind: Particle['kind'], count: number, atX: number) => {
    const fresh = Array.from({ length: count }, () => ({
      id: ++idRef.current,
      x: atX + (Math.random() * 10 - 5),
      kind,
    }))
    setParticles((p) => [...p, ...fresh])
    window.setTimeout(() => setParticles((p) => p.filter((q) => !fresh.includes(q))), 1600)
  }, [])

  const xRef = useRef(50)
  const walkTo = useCallback((target: number): Promise<void> => {
    const from = xRef.current
    const ms = prefersReducedMotion() ? 0 : Math.min(2600, Math.abs(target - from) * 45)
    xRef.current = target
    setFacingLeft(target < from)
    setWalkMs(ms)
    setPose(ms > 0 ? 'walk' : 'idle')
    setX(target)
    return new Promise((resolve) =>
      window.setTimeout(() => {
        setPose('idle')
        resolve()
      }, ms),
    )
  }, [])

  // Idle wandering along the route.
  useEffect(() => {
    if (prefersReducedMotion()) return
    let timer: number
    const schedule = () => {
      timer = window.setTimeout(
        async () => {
          if (!busyRef.current && !reaction) {
            await walkTo(28 + Math.random() * 44)
          }
          schedule()
        },
        5000 + Math.random() * 5000,
      )
    }
    schedule()
    return () => window.clearTimeout(timer)
  }, [walkTo, reaction])

  // Every so often Rocky acts out his mood (3D only).
  useEffect(() => {
    if (!is3d || prefersReducedMotion()) return
    const timer = window.setInterval(() => {
      if (!busyRef.current) playClip(MOOD_CLIP[mood])
    }, 11000)
    return () => window.clearInterval(timer)
  }, [is3d, mood, playClip])

  function handlePet() {
    if (busyRef.current) return
    setPose('pet')
    playClip('Happy')
    burst('heart', 3, x)
    say(pick(PET_LINES))
    onPet()
    window.setTimeout(() => setPose('idle'), 700)
  }

  function handleFeed() {
    if (busyRef.current || treats <= 0) return
    busyRef.current = true
    setTreatFlying(true)
    window.setTimeout(() => {
      setTreatFlying(false)
      setPose('eat')
      playClip('Eat')
      burst('crumb', 6, x)
      burst('heart', 2, x)
      say(pick(FEED_LINES))
      onFeed()
      window.setTimeout(
        () => {
          setPose('idle')
          busyRef.current = false
        },
        is3dRef.current ? 2100 : 1400,
      )
    }, 650)
  }

  async function handlePlay() {
    if (busyRef.current) return
    busyRef.current = true
    const target = x > 50 ? 26 + Math.random() * 14 : 60 + Math.random() * 14
    setBall({ x: target, kicked: false })
    await new Promise((r) => window.setTimeout(r, 450))
    await walkTo(target)
    setPose('hop')
    playClip('Celebrate')
    setBall({ x: target, kicked: true })
    burst('heart', 2, target)
    say(pick(PLAY_LINES))
    onPlay()
    window.setTimeout(() => {
      setPose('idle')
      setBall(null)
      busyRef.current = false
    }, 1100)
  }

  // Rocky's size follows the world's height.
  const size = Math.round(Math.min(300, Math.max(170, worldH * 0.62)))
  const anchor = ROCKY_HEAD_ANCHORS[stage][mood]
  const src = reaction ? getReactionAsset(reaction) : getRockyAsset(stage, mood)
  const equippedHat = outfit.hat ? HAT_ART[outfit.hat] : undefined
  // 2.5D: reaction art has different poses, so the hat comes off for it.
  const hat = !reaction ? equippedHat : undefined
  const hatBox = hat ? hatPlacement(anchor, hat, size) : null
  const feetGap = (1 - (is3d ? FEET_3D : anchor.figureBottom)) * size
  const facing: -1 | 0 | 1 = pose === 'walk' ? (facingLeft ? -1 : 1) : 0
  const line = localLine ?? speech

  return (
    <section className={styles.world} aria-label="Rocky's world">
      <div className={styles.hud}>{hud}</div>

      <div className={styles.stage} ref={worldRef}>
        <div className={styles.scene}>
          <SceneArt id={outfit.scene} />
        </div>

        {outfit.decor.map((id) => {
          const d = DECOR_ART[id]
          if (!d) return null
          return (
            <svg
              key={id}
              className={styles.decor}
              viewBox={d.viewBox}
              style={{
                left: `${d.left}%`,
                width: `${d.width}%`,
                bottom: `${FLOOR + (d.lift ?? 0) - 2}%`,
              }}
              aria-hidden="true"
            >
              {d.svg}
            </svg>
          )
        })}

        {ball && (
          <span
            className={`${styles.ball} ${ball.kicked ? styles.ballKicked : ''}`}
            style={{ left: `${ball.x}%`, bottom: `${FLOOR}%` }}
            aria-hidden="true"
          />
        )}

        <div
          className={styles.actor}
          style={{
            left: `${x}%`,
            bottom: `calc(${FLOOR}% - ${feetGap}px)`,
            width: size,
            height: size,
            transitionDuration: `${walkMs}ms`,
          }}
        >
          <p className={styles.bubble} aria-live="polite">
            {line}
          </p>
          <span className={styles.shadow} style={{ bottom: feetGap - 6 }} aria-hidden="true" />
          <button
            type="button"
            className={`${styles.body} ${is3d ? styles.body3d : (styles[`pose-${pose}`] ?? '')}`}
            onClick={handlePet}
            aria-label={`Pet ${ROCKY_VISUALS[stage].label}`}
          >
            <span className={is3d ? '' : facingLeft && pose === 'walk' ? styles.leanLeft : pose === 'walk' ? styles.leanRight : ''}>
              {mode3d !== 'off' && model3d && (
                <Rocky3D
                  url={model3d}
                  size={size}
                  walking={pose === 'walk'}
                  facing={facing}
                  request={clipRequest}
                  hat={equippedHat}
                  animate={!prefersReducedMotion()}
                  onReady={() => setMode3d('ready')}
                  onFail={() => setMode3d('off')}
                />
              )}
              {!is3d && <img key={src} src={src} alt="" className={styles.art} draggable={false} />}
              {!is3d && hat && hatBox && (
                <svg className={styles.hat} viewBox="0 0 100 60" style={hatBox} aria-hidden="true">
                  {hat.svg}
                </svg>
              )}
            </span>
          </button>
          {treatFlying && <span className={styles.treat} aria-hidden="true" />}
        </div>

        {particles.map((p) => (
          <span
            key={p.id}
            className={p.kind === 'heart' ? styles.heart : styles.crumb}
            style={{
              left: `${p.x}%`,
              bottom: `${FLOOR + (p.kind === 'heart' ? 38 : 20)}%`,
            }}
            aria-hidden="true"
          >
            {p.kind === 'heart' ? '❤' : ''}
          </span>
        ))}
      </div>

      <div className={styles.dock}>
        <div className={styles.care}>
          <div
            className={styles.heartsMeter}
            role="meter"
            aria-valuemin={0}
            aria-valuemax={maxHearts}
            aria-valuenow={hearts}
            aria-label="Rocky's hearts today"
          >
            {Array.from({ length: maxHearts / 2 }, (_, i) => {
              const fill = Math.max(0, Math.min(2, hearts - i * 2))
              return (
                <span key={i} className={styles.heartSlot} data-fill={fill} aria-hidden="true">
                  ❤
                </span>
              )
            })}
          </div>
          <div className={styles.careButtons}>
            <button type="button" className={styles.careBtn} onClick={handlePet}>
              <span aria-hidden="true">✋</span> Pet
            </button>
            <button
              type="button"
              className={styles.careBtn}
              onClick={handleFeed}
              disabled={treats <= 0}
              title={treats <= 0 ? 'Earn treats with check-ins and QA passes' : undefined}
            >
              <span aria-hidden="true">🍎</span> Treat <b>{treats}</b>
            </button>
            <button type="button" className={styles.careBtn} onClick={() => void handlePlay()}>
              <span aria-hidden="true">⚽</span> Play
            </button>
          </div>
        </div>
        <div className={styles.primary}>{action}</div>
      </div>
    </section>
  )
}
