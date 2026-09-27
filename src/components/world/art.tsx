// Flat, RLX-style vector art for Rocky's world: hats, room props and scenes.
// Rocky himself is NEVER drawn here — the approved 2.5D artwork is the only
// Rocky. These are accessories and environments layered around it.
import type { ReactElement } from 'react'
import type { HeadAnchor } from '../rockyAnchors'

const NAVY = '#0f2341'
const NAVY2 = '#1b3358'
const GREEN = '#008c45'
const GREEN2 = '#1fbf68'
const GOLD = '#f5b82e'
const WHITE = '#ffffff'

// ---------------------------------------------------------------------------
// Hats. Each is drawn in a 100x60 box. `width` is relative to the measured
// face width; `sink` is how far below the top of the hair tuft the hat's
// brim sits, also relative to face width (the tuft is tall, the skull is
// lower). See hatPlacement().
// ---------------------------------------------------------------------------
export interface HatArt {
  width: number
  sink: number
  svg: ReactElement
}

export interface HatBox {
  left: number
  top: number
  width: number
  height: number
}

/** Where to draw a hat over a Rocky rendered at `size` px, from that artwork's head anchor. */
export function hatPlacement(anchor: HeadAnchor, hat: HatArt, size: number): HatBox {
  const width = anchor.w * hat.width * size
  const height = width * 0.6
  const brim = (anchor.y + anchor.w * hat.sink) * size
  return { left: anchor.x * size - width / 2, top: brim - height, width, height }
}

