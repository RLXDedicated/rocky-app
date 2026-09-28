import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { EvolutionStage, Mood } from '../../types/domain'
import type { Outfit } from '../../game/closet'
import { needsSummary, type Needs } from '../../game/pet'
import { isMuted, play as playSfx, setMuted } from '../../game/sfx'
import { ROCKY_HEAD_ANCHORS } from '../rockyAnchors'
import { getReactionAsset, getRockyAsset, ROCKY_VISUALS, type RockyReactionKey } from '../rockyVisuals'
import { DECOR_ART, HAT_ART, SceneArt, hatPlacement } from './art'
import { Ball, type BallHandle } from './Ball'
import { FxLayer } from './FxLayer'
import { BACK_ART, GLASSES_ART, NECK_ART, WEAR_VIEWBOX, backPlacement, glassesPlacement, neckPlacement } from './wearables'
import { NeedsDock } from './NeedsDock'
import { Rocky3D, type ClipRequest } from './Rocky3D'
import { RockyRig, type RigAction } from './RockyRig'
import { ROCKY_RIG } from '../rockyRig'
import { ROCKY_3D_MODELS, rocky3dEnabled } from './rocky3dModels'
import type { RockyClip } from './rocky3dRuntime'
import styles from './World.module.css'

type Pose = 'idle' | 'walk' | 'run' | 'pet' | 'eat' | 'hop' | 'bath'

interface Particle {
  id: number
  x: number
  kind: 'heart' | 'crumb' | 'bubble' | 'sparkle'
  /** Extra offsets so bursts don't stack in one column. */
  dx: number
  dy: number
}

interface Props {
  mood: Mood
  stage: EvolutionStage
  reaction: RockyReactionKey | null
  outfit: Outfit
  /** What Rocky says (mood line or a check-in reaction). */
  speech: string
  treats: number
  needs: Needs
  /** Care actions: each returns false when it can't happen (e.g. no treats). */
  onPet: () => boolean
  onFeed: () => boolean
  onPlay: () => boolean
  onBath: () => boolean
  /** Top overlay (name tag, level, shop). */
  hud: ReactNode
  /** The primary action (check-in). */
  action: ReactNode
}

const FLOOR = 15 // % from the bottom of the world where Rocky's feet rest
const PET_LINES = ['Hehe, that tickles!', 'Right behind the horns!', 'More scratches, please!', 'Best teammate ever.']
const FEED_LINES = ['Nom nom nom!', 'Delicious. Thank you!', 'Crunchy! Rocky approves.']
const PLAY_LINES = ['Goooal!', 'Again! Again!', 'Did you see that kick?']
const TAP_LINES = ['Nice pass!', 'My ball!', 'Wheee!', 'You’re good at this!']
const PLAY_START = 'Ball! Let’s play!'
/** How long Rocky plays with the ball before the final kick. */
const PLAY_MS = 9000
/** Rocky's walkable band, % of the stage width. */
const WALK_MIN = 34
const WALK_MAX = 86
const BATH_LINES = ['Squeaky clean!', 'Ahh, bubbles!', 'Fresh as a daisy.']
const NEED_LINES = {
  dirty: 'I could really use a bath…',
  sad: 'Play with me? Pretty please?',
  unwell: 'I’m not feeling great. A treat and a bath would help.',
} as const

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
const BATH_MS = 2600

function pick<T>(list: readonly T[]): T {
  return list[Math.floor(Math.random() * list.length)]!
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
}

/**
 * Rocky's world: a scene with Rocky walking around in his outfit. Tap him
 * to pet, give a treat, kick a ball around or give him a bath. Care keeps
 * his health, happiness and cleanliness up — for fun and connection only;
 * nothing here changes XP, Energy or Streak.
 */
