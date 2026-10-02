// Flat, RLX-style vector art for Rocky's world: hats, room props and scenes.
// Rocky himself is NEVER drawn here — the approved 2.5D artwork is the only
// Rocky. These are accessories and environments layered around it.
import { useState, type ReactElement } from "react";
import { EXTRA_DECOR, EXTRA_HATS, STAFF_HATS } from "./extraArt";
import { THIRD_DECOR, THIRD_HATS } from "./thirdArt";
import { FOURTH_DECOR, FOURTH_HATS } from "./fourthArt";
import { COLOMBIA_DECOR, COLOMBIA_HATS } from "./colombiaArt";
import { SCENES } from "./scenes";
import { ParticleLayer } from "./scenes/kit";
import type { HeadAnchor } from "../rockyWorldRig";

const NAVY = "#0f2341";
const NAVY2 = "#1b3358";
const GREEN = "#008c45";
const GREEN2 = "#1fbf68";
const GOLD = "#f5b82e";
const WHITE = "#ffffff";

// ---------------------------------------------------------------------------
// Hats. Each is drawn in a 100x60 box. `width` is relative to the measured
// face width; `sink` is how far below the top of the hair tuft the hat's
// brim sits, also relative to face width (the tuft is tall, the skull is
// lower). See hatPlacement().
// ---------------------------------------------------------------------------
export interface HatArt {
  width: number;
  sink: number;
  svg: ReactElement;
}

export interface HatBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Where to draw a hat over a Rocky rendered at `size` px, from that artwork's head anchor. */
export function hatPlacement(
  anchor: HeadAnchor,
  hat: HatArt,
  size: number,
): HatBox {
  const width = anchor.w * hat.width * size;
  const height = width * 0.6;
  const brim = (anchor.y + anchor.w * hat.sink) * size;
  return {
    left: anchor.x * size - width / 2,
    top: brim - height,
    width,
    height,
  };
}