export const HAT_ART: Record<string, HatArt> = {
  'hat-rlx-cap': {
    width: 0.78,
    sink: 0.42,
    svg: (
      <>
        <path d="M14 48 C14 18 34 6 52 6 C72 6 88 20 88 46 Z" fill={GREEN} />
        <path d="M52 6 C58 16 60 32 58 47" stroke="#006b35" strokeWidth="2" fill="none" />
        <path d="M60 44 C76 40 94 42 99 50 C92 55 74 55 58 53 Z" fill={NAVY} />
        <rect x="12" y="44" width="78" height="7" rx="3" fill="#006b35" />
        <text x="34" y="36" fontFamily="Poppins, sans-serif" fontWeight="800" fontSize="15" fill={WHITE}>
          RLX
        </text>
        <circle cx="51" cy="7" r="3" fill="#006b35" />
      </>
    ),
  },
  'hat-headset': {
    width: 1.04,
    sink: 0.6,
    svg: (
      <>
        <path d="M11 40 C11 -6 89 -6 89 40" stroke={NAVY} strokeWidth="6" fill="none" strokeLinecap="round" />
        <path d="M11 40 C11 -6 89 -6 89 40" stroke={GREEN} strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.9" />
        <rect x="1" y="32" width="19" height="26" rx="8" fill={NAVY2} />
        <rect x="80" y="32" width="19" height="26" rx="8" fill={NAVY2} />
        <rect x="4" y="36" width="13" height="18" rx="5" fill={GREEN} />
        <rect x="83" y="36" width="13" height="18" rx="5" fill={GREEN} />
        <path d="M90 56 C90 66 84 69 76 68" stroke={NAVY} strokeWidth="3" fill="none" strokeLinecap="round" />
        <circle cx="74" cy="68" r="3.5" fill={NAVY} />
      </>
    ),
  },
  'hat-party': {
    width: 0.5,
    sink: 0.2,
    svg: (
      <>
        <path d="M22 58 L50 4 L78 58 Z" fill={GREEN} />
        <path d="M31 40 L69 40 L74 50 L26 50 Z" fill={WHITE} opacity="0.9" />
        <path d="M40 22 L60 22 L64 30 L36 30 Z" fill={WHITE} opacity="0.9" />
        <circle cx="50" cy="5" r="6" fill={GOLD} />
        <rect x="20" y="54" width="60" height="6" rx="3" fill={GOLD} />
      </>
    ),
  },
  'hat-hardhat': {
    width: 0.86,
    sink: 0.4,
    svg: (
      <>
        <path d="M14 46 C14 16 32 6 50 6 C68 6 86 16 86 46 Z" fill="#f7c531" />
        <path d="M42 8 L44 46 M58 8 L56 46" stroke="#e0a91a" strokeWidth="4" />
        <rect x="4" y="44" width="92" height="9" rx="4.5" fill="#e0a91a" />
        <rect x="36" y="24" width="28" height="12" rx="3" fill={NAVY} />
        <text x="40" y="33.5" fontFamily="Poppins, sans-serif" fontWeight="800" fontSize="9" fill={WHITE}>
          RLX
        </text>
      </>
    ),
  },
  'hat-beanie': {
    width: 0.8,
    sink: 0.45,
    svg: (
      <>
        <circle cx="50" cy="9" r="8" fill={WHITE} />
        <path d="M14 50 C14 20 30 12 50 12 C70 12 86 20 86 50 Z" fill={GREEN} />
        <path d="M30 18 L30 48 M42 13 L42 48 M58 13 L58 48 M70 18 L70 48" stroke="#006b35" strokeWidth="2.5" />
        <rect x="10" y="42" width="80" height="14" rx="6" fill="#006b35" />
      </>
    ),
  },
  'hat-driver': {
    width: 0.82,
    sink: 0.42,
    svg: (
      <>
        <path d="M14 48 C14 16 34 6 50 6 C70 6 86 18 86 46 Z" fill={NAVY} />
        <path d="M14 48 C14 30 20 20 30 14 L50 16 L50 48 Z" fill={WHITE} />
        <path d="M2 50 C10 42 30 42 40 48 C30 54 12 55 2 50 Z" fill={NAVY2} />
        <polygon points="64,22 67,30 76,30 69,35 72,43 64,38 56,43 59,35 52,30 61,30" fill={GREEN2} />
        <rect x="12" y="44" width="76" height="6" rx="3" fill={NAVY2} />
      </>
    ),
  },
  'hat-grad': {
    width: 0.95,
    sink: 0.55,
    svg: (
      <>
        <path d="M24 36 L24 52 C24 58 76 58 76 52 L76 36 Z" fill={NAVY2} />
        <polygon points="50,6 98,24 50,42 2,24" fill={NAVY} />
        <path d="M50 24 L86 30 L86 48" stroke={GOLD} strokeWidth="2.5" fill="none" />
        <rect x="82" y="46" width="8" height="12" rx="2" fill={GOLD} />
        <circle cx="50" cy="24" r="3.5" fill={GOLD} />
      </>
    ),
  },
  'hat-crown': {
    width: 0.62,
    sink: 0.3,
    svg: (
      <>
        <path d="M8 56 L4 14 L28 32 L50 4 L72 32 L96 14 L92 56 Z" fill={GOLD} />
        <rect x="8" y="46" width="84" height="12" rx="3" fill="#e0a21a" />
        <circle cx="50" cy="30" r="6" fill={GREEN} />
        <circle cx="26" cy="40" r="4" fill={WHITE} />
        <circle cx="74" cy="40" r="4" fill={WHITE} />
        <circle cx="4" cy="14" r="4" fill={GOLD} />
        <circle cx="50" cy="4" r="4" fill={GOLD} />
        <circle cx="96" cy="14" r="4" fill={GOLD} />
      </>
    ),
  },
}

// ---------------------------------------------------------------------------
// Decor props, each in its own viewBox; `slot` places it on the floor.
// ---------------------------------------------------------------------------
export interface DecorArt {
  viewBox: string
  /** Horizontal position (% of the world width) and width (% of world width). */
  left: number
  width: number
  /** Distance from the floor line, % of world height (pennant hangs up high). */
  lift?: number
  svg: ReactElement
}

