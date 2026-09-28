// Clothes and accessories beyond hats: glasses (on the measured eyes, and
// moving with the head), things worn at the neck (bow tie, scarf, tie,
// medal, RLX ID badge…) and things worn on the back (cape, wings,
// backpack — drawn behind Rocky). Placement uses the rig points measured on
// each approved artwork (tools/build-rocky-rig.py) and the head anchors, so
// every item sits right on every stage and mood. Rocky himself is never
// redrawn — these are overlays.
import type { ReactElement } from 'react'
import type { HeadAnchor } from '../rockyAnchors'
import type { RockyRigPoints } from '../rockyRig'
import type { HatBox } from './art'

const NAVY = '#0f2341'
const GREEN = '#008c45'
const GREEN2 = '#1fbf68'
const GOLD = '#f5b82e'
const WHITE = '#ffffff'

// ---------------------------------------------------------------------------
// Glasses: 100x40 box, lens centres at (25,20) and (75,20).
// ---------------------------------------------------------------------------
export const GLASSES_ART: Record<string, ReactElement> = {
  'glasses-round': (
    <>
      <circle cx="25" cy="20" r="15" fill="#dff1ff" opacity="0.35" stroke="#3a2a1e" strokeWidth="3.5" />
      <circle cx="75" cy="20" r="15" fill="#dff1ff" opacity="0.35" stroke="#3a2a1e" strokeWidth="3.5" />
      <path d="M40 18 Q50 13 60 18" stroke="#3a2a1e" strokeWidth="3" fill="none" />
      <path d="M10 16 L1 12 M90 16 L99 12" stroke="#3a2a1e" strokeWidth="3" strokeLinecap="round" />
      <path d="M17 12 L22 10" stroke={WHITE} strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
      <path d="M67 12 L72 10" stroke={WHITE} strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
    </>
  ),
  'glasses-sun': (
    <>
      <path d="M6 10 H44 Q44 34 26 34 Q8 34 6 10 Z" fill="#1b2433" />
      <path d="M56 10 H94 Q92 34 74 34 Q56 34 56 10 Z" fill="#1b2433" />
      <path d="M44 14 Q50 10 56 14" stroke="#1b2433" strokeWidth="4" fill="none" />
      <path d="M6 12 L0 9 M94 12 L100 9" stroke="#1b2433" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M12 15 L22 15 M62 15 L72 15" stroke={WHITE} strokeWidth="3" strokeLinecap="round" opacity="0.55" />
    </>
  ),
  'glasses-star': (
    <>
      {[25, 75].map((cx) => (
        <polygon
          key={cx}
          points={Array.from({ length: 10 }, (_, i) => {
            const a = (Math.PI / 5) * i - Math.PI / 2
            const r = i % 2 === 0 ? 19 : 9
            return `${cx + r * Math.cos(a)},${21 + r * Math.sin(a)}`
          }).join(' ')}
          fill={GOLD}
          stroke="#c07a0c"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      ))}
      <path d="M42 18 Q50 14 58 18" stroke="#c07a0c" strokeWidth="3" fill="none" />
    </>
  ),
  'glasses-heart': (
    <>
      {[25, 75].map((cx) => (
        <path
          key={cx}
          d={`M${cx} 34 C${cx - 22} 20 ${cx - 16} 2 ${cx} 12 C${cx + 16} 2 ${cx + 22} 20 ${cx} 34 Z`}
          fill="#ff5c8a"
          stroke="#c7305c"
          strokeWidth="2.5"
          opacity="0.92"
        />
      ))}
      <path d="M40 16 Q50 12 60 16" stroke="#c7305c" strokeWidth="3" fill="none" />
    </>
  ),
  'glasses-3d': (
    <>
      <rect x="4" y="7" width="92" height="27" rx="5" fill={WHITE} stroke="#d7dee6" strokeWidth="2" />
      <rect x="10" y="11" width="32" height="19" rx="3" fill="#e2445c" opacity="0.85" />
      <rect x="58" y="11" width="32" height="19" rx="3" fill="#2f8fd8" opacity="0.85" />
    </>
  ),
}

