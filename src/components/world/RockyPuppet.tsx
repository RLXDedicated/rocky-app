import type { CSSProperties, ReactNode } from 'react'
import meta from '../../assets/rocky/official/puppet/puppet.json'
import tail from '../../assets/rocky/official/puppet/tail.png'
import thighLeft from '../../assets/rocky/official/puppet/thigh-left.png'
import thighRight from '../../assets/rocky/official/puppet/thigh-right.png'
import shinLeft from '../../assets/rocky/official/puppet/shin-left.png'
import shinRight from '../../assets/rocky/official/puppet/shin-right.png'
import upperArmLeft from '../../assets/rocky/official/puppet/upper-arm-left.png'
import upperArmRight from '../../assets/rocky/official/puppet/upper-arm-right.png'
import forearmLeft from '../../assets/rocky/official/puppet/forearm-left.png'
import forearmRight from '../../assets/rocky/official/puppet/forearm-right.png'
import body from '../../assets/rocky/official/puppet/body.png'
import head from '../../assets/rocky/official/puppet/head.png'
import styles from './RockyPuppet.module.css'
import type { HeadAnchor, RockyRigPoints } from '../rockyWorldRig'

/**
 * Rocky as a cut-out puppet: the design team's layers of the official A-pose
 * (tools/build-rocky-puppet.py), turned at their joints by CSS. The visible
 * pixels are the approved art, so at rest the puppet is the A-pose exactly;
 * each piece continues under its neighbour, so a turn shows art, not a gap.
 * Joints chain like a body: the shoulder carries the elbow, the hip the knee.
 */
export type PuppetAction = 'idle' | 'walk' | 'run' | 'pet' | 'eat' | 'hop' | 'bath'

const SRC: Record<string, string> = {
  tail,
  'thigh-left': thighLeft,
  'thigh-right': thighRight,
  'shin-left': shinLeft,
  'shin-right': shinRight,
  'upper-arm-left': upperArmLeft,
  'upper-arm-right': upperArmRight,
  'forearm-left': forearmLeft,
  'forearm-right': forearmRight,
  body,
  head,
}

type Box = { x: number; y: number; w: number; h: number }
const BOXES = meta.boxes as Record<string, Box>
const JOINTS = meta.joints as Record<string, { x: number; y: number }>
const W = meta.width
const H = meta.height

const pct = (v: number, of: number) => `${(v / of) * 100}%`

/** One piece of art, placed on the full canvas. */
function Piece({ name }: { name: string }) {
  const b = BOXES[name]!
  const style: CSSProperties = { left: pct(b.x, W), top: pct(b.y, H), width: pct(b.w, W), height: pct(b.h, H) }
  return <img src={SRC[name]} alt="" draggable={false} className={styles.piece} style={style} />
}

/** A limb segment that turns at `joint`; everything inside turns with it. */
function Joint({ joint, part, children }: { joint: string; part: string; children: ReactNode }) {
  const j = JOINTS[joint]!
  return (
    <span className={`${styles.joint} ${styles[part]}`} style={{ transformOrigin: `${pct(j.x, W)} ${pct(j.y, H)}` }}>
      {children}
    </span>
  )
}

export function RockyPuppet({ action, animate }: { action: PuppetAction; animate: boolean }) {
  // Back to front, as the art stacks: tail, legs (shin over thigh), arms
  // (upper arm over forearm), head, then the body over the neck.
  return (
    <span className={`${styles.puppet} ${animate ? styles[action] : ''}`} aria-hidden="true">
      <Joint joint="tail" part="tail">
        <Piece name="tail" />
      </Joint>
      <Joint joint="hip-left" part="legL">
        <Piece name="thigh-left" />
        <Joint joint="knee-left" part="shinL">
          <Piece name="shin-left" />
        </Joint>
      </Joint>
      <Joint joint="hip-right" part="legR">
        <Piece name="thigh-right" />
        <Joint joint="knee-right" part="shinR">
          <Piece name="shin-right" />
        </Joint>
      </Joint>
      <Joint joint="shoulder-left" part="armL">
        <Joint joint="elbow-left" part="foreL">
          <Piece name="forearm-left" />
        </Joint>
        <Piece name="upper-arm-left" />
      </Joint>
      <Joint joint="shoulder-right" part="armR">
        <Joint joint="elbow-right" part="foreR">
          <Piece name="forearm-right" />
        </Joint>
        <Piece name="upper-arm-right" />
      </Joint>
      <Joint joint="neck" part="head">
        <Piece name="head" />
      </Joint>
      <Joint joint="neck" part="body">
        <Piece name="body" />
      </Joint>
    </span>
  )
}

/** Where the puppet sits in Rocky's square box: feet on 94%, figure ≈86% tall. */
export const PUPPET_FRAME = (() => {
  const scale = 0.86 / meta.height
  const width = meta.width * scale
  const top = 0.94 - 1360 * scale // the shoes' soles are at y≈1360 of the art
  return { left: (1 - width) / 2, top, width, height: 0.86, scale }
})()

/** Canvas pixel → fraction of Rocky's square box (for hats, glasses…). */
export const puppetPoint = (x: number, y: number) => ({
  x: PUPPET_FRAME.left + x * PUPPET_FRAME.scale,
  y: PUPPET_FRAME.top + y * PUPPET_FRAME.scale,
})

const PREF_KEY = 'rocky.puppet'

/**
 * The cut-out puppet is on for everyone (the calm moods). `?puppet=0` turns it
 * off in this browser (back to the still official pose), `?puppet=1` back on.
 */
export function puppetEnabled(): boolean {
  if (import.meta.env.MODE === 'test') return false
  try {
    const q = new URLSearchParams(window.location.search).get('puppet')
    if (q === '0') window.localStorage.setItem(PREF_KEY, 'off')
    if (q === '1') window.localStorage.removeItem(PREF_KEY)
    return window.localStorage.getItem(PREF_KEY) !== 'off'
  } catch {
    return true
  }
}

const at = (x: number, y: number) => puppetPoint(x, y)
const s = PUPPET_FRAME.scale

/** Head, eyes, collar and hips on the A-pose (canvas pixels → box fractions). */
export const PUPPET_ANCHOR: HeadAnchor = {
  x: at(565, 0).x,
  y: at(0, 60).y,
  w: 470 * s,
  figureTop: at(0, 15).y,
  figureBottom: 0.94,
}

export const PUPPET_RIG: RockyRigPoints = {
  neck: at(0, 560).y,
  pivot: at(565, 540),
  chest: at(0, 700).y,
  feet: 0.94,
  top: at(0, 15).y,
  hip: at(0, 870).y,
  splitX: at(568, 0).x,
  eyes: [
    { ...at(480, 310), r: 45 * s },
    { ...at(660, 310), r: 45 * s },
  ],
}
