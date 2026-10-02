// Clothes and accessories beyond hats: glasses (on the measured eyes, and
// moving with the head), things worn at the neck (bow tie, scarf, tie,
// medal, RLX ID badge…) and things worn on the back (cape, wings,
// backpack — drawn behind Rocky). Placement uses the rig points measured on
// each approved artwork (tools/build-rocky-rig.py) and the head anchors, so
// every item sits right on every stage and mood. Rocky himself is never
// redrawn — these are overlays.
import type { ReactElement } from "react";
import type { HeadAnchor } from "../rockyWorldRig";
import type { RockyRigPoints } from "../rockyWorldRig";
import type { HatBox } from "./art";
import {
  EXTRA_BACK,
  EXTRA_BACK_WIDTH,
  EXTRA_GLASSES,
  EXTRA_NECK,
  STAFF_BACK,
  STAFF_BACK_WIDTH,
} from "./extraArt";
import { THIRD_BACK, THIRD_BACK_WIDTH, THIRD_GLASSES, THIRD_NECK } from "./thirdArt";
import { FOURTH_BACK, FOURTH_BACK_WIDTH, FOURTH_GLASSES, FOURTH_NECK, SPOOKY_GLASSES, SPOOKY_NECK } from "./fourthArt";
import { COLOMBIA_BACK, COLOMBIA_BACK_WIDTH, COLOMBIA_BODY, COLOMBIA_GLASSES, COLOMBIA_NECK } from "./colombiaArt";

const NAVY = "#0f2341";
const GREEN = "#008c45";
const GREEN2 = "#1fbf68";
const GOLD = "#f5b82e";
const WHITE = "#ffffff";

// ---------------------------------------------------------------------------
// Glasses: 100x40 box, lens centres at (25,20) and (75,20).
// ---------------------------------------------------------------------------
export const GLASSES_ART: Record<string, ReactElement> = {
  "glasses-round": (
    <>
      <circle
        cx="25"
        cy="20"
        r="15"
        fill="#dff1ff"
        opacity="0.35"
        stroke="#3a2a1e"
        strokeWidth="3.5"
      />
      <circle
        cx="75"
        cy="20"
        r="15"
        fill="#dff1ff"
        opacity="0.35"
        stroke="#3a2a1e"
        strokeWidth="3.5"
      />
      <path
        d="M40 18 Q50 13 60 18"
        stroke="#3a2a1e"
        strokeWidth="3"
        fill="none"
      />
      <path
        d="M10 16 L1 12 M90 16 L99 12"
        stroke="#3a2a1e"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M17 12 L22 10"
        stroke={WHITE}
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.8"
      />
      <path
        d="M67 12 L72 10"
        stroke={WHITE}
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.8"
      />
    </>
  ),
  "glasses-sun": (
    <>
      <path d="M6 10 H44 Q44 34 26 34 Q8 34 6 10 Z" fill="#1b2433" />
      <path d="M56 10 H94 Q92 34 74 34 Q56 34 56 10 Z" fill="#1b2433" />
      <path
        d="M44 14 Q50 10 56 14"
        stroke="#1b2433"
        strokeWidth="4"
        fill="none"
      />
      <path
        d="M6 12 L0 9 M94 12 L100 9"
        stroke="#1b2433"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <path
        d="M12 15 L22 15 M62 15 L72 15"
        stroke={WHITE}
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.55"
      />
    </>
  ),
  "glasses-star": (
    <>
      {[25, 75].map((cx) => (
        <polygon
          key={cx}
          points={Array.from({ length: 10 }, (_, i) => {
            const a = (Math.PI / 5) * i - Math.PI / 2;
            const r = i % 2 === 0 ? 19 : 9;
            return `${cx + r * Math.cos(a)},${21 + r * Math.sin(a)}`;
          }).join(" ")}
          fill={GOLD}
          stroke="#c07a0c"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      ))}
      <path
        d="M42 18 Q50 14 58 18"
        stroke="#c07a0c"
        strokeWidth="3"
        fill="none"
      />
    </>
  ),
  "glasses-heart": (
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
      <path
        d="M40 16 Q50 12 60 16"
        stroke="#c7305c"
        strokeWidth="3"
        fill="none"
      />
    </>
  ),
  "glasses-3d": (
    <>
      <rect
        x="4"
        y="7"
        width="92"
        height="27"
        rx="5"
        fill={WHITE}
        stroke="#d7dee6"
        strokeWidth="2"
      />
      <rect
        x="10"
        y="11"
        width="32"
        height="19"
        rx="3"
        fill="#e2445c"
        opacity="0.85"
      />
      <rect
        x="58"
        y="11"
        width="32"
        height="19"
        rx="3"
        fill="#2f8fd8"
        opacity="0.85"
      />
    </>
  ),
  "glasses-mask": (
    <>
      <path
        d="M2 14 C10 2 40 4 50 12 C60 4 90 2 98 14 C98 30 80 38 66 34 C58 32 54 26 50 26 C46 26 42 32 34 34 C20 38 2 30 2 14 Z"
        fill="#2a1f3d"
      />
      <ellipse cx="27" cy="20" rx="10" ry="7" fill="#000" opacity="0.55" />
      <ellipse cx="73" cy="20" rx="10" ry="7" fill="#000" opacity="0.55" />
      <path
        d="M8 12 C4 6 0 6 -2 8 M92 12 C96 6 100 6 102 8"
        stroke="#f28c28"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
      <circle cx="50" cy="16" r="3" fill="#f28c28" />
      <path
        d="M12 26 C18 30 24 32 30 32"
        stroke="#f28c28"
        strokeWidth="2"
        fill="none"
        opacity="0.8"
      />
    </>
  ),
  "glasses-snow": (
    <>
      {[25, 75].map((cx) => (
        <g key={cx} transform={`translate(${cx} 20)`}>
          <circle
            r="15"
            fill="#dff1ff"
            opacity="0.4"
            stroke="#7fb6e0"
            strokeWidth="3"
          />
          {[0, 60, 120].map((a) => (
            <path
              key={a}
              d="M0 -12 L0 12 M-3 -9 L0 -6 L3 -9 M-3 9 L0 6 L3 9"
              stroke={WHITE}
              strokeWidth="2"
              transform={`rotate(${a})`}
              strokeLinecap="round"
              fill="none"
            />
          ))}
        </g>
      ))}
      <path
        d="M40 18 Q50 13 60 18"
        stroke="#7fb6e0"
        strokeWidth="3"
        fill="none"
      />
      <path
        d="M10 16 L1 12 M90 16 L99 12"
        stroke="#7fb6e0"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </>
  ),
  ...EXTRA_GLASSES,
  ...THIRD_GLASSES,
  ...FOURTH_GLASSES,
  ...SPOOKY_GLASSES,
  ...COLOMBIA_GLASSES,
};