// ---------------------------------------------------------------------------
// Neck: 100x70 box, the knot/collar centre at (50,10).
// ---------------------------------------------------------------------------
export const NECK_ART: Record<string, ReactElement> = {
  'neck-lanyard': (
    <>
      <path d="M22 0 L44 44 M78 0 L56 44" stroke={GREEN} strokeWidth="5" strokeLinecap="round" />
      <rect x="36" y="40" width="28" height="30" rx="4" fill={WHITE} stroke="#c9d2da" strokeWidth="1.5" />
      <rect x="36" y="40" width="28" height="8" rx="3" fill={NAVY} />
      <circle cx="50" cy="56" r="5" fill="#e7c7a4" />
      <rect x="41" y="63" width="18" height="3" rx="1.5" fill={GREEN} />
      <text x="42" y="46.5" fontFamily="Poppins, sans-serif" fontWeight="800" fontSize="6" fill={WHITE}>
        RLX
      </text>
    </>
  ),
  'neck-bowtie': (
    <>
      <path d="M50 12 L22 0 L22 26 Z" fill={GREEN} stroke="#006b35" strokeWidth="2" strokeLinejoin="round" />
      <path d="M50 12 L78 0 L78 26 Z" fill={GREEN} stroke="#006b35" strokeWidth="2" strokeLinejoin="round" />
      <rect x="43" y="5" width="14" height="15" rx="4" fill="#006b35" />
      <circle cx="30" cy="8" r="2" fill={WHITE} opacity="0.7" />
      <circle cx="70" cy="18" r="2" fill={WHITE} opacity="0.7" />
    </>
  ),
  'neck-scarf': (
    <>
      <path d="M8 6 Q50 24 92 6 L94 18 Q50 38 6 18 Z" fill="#d6333a" />
      <path d="M62 20 L74 64 L60 66 L52 24 Z" fill="#c1272f" />
      {[16, 30, 44, 58, 72, 86].map((x) => (
        <path key={x} d={`M${x} ${x < 50 ? 10 + (x - 8) * 0.3 : 10 + (92 - x) * 0.3} l0 10`} stroke={WHITE} strokeWidth="3" opacity="0.8" />
      ))}
      <path d="M62 64 l2 6 M66 64 l2 6 M70 63 l2 6" stroke="#c1272f" strokeWidth="2" />
    </>
  ),
  'neck-bandana': (
    <>
      <path d="M10 4 Q50 18 90 4 L50 50 Z" fill={NAVY} />
      <path d="M10 4 Q50 18 90 4" stroke="#1b3358" strokeWidth="4" fill="none" />
      {[
        [34, 18],
        [50, 26],
        [66, 18],
        [50, 38],
        [42, 30],
        [58, 30],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="2.2" fill={WHITE} opacity="0.85" />
      ))}
    </>
  ),
  'neck-tie': (
    <>
      <path d="M38 2 L62 2 L56 14 L44 14 Z" fill={NAVY} />
      <path d="M44 14 L56 14 L64 58 L50 70 L36 58 Z" fill={NAVY} />
      <path d="M40 24 L60 30 M38 38 L62 44 M38 52 L62 58" stroke={GREEN2} strokeWidth="4" />
    </>
  ),
  'neck-medal': (
    <>
      <path d="M26 0 L46 38 M74 0 L54 38" stroke={GREEN} strokeWidth="9" />
      <path d="M26 0 L46 38 M74 0 L54 38" stroke={WHITE} strokeWidth="2" opacity="0.7" />
      <circle cx="50" cy="52" r="16" fill={GOLD} stroke="#c07a0c" strokeWidth="3" />
      <polygon points="50,42 53,49 60,49 55,54 57,61 50,57 43,61 45,54 40,49 47,49" fill="#fff3c9" />
    </>
  ),
}