export const HAT_ART: Record<string, HatArt> = {
  "hat-jr-cap": {
    width: 0.78,
    sink: 0.42,
    svg: (
      <>
        <path d="M14 48 C14 18 34 6 52 6 C72 6 88 20 88 46 Z" fill="#ffffff" />
        <path
          d="M24 44 C24 22 34 10 42 8 L46 7 C40 14 36 28 36 46 Z M56 7 C62 14 66 28 66 46 L78 45 C78 26 70 12 62 8 Z"
          fill="#d0112b"
        />
        <path
          d="M60 44 C76 40 94 42 99 50 C92 55 74 55 58 53 Z"
          fill="#12234a"
        />
        <rect x="12" y="44" width="78" height="7" rx="3" fill="#12234a" />
        <circle cx="51" cy="7" r="3" fill="#12234a" />
      </>
    ),
  },
  "hat-rlx-cap": {
    width: 0.78,
    sink: 0.42,
    svg: (
      <>
        <path d="M14 48 C14 18 34 6 52 6 C72 6 88 20 88 46 Z" fill={GREEN} />
        <path
          d="M52 6 C58 16 60 32 58 47"
          stroke="#006b35"
          strokeWidth="2"
          fill="none"
        />
        <path d="M60 44 C76 40 94 42 99 50 C92 55 74 55 58 53 Z" fill={NAVY} />
        <rect x="12" y="44" width="78" height="7" rx="3" fill="#006b35" />
        <text
          x="34"
          y="36"
          fontFamily="Poppins, sans-serif"
          fontWeight="800"
          fontSize="15"
          fill={WHITE}
        >
          RLX
        </text>
        <circle cx="51" cy="7" r="3" fill="#006b35" />
      </>
    ),
  },
  "hat-headset": {
    width: 1.04,
    sink: 0.6,
    svg: (
      <>
        <path
          d="M11 40 C11 -6 89 -6 89 40"
          stroke={NAVY}
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M11 40 C11 -6 89 -6 89 40"
          stroke={GREEN}
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          opacity="0.9"
        />
        <rect x="1" y="32" width="19" height="26" rx="8" fill={NAVY2} />
        <rect x="80" y="32" width="19" height="26" rx="8" fill={NAVY2} />
        <rect x="4" y="36" width="13" height="18" rx="5" fill={GREEN} />
        <rect x="83" y="36" width="13" height="18" rx="5" fill={GREEN} />
        <path
          d="M90 56 C90 66 84 69 76 68"
          stroke={NAVY}
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
        <circle cx="74" cy="68" r="3.5" fill={NAVY} />
      </>
    ),
  },
  "hat-party": {
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
  "hat-hardhat": {
    width: 0.86,
    sink: 0.4,
    svg: (
      <>
        <path d="M14 46 C14 16 32 6 50 6 C68 6 86 16 86 46 Z" fill="#f7c531" />
        <path d="M42 8 L44 46 M58 8 L56 46" stroke="#e0a91a" strokeWidth="4" />
        <rect x="4" y="44" width="92" height="9" rx="4.5" fill="#e0a91a" />
        <rect x="36" y="24" width="28" height="12" rx="3" fill={NAVY} />
        <text
          x="40"
          y="33.5"
          fontFamily="Poppins, sans-serif"
          fontWeight="800"
          fontSize="9"
          fill={WHITE}
        >
          RLX
        </text>
      </>
    ),
  },
  "hat-beanie": {
    width: 0.8,
    sink: 0.45,
    svg: (
      <>
        <circle cx="50" cy="9" r="8" fill={WHITE} />
        <path d="M14 50 C14 20 30 12 50 12 C70 12 86 20 86 50 Z" fill={GREEN} />
        <path
          d="M30 18 L30 48 M42 13 L42 48 M58 13 L58 48 M70 18 L70 48"
          stroke="#006b35"
          strokeWidth="2.5"
        />
        <rect x="10" y="42" width="80" height="14" rx="6" fill="#006b35" />
      </>
    ),
  },
  "hat-driver": {
    width: 0.82,
    sink: 0.42,
    svg: (
      <>
        <path d="M14 48 C14 16 34 6 50 6 C70 6 86 18 86 46 Z" fill={NAVY} />
        <path d="M14 48 C14 30 20 20 30 14 L50 16 L50 48 Z" fill={WHITE} />
        <path d="M2 50 C10 42 30 42 40 48 C30 54 12 55 2 50 Z" fill={NAVY2} />
        <polygon
          points="64,22 67,30 76,30 69,35 72,43 64,38 56,43 59,35 52,30 61,30"
          fill={GREEN2}
        />
        <rect x="12" y="44" width="76" height="6" rx="3" fill={NAVY2} />
      </>
    ),
  },
  "hat-grad": {
    width: 0.95,
    sink: 0.55,
    svg: (
      <>
        <path d="M24 36 L24 52 C24 58 76 58 76 52 L76 36 Z" fill={NAVY2} />
        <polygon points="50,6 98,24 50,42 2,24" fill={NAVY} />
        <path
          d="M50 24 L86 30 L86 48"
          stroke={GOLD}
          strokeWidth="2.5"
          fill="none"
        />
        <rect x="82" y="46" width="8" height="12" rx="2" fill={GOLD} />
        <circle cx="50" cy="24" r="3.5" fill={GOLD} />
      </>
    ),
  },
  "hat-vueltiao": {
    width: 1.12,
    sink: 0.42,
    svg: (
      <>
        <ellipse cx="50" cy="50" rx="49" ry="9" fill="#f3e6c4" />
        <ellipse
          cx="50"
          cy="50"
          rx="49"
          ry="9"
          fill="none"
          stroke="#1e1a16"
          strokeWidth="2"
          strokeDasharray="4 3"
        />
        <ellipse
          cx="50"
          cy="50"
          rx="38"
          ry="6"
          fill="none"
          stroke="#1e1a16"
          strokeWidth="2"
          strokeDasharray="3 3"
        />
        <path
          d="M28 50 C28 20 36 10 50 10 C64 10 72 20 72 50 Z"
          fill="#f3e6c4"
        />
        {[18, 26, 34, 42].map((y) => (
          <path
            key={y}
            d={`M${29 + (y - 10) * 0.1} ${y} L${71 - (y - 10) * 0.1} ${y}`}
            stroke="#1e1a16"
            strokeWidth="3"
            strokeDasharray="3 2.5"
          />
        ))}
      </>
    ),
  },
  "hat-chef": {
    width: 0.78,
    sink: 0.4,
    svg: (
      <>
        <circle cx="30" cy="22" r="17" fill={WHITE} />
        <circle cx="50" cy="15" r="19" fill={WHITE} />
        <circle cx="70" cy="22" r="17" fill={WHITE} />
        <rect x="22" y="22" width="56" height="26" fill={WHITE} />
        <path
          d="M34 22 C36 30 36 38 34 46 M50 18 L50 46 M66 22 C64 30 64 38 66 46"
          stroke="#e3e8ee"
          strokeWidth="2"
          fill="none"
        />
        <rect
          x="18"
          y="44"
          width="64"
          height="12"
          rx="4"
          fill="#eef2f6"
          stroke="#d7dee6"
        />
        <rect x="18" y="47" width="64" height="3" fill={GREEN} opacity="0.8" />
      </>
    ),
  },
  "hat-cowboy": {
    width: 1.02,
    sink: 0.4,
    svg: (
      <>
        <path
          d="M2 44 C14 56 86 56 98 44 C90 50 70 54 50 54 C30 54 10 50 2 44 Z"
          fill="#8a5a2b"
        />
        <path
          d="M4 42 C20 50 80 50 96 42 C94 47 80 52 50 52 C20 52 6 47 4 42 Z"
          fill="#a8703a"
        />
        <path
          d="M26 46 C24 30 28 12 40 10 C46 16 54 16 60 10 C72 12 76 30 74 46 Z"
          fill="#a8703a"
        />
        <path
          d="M26 40 C40 44 60 44 74 40 L74 46 C60 50 40 50 26 46 Z"
          fill={NAVY}
        />
        <circle cx="50" cy="44" r="3" fill={GOLD} />
      </>
    ),
  },
  "hat-flowers": {
    width: 0.86,
    sink: 0.3,
    svg: (
      <>
        <path
          d="M6 48 C24 38 76 38 94 48"
          stroke="#3aa14c"
          strokeWidth="5"
          fill="none"
          strokeLinecap="round"
        />
        {[
          [12, 44, "#f5b82e"],
          [30, 38, "#ff8fa3"],
          [50, 36, WHITE],
          [70, 38, "#ff8fa3"],
          [88, 44, "#f5b82e"],
        ].map(([x, y, c], i) => (
          <g key={i} transform={`translate(${x} ${y})`}>
            {[0, 72, 144, 216, 288].map((a) => (
              <ellipse
                key={a}
                cx="0"
                cy="-6"
                rx="4.5"
                ry="6.5"
                fill={c as string}
                transform={`rotate(${a})`}
              />
            ))}
            <circle r="3.5" fill={i === 2 ? GOLD : "#fff3c9"} />
          </g>
        ))}
        <path d="M20 42 l-4 -8 l8 3 z M80 42 l4 -8 l-8 3 z" fill="#3aa14c" />
      </>
    ),
  },
  "hat-santa": {
    width: 0.86,
    sink: 0.4,
    svg: (
      <>
        <path
          d="M16 48 C18 22 36 8 58 10 C74 12 88 22 92 34 C84 28 76 28 72 34 C70 40 72 46 74 48 Z"
          fill="#d6333a"
        />
        <circle cx="92" cy="36" r="8" fill={WHITE} />
        <rect x="10" y="42" width="70" height="14" rx="7" fill={WHITE} />
        <path
          d="M40 16 C48 12 60 12 68 18"
          stroke="#ff6b70"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
          opacity="0.6"
        />
      </>
    ),
  },
  "hat-wizard": {
    width: 0.9,
    sink: 0.34,
    svg: (
      <>
        <path
          d="M30 50 C40 36 46 18 62 2 C60 18 64 34 72 50 Z"
          fill="#2b3f8f"
        />
        <ellipse cx="50" cy="50" rx="46" ry="8" fill="#23357a" />
        <path
          d="M34 44 C44 40 58 40 70 44 L70 49 C58 46 44 46 34 49 Z"
          fill={GOLD}
        />
        <polygon
          points="52,22 54,27 59,27 55,30 57,35 52,32 47,35 49,30 45,27 50,27"
          fill={GOLD}
        />
        <circle cx="61" cy="36" r="2" fill="#ffe28a" />
        <circle cx="44" cy="33" r="1.5" fill="#ffe28a" />
      </>
    ),
  },
  "hat-crown": {
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
  "hat-witch": {
    width: 1.0,
    sink: 0.36,
    svg: (
      <>
        <ellipse cx="50" cy="52" rx="49" ry="7" fill="#2a1f3d" />
        <path
          d="M26 50 C34 36 38 20 50 10 C58 4 70 2 78 8 C70 8 64 14 62 22 C60 32 66 42 72 50 Z"
          fill="#3b2a5a"
        />
        <path
          d="M30 44 C44 40 58 40 70 44 L71 50 C58 46 44 46 29 50 Z"
          fill="#f28c28"
        />
        <rect
          x="46"
          y="41"
          width="10"
          height="9"
          rx="1.5"
          fill="none"
          stroke={GOLD}
          strokeWidth="2"
        />
        <path
          d="M40 24 C46 20 52 18 56 18"
          stroke="#5a4580"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
      </>
    ),
  },
  "hat-pumpkin": {
    width: 0.8,
    sink: 0.38,
    svg: (
      <>
        <ellipse cx="50" cy="36" rx="44" ry="22" fill="#f28c28" />
        <path
          d="M30 16 C24 26 24 46 30 56 M50 14 L50 58 M70 16 C76 26 76 46 70 56"
          stroke="#d0661a"
          strokeWidth="3"
          fill="none"
        />
        <path
          d="M46 16 C46 8 50 2 56 2 L58 6 C54 6 52 10 52 16 Z"
          fill="#3f7d2a"
        />
        <path d="M56 8 C66 2 76 6 76 12 C68 10 62 12 58 12 Z" fill="#5cb85c" />
        <path
          d="M32 34 L38 28 L44 34 Z M56 34 L62 28 L68 34 Z"
          fill="#3a1d05"
        />
        <path
          d="M34 42 L40 46 L46 42 L50 47 L54 42 L60 46 L66 42 C62 52 38 52 34 42 Z"
          fill="#3a1d05"
        />
      </>
    ),
  },
  "hat-elf": {
    width: 0.86,
    sink: 0.4,
    svg: (
      <>
        <path
          d="M14 48 C22 28 40 14 62 10 C76 8 90 14 98 22 C88 22 78 26 76 34 C74 40 76 46 78 48 Z"
          fill="#1f9d55"
        />
        <circle cx="98" cy="24" r="6" fill={GOLD} />
        <path d="M10 42 L82 42 L84 56 L8 56 Z" fill="#d6333a" />
        <path
          d="M14 42 L20 56 M26 42 L32 56 M38 42 L44 56 M50 42 L56 56 M62 42 L68 56 M74 42 L80 56"
          stroke={WHITE}
          strokeWidth="2.5"
          opacity="0.7"
        />
        <path
          d="M44 18 C54 14 64 14 72 18"
          stroke="#34c26f"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
      </>
    ),
  },
  "hat-reindeer": {
    width: 1.3,
    sink: 0.46,
    svg: (
      <>
        {["", "translate(100 0) scale(-1 1)"].map((t) => (
          <g key={t} transform={t || undefined}>
            <path
              d="M30 56 C26 40 22 30 12 22 M22 32 C14 32 8 26 6 18 M16 26 C18 16 14 8 8 4 M26 40 C32 30 32 20 28 12"
              stroke="#8a5a2b"
              strokeWidth="6"
              fill="none"
              strokeLinecap="round"
            />
          </g>
        ))}
        <path
          d="M20 58 C30 46 70 46 80 58"
          stroke="#c9463d"
          strokeWidth="5"
          fill="none"
          strokeLinecap="round"
        />
        <circle cx="50" cy="50" r="4" fill={GOLD} />
      </>
    ),
  },
  ...EXTRA_HATS,
  ...STAFF_HATS,
  ...THIRD_HATS,
  ...FOURTH_HATS,
  ...COLOMBIA_HATS,
};

// ---------------------------------------------------------------------------
// Decor props, each in its own viewBox; `slot` places it on the floor.
// ---------------------------------------------------------------------------
export interface DecorArt {
  viewBox: string;
  /** Horizontal position (% of the world width) and width (% of world width). */
  left: number;
  width: number;
  /** Distance from the floor line, % of world height (pennant hangs up high). */
  lift?: number;
  /** What Rocky does when he visits it. */
  play: DecorPlay;
  svg: ReactElement;
}

/** Rocky's interactions with placed items (Pet Society style). */
export type DecorPlay =
  | "eat"
  | "rest"
  | "nap"
  | "cheer"
  | "sniff"
  | "vroom"
  | "peek";

export const DECOR_ART: Record<string, DecorArt> = {
  "decor-boxes": {
    play: "peek",
    viewBox: "0 0 120 100",
    left: 4,
    width: 13,
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
        <text
          x="30"
          y="36"
          fontFamily="Poppins, sans-serif"
          fontWeight="800"
          fontSize="11"
          fill={NAVY}
          opacity="0.75"
        >
          RLX
        </text>
      </>
    ),
  },
  "decor-plant": {
    play: "sniff",
    viewBox: "0 0 80 120",
    left: 80,
    width: 9,
    svg: (
      <>
        <ellipse cx="40" cy="116" rx="30" ry="4" fill="#000" opacity="0.08" />
        <path d="M40 70 C10 60 6 30 22 20 C30 40 36 50 40 70 Z" fill={GREEN} />
        <path
          d="M40 70 C70 58 74 28 58 16 C50 36 44 50 40 70 Z"
          fill={GREEN2}
        />
        <path
          d="M40 70 C36 40 40 16 40 4 C46 20 48 44 40 70 Z"
          fill="#006b35"
        />
        <path d="M18 70 L62 70 L56 116 L24 116 Z" fill={NAVY} />
        <rect x="14" y="66" width="52" height="10" rx="3" fill={NAVY2} />
      </>
    ),
  },
  "decor-trophy": {
    play: "cheer",
    viewBox: "0 0 80 100",
    left: 17,
    width: 8,
    svg: (
      <>
        <ellipse cx="40" cy="96" rx="26" ry="4" fill="#000" opacity="0.08" />
        <path
          d="M18 8 L62 8 L60 36 C58 50 50 56 40 56 C30 56 22 50 20 36 Z"
          fill={GOLD}
        />
        <path
          d="M18 14 C4 14 4 36 22 38 M62 14 C76 14 76 36 58 38"
          stroke={GOLD}
          strokeWidth="5"
          fill="none"
        />
        <rect x="34" y="56" width="12" height="18" fill="#e0a21a" />
        <rect x="20" y="74" width="40" height="20" rx="3" fill={NAVY} />
        <circle cx="40" cy="28" r="7" fill={WHITE} opacity="0.7" />
      </>
    ),
  },
  "decor-truck": {
    play: "vroom",
    viewBox: "0 0 160 90",
    left: 76,
    width: 15,
    svg: (
      <>
        <ellipse cx="80" cy="86" rx="74" ry="4" fill="#000" opacity="0.08" />
        <rect
          x="6"
          y="12"
          width="104"
          height="58"
          rx="5"
          fill={WHITE}
          stroke="#d7dee6"
          strokeWidth="2"
        />
        <rect x="6" y="50" width="104" height="8" fill={GREEN} />
        <text
          x="20"
          y="42"
          fontFamily="Poppins, sans-serif"
          fontWeight="800"
          fontSize="20"
          fill={NAVY}
        >
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
  "decor-balloons": {
    play: "cheer",
    viewBox: "0 0 90 170",
    left: 33,
    width: 9,
    svg: (
      <>
        <path
          d="M30 70 C32 110 42 140 46 168 M60 64 C56 110 50 140 46 168 M46 58 C44 110 46 140 46 168"
          stroke="#9aa6b2"
          strokeWidth="1.5"
          fill="none"
        />
        <ellipse cx="28" cy="44" rx="20" ry="25" fill={GREEN} />
        <ellipse cx="62" cy="40" rx="20" ry="25" fill={GOLD} />
        <ellipse cx="45" cy="30" rx="21" ry="26" fill={NAVY} />
        <text
          x="34"
          y="36"
          fontFamily="Poppins, sans-serif"
          fontWeight="800"
          fontSize="10"
          fill={WHITE}
        >
          RLX
        </text>
        <ellipse cx="20" cy="34" rx="5" ry="8" fill={WHITE} opacity="0.35" />
        <ellipse cx="55" cy="30" rx="5" ry="8" fill={WHITE} opacity="0.35" />
      </>
    ),
  },
  "decor-lamp": {
    play: "sniff",
    viewBox: "0 0 60 220",
    left: 26,
    width: 8,
    svg: (
      <>
        <ellipse cx="30" cy="216" rx="22" ry="4" fill="#000" opacity="0.08" />
        <rect x="26" y="40" width="8" height="176" rx="3" fill={NAVY2} />
        <rect x="18" y="200" width="24" height="14" rx="4" fill={NAVY} />
        <path d="M12 40 L48 40 L42 18 L18 18 Z" fill={NAVY} />
        <rect x="20" y="40" width="20" height="10" rx="3" fill="#fff4c9" />
        <circle cx="30" cy="46" r="26" fill="#fff4c9" opacity="0.18" />
      </>
    ),
  },
  "decor-bench": {
    play: "rest",
    viewBox: "0 0 160 80",
    left: 60,
    width: 15,
    svg: (
      <>
        <ellipse cx="80" cy="76" rx="74" ry="4" fill="#000" opacity="0.08" />
        <rect x="10" y="10" width="140" height="10" rx="3" fill="#b88650" />
        <rect x="10" y="24" width="140" height="10" rx="3" fill="#c99a63" />
        <rect x="6" y="42" width="148" height="10" rx="3" fill="#d6a86f" />
        <path
          d="M20 20 L20 74 M140 20 L140 74 M30 52 L24 74 M130 52 L136 74"
          stroke={NAVY}
          strokeWidth="6"
          strokeLinecap="round"
        />
      </>
    ),
  },
  "decor-barn": {
    play: "peek",
    viewBox: "0 0 160 140",
    left: 78,
    width: 20,
    svg: (
      <>
        <ellipse cx="80" cy="136" rx="76" ry="5" fill="#000" opacity="0.08" />
        <path d="M12 60 L80 12 L148 60 L148 134 L12 134 Z" fill="#c9463d" />
        <path d="M4 62 L80 6 L156 62 L148 66 L80 18 L12 66 Z" fill={WHITE} />
        <rect x="52" y="74" width="56" height="60" fill="#a8372f" />
        <path
          d="M52 74 L108 134 M108 74 L52 134"
          stroke={WHITE}
          strokeWidth="5"
        />
        <rect
          x="52"
          y="74"
          width="56"
          height="60"
          fill="none"
          stroke={WHITE}
          strokeWidth="5"
        />
        <circle cx="80" cy="44" r="11" fill={WHITE} />
        <text
          x="72"
          y="48"
          fontFamily="Poppins, sans-serif"
          fontWeight="800"
          fontSize="10"
          fill={NAVY}
        >
          R
        </text>
      </>
    ),
  },
  "decor-bowl": {
    play: "eat",
    viewBox: "0 0 100 50",
    left: 40,
    width: 7,
    svg: (
      <>
        <ellipse cx="50" cy="46" rx="46" ry="4" fill="#000" opacity="0.1" />
        <ellipse cx="50" cy="16" rx="40" ry="8" fill="#c98a3a" />
        <circle cx="36" cy="13" r="5" fill="#a86a28" />
        <circle cx="50" cy="11" r="5" fill="#b87a30" />
        <circle cx="63" cy="14" r="5" fill="#a86a28" />
        <path d="M8 16 L92 16 L80 44 L20 44 Z" fill={NAVY} />
        <path d="M8 16 L92 16 L90 22 L10 22 Z" fill={NAVY2} />
        <text
          x="37"
          y="38"
          fontFamily="Poppins, sans-serif"
          fontWeight="800"
          fontSize="12"
          fill={WHITE}
        >
          RLX
        </text>
      </>
    ),
  },
  "decor-hay": {
    play: "eat",
    viewBox: "0 0 120 80",
    left: 47,
    width: 11,
    svg: (
      <>
        <ellipse cx="60" cy="76" rx="56" ry="4" fill="#000" opacity="0.1" />
        <rect x="6" y="14" width="108" height="60" rx="10" fill="#e3b94f" />
        <path
          d="M12 26 L108 26 M12 40 L108 40 M12 54 L108 54 M12 66 L108 66"
          stroke="#c89a32"
          strokeWidth="3"
        />
        <rect x="30" y="14" width="7" height="60" fill="#8c5a2b" />
        <rect x="82" y="14" width="7" height="60" fill="#8c5a2b" />
        <path
          d="M20 14 L16 4 M44 14 L46 2 M70 14 L66 5 M96 14 L102 6"
          stroke="#e3b94f"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </>
    ),
  },
  "decor-mailbox": {
    play: "peek",
    viewBox: "0 0 70 130",
    left: 70,
    width: 7,
    svg: (
      <>
        <ellipse cx="35" cy="126" rx="26" ry="4" fill="#000" opacity="0.1" />
        <rect x="31" y="50" width="8" height="76" fill="#8c5a2b" />
        <path d="M6 20 C6 6 64 6 64 20 L64 54 L6 54 Z" fill={NAVY} />
        <rect x="6" y="40" width="58" height="6" fill={GREEN} />
        <rect x="62" y="12" width="4" height="26" fill="#c9463d" />
        <rect x="62" y="12" width="16" height="10" fill="#c9463d" />
        <text
          x="18"
          y="34"
          fontFamily="Poppins, sans-serif"
          fontWeight="800"
          fontSize="12"
          fill={WHITE}
        >
          RLX
        </text>
      </>
    ),
  },
  "decor-bed": {
    play: "nap",
    viewBox: "0 0 160 70",
    left: 22,
    width: 14,
    svg: (
      <>
        <ellipse cx="80" cy="66" rx="76" ry="4" fill="#000" opacity="0.1" />
        <ellipse cx="80" cy="46" rx="74" ry="20" fill={NAVY} />
        <ellipse cx="80" cy="40" rx="60" ry="14" fill="#7aa7d6" />
        <ellipse cx="80" cy="38" rx="50" ry="9" fill="#a9c8ea" />
        <ellipse cx="36" cy="32" rx="18" ry="8" fill={WHITE} />
        <path
          d="M60 56 L70 56 M90 56 L100 56"
          stroke={GREEN}
          strokeWidth="4"
          strokeLinecap="round"
        />
      </>
    ),
  },
  "decor-jack": {
    play: "peek",
    viewBox: "0 0 100 80",
    left: 12,
    width: 8,
    svg: (
      <>
        <ellipse cx="50" cy="77" rx="44" ry="4" fill="#000" opacity="0.1" />
        <ellipse cx="50" cy="46" rx="44" ry="30" fill="#f28c28" />
        <path
          d="M28 20 C20 34 20 60 28 72 M50 16 L50 76 M72 20 C80 34 80 60 72 72"
          stroke="#d0661a"
          strokeWidth="3"
          fill="none"
        />
        <path
          d="M46 18 C46 8 50 2 58 2 L60 6 C54 6 52 12 54 18 Z"
          fill="#3f7d2a"
        />
        <path
          d="M28 40 L36 30 L44 40 Z M56 40 L64 30 L72 40 Z"
          fill="#ffd54a"
        />
        <path
          d="M30 52 L38 58 L44 52 L50 58 L56 52 L62 58 L70 52 C66 66 34 66 30 52 Z"
          fill="#ffd54a"
        />
        <ellipse
          cx="50"
          cy="46"
          rx="30"
          ry="18"
          fill="#ffd54a"
          opacity="0.12"
          className="rocky-twinkle"
        />
      </>
    ),
  },
  "decor-candy-bucket": {
    play: "eat",
    viewBox: "0 0 80 80",
    left: 55,
    width: 7,
    svg: (
      <>
        <ellipse cx="40" cy="77" rx="34" ry="3.5" fill="#000" opacity="0.1" />
        <path
          d="M14 20 C10 4 70 4 66 20"
          stroke="#3a1d05"
          strokeWidth="3"
          fill="none"
        />
        <circle cx="26" cy="22" r="7" fill="#e2445c" />
        <circle cx="40" cy="18" r="7" fill="#7a4fd1" />
        <circle cx="54" cy="22" r="7" fill={GOLD} />
        <path d="M8 26 L72 26 L64 76 L16 76 Z" fill="#f28c28" />
        <path
          d="M24 42 L32 36 L38 42 Z M42 42 L50 36 L56 42 Z"
          fill="#3a1d05"
        />
        <path
          d="M24 54 C32 62 48 62 56 54"
          stroke="#3a1d05"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
      </>
    ),
  },
  "decor-tombstone": {
    play: "sniff",
    viewBox: "0 0 80 100",
    left: 82,
    width: 8.5,
    svg: (
      <>
        <ellipse cx="40" cy="96" rx="36" ry="4" fill="#3f7d2a" opacity="0.5" />
        <path d="M10 96 L10 36 C10 10 70 10 70 36 L70 96 Z" fill="#9aa3ad" />
        <path
          d="M10 96 L10 36 C10 10 70 10 70 36 L70 44 C60 30 20 30 10 44 Z"
          fill="#b8c0c8"
        />
        <text
          x="21"
          y="56"
          fontFamily="Poppins, sans-serif"
          fontWeight="800"
          fontSize="15"
          fill="#5b6570"
        >
          RIP
        </text>
        <text
          x="16"
          y="74"
          fontFamily="Poppins, sans-serif"
          fontWeight="700"
          fontSize="8.5"
          fill="#5b6570"
        >
          typos
        </text>
        <path
          d="M6 96 C12 88 18 90 20 96 M58 96 C62 88 70 88 74 96"
          stroke="#3f7d2a"
          strokeWidth="3"
          fill="none"
        />
      </>
    ),
  },
  "decor-ghost": {
    play: "cheer",
    viewBox: "0 0 80 90",
    left: 30,
    width: 8,
    lift: 40,
    svg: (
      <g className="rocky-drift">
        <path
          d="M10 40 C10 10 70 10 70 40 L70 80 L60 72 L50 82 L40 72 L30 82 L20 72 L10 80 Z"
          fill={WHITE}
          opacity="0.92"
        />
        <ellipse cx="30" cy="40" rx="5" ry="7" fill="#2a1f3d" />
        <ellipse cx="50" cy="40" rx="5" ry="7" fill="#2a1f3d" />
        <ellipse cx="40" cy="56" rx="6" ry="4" fill="#2a1f3d" />
        <ellipse cx="24" cy="50" rx="4" ry="2.5" fill="#ffb3c7" />
        <ellipse cx="56" cy="50" rx="4" ry="2.5" fill="#ffb3c7" />
      </g>
    ),
  },
  "decor-cauldron": {
    play: "sniff",
    viewBox: "0 0 100 100",
    left: 68,
    width: 10,
    svg: (
      <>
        <ellipse cx="50" cy="97" rx="44" ry="3.5" fill="#000" opacity="0.12" />
        <path
          d="M20 94 L26 84 M80 94 L74 84"
          stroke="#1b1b1b"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <ellipse cx="50" cy="44" rx="42" ry="10" fill="#2a2a2a" />
        <path d="M10 46 C10 92 90 92 90 46 Z" fill="#1b1b1b" />
        <ellipse cx="50" cy="44" rx="36" ry="7" fill="#7ee06a" />
        <g className="rocky-twinkle">
          <circle cx="36" cy="32" r="7" fill="#9df08a" opacity="0.9" />
          <circle cx="56" cy="24" r="5" fill="#9df08a" opacity="0.8" />
          <circle cx="64" cy="34" r="4" fill="#b8ff9f" opacity="0.8" />
          <circle cx="48" cy="12" r="3" fill="#b8ff9f" opacity="0.7" />
        </g>
        <path
          d="M26 62 C34 66 44 66 50 64"
          stroke="#3a3a3a"
          strokeWidth="3"
          fill="none"
        />
      </>
    ),
  },
  "decor-candy-cane": {
    play: "eat",
    viewBox: "0 0 60 140",
    left: 6,
    width: 6,
    svg: (
      <>
        <ellipse cx="30" cy="137" rx="20" ry="3" fill="#000" opacity="0.1" />
        <path
          d="M38 136 L38 40 C38 12 10 12 10 36"
          stroke={WHITE}
          strokeWidth="14"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M38 136 L38 40 C38 12 10 12 10 36"
          stroke="#d6333a"
          strokeWidth="14"
          fill="none"
          strokeLinecap="round"
          strokeDasharray="9 9"
        />
        <path d="M32 132 L32 44" stroke={WHITE} strokeWidth="3" opacity="0.5" />
      </>
    ),
  },
  "decor-gifts": {
    play: "peek",
    viewBox: "0 0 120 90",
    left: 58,
    width: 11,
    svg: (
      <>
        <ellipse cx="60" cy="87" rx="56" ry="4" fill="#000" opacity="0.1" />
        <rect x="6" y="40" width="50" height="46" rx="3" fill="#d6333a" />
        <rect x="27" y="40" width="8" height="46" fill={GOLD} />
        <rect x="6" y="58" width="50" height="8" fill={GOLD} />
        <rect x="60" y="50" width="54" height="36" rx="3" fill="#1f9d55" />
        <rect x="83" y="50" width="8" height="36" fill={WHITE} />
        <rect x="30" y="14" width="40" height="30" rx="3" fill="#3a78c2" />
        <rect x="46" y="14" width="8" height="30" fill={WHITE} />
        <path
          d="M50 14 C40 2 32 8 42 14 M50 14 C60 2 68 8 58 14"
          stroke={WHITE}
          strokeWidth="4"
          fill="none"
        />
      </>
    ),
  },
  "decor-snowman": {
    play: "cheer",
    viewBox: "0 0 90 140",
    left: 84,
    width: 10,
    svg: (
      <>
        <ellipse cx="45" cy="137" rx="38" ry="4" fill="#000" opacity="0.1" />
        <circle
          cx="45"
          cy="104"
          r="32"
          fill={WHITE}
          stroke="#d7e4ef"
          strokeWidth="2"
        />
        <circle
          cx="45"
          cy="56"
          r="24"
          fill={WHITE}
          stroke="#d7e4ef"
          strokeWidth="2"
        />
        <circle
          cx="45"
          cy="22"
          r="17"
          fill={WHITE}
          stroke="#d7e4ef"
          strokeWidth="2"
        />
        <circle cx="39" cy="19" r="2.2" fill="#1b2433" />
        <circle cx="51" cy="19" r="2.2" fill="#1b2433" />
        <path d="M45 24 L60 28 L45 28 Z" fill="#f28c28" />
        <path d="M28 38 Q45 46 62 38 L62 44 Q45 52 28 44 Z" fill="#d6333a" />
        <path d="M58 42 L64 60 L58 62 L54 44 Z" fill="#d6333a" />
        <circle cx="45" cy="56" r="2.5" fill="#1b2433" />
        <circle cx="45" cy="68" r="2.5" fill="#1b2433" />
        <path
          d="M22 54 L4 42 M68 54 L86 42"
          stroke="#8a5a2b"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <rect x="32" y="0" width="26" height="8" rx="2" fill="#1b2433" />
        <rect x="28" y="6" width="34" height="5" rx="2" fill="#1b2433" />
      </>
    ),
  },
  "decor-xmas-tree": {
    play: "cheer",
    viewBox: "0 0 120 160",
    left: 70,
    width: 15,
    svg: (
      <>
        <ellipse cx="60" cy="156" rx="50" ry="4" fill="#000" opacity="0.1" />
        <rect x="52" y="130" width="16" height="24" fill="#8a5a2b" />
        <path
          d="M60 10 L100 70 L80 70 L108 112 L84 112 L112 138 L8 138 L36 112 L12 112 L40 70 L20 70 Z"
          fill="#1f7a45"
        />
        <path
          d="M60 10 L100 70 L80 70 L108 112 L84 112 L112 138 L60 138 Z"
          fill="#17663a"
        />
        <path
          d="M34 72 Q60 84 88 70 M24 114 Q60 128 98 112"
          stroke={GOLD}
          strokeWidth="3"
          fill="none"
        />
        <g className="rocky-twinkle">
          {[
            [48, 56, "#e2445c"],
            [72, 62, GOLD],
            [40, 94, "#3a78c2"],
            [66, 96, "#e2445c"],
            [86, 100, GOLD],
            [30, 128, GOLD],
            [58, 126, "#3a78c2"],
            [90, 128, "#e2445c"],
          ].map(([x, y, c], i) => (
            <circle
              key={i}
              cx={x as number}
              cy={y as number}
              r="5"
              fill={c as string}
            />
          ))}
        </g>
        <polygon
          points="60,0 64,10 75,10 66,16 69,27 60,20 51,27 54,16 45,10 56,10"
          fill={GOLD}
        />
      </>
    ),
  },
  "decor-sleigh": {
    play: "vroom",
    viewBox: "0 0 160 90",
    left: 40,
    width: 15,
    svg: (
      <>
        <ellipse cx="80" cy="87" rx="74" ry="4" fill="#000" opacity="0.1" />
        <path
          d="M6 80 L140 80 C152 80 156 70 150 64"
          stroke={GOLD}
          strokeWidth="5"
          fill="none"
          strokeLinecap="round"
        />
        <path d="M30 80 L34 68 M110 80 L106 68" stroke={GOLD} strokeWidth="4" />
        <path
          d="M16 20 C16 50 22 68 40 68 L120 68 C132 68 136 58 132 44 L124 20 C120 34 110 38 96 38 L40 38 C28 38 22 30 16 20 Z"
          fill="#c9463d"
        />
        <path
          d="M40 38 L96 38 C110 38 120 34 124 20"
          stroke={GOLD}
          strokeWidth="4"
          fill="none"
        />
        <rect x="46" y="16" width="26" height="24" rx="3" fill="#1f9d55" />
        <rect x="56" y="16" width="6" height="24" fill={GOLD} />
        <rect x="74" y="22" width="22" height="18" rx="3" fill="#3a78c2" />
        <rect x="83" y="22" width="5" height="18" fill={WHITE} />
      </>
    ),
  },
  "decor-jr-flag": {
    play: "cheer",
    viewBox: "0 0 90 170",
    left: 90,
    width: 8,
    svg: (
      <>
        <ellipse cx="14" cy="167" rx="12" ry="3" fill="#000" opacity="0.12" />
        <rect x="11" y="6" width="5" height="162" rx="2" fill="#9aa6b2" />
        <circle cx="13.5" cy="6" r="5" fill={GOLD} />
        <g className="rocky-drift">
          <path
            d="M16 12 C40 4 60 22 86 12 L86 70 C60 80 40 62 16 70 Z"
            fill="#ffffff"
          />
          <clipPath id="jr-flag-clip">
            <path d="M16 12 C40 4 60 22 86 12 L86 70 C60 80 40 62 16 70 Z" />
          </clipPath>
          <g clipPath="url(#jr-flag-clip)">
            {[16, 36, 56, 76].map((x) => (
              <rect key={x} x={x} y="0" width="10" height="90" fill="#d0112b" />
            ))}
          </g>
          <path
            d="M16 12 C40 4 60 22 86 12 L86 70 C60 80 40 62 16 70 Z"
            fill="none"
            stroke="#12234a"
            strokeWidth="2"
          />
        </g>
      </>
    ),
  },
  "decor-jr-goal": {
    play: "cheer",
    viewBox: "0 0 180 110",
    left: 50,
    width: 17,
    svg: (
      <>
        <ellipse cx="90" cy="106" rx="86" ry="4" fill="#000" opacity="0.1" />
        <path
          d="M14 104 L24 30 L156 30 L166 104"
          fill="#ffffff"
          opacity="0.25"
        />
        <g stroke="#cfd8e3" strokeWidth="1.2">
          {Array.from({ length: 13 }, (_, i) => (
            <path
              key={`v${i}`}
              d={`M${24 + i * 11} 30 L${14 + i * 12.5} 104`}
            />
          ))}
          {Array.from({ length: 7 }, (_, i) => (
            <path
              key={`h${i}`}
              d={`M${24 - i * 1.4} ${40 + i * 10.6} L${156 + i * 1.4} ${40 + i * 10.6}`}
            />
          ))}
        </g>
        <path
          d="M10 106 L10 20 L170 20 L170 106"
          stroke="#ffffff"
          strokeWidth="7"
          fill="none"
          strokeLinejoin="round"
        />
        <path
          d="M10 106 L10 20 L170 20 L170 106"
          stroke="#d0112b"
          strokeWidth="7"
          fill="none"
          strokeDasharray="12 12"
          strokeLinejoin="round"
        />
      </>
    ),
  },
  "decor-jr-shark": {
    play: "vroom",
    viewBox: "0 0 160 90",
    left: 30,
    width: 14,
    svg: (
      <>
        <ellipse cx="80" cy="86" rx="70" ry="4" fill="#000" opacity="0.12" />
        <path
          d="M6 54 C20 30 60 20 100 26 C124 30 146 40 154 52 C146 64 124 72 100 74 C60 78 22 72 6 54 Z"
          fill="#6f8fb3"
        />
        <path
          d="M14 58 C40 70 80 76 120 70 C136 66 148 60 154 52 C146 64 124 74 96 76 C58 80 26 72 14 58 Z"
          fill="#e8eef5"
        />
        <path d="M78 26 C82 8 94 2 100 2 C96 12 96 20 98 27 Z" fill="#5a789b" />
        <path
          d="M6 54 C0 40 2 30 8 24 C12 36 14 46 18 52 C12 62 8 72 2 78 C2 68 4 60 6 54 Z"
          fill="#5a789b"
        />
        <path
          d="M84 70 C90 80 96 84 104 84 C100 78 98 74 98 70 Z"
          fill="#5a789b"
        />
        <circle cx="130" cy="46" r="4" fill="#12234a" />
        <circle cx="131.5" cy="44.5" r="1.3" fill="#ffffff" />
        <path
          d="M128 58 C136 62 144 60 150 55"
          stroke="#12234a"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M112 40 L112 56 M106 41 L106 57 M118 40 L118 55"
          stroke="#5a789b"
          strokeWidth="2"
          strokeLinecap="round"
        />
        {/* A red-and-white fan band around its middle. */}
        <path
          d="M58 28 C56 44 56 60 60 76 L70 76 C66 60 66 44 68 26 Z"
          fill="#d0112b"
        />
        <path
          d="M68 26 C66 44 66 60 70 76 L78 76 C74 60 74 44 76 25 Z"
          fill="#ffffff"
        />
        <path
          d="M76 25 C74 44 74 60 78 76 L86 75 C82 60 82 44 84 25 Z"
          fill="#d0112b"
        />
        <ellipse cx="96" cy="36" rx="18" ry="5" fill="#ffffff" opacity="0.35" />
      </>
    ),
  },
  "decor-pennant": {
    play: "cheer",
    viewBox: "0 0 140 70",
    left: 8,
    width: 16,
    lift: 58,
    svg: (
      <>
        <path d="M2 6 L138 6" stroke={NAVY2} strokeWidth="3" />
        <path d="M10 6 L30 6 L20 34 Z" fill={GREEN} />
        <path d="M40 6 L60 6 L50 34 Z" fill={NAVY} />
        <path d="M70 6 L90 6 L80 34 Z" fill={GREEN} />
        <path d="M100 6 L120 6 L110 34 Z" fill={GOLD} />
        <text
          x="44"
          y="60"
          fontFamily="Caveat, cursive"
          fontWeight="700"
          fontSize="20"
          fill={GREEN}
        >
          go Rocky!
        </text>
      </>
    ),
  },
  ...EXTRA_DECOR,
  ...THIRD_DECOR,
  ...FOURTH_DECOR,
  ...COLOMBIA_DECOR,
};

/**
 * A background, drawn by its scene component (scenes/). Unknown ids fall back
 * to the starter route. Live, a second SVG on top holds the scene's particles
 * so their motion never repaints the scene beneath (scenes/kit.tsx, Particles).
 */
export function SceneArt({ id, live = false }: { id: string; live?: boolean }) {
  const Scene = SCENES[id] ?? SCENES["scene-route"]!;
  const [particles, setParticles] = useState<SVGGElement | null>(null);
  return (
    <>
      <svg viewBox="0 0 1000 400" preserveAspectRatio="xMidYMax slice" width="100%" height="100%" aria-hidden="true">
        <ParticleLayer.Provider value={live ? particles : null}>
          <g className={live ? "rocky-live" : undefined}>
            <Scene live={live} />
          </g>
        </ParticleLayer.Provider>
      </svg>
      {live && (
        <svg
          viewBox="0 0 1000 400"
          preserveAspectRatio="xMidYMax slice"
          width="100%"
          height="100%"
          aria-hidden="true"
          style={{ position: "absolute", inset: 0, pointerEvents: "none", willChange: "transform" }}
        >
          <g className="rocky-live" ref={setParticles} />
        </svg>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Ambience previews for the shop (the live effect is FxLayer in RockyWorld).
// ---------------------------------------------------------------------------
export const FX_ART: Record<string, ReactElement> = {
  "fx-leaves": (
    <>
      {[
        [20, 20, 20],
        [60, 14, -30],
        [40, 44, 60],
        [78, 50, 10],
      ].map(([x, y, r], i) => (
        <path
          key={i}
          d="M0 0 C6 -8 14 -6 16 0 C10 6 4 6 0 0 Z"
          fill={i % 2 ? "#e8963a" : "#f5b82e"}
          transform={`translate(${x} ${y}) rotate(${r}) scale(1.2)`}
        />
      ))}
    </>
  ),
  "fx-fireflies": (
    <>
      {[
        [22, 30],
        [50, 18],
        [70, 42],
        [36, 56],
        [84, 22],
      ].map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="7" fill="#fff3a6" opacity="0.25" />
          <circle cx={x} cy={y} r="2.6" fill="#fff6c2" />
        </g>
      ))}
    </>
  ),
  "fx-snow": (
    <>
      {Array.from({ length: 16 }, (_, i) => (
        <circle
          key={i}
          cx={6 + ((i * 37) % 90)}
          cy={6 + ((i * 23) % 64)}
          r={1.5 + (i % 3)}
          fill={WHITE}
          opacity="0.9"
        />
      ))}
    </>
  ),
  "fx-hearts": (
    <>
      {[
        [26, 44, 1.1],
        [56, 26, 1.4],
        [76, 50, 0.9],
      ].map(([x, y, k], i) => (
        <path
          key={i}
          d="M0 4 C0 -2 -8 -3 -8 3 C-8 8 0 12 0 14 C0 12 8 8 8 3 C8 -3 0 -2 0 4 Z"
          fill="#ff8fa3"
          transform={`translate(${x} ${y}) scale(${k})`}
        />
      ))}
    </>
  ),
  "fx-confetti": (
    <>
      {Array.from({ length: 14 }, (_, i) => (
        <rect
          key={i}
          x={8 + ((i * 29) % 84)}
          y={8 + ((i * 17) % 58)}
          width="6"
          height="3"
          rx="1"
          fill={[GREEN2, GOLD, WHITE, "#e2445c"][i % 4]}
          transform={`rotate(${i * 37} ${11 + ((i * 29) % 84)} ${9 + ((i * 17) % 58)})`}
        />
      ))}
    </>
  ),
};
