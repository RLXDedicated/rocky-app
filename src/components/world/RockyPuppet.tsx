import type { CSSProperties } from 'react'
import meta from '../../assets/rocky/official/puppet/puppet.json'
import tail from '../../assets/rocky/official/puppet/tail.png'
import legLeft from '../../assets/rocky/official/puppet/leg-left.png'
import legRight from '../../assets/rocky/official/puppet/leg-right.png'
import armLeft from '../../assets/rocky/official/puppet/arm-left.png'
import armRight from '../../assets/rocky/official/puppet/arm-right.png'
import body from '../../assets/rocky/official/puppet/body.png'
import head from '../../assets/rocky/official/puppet/head.png'
import styles from './RockyPuppet.module.css'
import type { HeadAnchor, RockyRigPoints } from '../rockyWorldRig'

/**
 * Rocky as a cut-out puppet: the official A-pose art in pieces
 * (tools/build-rocky-puppet.py), each moved and turned at its joint by CSS.
 * The pieces are the delivered pixels — nothing is redrawn or stretched —
 * and at rest they rebuild the A-pose exactly.
 */
export type PuppetAction = 'idle' | 'walk' | 'run' | 'pet' | 'eat' | 'hop' | 'bath'

const SRC: Record<string, string> = {
  tail,
  'leg-left': legLeft,
  'leg-right': legRight,
  'arm-left': armLeft,
  'arm-right': armRight,
  body,
  head,
}

type Box = { x: number; y: number; w: number; h: number }
const BOXES = meta.boxes as Record<string, Box>
const PIVOTS = meta.pivots as Record<string, { x: number; y: number }>

const pct = (v: number, of: number) => `${(v / of) * 100}%`

export function RockyPuppet({ action, animate }: { action: PuppetAction; animate: boolean }) {
  return (
    <span className={`${styles.puppet} ${animate ? styles[action] : ''}`} aria-hidden="true">
      {meta.order.map((name) => {
        const b = BOXES[name]!
        const p = PIVOTS[name]!
        const style: CSSProperties = {
          left: pct(b.x, meta.width),
          top: pct(b.y, meta.height),
          width: pct(b.w, meta.width),
          height: pct(b.h, meta.height),
          transformOrigin: `${pct(p.x - b.x, b.w)} ${pct(p.y - b.y, b.h)}`,
        }
        return <img key={name} src={SRC[name]} alt="" draggable={false} className={`${styles.piece} ${styles[name]}`} style={style} />
      })}
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