// ---------------------------------------------------------------------------
// Back: 100x120 box, shoulders across the top; drawn behind Rocky.
// ---------------------------------------------------------------------------
export const BACK_ART: Record<string, ReactElement> = {
  'back-cape': (
    <>
      <path d="M20 2 Q50 12 80 2 L94 112 Q50 124 6 112 Z" fill="#d6333a" />
      <path d="M20 2 Q50 12 80 2 L84 34 Q50 44 16 34 Z" fill="#b8262e" opacity="0.55" />
      <path d="M26 44 L16 108 M74 44 L84 108" stroke="#b8262e" strokeWidth="3" opacity="0.5" />
      <path d="M20 2 Q50 12 80 2" stroke={GOLD} strokeWidth="4" fill="none" />
    </>
  ),
  'back-wings': (
    <>
      {['', 'translate(100 0) scale(-1 1)'].map((t) => (
        <g key={t} transform={t || undefined}>
          <path
            d="M40 26 C28 4 8 2 3 20 C-1 32 4 40 12 42 C4 48 4 60 14 62 C8 70 12 82 24 80 C26 90 38 92 42 80 Z"
            fill={WHITE}
            stroke="#c9d9e8"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path d="M36 34 C26 26 16 26 10 30 M38 50 C28 44 18 46 14 52 M40 66 C32 62 26 64 22 70" stroke="#c9d9e8" strokeWidth="2" fill="none" />
        </g>
      ))}
    </>
  ),
  'back-backpack': (
    <>
      <path d="M40 2 Q50 -6 60 2" stroke="#8a5a2b" strokeWidth="5" fill="none" strokeLinecap="round" />
      <rect x="10" y="4" width="80" height="104" rx="22" fill="#c99a63" />
      <path d="M10 30 Q50 44 90 30 L90 26 Q90 4 68 4 L32 4 Q10 4 10 26 Z" fill="#b88650" />
      <rect x="44" y="30" width="12" height="8" rx="2" fill={GREEN} />
      <rect x="2" y="54" width="14" height="44" rx="7" fill="#b88650" />
      <rect x="84" y="54" width="14" height="44" rx="7" fill="#b88650" />
    </>
  ),
}

/** How wide each back item is relative to the face (wings spread past the body). */
const BACK_WIDTH: Record<string, number> = { 'back-cape': 1.3, 'back-wings': 1.9, 'back-backpack': 1.15 }

export type WearSlot = 'glasses' | 'neck' | 'back'

/** Glasses over the measured eyes (or, for closed-eye art, the face estimate from the head anchor). */
export function glassesPlacement(rig: RockyRigPoints, anchor: HeadAnchor, size: number): HatBox {
  let cx: number, cy: number, span: number
  if (rig.eyes.length === 2) {
    const [a, b] = rig.eyes as [{ x: number; y: number; r: number }, { x: number; y: number; r: number }]
    cx = (a.x + b.x) / 2
    cy = (a.y + b.y) / 2
    span = Math.abs(b.x - a.x)
  } else {
    cx = rig.pivot.x
    cy = anchor.y + anchor.w * 0.62
    span = anchor.w * 0.36
  }
  // Lens centres are 50 units apart in the 100-wide art.
  const width = span * 2 * size
  const height = width * 0.4
  return { left: cx * size - width / 2, top: cy * size - height / 2, width, height }
}

/** Neck items: the knot sits on the collar (the measured neck line), centred under the head. */
export function neckPlacement(rig: RockyRigPoints, anchor: HeadAnchor, size: number): HatBox {
  const width = anchor.w * 0.62 * size
  const height = width * 0.7
  return { left: rig.pivot.x * size - width / 2, top: rig.neck * size - width * 0.13, width, height }
}

/** Back items: from just above the shoulders down to the hips, behind the body (the SVG stretches to this box). */
export function backPlacement(rig: RockyRigPoints, anchor: HeadAnchor, size: number, id: string): HatBox {
  const width = anchor.w * (BACK_WIDTH[id] ?? 1.2) * size
  const top = (rig.neck - 0.035) * size
  const height = (rig.hip + 0.05) * size - top
  const cx = (rig.pivot.x + rig.splitX) / 2
  return { left: cx * size - width / 2, top, width, height }
}

export const WEAR_VIEWBOX: Record<WearSlot, string> = { glasses: '0 0 100 40', neck: '0 0 100 70', back: '0 0 100 120' }
export const WEAR_ART: Record<WearSlot, Record<string, ReactElement>> = { glasses: GLASSES_ART, neck: NECK_ART, back: BACK_ART }
