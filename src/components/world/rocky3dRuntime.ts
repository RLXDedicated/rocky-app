// three.js runtime for the 3D Rocky. Loaded on demand (dynamic import from
// Rocky3D.tsx) so three.js never weighs on the app's first paint, and so a
// device without WebGL simply keeps the 2.5D artwork.
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js'

export type RockyClip = 'Idle' | 'Walk' | 'Wave' | 'Eat' | 'Celebrate' | 'Happy' | 'Motivated' | 'Worried' | 'Recovery'

export const ONE_SHOT_CLIPS: RockyClip[] = ['Wave', 'Eat', 'Celebrate', 'Happy', 'Motivated', 'Worried', 'Recovery']

/** Where the head is on the canvas this frame, in CSS px — drives the hat overlay. */
export interface HeadPose {
  /** Top-centre of the hair tuft. */
  x: number
  y: number
  /** Face width in px (same meaning as the 2.5D head anchors' `w`). */
  faceWidth: number
  /** Head roll in degrees (screen space). */
  roll: number
}

// Visible model-space window: feet (y=0) sit at ~94.5% of the canvas height,
// matching where the 2.5D artwork puts Rocky's feet.
const VIEW_BOTTOM = -0.06
const VIEW_TOP = 1.04
const FOV = 20
// Face (ear to ear) is ~0.57 model units wide on the Baby model — the same
// proportion of Rocky's height as the 2.5D head anchors' face width.
const FACE_WIDTH_UNITS = 0.57

const gltfCache = new Map<string, Promise<{ scene: THREE.Group; animations: THREE.AnimationClip[] }>>()

function loadModel(url: string) {
  let p = gltfCache.get(url)
  if (!p) {
    p = new GLTFLoader().loadAsync(url).then((g) => ({ scene: g.scene, animations: g.animations }))
    gltfCache.set(url, p)
  }
  return p
}

export interface RockyStage3D {
  play(clip: RockyClip, opts?: { loop?: boolean; onDone?: () => void }): void
  setFacing(direction: -1 | 0 | 1): void
  setSize(px: number): void
  dispose(): void
}