export function RockyWorld({ mood, stage, reaction, outfit, speech, treats, needs, onPet, onFeed, onPlay, onBath, hud, action }: Props) {
  const [x, setX] = useState(50)
  const [pose, setPose] = useState<Pose>('idle')
  const [walkMs, setWalkMs] = useState(0)
  const [facingLeft, setFacingLeft] = useState(false)
  const [localLine, setLocalLine] = useState<string | null>(null)
  const [particles, setParticles] = useState<Particle[]>([])
  const [ball, setBall] = useState<{ id: number; x: number; final: boolean } | null>(null)
  const ballRef = useRef<BallHandle>(null)
  // What Rocky's eyes follow: the ball while playing, or where the agent clicked.
  const gazeRef = useRef<{ x: number; y: number } | null>(null)
  const [playing, setPlaying] = useState(false)
  const [clickMark, setClickMark] = useState<{ id: number; x: number; y: number } | null>(null)
  const [treatFlying, setTreatFlying] = useState(false)
  const [muted, setMutedState] = useState(() => isMuted())
  const busyRef = useRef(false)
  // Mirrors busyRef for rendering: care buttons are disabled while Rocky is mid-action.
  const [busy, setBusyState] = useState(false)
  const setBusy = (v: boolean) => {
    busyRef.current = v
    setBusyState(v)
  }
  const idRef = useRef(0)
  const worldRef = useRef<HTMLDivElement>(null)
  const [worldSize, setWorldSize] = useState({ w: 900, h: 420 })
  const worldSizeRef = useRef(worldSize)
  worldSizeRef.current = worldSize
  const model3d = ROCKY_3D_MODELS[stage]
  const [mode3d, setMode3d] = useState<'loading' | 'ready' | 'off'>(() => (model3d && rocky3dEnabled() ? 'loading' : 'off'))
  const [clipRequest, setClipRequest] = useState<ClipRequest | null>(null)
  const nonceRef = useRef(0)
  const is3d = mode3d === 'ready'
  const is3dRef = useRef(false)
  is3dRef.current = is3d
  // 2.5D animated rig (the default): 'loading' until the art is on the canvas.
  const [rigMode, setRigMode] = useState<'loading' | 'ready' | 'off'>(() => (import.meta.env.MODE === 'test' ? 'off' : 'loading'))
  const hatRef = useRef<SVGSVGElement>(null)
  const glassesRef = useRef<SVGSVGElement>(null)
  const headRefs = useMemo(() => [glassesRef], [])
  const animate = !prefersReducedMotion()

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

  // Check-in reactions become animations in 3D, and a little tune.
  useEffect(() => {
    if (!reaction) return
    playClip(REACTION_CLIP[reaction])
    playSfx(reaction === 'level-up' || reaction === 'evolution' ? 'fanfare' : 'chime')
  }, [reaction, playClip])

  useEffect(() => {
    const el = worldRef.current
    if (!el) return
    const measure = () => setWorldSize({ w: el.clientWidth || 900, h: el.clientHeight || 420 })
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

  const burst = useCallback((kind: Particle['kind'], count: number, atX: number, life = 1600) => {
    const fresh = Array.from({ length: count }, () => ({
      id: ++idRef.current,
      x: atX + (Math.random() * 10 - 5),
      kind,
      dx: Math.random() * 40 - 20,
      dy: Math.random() * 30,
    }))
    setParticles((p) => [...p, ...fresh])
    window.setTimeout(() => setParticles((p) => p.filter((q) => !fresh.includes(q))), life)
  }, [])

  const xRef = useRef(50)
  const walkTimer = useRef(0)
  const walkTo = useCallback((target: number, run = false): Promise<void> => {
    const from = xRef.current
    // Never behind the care panel (bottom-left) or off the right edge.
    const clamped = Math.max(WALK_MIN, Math.min(WALK_MAX, target))
    const ms = prefersReducedMotion() ? 0 : Math.min(run ? 1400 : 2600, Math.abs(clamped - from) * (run ? 16 : 45))
    xRef.current = clamped
    if (Math.abs(clamped - from) > 0.5) setFacingLeft(clamped < from)
    setWalkMs(ms)
    setPose(ms > 0 ? (run ? 'run' : 'walk') : 'idle')
    setX(clamped)
    window.clearTimeout(walkTimer.current)
    return new Promise((resolve) => {
      walkTimer.current = window.setTimeout(() => {
        setPose((p) => (p === 'walk' || p === 'run' ? 'idle' : p))
        resolve()
      }, ms)
    })
  }, [])

  // Idle wandering along the route.
  useEffect(() => {
    if (!animate) return
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
  }, [walkTo, reaction, animate])

  // Every so often Rocky acts out his mood (3D only).
  useEffect(() => {
    if (!is3d || !animate) return
    const timer = window.setInterval(() => {
      if (!busyRef.current) playClip(MOOD_CLIP[mood])
    }, 11000)
    return () => window.clearInterval(timer)
  }, [is3d, mood, playClip, animate])

  function handlePet() {
    if (busyRef.current || !onPet()) return
    setPose('pet')
    playClip('Happy')
    playSfx('pop')
    burst('heart', 3, x)
    say(pick(PET_LINES))
    window.setTimeout(() => setPose('idle'), 700)
  }

  function handleFeed() {
    if (busyRef.current) return
    if (treats <= 0) {
      playSfx('nope')
      say('No treats left — check-ins and clean audits earn more.')
      return
    }
    if (!onFeed()) return
    setBusy(true)
    setTreatFlying(true)
    playSfx('tap')
    window.setTimeout(() => {
      setTreatFlying(false)
      setPose('eat')
      playClip('Eat')
      playSfx('chomp')
      burst('crumb', 6, x)
      burst('heart', 2, x)
      say(pick(FEED_LINES))
      window.setTimeout(
        () => {
          setPose('idle')
          setBusy(false)
        },
        is3dRef.current ? 2100 : 1400,
      )
    }, 650)
  }

  /**
   * Play time: the ball drops in and for a while Rocky chases it, dribbling
   * it along; the agent can tap the ball to kick it around. Then Rocky
   * lines up and takes the final shot.
   */
  async function handlePlay() {
    if (busyRef.current) return
    setBusy(true)
    setPlaying(true)
    const target = x > 50 ? 26 + Math.random() * 12 : 62 + Math.random() * 12
    const id = ++idRef.current
    setBall({ id, x: target, final: false })
    playSfx('tap')
    say(PLAY_START)
    const wait = (ms: number) => new Promise((r) => window.setTimeout(r, ms))
    await wait(animate ? 900 : 200)

    if (animate) {
      const until = performance.now() + PLAY_MS
      let lastNudge = 0
      while (performance.now() < until) {
        const b = ballRef.current?.position()
        if (!b) break
        const bx = (b.x / worldSizeRef.current.w) * 100
        const gap = bx - xRef.current
        if (Math.abs(gap) > 7) {
          // Chase: stop just short of the ball, on the side it came from.
          void walkTo(bx - Math.sign(gap) * 5, true)
        } else if (b.y < 30 && performance.now() - lastNudge > 650) {
          // Dribble: a light touch in the direction Rocky is going.
          const dir = gap === 0 ? (Math.random() < 0.5 ? -1 : 1) : Math.sign(gap)
          ballRef.current?.push(dir * (220 + Math.random() * 180), 200 + Math.random() * 260)
          playSfx('bounce')
          if (Math.random() < 0.35) burst('heart', 1, bx)
          lastNudge = performance.now()
        }
        await wait(260)
      }
    }

    // The final shot: run up to the ball and send it flying.
    const b = ballRef.current?.position()
    const bx = b ? (b.x / worldSizeRef.current.w) * 100 : target
    const side = bx > 50 ? 1 : -1 // shoot toward the nearer edge... from the inside
    await walkTo(bx - side * 6, true)
    setPose('hop')
    playClip('Celebrate')
    playSfx('kick')
    ballRef.current?.push(side * 900, 950)
    setBall((cur) => (cur?.id === id ? { ...cur, final: true } : cur))
    burst('heart', 3, bx)
    say(pick(PLAY_LINES))
    onPlay()
    window.setTimeout(() => {
      setPose('idle')
      setPlaying(false)
      setBusy(false)
    }, 1100)
  }

  /** Clicking/tapping the ground: Rocky walks (or runs, if it's far) to that spot and looks at it. */
  function handleStageClick(e: React.MouseEvent<HTMLDivElement>) {
    if ((e.target as Element).closest('button')) return
    if (busyRef.current && !playing) return
    const rect = e.currentTarget.getBoundingClientRect()
    const px = ((e.clientX - rect.left) / rect.width) * 100
    gazeRef.current = { x: e.clientX, y: e.clientY }
    window.setTimeout(() => {
      if (!ball) gazeRef.current = null
    }, 1600)
    setClickMark({ id: ++idRef.current, x: px, y: ((e.clientY - rect.top) / rect.height) * 100 })
    if (!playing) void walkTo(px, Math.abs(px - xRef.current) > 30)
  }

  function handleBath() {
    if (busyRef.current || !onBath()) return
    setBusy(true)
    setPose('bath')
    playSfx('splash')
    window.setTimeout(() => playSfx('bubble'), 500)
    window.setTimeout(() => playSfx('bubble'), 1300)
    burst('bubble', 10, x, BATH_MS)
    window.setTimeout(
      () => {
        setPose('idle')
        burst('sparkle', 7, x, 1400)
        playSfx('chime')
        say(pick(BATH_LINES))
        setBusy(false)
      },
      animate ? BATH_MS : 300,
    )
  }

  function toggleSound() {
    const next = !muted
    setMuted(next)
    setMutedState(next)
    if (!next) playSfx('pop')
  }

  // Rocky's size follows the world's height.
  const size = Math.round(Math.min(340, Math.max(170, worldSize.h * 0.6)))
  const anchor = ROCKY_HEAD_ANCHORS[stage][mood]
  const src = reaction ? getReactionAsset(reaction) : getRockyAsset(stage, mood)
  const equippedHat = outfit.hat ? HAT_ART[outfit.hat] : undefined
  // 2.5D: reaction art has different poses, so the hat comes off for it.
  const hat = !reaction ? equippedHat : undefined
  const hatBox = hat ? hatPlacement(anchor, hat, size) : null
  // Clothes follow the same rule as hats: off for the reaction art's different poses.
  const rigPoints = ROCKY_RIG[stage][mood]
  const glasses = !reaction && outfit.glasses ? GLASSES_ART[outfit.glasses] : undefined
  const neckItem = !reaction && outfit.neck ? NECK_ART[outfit.neck] : undefined
  const backItem = !reaction && outfit.back ? BACK_ART[outfit.back] : undefined
  const feetGap = (1 - (is3d ? FEET_3D : anchor.figureBottom)) * size
  const moving = pose === 'walk' || pose === 'run'
  const facing: -1 | 0 | 1 = moving ? (facingLeft ? -1 : 1) : 0
  const summary = needsSummary(needs)
  const needLine = !reaction && summary in NEED_LINES ? NEED_LINES[summary as keyof typeof NEED_LINES] : null
  const line = localLine ?? needLine ?? speech
  const floorPx = (FLOOR / 100) * worldSize.h
  const bathing = pose === 'bath'
  // Mud shows from 40% dirt and is fully visible at 100%; never during/after a bath.
  const mud = bathing ? 0 : Math.max(0, Math.min(1, (needs.dirt - 40) / 60))
  const rigAction: RigAction = pose === 'bath' ? 'pet' : pose

  return (
    <section className={styles.world} aria-label="Rocky's world">
      <div className={styles.hud}>{hud}</div>

      <div className={styles.stage} ref={worldRef} onClick={handleStageClick}>
        <div className={styles.scene}>
          <SceneArt id={outfit.scene} live={animate} />
        </div>
        <div className={styles.spotlight} aria-hidden="true" />

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
          <Ball
            key={ball.id}
            ref={ballRef}
            x={ball.x}
            final={ball.final}
            stageW={worldSize.w}
            stageH={worldSize.h}
            floor={floorPx}
            animate={animate}
            track={gazeRef}
            stageRef={worldRef}
            onBounce={(s) => s > 0.12 && playSfx('bounce')}
            onTap={() => {
              playSfx('kick')
              say(pick(TAP_LINES), 1400)
            }}
            onDone={() => setBall((b) => (b?.id === ball.id ? null : b))}
          />
        )}

        {clickMark && (
          <span
            key={clickMark.id}
            className={styles.clickMark}
            style={{ left: `${clickMark.x}%`, top: `${clickMark.y}%` }}
            onAnimationEnd={() => setClickMark((c) => (c?.id === clickMark.id ? null : c))}
            aria-hidden="true"
          />
        )}

        {playing && ball && !ball.final && (
          <p className={styles.playHint} role="status">
            Tap the ball to kick it!
          </p>
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
            className={`${styles.body} ${is3d ? styles.body3d : (styles[`pose-${pose}`] ?? '')} ${!is3d && rigMode === 'ready' && pose === 'idle' ? styles.bodyRig : ''}`}
            onClick={handlePet}
            aria-label={`Pet ${ROCKY_VISUALS[stage].label}`}
          >
            <span
              className={
                is3d || !moving
                  ? ''
                  : facingLeft
                    ? pose === 'run'
                      ? styles.runLeft
                      : styles.leanLeft
                    : pose === 'run'
                      ? styles.runRight
                      : styles.leanRight
              }
            >
              {!is3d && backItem && (
                <svg
                  className={styles.wearBack}
                  viewBox={WEAR_VIEWBOX.back}
                  preserveAspectRatio="none"
                  style={backPlacement(rigPoints, anchor, size, outfit.back!)}
                  aria-hidden="true"
                >
                  {backItem}
                </svg>
              )}
              {mode3d !== 'off' && model3d && (
                <Rocky3D
                  url={model3d}
                  size={size}
                  walking={moving}
                  facing={facing}
                  request={clipRequest}
                  hat={equippedHat}
                  animate={animate}
                  onReady={() => setMode3d('ready')}
                  onFail={() => setMode3d('off')}
                />
              )}
              {!is3d && !reaction && rigMode !== 'off' && (
                <RockyRig
                  src={src}
                  rig={ROCKY_RIG[stage][mood]}
                  size={size}
                  mood={mood}
                  action={rigAction}
                  animate={animate}
                  facing={facing}
                  lookAt={gazeRef}
                  hatRef={hatRef}
                  headRefs={headRefs}
                  onReady={() => setRigMode('ready')}
                  onFail={() => setRigMode('off')}
                />
              )}
              {!is3d && (reaction || rigMode !== 'ready') && <img key={src} src={src} alt="" className={styles.art} draggable={false} />}
              {!is3d && neckItem && (
                <svg className={styles.wear} viewBox={WEAR_VIEWBOX.neck} style={neckPlacement(rigPoints, anchor, size)} aria-hidden="true">
                  {neckItem}
                </svg>
              )}
              {!is3d && glasses && (
                <svg
                  ref={glassesRef}
                  className={styles.wear}
                  viewBox={WEAR_VIEWBOX.glasses}
                  style={glassesPlacement(rigPoints, anchor, size)}
                  aria-hidden="true"
                >
                  {glasses}
                </svg>
              )}
              {!is3d && hat && hatBox && (
                <svg ref={hatRef} className={styles.hat} viewBox="0 0 100 60" style={hatBox} aria-hidden="true">
                  {hat.svg}
                </svg>
              )}
            </span>
            {/* Mud on the fur and belly — it builds up with time and play and washes off in the bath. */}
            {mud > 0 && (
              <span className={styles.mud} style={{ opacity: mud }} aria-hidden="true">
                <i style={{ left: '30%', top: '62%', width: '16%', height: '11%' }} />
                <i style={{ left: '56%', top: '70%', width: '13%', height: '9%' }} />
                <i style={{ left: '38%', top: '80%', width: '20%', height: '8%' }} />
                <i style={{ left: '60%', top: '48%', width: '10%', height: '7%' }} />
                <i style={{ left: '32%', top: '44%', width: '8%', height: '6%' }} />
              </span>
            )}
            {mud > 0.6 && animate && (
              <span className={styles.flies} aria-hidden="true">
                <i />
                <i />
              </span>
            )}
            {bathing && (
              <span className={styles.bath} aria-hidden="true">
                <span className={styles.showerHead} />
                <span className={styles.water} />
                <span className={styles.foam}>
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                </span>
              </span>
            )}
          </button>
          {treatFlying && <span className={styles.treat} aria-hidden="true" />}
        </div>

        {particles.map((p) => (
          <span
            key={p.id}
            className={styles[p.kind]}
            style={{
              left: `calc(${p.x}% + ${p.dx}px)`,
              bottom: `calc(${FLOOR + (p.kind === 'heart' ? 38 : p.kind === 'crumb' ? 20 : 26)}% + ${p.dy}px)`,
            }}
            aria-hidden="true"
          >
            {p.kind === 'heart' ? '❤' : ''}
          </span>
        ))}

        <FxLayer id={outfit.fx} />
        <div className={styles.vignette} aria-hidden="true" />
        <button
          type="button"
          className={styles.sound}
          onClick={toggleSound}
          aria-pressed={!muted}
          aria-label={muted ? 'Turn sound on' : 'Turn sound off'}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M4 9h4l5-4v14l-5-4H4z" />
            {muted ? <path d="M17 9l5 5M22 9l-5 5" /> : <path d="M16.5 8.5a5 5 0 0 1 0 7M19.5 5.5a9 9 0 0 1 0 13" />}
          </svg>
        </button>
      </div>

      <div className={styles.dock}>
        <NeedsDock
          needs={needs}
          treats={treats}
          busy={busy}
          playing={playing}
          onPet={handlePet}
          onFeed={handleFeed}
          onPlay={() => void handlePlay()}
          onBath={handleBath}
        />
        <div className={styles.primary}>{action}</div>
      </div>
    </section>
  )
}