export const DECOR_ART: Record<string, DecorArt> = {
  'decor-boxes': {
    viewBox: '0 0 120 100',
    left: 4,
    width: 12,
    svg: (
      <>
        <ellipse cx="60" cy="96" rx="56" ry="5" fill="#000" opacity="0.08" />
        <rect x="8" y="48" width="56" height="48" rx="3" fill="#c99a63" />
        <rect x="62" y="56" width="50" height="40" rx="3" fill="#b88650" />
        <rect x="26" y="10" width="50" height="40" rx="3" fill="#d6a86f" />
        <rect x="33" y="48" width="6" height="48" fill="#e8c998" />
        <rect x="84" y="56" width="6" height="40" fill="#d8b17f" />
        <rect x="48" y="10" width="6" height="40" fill="#f0d5a8" />
        <rect x="14" y="70" width="22" height="10" rx="2" fill={WHITE} />
        <rect x="16" y="73" width="14" height="2" fill={NAVY} />
        <text x="30" y="36" fontFamily="Poppins, sans-serif" fontWeight="800" fontSize="11" fill={NAVY} opacity="0.75">
          RLX
        </text>
      </>
    ),
  },
  'decor-plant': {
    viewBox: '0 0 80 120',
    left: 88,
    width: 7,
    svg: (
      <>
        <ellipse cx="40" cy="116" rx="30" ry="4" fill="#000" opacity="0.08" />
        <path d="M40 70 C10 60 6 30 22 20 C30 40 36 50 40 70 Z" fill={GREEN} />
        <path d="M40 70 C70 58 74 28 58 16 C50 36 44 50 40 70 Z" fill={GREEN2} />
        <path d="M40 70 C36 40 40 16 40 4 C46 20 48 44 40 70 Z" fill="#006b35" />
        <path d="M18 70 L62 70 L56 116 L24 116 Z" fill={NAVY} />
        <rect x="14" y="66" width="52" height="10" rx="3" fill={NAVY2} />
      </>
    ),
  },
  'decor-trophy': {
    viewBox: '0 0 80 100',
    left: 17,
    width: 6,
    svg: (
      <>
        <ellipse cx="40" cy="96" rx="26" ry="4" fill="#000" opacity="0.08" />
        <path d="M18 8 L62 8 L60 36 C58 50 50 56 40 56 C30 56 22 50 20 36 Z" fill={GOLD} />
        <path d="M18 14 C4 14 4 36 22 38 M62 14 C76 14 76 36 58 38" stroke={GOLD} strokeWidth="5" fill="none" />
        <rect x="34" y="56" width="12" height="18" fill="#e0a21a" />
        <rect x="20" y="74" width="40" height="20" rx="3" fill={NAVY} />
        <circle cx="40" cy="28" r="7" fill={WHITE} opacity="0.7" />
      </>
    ),
  },
  'decor-truck': {
    viewBox: '0 0 160 90',
    left: 76,
    width: 13,
    svg: (
      <>
        <ellipse cx="80" cy="86" rx="74" ry="4" fill="#000" opacity="0.08" />
        <rect x="6" y="12" width="104" height="58" rx="5" fill={WHITE} stroke="#d7dee6" strokeWidth="2" />
        <rect x="6" y="50" width="104" height="8" fill={GREEN} />
        <text x="20" y="42" fontFamily="Poppins, sans-serif" fontWeight="800" fontSize="20" fill={NAVY}>
          RLX
        </text>
        <path d="M110 30 L136 30 L152 50 L152 70 L110 70 Z" fill={NAVY} />
        <path d="M116 36 L134 36 L144 50 L116 50 Z" fill="#9fc6e8" />
        <circle cx="36" cy="72" r="11" fill={NAVY2} />
        <circle cx="36" cy="72" r="4" fill="#cfd8e3" />
        <circle cx="128" cy="72" r="11" fill={NAVY2} />
        <circle cx="128" cy="72" r="4" fill="#cfd8e3" />
      </>
    ),
  },
  'decor-pennant': {
    viewBox: '0 0 140 70',
    left: 8,
    width: 14,
    lift: 58,
    svg: (
      <>
        <path d="M2 6 L138 6" stroke={NAVY2} strokeWidth="3" />
        <path d="M10 6 L30 6 L20 34 Z" fill={GREEN} />
        <path d="M40 6 L60 6 L50 34 Z" fill={NAVY} />
        <path d="M70 6 L90 6 L80 34 Z" fill={GREEN} />
        <path d="M100 6 L120 6 L110 34 Z" fill={GOLD} />
        <text x="44" y="60" fontFamily="Caveat, cursive" fontWeight="700" fontSize="20" fill={GREEN}>
          go Rocky!
        </text>
      </>
    ),
  },
}