export async function createRockyStage(opts: {
  canvas: HTMLCanvasElement
  url: string
  size: number
  animate: boolean
  onHead: (pose: HeadPose) => void
}): Promise<RockyStage3D> {
  const { canvas, url, animate, onHead } = opts
  let size = opts.size

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.setSize(size, size, false)
  renderer.outputColorSpace = THREE.SRGBColorSpace

  const scene = new THREE.Scene()
  // Bright, soft, front-lit — the model should read as cheerfully as the 2.5D art.
  scene.add(new THREE.HemisphereLight(0xffffff, 0xb8c4d2, 2.6))
  const key = new THREE.DirectionalLight(0xffffff, 1.3)
  key.position.set(0.8, 1.6, 3)
  scene.add(key)
  const fill = new THREE.DirectionalLight(0xffffff, 0.7)
  fill.position.set(-1.5, 0.8, 2)
  scene.add(fill)

  const centerY = (VIEW_TOP + VIEW_BOTTOM) / 2
  const distance = (VIEW_TOP - VIEW_BOTTOM) / 2 / Math.tan(THREE.MathUtils.degToRad(FOV / 2))
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 20)
  camera.position.set(0, centerY, distance)
  camera.lookAt(0, centerY, 0)

  const { scene: source, animations } = await loadModel(url)
  // One Rocky per stage component; clone so the cached source stays pristine.
  const model = clone(source) as THREE.Group
  scene.add(model)

  const headTop = model.getObjectByName('mixamorigHeadTop_End') ?? model.getObjectByName('mixamorig:HeadTop_End')
  const head = model.getObjectByName('mixamorigHead') ?? model.getObjectByName('mixamorig:Head')

  // HeadTop_End sits at eye level on this rig; the hair tuft reaches the top
  // of the model. Measure, in the rest pose, how far along the Head→HeadTop
  // axis the tuft is, so the hat follows the head as it tilts.
  let tuftReach = 1
  if (head && headTop) {
    model.updateMatrixWorld(true)
    const top = new THREE.Box3().setFromObject(model).max.y
    const hy = head.getWorldPosition(new THREE.Vector3()).y
    const ty = headTop.getWorldPosition(new THREE.Vector3()).y
    if (ty - hy > 1e-4) tuftReach = (top - hy) / (ty - hy)
  }

  const mixer = new THREE.AnimationMixer(model)
  const actions = new Map<string, THREE.AnimationAction>()
  for (const clip of animations) actions.set(clip.name, mixer.clipAction(clip))
  let current: THREE.AnimationAction | null = null
  let doneHandler: (() => void) | null = null

  mixer.addEventListener('finished', (e) => {
    if (e.action === current && doneHandler) {
      const cb = doneHandler
      doneHandler = null
      cb()
    }
  })

  function play(name: RockyClip, o: { loop?: boolean; onDone?: () => void } = {}) {
    const next = actions.get(name) ?? actions.get('Idle')
    if (!next) return
    doneHandler = o.onDone ?? null
    next.reset()
    next.setLoop(o.loop === false ? THREE.LoopOnce : THREE.LoopRepeat, Infinity)
    next.clampWhenFinished = o.loop === false
    if (!animate) {
      // Reduced motion: no blending (time never advances, so a crossfade
      // would freeze half-way) — switch straight to the new pose.
      mixer.stopAllAction()
      next.play()
      current = next
      return
    }
    if (current && current !== next) next.crossFadeFrom(current, 0.25, false)
    next.play()
    current = next
  }

  let facing = 0
  let targetFacing = 0
  function setFacing(direction: -1 | 0 | 1) {
    targetFacing = direction * 0.85
  }

  const v = new THREE.Vector3()
  const v2 = new THREE.Vector3()
  function toScreen(p: THREE.Vector3) {
    p.project(camera)
    return { x: ((p.x + 1) / 2) * size, y: ((1 - p.y) / 2) * size }
  }

  function reportHead() {
    if (!headTop || !head) return
    head.getWorldPosition(v2)
    headTop.getWorldPosition(v)
    v.sub(v2).multiplyScalar(tuftReach).add(v2) // hair-tuft top
    const top = toScreen(v.clone())
    const base = toScreen(v2.clone())
    // Face width: project a horizontal segment through the head.
    const l = toScreen(v2.clone().add(new THREE.Vector3(-FACE_WIDTH_UNITS / 2, 0, 0)))
    const r = toScreen(v2.clone().add(new THREE.Vector3(FACE_WIDTH_UNITS / 2, 0, 0)))
    const roll = THREE.MathUtils.radToDeg(Math.atan2(top.x - base.x, base.y - top.y))
    onHead({ x: top.x, y: top.y, faceWidth: Math.abs(r.x - l.x), roll })
  }

  let last = performance.now()
  let raf = 0
  let disposed = false
  function frame() {
    if (disposed) return
    const now = performance.now()
    const dt = Math.min((now - last) / 1000, 0.1)
    last = now
    facing += (targetFacing - facing) * Math.min(1, dt * 8)
    model.rotation.y = facing
    mixer.update(dt)
    renderer.render(scene, camera)
    reportHead()
    if (animate) raf = requestAnimationFrame(frame)
  }

  play('Idle')
  if (!animate) mixer.update(0)
  frame()

  return {
    play(name, o) {
      play(name, o)
      if (!animate) {
        // Reduced motion: a still pose, no motion; one-shots end at once.
        mixer.update(0)
        frame()
        o?.onDone?.()
      }
    },
    setFacing,
    setSize(px: number) {
      size = px
      renderer.setSize(px, px, false)
      if (!animate) frame()
    },
    dispose() {
      disposed = true
      cancelAnimationFrame(raf)
      mixer.stopAllAction()
      model.traverse((o) => {
        const mesh = o as THREE.Mesh
        if (mesh.isMesh) {
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
          mats.forEach((m) => m.dispose())
        }
      })
      renderer.dispose()
    },
  }
}