// ---------------------------------------------------------------------------
// Neck: 100x70 box, the knot/collar centre at (50,10).
// ---------------------------------------------------------------------------
export const NECK_ART: Record<string, ReactElement> = {
  "neck-lanyard": (
    <>
      <path
        d="M22 0 L44 44 M78 0 L56 44"
        stroke={GREEN}
        strokeWidth="5"
        strokeLinecap="round"
      />
      <rect
        x="36"
        y="40"
        width="28"
        height="30"
        rx="4"
        fill={WHITE}
        stroke="#c9d2da"
        strokeWidth="1.5"
      />
      <rect x="36" y="40" width="28" height="8" rx="3" fill={NAVY} />
      <circle cx="50" cy="56" r="5" fill="#e7c7a4" />
      <rect x="41" y="63" width="18" height="3" rx="1.5" fill={GREEN} />
      <text
        x="42"
        y="46.5"
        fontFamily="Poppins, sans-serif"
        fontWeight="800"
        fontSize="6"
        fill={WHITE}
      >
        RLX
      </text>
    </>
  ),
  "neck-bowtie": (
    <>
      <path
        d="M50 12 L22 0 L22 26 Z"
        fill={GREEN}
        stroke="#006b35"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M50 12 L78 0 L78 26 Z"
        fill={GREEN}
        stroke="#006b35"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <rect x="43" y="5" width="14" height="15" rx="4" fill="#006b35" />
      <circle cx="30" cy="8" r="2" fill={WHITE} opacity="0.7" />
      <circle cx="70" cy="18" r="2" fill={WHITE} opacity="0.7" />
    </>
  ),
  "neck-scarf": (
    <>
      <path d="M8 6 Q50 24 92 6 L94 18 Q50 38 6 18 Z" fill="#d6333a" />
      <path d="M62 20 L74 64 L60 66 L52 24 Z" fill="#c1272f" />
      {[16, 30, 44, 58, 72, 86].map((x) => (
        <path
          key={x}
          d={`M${x} ${x < 50 ? 10 + (x - 8) * 0.3 : 10 + (92 - x) * 0.3} l0 10`}
          stroke={WHITE}
          strokeWidth="3"
          opacity="0.8"
        />
      ))}
      <path
        d="M62 64 l2 6 M66 64 l2 6 M70 63 l2 6"
        stroke="#c1272f"
        strokeWidth="2"
      />
    </>
  ),
  "neck-bandana": (
    <>
      <path d="M10 4 Q50 18 90 4 L50 50 Z" fill={NAVY} />
      <path
        d="M10 4 Q50 18 90 4"
        stroke="#1b3358"
        strokeWidth="4"
        fill="none"
      />
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
  "neck-tie": (
    <>
      <path d="M38 2 L62 2 L56 14 L44 14 Z" fill={NAVY} />
      <path d="M44 14 L56 14 L64 58 L50 70 L36 58 Z" fill={NAVY} />
      <path
        d="M40 24 L60 30 M38 38 L62 44 M38 52 L62 58"
        stroke={GREEN2}
        strokeWidth="4"
      />
    </>
  ),
  "neck-medal": (
    <>
      <path d="M26 0 L46 38 M74 0 L54 38" stroke={GREEN} strokeWidth="9" />
      <path
        d="M26 0 L46 38 M74 0 L54 38"
        stroke={WHITE}
        strokeWidth="2"
        opacity="0.7"
      />
      <circle
        cx="50"
        cy="52"
        r="16"
        fill={GOLD}
        stroke="#c07a0c"
        strokeWidth="3"
      />
      <polygon
        points="50,42 53,49 60,49 55,54 57,61 50,57 43,61 45,54 40,49 47,49"
        fill="#fff3c9"
      />
    </>
  ),
  "neck-spooky-bow": (
    <>
      <path
        d="M50 12 L20 -2 L22 28 Z"
        fill="#f28c28"
        stroke="#2a1f3d"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d="M50 12 L80 -2 L78 28 Z"
        fill="#f28c28"
        stroke="#2a1f3d"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d="M26 6 L34 10 M26 18 L34 16 M74 6 L66 10 M74 18 L66 16"
        stroke="#2a1f3d"
        strokeWidth="2.5"
      />
      <circle cx="50" cy="12" r="7" fill="#2a1f3d" />
      <path
        d="M47 11 L49 9 L50 12 L51 9 L53 11"
        stroke="#f28c28"
        strokeWidth="1.5"
        fill="none"
      />
    </>
  ),
  "neck-bell": (
    <>
      <path d="M8 6 Q50 26 92 6 L92 14 Q50 34 8 14 Z" fill="#d6333a" />
      <path
        d="M8 10 Q50 30 92 10"
        stroke={GOLD}
        strokeWidth="1.5"
        fill="none"
        strokeDasharray="3 4"
      />
      <circle
        cx="50"
        cy="36"
        r="11"
        fill={GOLD}
        stroke="#c07a0c"
        strokeWidth="2"
      />
      <path d="M41 36 L59 36" stroke="#c07a0c" strokeWidth="2" />
      <circle cx="50" cy="41" r="2.5" fill="#6b4423" />
      <circle cx="46" cy="31" r="2" fill={WHITE} opacity="0.8" />
      <path
        d="M44 22 L50 26 L56 22"
        stroke="#3f7d2a"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
    </>
  ),
  "neck-candy-scarf": (
    <>
      <path d="M8 6 Q50 24 92 6 L94 18 Q50 38 6 18 Z" fill={WHITE} />
      <path d="M62 20 L74 64 L60 66 L52 24 Z" fill={WHITE} />
      {[14, 28, 42, 56, 70, 84].map((x) => (
        <path
          key={x}
          d={`M${x} 6 l8 22`}
          stroke="#d6333a"
          strokeWidth="5"
          opacity="0.9"
        />
      ))}
      {[30, 42, 54].map((y) => (
        <path
          key={y}
          d={`M${56 + (y - 24) * 0.3} ${y} l12 -4`}
          stroke="#d6333a"
          strokeWidth="5"
        />
      ))}
      <path
        d="M62 64 l2 6 M66 64 l2 6 M70 63 l2 6"
        stroke="#1f9d55"
        strokeWidth="2"
      />
    </>
  ),
  "neck-jr-scarf": (
    <>
      <path d="M8 6 Q50 24 92 6 L94 18 Q50 38 6 18 Z" fill="#ffffff" />
      {[10, 26, 42, 58, 74].map((x) => (
        <path
          key={x}
          d={`M${x} ${x < 50 ? 8 + (x - 8) * 0.28 : 8 + (92 - x) * 0.28} l9 0 l0 12 l-9 -1 Z`}
          fill="#d0112b"
        />
      ))}
      <path
        d="M8 6 Q50 24 92 6 M6 18 Q50 38 94 18"
        stroke="#12234a"
        strokeWidth="2"
        fill="none"
      />
      <path d="M58 22 L70 66 L56 68 L50 26 Z" fill="#ffffff" />
      {[30, 40, 50, 60].map((y) => (
        <path
          key={y}
          d={`M${51 + (y - 24) * 0.27} ${y} l12 -3 l1.6 5 l-12 3 Z`}
          fill="#d0112b"
        />
      ))}
      <path
        d="M57 66 l1 6 M61 66 l1 6 M65 65 l1 6 M69 65 l1 6"
        stroke="#12234a"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </>
  ),
  ...EXTRA_NECK,
  ...THIRD_NECK,
  ...FOURTH_NECK,
  ...SPOOKY_NECK,
  ...COLOMBIA_NECK,
};

// ---------------------------------------------------------------------------
// Back: 100x120 box, shoulders across the top; drawn behind Rocky.
// ---------------------------------------------------------------------------
export const BACK_ART: Record<string, ReactElement> = {
  "back-cape": (
    <>
      <path d="M20 2 Q50 12 80 2 L94 112 Q50 124 6 112 Z" fill="#d6333a" />
      <path
        d="M20 2 Q50 12 80 2 L84 34 Q50 44 16 34 Z"
        fill="#b8262e"
        opacity="0.55"
      />
      <path
        d="M26 44 L16 108 M74 44 L84 108"
        stroke="#b8262e"
        strokeWidth="3"
        opacity="0.5"
      />
      <path d="M20 2 Q50 12 80 2" stroke={GOLD} strokeWidth="4" fill="none" />
    </>
  ),
  "back-wings": (
    <>
      {["", "translate(100 0) scale(-1 1)"].map((t) => (
        <g key={t} transform={t || undefined}>
          <path
            d="M40 26 C28 4 8 2 3 20 C-1 32 4 40 12 42 C4 48 4 60 14 62 C8 70 12 82 24 80 C26 90 38 92 42 80 Z"
            fill={WHITE}
            stroke="#c9d9e8"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M36 34 C26 26 16 26 10 30 M38 50 C28 44 18 46 14 52 M40 66 C32 62 26 64 22 70"
            stroke="#c9d9e8"
            strokeWidth="2"
            fill="none"
          />
        </g>
      ))}
    </>
  ),
  "back-backpack": (
    <>
      <path
        d="M40 2 Q50 -6 60 2"
        stroke="#8a5a2b"
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
      />
      <rect x="10" y="4" width="80" height="104" rx="22" fill="#c99a63" />
      <path
        d="M10 30 Q50 44 90 30 L90 26 Q90 4 68 4 L32 4 Q10 4 10 26 Z"
        fill="#b88650"
      />
      <rect x="44" y="30" width="12" height="8" rx="2" fill={GREEN} />
      <rect x="2" y="54" width="14" height="44" rx="7" fill="#b88650" />
      <rect x="84" y="54" width="14" height="44" rx="7" fill="#b88650" />
    </>
  ),
  "back-bat-wings": (
    <>
      {["", "translate(100 0) scale(-1 1)"].map((t) => (
        <g key={t} transform={t || undefined}>
          <path
            d="M44 20 C34 6 14 2 2 12 C8 16 10 22 8 30 C14 28 20 30 22 36 C26 32 32 32 36 38 C38 32 42 30 46 32 Z"
            fill="#2a1f3d"
            stroke="#4b3a6b"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M44 20 L8 30 M44 22 L22 36 M44 24 L36 38"
            stroke="#4b3a6b"
            strokeWidth="1.8"
          />
        </g>
      ))}
    </>
  ),
  "back-gift-sack": (
    <>
      <path
        d="M18 30 C10 60 8 98 26 110 C44 120 64 120 80 108 C94 96 90 60 80 30 Z"
        fill="#c9463d"
      />
      <path d="M22 30 C40 22 62 22 80 30 C66 40 36 40 22 30 Z" fill="#a8372f" />
      <path
        d="M40 22 C36 12 44 4 50 12 C56 4 64 12 60 22"
        stroke={GOLD}
        strokeWidth="4"
        fill="none"
      />
      <rect
        x="44"
        y="4"
        width="18"
        height="18"
        rx="3"
        fill="#1f9d55"
        transform="rotate(-12 53 13)"
      />
      <rect
        x="30"
        y="8"
        width="16"
        height="16"
        rx="3"
        fill="#3a78c2"
        transform="rotate(10 38 16)"
      />
      <path
        d="M30 60 C40 66 60 66 72 60"
        stroke={GOLD}
        strokeWidth="3"
        fill="none"
        opacity="0.8"
      />
    </>
  ),
  ...EXTRA_BACK,
  ...STAFF_BACK,
  ...THIRD_BACK,
  ...FOURTH_BACK,
  ...COLOMBIA_BACK,
};

/** How wide each back item is relative to the face (wings spread past the body). */
const BACK_WIDTH: Record<string, number> = {
  "back-cape": 1.3,
  "back-wings": 1.9,
  "back-backpack": 1.15,
  "back-bat-wings": 2.1,
  "back-gift-sack": 1.2,
  ...EXTRA_BACK_WIDTH,
  ...STAFF_BACK_WIDTH,
  ...THIRD_BACK_WIDTH,
  ...FOURTH_BACK_WIDTH,
  ...COLOMBIA_BACK_WIDTH,
};

// ---------------------------------------------------------------------------
// Body: 100x110 box from the collar (top) down to the hips (bottom); worn
// over the vest. The shoulders reach the box's top corners.
// ---------------------------------------------------------------------------
export const BODY_ART: Record<string, ReactElement> = { ...COLOMBIA_BODY };

/** Body items: from the collar to just below the hips, across the chest (the SVG stretches to this box). */
export function bodyPlacement(
  rig: RockyRigPoints,
  anchor: HeadAnchor,
  size: number,
): HatBox {
  const width = anchor.w * 1.12 * size;
  const top = (rig.neck - 0.012) * size;
  const height = (rig.hip + 0.035) * size - top;
  const cx = (rig.pivot.x + rig.splitX) / 2;
  return { left: cx * size - width / 2, top, width, height };
}

export type WearSlot = "glasses" | "neck" | "back" | "body";

/** Glasses over the measured eyes (or, for closed-eye art, the face estimate from the head anchor). */
export function glassesPlacement(
  rig: RockyRigPoints,
  anchor: HeadAnchor,
  size: number,
): HatBox {
  let cx: number, cy: number, span: number;
  if (rig.eyes.length === 2) {
    const [a, b] = rig.eyes as [
      { x: number; y: number; r: number },
      { x: number; y: number; r: number },
    ];
    cx = (a.x + b.x) / 2;
    cy = (a.y + b.y) / 2;
    span = Math.abs(b.x - a.x);
  } else {
    cx = rig.pivot.x;
    cy = anchor.y + anchor.w * 0.62;
    span = anchor.w * 0.36;
  }
  // Lens centres are 50 units apart in the 100-wide art.
  const width = span * 2 * size;
  const height = width * 0.4;
  return {
    left: cx * size - width / 2,
    top: cy * size - height / 2,
    width,
    height,
  };
}

/** Neck items: the knot sits on the collar (the measured neck line), centred under the head. */
export function neckPlacement(
  rig: RockyRigPoints,
  anchor: HeadAnchor,
  size: number,
): HatBox {
  const width = anchor.w * 0.62 * size;
  const height = width * 0.7;
  return {
    left: rig.pivot.x * size - width / 2,
    top: rig.neck * size - width * 0.13,
    width,
    height,
  };
}

/** Back items: from just above the shoulders down to the hips, behind the body (the SVG stretches to this box). */
export function backPlacement(
  rig: RockyRigPoints,
  anchor: HeadAnchor,
  size: number,
  id: string,
): HatBox {
  const width = anchor.w * (BACK_WIDTH[id] ?? 1.2) * size;
  const top = (rig.neck - 0.035) * size;
  const height = (rig.hip + 0.05) * size - top;
  const cx = (rig.pivot.x + rig.splitX) / 2;
  return { left: cx * size - width / 2, top, width, height };
}

export const WEAR_VIEWBOX: Record<WearSlot, string> = {
  glasses: "0 0 100 40",
  neck: "0 0 100 70",
  back: "0 0 100 120",
  body: "0 0 100 110",
};
export const WEAR_ART: Record<WearSlot, Record<string, ReactElement>> = {
  glasses: GLASSES_ART,
  neck: NECK_ART,
  back: BACK_ART,
  body: BODY_ART,
};