// ---------------------------------------------------------------------------
// Scenes — 1000x400, the floor line sits at y≈340.
// ---------------------------------------------------------------------------
function Tree({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx="0" cy="20" rx="22" ry="6" fill="#000" opacity="0.07" />
      <rect x="-3" y="0" width="6" height="18" fill="#6b4a2f" />
      <circle cx="-10" cy="-8" r="14" fill="#2e8b3e" />
      <circle cx="10" cy="-10" r="15" fill="#3aa14c" />
      <circle cx="0" cy="-24" r="15" fill="#48b35a" />
    </g>
  )
}

function House({ x, y, roof = '#d9695f' }: { x: number; y: number; roof?: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx="22" cy="44" rx="34" ry="7" fill="#000" opacity="0.07" />
      <polygon points="0,16 22,4 44,16 44,42 0,42" fill="#f7f4ef" />
      <polygon points="22,4 44,16 44,42 22,42" fill="#e4dfd6" />
      <polygon points="-4,18 22,-2 26,2 2,22" fill={roof} />
      <polygon points="22,-2 48,18 44,22 22,4" fill={roof} opacity="0.8" />
      <rect x="8" y="26" width="8" height="16" fill={NAVY2} />
      <rect x="28" y="24" width="8" height="8" fill="#9fc6e8" />
    </g>
  )
}

function RouteScene({ night = false }: { night?: boolean }) {
  const sky = night ? NAVY : '#f2f6f8'
  const ground = night ? '#16305a' : '#ffffff'
  const road = night ? '#243f6b' : '#e8ecef'
  return (
    <>
      <rect width="1000" height="400" fill={sky} />
      {night && (
        <>
          <circle cx="840" cy="70" r="30" fill="#f7e9b8" />
          <circle cx="828" cy="62" r="30" fill={NAVY} />
          {[80, 190, 300, 420, 560, 660, 760, 930].map((x, i) => (
            <circle key={x} cx={x} cy={40 + ((i * 37) % 90)} r={i % 3 === 0 ? 2.5 : 1.6} fill="#ffffff" opacity="0.8" />
          ))}
        </>
      )}
      <path d="M0 250 C200 230 380 270 520 250 C700 225 850 250 1000 238 L1000 400 L0 400 Z" fill={ground} />
      {/* The winding RLX route. */}
      <path
        d="M-20 380 C160 330 240 250 420 262 C600 274 640 180 820 170 C920 164 980 190 1040 176"
        stroke={road}
        strokeWidth="54"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M-20 380 C160 330 240 250 420 262 C600 274 640 180 820 170 C920 164 980 190 1040 176"
        stroke={night ? '#f5b82e' : '#ffffff'}
        strokeWidth="3"
        strokeDasharray="14 14"
        fill="none"
        opacity={night ? 0.5 : 1}
      />
      <House x={560} y={120} />
      <House x={640} y={100} roof="#c9564c" />
      <House x={880} y={214} roof="#d9695f" />
      <Tree x={520} y={150} s={0.9} />
      <Tree x={720} y={120} s={0.8} />
      <Tree x={960} y={150} />
      <Tree x={90} y={220} s={0.9} />
      <Tree x={300} y={196} s={0.7} />
      {/* Map pin at a delivery stop. */}
      <g transform="translate(820 160)">
        <circle r="16" fill={WHITE} />
        <circle r="8" fill={GREEN} />
      </g>
      {night &&
        [150, 450, 750].map((x) => (
          <g key={x} transform={`translate(${x} 200)`}>
            <rect x="-2" y="0" width="4" height="60" fill="#35507e" />
            <circle cx="0" cy="0" r="7" fill="#f7e9b8" />
            <circle cx="0" cy="0" r="22" fill="#f7e9b8" opacity="0.15" />
          </g>
        ))}
    </>
  )
}

function WarehouseScene() {
  return (
    <>
      <rect width="1000" height="400" fill="#eef2f5" />
      <rect y="300" width="1000" height="100" fill="#dfe5ea" />
      <rect y="296" width="1000" height="6" fill="#c9d2da" />
      {[0, 1, 2].map((r) => (
        <g key={r} transform={`translate(${90 + r * 300} 60)`}>
          <rect x="0" y="0" width="8" height="240" fill={NAVY} />
          <rect x="200" y="0" width="8" height="240" fill={NAVY} />
          {[70, 150, 230].map((y) => (
            <rect key={y} x="0" y={y} width="208" height="7" fill={GREEN} />
          ))}
          {[0, 1, 2].map((row) =>
            [0, 1, 2, 3].map((c) => (
              <rect
                key={`${row}-${c}`}
                x={14 + c * 46}
                y={[36, 116, 196][row]}
                width={40}
                height={34}
                rx="2"
                fill={(row + c) % 3 === 0 ? '#c99a63' : (row + c) % 3 === 1 ? '#d6a86f' : '#b88650'}
              />
            )),
          )}
        </g>
      ))}
      <rect x="0" y="338" width="1000" height="6" fill={GOLD} opacity="0.7" />
      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={i} x={40 + i * 220} y="338" width="80" height="6" fill={NAVY} opacity="0.7" />
      ))}
      <path d="M500 0 L500 30" stroke={NAVY2} strokeWidth="3" />
      <path d="M470 30 L530 30 L520 44 L480 44 Z" fill={NAVY} />
      <path d="M480 44 L380 200 L620 200 L520 44 Z" fill="#fff6d6" opacity="0.35" />
    </>
  )
}

function BallparkScene() {
  return (
    <>
      <defs>
        <linearGradient id="bp-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#bfe2f7" />
          <stop offset="1" stopColor="#eaf6fc" />
        </linearGradient>
      </defs>
      <rect width="1000" height="400" fill="url(#bp-sky)" />
      <circle cx="140" cy="70" r="36" fill="#fff4c9" />
      {/* Stands */}
      <path d="M0 120 L1000 90 L1000 220 L0 230 Z" fill={NAVY2} />
      {Array.from({ length: 5 }, (_, row) => (
        <path key={row} d={`M0 ${140 + row * 18} L1000 ${112 + row * 26}`} stroke={NAVY} strokeWidth="4" />
      ))}
      {Array.from({ length: 40 }, (_, i) => (
        <circle key={i} cx={20 + i * 25} cy={150 + ((i * 13) % 50)} r="4" fill={[GREEN2, WHITE, GOLD, '#d9695f'][i % 4]} opacity="0.85" />
      ))}
      <rect y="222" width="1000" height="16" fill={GREEN} />
      {/* Field */}
      <rect y="236" width="1000" height="164" fill="#3aa14c" />
      {Array.from({ length: 10 }, (_, i) => (
        <rect key={i} x={i * 100} y="236" width="50" height="164" fill="#46ad58" />
      ))}
      <path d="M250 400 L500 290 L750 400 Z" fill="#c9905a" opacity="0.85" />
      <path d="M300 400 L500 312 L700 400" stroke={WHITE} strokeWidth="3" fill="none" />
      <text x="760" y="212" fontFamily="Poppins, sans-serif" fontWeight="800" fontSize="22" fill={WHITE} opacity="0.9">
        RLX
      </text>
    </>
  )
}

export function SceneArt({ id }: { id: string }) {
  return (
    <svg viewBox="0 0 1000 400" preserveAspectRatio="xMidYMax slice" width="100%" height="100%" aria-hidden="true">
      {id === 'scene-warehouse' ? (
        <WarehouseScene />
      ) : id === 'scene-ballpark' ? (
        <BallparkScene />
      ) : id === 'scene-night' ? (
        <RouteScene night />
      ) : (
        <RouteScene />
      )}
    </svg>
  )
}
