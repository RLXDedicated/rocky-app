// Flat, RLX-style vector art for Rocky's world: hats, room props and scenes.
// Rocky himself is NEVER drawn here — the approved 2.5D artwork is the only
// Rocky. These are accessories and environments layered around it.
import type { ReactElement } from "react";
import { EXTRA_DECOR, EXTRA_HATS, STAFF_HATS } from "./extraArt";
import { THIRD_DECOR, THIRD_HATS, THIRD_SCENES } from "./thirdArt";
import { FOURTH_DECOR, FOURTH_HATS, FOURTH_SCENES, SPOOKY_SCENES } from "./fourthArt";
import { COLOMBIA_DECOR, COLOMBIA_HATS, COLOMBIA_SCENES } from "./colombiaArt";
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

// ---------------------------------------------------------------------------
// Scenes — 1000x400, the floor line sits at y≈340.
// ---------------------------------------------------------------------------
function Tree({
  x,
  y,
  s = 1,
  tone = 0,
}: {
  x: number;
  y: number;
  s?: number;
  tone?: number;
}) {
  // Three greens per tone so a row of trees never looks copy-pasted.
  const g = [
    ["#2e8b3e", "#3aa14c", "#56bd66"],
    ["#2c7a45", "#36955a", "#4fb173"],
    ["#3d8f2f", "#4ea63e", "#6cc155"],
  ][tone % 3]!;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx="0" cy="20" rx="26" ry="6" fill="#000" opacity="0.08" />
      <path d="M-3 18 L-2 -2 L2 -2 L3 18 Z" fill="#6b4a2f" />
      <path
        d="M0 4 L-7 -6 M0 0 L6 -8"
        stroke="#6b4a2f"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <g
        className="rocky-sway"
        style={{ animationDelay: `${-((x * 7) % 45) / 10}s` }}
      >
        <circle cx="-12" cy="-8" r="14" fill={g[0]} />
        <circle cx="12" cy="-10" r="15" fill={g[1]} />
        <circle cx="0" cy="-24" r="16" fill={g[2]} />
        <circle cx="-4" cy="-30" r="6" fill="#ffffff" opacity="0.18" />
        <circle cx="8" cy="-16" r="4" fill="#ffffff" opacity="0.12" />
      </g>
    </g>
  );
}

function Bush({
  x,
  y,
  s = 1,
  color = "#3aa14c",
}: {
  x: number;
  y: number;
  s?: number;
  color?: string;
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx="0" cy="8" rx="30" ry="5" fill="#000" opacity="0.08" />
      <circle cx="-14" cy="0" r="12" fill={color} />
      <circle cx="0" cy="-6" r="15" fill={color} />
      <circle cx="15" cy="0" r="11" fill={color} />
      <circle cx="-4" cy="-10" r="5" fill="#ffffff" opacity="0.15" />
      <circle cx="-8" cy="-2" r="2" fill="#f5b82e" />
      <circle cx="6" cy="-8" r="2" fill="#ff8fa3" />
    </g>
  );
}

function House({
  x,
  y,
  roof = "#d9695f",
  wall = "#f7f4ef",
}: {
  x: number;
  y: number;
  roof?: string;
  wall?: string;
}) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx="22" cy="44" rx="36" ry="7" fill="#000" opacity="0.08" />
      <polygon points="0,16 22,4 44,16 44,42 0,42" fill={wall} />
      <polygon points="22,4 44,16 44,42 22,42" fill="#000" opacity="0.07" />
      <rect x="30" y="-6" width="6" height="14" fill="#8a5a4a" />
      {[0, 1.3, 2.6].map((d) => (
        <circle
          key={d}
          cx="33"
          cy="-10"
          r="4"
          fill="#ffffff"
          opacity="0"
          className="rocky-smoke"
          style={{ animationDelay: `${d + ((x * 3) % 10) / 10}s` }}
        />
      ))}
      <polygon points="-4,18 22,-2 26,2 2,22" fill={roof} />
      <polygon points="22,-2 48,18 44,22 22,4" fill={roof} opacity="0.8" />
      <rect x="8" y="26" width="9" height="16" rx="1" fill={NAVY2} />
      <circle cx="15" cy="34" r="0.9" fill={GOLD} />
      <rect
        x="27"
        y="23"
        width="10"
        height="9"
        fill="#9fc6e8"
        stroke="#ffffff"
        strokeWidth="1.2"
      />
      <path
        d="M32 23 L32 32 M27 27.5 L37 27.5"
        stroke="#ffffff"
        strokeWidth="1"
      />
      <rect x="25" y="32" width="14" height="3" fill="#6fbf73" />
    </g>
  );
}

/** Tufts of grass and little flowers along a ground line. */
function Meadow({
  y,
  color = "#7cc48f",
  flowers = true,
  seed = 1,
  count = 22,
}: {
  y: number;
  color?: string;
  flowers?: boolean;
  seed?: number;
  count?: number;
}) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const x = (i * 97 * seed + 23) % 1000;
        const dy = ((i * 37 * seed) % 30) - 6;
        return (
          <g key={i} transform={`translate(${x} ${y + dy})`}>
            <path
              d="M0 0 q3 -12 6 0 q3 -9 6 0 q2 -7 5 0"
              stroke={color}
              strokeWidth="2.4"
              fill="none"
              strokeLinecap="round"
              opacity={0.55 + (i % 3) * 0.15}
            />
            {flowers && i % 4 === 0 && (
              <>
                <path d="M9 0 L9 -10" stroke={color} strokeWidth="1.5" />
                <circle
                  cx="9"
                  cy="-12"
                  r="3"
                  fill={["#ffffff", "#f5b82e", "#ff8fa3", "#b8a2ff"][i % 4]}
                />
                <circle cx="9" cy="-12" r="1.1" fill="#f5b82e" />
              </>
            )}
          </g>
        );
      })}
    </>
  );
}

function Birds({ x, y }: { x: number; y: number; live?: boolean }) {
  return (
    <g
      transform={`translate(${x} ${y})`}
      stroke="#3b4a5c"
      strokeWidth="2"
      fill="none"
      strokeLinecap="round"
      opacity="0.6"
    >
      <g
        className="rocky-cross-back"
        style={{ animationDelay: `${-(x % 30)}s` }}
      >
        <path d="M0 0 q6 -6 12 0 q6 -6 12 0" className="rocky-flap" />
        <path d="M30 -14 q5 -5 10 0 q5 -5 10 0" className="rocky-flap" />
        <path d="M-24 -20 q4 -4 8 0 q4 -4 8 0" className="rocky-flap" />
      </g>
    </g>
  );
}

type TimeOfDay = "day" | "sunset" | "night";

const ROUTE_PALETTE: Record<
  TimeOfDay,
  {
    sky: [string, string];
    far: string;
    mid: string;
    ground: [string, string];
    road: string;
    line: string;
    glow: string;
  }
> = {
  day: {
    sky: ["#bfe3f6", "#f3fbf6"],
    far: "#cfe8dc",
    mid: "#a9dcb9",
    ground: ["#e9f6ec", "#ffffff"],
    road: "#e3e8ec",
    line: "#ffffff",
    glow: "#fff7d6",
  },
  sunset: {
    sky: ["#ff9f7a", "#ffe0b8"],
    far: "#e9a98f",
    mid: "#c98f86",
    ground: ["#f6dcc8", "#fff4ea"],
    road: "#ecd2c2",
    line: "#fff6ec",
    glow: "#ffd08a",
  },
  night: {
    sky: ["#0b1a33", "#1b3358"],
    far: "#1d3a63",
    mid: "#17325a",
    ground: ["#16305a", "#1c3a68"],
    road: "#243f6b",
    line: "#f5b82e",
    glow: "#f7e9b8",
  },
};

function Cloud({
  x,
  y,
  s = 1,
  opacity = 0.9,
}: {
  x: number;
  y: number;
  s?: number;
  opacity?: number;
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} opacity={opacity}>
      <ellipse cx="0" cy="0" rx="46" ry="16" fill="#ffffff" />
      <circle cx="-16" cy="-8" r="18" fill="#ffffff" />
      <circle cx="12" cy="-14" r="22" fill="#ffffff" />
      <circle cx="34" cy="-4" r="14" fill="#ffffff" />
    </g>
  );
}

function RouteScene({
  time = "day",
  live = false,
}: {
  time?: TimeOfDay;
  live?: boolean;
}) {
  const c = ROUTE_PALETTE[time];
  const night = time === "night";
  const id = `route-${time}`;
  return (
    <>
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={c.sky[0]} />
          <stop offset="1" stopColor={c.sky[1]} />
        </linearGradient>
        <linearGradient id={`${id}-ground`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={c.ground[0]} />
          <stop offset="1" stopColor={c.ground[1]} />
        </linearGradient>
        <radialGradient id={`${id}-sun`}>
          <stop offset="0" stopColor={c.glow} stopOpacity="0.9" />
          <stop offset="1" stopColor={c.glow} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="1000" height="400" fill={`url(#${id}-sky)`} />
      {/* Sun / moon with a soft halo. */}
      <circle
        cx={time === "sunset" ? 760 : 840}
        cy={time === "sunset" ? 170 : 70}
        r="110"
        fill={`url(#${id}-sun)`}
      />
      {night ? (
        <>
          <circle cx="840" cy="70" r="30" fill="#f7e9b8" />
          <circle cx="828" cy="62" r="30" fill="#0f2341" />
          {[80, 190, 300, 420, 560, 660, 760, 930, 130, 500, 700].map(
            (x, i) => (
              <circle
                key={i}
                cx={x}
                cy={30 + ((i * 37) % 110)}
                r={i % 3 === 0 ? 2.4 : 1.4}
                fill="#ffffff"
                opacity={0.5 + (i % 3) * 0.2}
                className={live ? "rocky-twinkle" : undefined}
                style={{ animationDelay: `${i * 0.37}s` }}
              />
            ),
          )}
        </>
      ) : (
        <circle
          cx={time === "sunset" ? 760 : 840}
          cy={time === "sunset" ? 170 : 70}
          r={time === "sunset" ? 40 : 28}
          fill={time === "sunset" ? "#ffcf73" : "#fff4c9"}
        />
      )}
      {time === "day" && (
        <g opacity="0.25">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <path
              key={i}
              d={`M840 70 L${600 + i * 70} 400 L${640 + i * 70} 400 Z`}
              fill="#fff8d6"
            />
          ))}
        </g>
      )}
      {!night && (
        <g className="rocky-float">
          <Cloud x={160} y={70} s={1.1} />
          <Cloud x={520} y={46} s={0.8} opacity={0.75} />
          <Cloud x={1080} y={90} s={0.9} opacity={0.8} />
        </g>
      )}
      {/* Distant town skyline for depth. */}
      <g opacity={night ? 0.55 : 0.35} fill={night ? "#0f2548" : "#9fbfd4"}>
        <rect x="150" y="150" width="18" height="30" />
        <rect x="172" y="138" width="14" height="42" />
        <rect x="190" y="158" width="22" height="22" />
        <rect x="380" y="146" width="16" height="30" />
        <rect x="400" y="132" width="12" height="44" />
      </g>
      {/* Far and mid hills for depth. */}
      <path
        d="M0 210 C120 170 240 190 360 176 C500 160 600 200 720 182 C840 166 930 184 1000 176 L1000 400 L0 400 Z"
        fill={c.far}
      />
      <path
        d="M0 240 C160 214 300 236 460 222 C620 208 760 236 1000 214 L1000 400 L0 400 Z"
        fill={c.mid}
        opacity="0.8"
      />
      <path
        d="M0 258 C200 238 380 276 520 258 C700 234 850 258 1000 246 L1000 400 L0 400 Z"
        fill={`url(#${id}-ground)`}
      />
      {/* The winding RLX route. */}
      <path
        d="M-20 380 C160 330 240 250 420 262 C600 274 640 180 820 170 C920 164 980 190 1040 176"
        stroke={c.road}
        strokeWidth="54"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M-20 380 C160 330 240 250 420 262 C600 274 640 180 820 170 C920 164 980 190 1040 176"
        stroke={c.line}
        strokeWidth="3"
        strokeDasharray="14 14"
        fill="none"
        opacity={night ? 0.5 : 1}
      />
      {!night && time === "day" && <Birds x={330} y={90} live={live} />}
      {time === "sunset" && <Birds x={600} y={120} live={live} />}
      <House x={560} y={120} />
      <House x={640} y={100} roof="#c9564c" wall="#fdf6e8" />
      <House x={880} y={214} roof="#3a78c2" wall="#f2f6fa" />
      <House x={220} y={170} roof="#e08b3a" wall="#fff7ec" />
      <Tree x={520} y={150} s={0.9} />
      <Tree x={720} y={120} s={0.8} tone={1} />
      <Tree x={960} y={150} tone={2} />
      <Tree x={90} y={220} s={0.9} tone={1} />
      <Tree x={300} y={196} s={0.7} tone={2} />
      <Tree x={40} y={250} s={1.1} />
      <Bush x={180} y={262} s={0.9} />
      <Bush x={660} y={236} s={0.8} color="#2e8b3e" />
      <Bush x={990} y={236} s={1} color="#48b35a" />
      {/* A picket fence in front of the far houses. */}
      <g opacity={night ? 0.5 : 0.9}>
        {Array.from({ length: 10 }, (_, i) => (
          <path
            key={i}
            d={`M${540 + i * 12} 168 l0 -14 l3 -4 l3 4 l0 14 Z`}
            fill={night ? "#38557f" : "#ffffff"}
          />
        ))}
        <rect
          x="538"
          y="158"
          width="122"
          height="3"
          fill={night ? "#38557f" : "#ffffff"}
        />
      </g>
      {/* Delivery truck parked by the road. */}
      <g transform="translate(700 210) scale(0.55)">
        <ellipse cx="80" cy="86" rx="74" ry="5" fill="#000" opacity="0.1" />
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
          x="22"
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
        <circle cx="128" cy="72" r="11" fill={NAVY2} />
      </g>
      {/* An RLX van out on its deliveries, driving the route. */}
      {live && (
        <g>
          <g transform="translate(-14 -16) scale(0.28)">
            <rect x="6" y="12" width="104" height="58" rx="5" fill={WHITE} />
            <rect x="6" y="50" width="104" height="8" fill={GREEN} />
            <path d="M110 30 L136 30 L152 50 L152 70 L110 70 Z" fill={NAVY} />
            <circle cx="36" cy="72" r="11" fill={NAVY2} />
            <circle cx="128" cy="72" r="11" fill={NAVY2} />
            {night && (
              <circle cx="152" cy="58" r="10" fill="#fff4c9" opacity="0.9" />
            )}
          </g>
          <animateMotion
            dur="18s"
            repeatCount="indefinite"
            rotate="auto"
            path="M-20 380 C160 330 240 250 420 262 C600 274 640 180 820 170 C920 164 980 190 1040 176"
          />
        </g>
      )}
      {/* Map pin at a delivery stop. */}
      <g transform="translate(820 160)">
        <g className="rocky-bob">
          <circle r="16" fill={WHITE} />
          <circle r="8" fill={GREEN} />
        </g>
      </g>
      {/* Grass and flowers along the floor Rocky walks on. */}
      <Meadow
        y={352}
        color={night ? "#2f5a8a" : time === "sunset" ? "#b98a6a" : "#7cc48f"}
        flowers={!night}
      />
      <Meadow
        y={300}
        color={night ? "#2a5080" : time === "sunset" ? "#c49a7a" : "#8fd0a0"}
        flowers={false}
        seed={3}
        count={12}
      />
      {night &&
        [150, 450, 750].map((x) => (
          <g key={x} transform={`translate(${x} 200)`}>
            <rect x="-2" y="0" width="4" height="60" fill="#35507e" />
            <circle cx="0" cy="0" r="7" fill="#f7e9b8" />
            <circle
              cx="0"
              cy="0"
              r="22"
              fill="#f7e9b8"
              opacity="0.15"
              className="rocky-pulse"
            />
          </g>
        ))}
    </>
  );
}

function Box({
  x,
  y,
  w,
  h,
  tone,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  tone: number;
}) {
  const c = ["#c99a63", "#d6a86f", "#b88650", "#e0b67c"][tone % 4]!;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="2" fill={c} />
      <rect
        x={x + w / 2 - 3}
        y={y}
        width="6"
        height={h}
        fill="#f0d5a8"
        opacity="0.7"
      />
      <rect x={x} y={y} width={w} height="4" fill="#000" opacity="0.08" />
      {tone % 3 === 0 && (
        <rect
          x={x + 5}
          y={y + h - 12}
          width={w * 0.35}
          height="7"
          rx="1"
          fill="#ffffff"
        />
      )}
    </g>
  );
}

function WarehouseScene() {
  return (
    <>
      <defs>
        <linearGradient id="wh-wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#dde5ec" />
          <stop offset="1" stopColor="#eef2f5" />
        </linearGradient>
        <linearGradient id="wh-floor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#cfd8e0" />
          <stop offset="1" stopColor="#e6ecf1" />
        </linearGradient>
        <linearGradient id="wh-beam" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff6d6" stopOpacity="0.6" />
          <stop offset="1" stopColor="#fff6d6" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="1000" height="400" fill="url(#wh-wall)" />
      {/* Roof trusses and skylights. */}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <g key={i}>
          <path
            d={`M${i * 200} 0 L${i * 200 + 100} 28 L${i * 200 + 200} 0`}
            stroke="#9fb0c0"
            strokeWidth="3"
            fill="none"
          />
          <rect
            x={i * 200 + 70}
            y="2"
            width="60"
            height="16"
            rx="2"
            fill="#cfe8f7"
            stroke="#9fb0c0"
            strokeWidth="2"
          />
        </g>
      ))}
      {[170, 570].map((x) => (
        <path
          key={x}
          d={`M${x} 18 L${x - 90} 330 L${x + 150} 330 L${x + 60} 18 Z`}
          fill="url(#wh-beam)"
          className="rocky-pulse"
        />
      ))}
      {/* Big roll-up dock doors with RLX signage. */}
      {[270, 560].map((x, i) => (
        <g key={x} transform={`translate(${x} 70)`}>
          <rect width="170" height="150" fill="#b8c4cf" />
          {Array.from({ length: 12 }, (_, k) => (
            <rect key={k} y={k * 12.5} width="170" height="2" fill="#9fb0c0" />
          ))}
          <rect x="-8" y="-24" width="186" height="22" rx="4" fill={NAVY} />
          <text
            x="46"
            y="-8"
            fontFamily="Poppins, sans-serif"
            fontWeight="800"
            fontSize="14"
            fill={WHITE}
          >
            DOCK {i + 3}
          </text>
          <rect x="-8" y="0" width="8" height="150" fill={GOLD} />
          <rect x="170" y="0" width="8" height="150" fill={GOLD} />
          <path
            d="M0 0 L8 10 M0 20 L8 30 M0 40 L8 50 M170 0 L178 10 M170 20 L178 30 M170 40 L178 50"
            stroke={NAVY}
            strokeWidth="3"
          />
        </g>
      ))}
      {/* Pallet racking full of parcels. */}
      {[20, 770].map((rx, r) => (
        <g key={rx} transform={`translate(${rx} 60)`}>
          <rect x="0" y="0" width="8" height="250" fill={NAVY} />
          <rect x="202" y="0" width="8" height="250" fill={NAVY} />
          <rect x="101" y="0" width="6" height="250" fill={NAVY2} />
          {[70, 150, 230].map((y) => (
            <rect key={y} x="0" y={y} width="210" height="8" fill="#e8762c" />
          ))}
          {[0, 1, 2].map((row) =>
            [0, 1, 2, 3].map((c) => (
              <Box
                key={`${row}-${c}`}
                x={10 + c * 48 + (c > 1 ? 6 : 0)}
                y={[26, 104, 184][row]! + ((row + c + r) % 2) * 8}
                w={42}
                h={44 - ((row + c + r) % 2) * 8}
                tone={row + c + r}
              />
            )),
          )}
        </g>
      ))}
      {/* A conveyor belt carrying parcels. */}
      <g transform="translate(250 250)">
        <rect x="0" y="30" width="500" height="14" rx="7" fill="#3b4a5c" />
        {Array.from({ length: 21 }, (_, i) => (
          <circle key={i} cx={10 + i * 24} cy="37" r="4" fill="#9fb0c0" />
        ))}
        <rect x="20" y="44" width="8" height="40" fill="#3b4a5c" />
        <rect x="472" y="44" width="8" height="40" fill="#3b4a5c" />
        {[0, 1, 2, 3].map((k) => (
          <g
            key={k}
            className="rocky-conveyor"
            style={{ animationDelay: `${-k * 1.75}s` }}
          >
            <Box
              x={0}
              y={k % 2 ? 0 : 4}
              w={k % 2 ? 44 : 34}
              h={k % 2 ? 30 : 26}
              tone={k}
            />
          </g>
        ))}
      </g>
      {/* Floor, safety lines and a forklift. */}
      <rect y="310" width="1000" height="90" fill="url(#wh-floor)" />
      <rect y="306" width="1000" height="6" fill="#b8c4cf" />
      <rect x="0" y="338" width="1000" height="6" fill={GOLD} opacity="0.75" />
      {Array.from({ length: 12 }, (_, i) => (
        <path
          key={i}
          d={`M${i * 90} 338 l20 0 l-10 6 l-20 0 Z`}
          fill={NAVY}
          opacity="0.7"
        />
      ))}
      <g transform="translate(760 250)">
        <g className="rocky-patrol">
          <circle
            cx="45"
            cy="-4"
            r="5"
            fill="#ff8a1f"
            className="rocky-blink"
          />
          <ellipse cx="50" cy="88" rx="56" ry="6" fill="#000" opacity="0.12" />
          <rect x="10" y="30" width="70" height="44" rx="6" fill={GOLD} />
          <path
            d="M20 30 L24 0 L66 0 L70 30"
            stroke="#3b4a5c"
            strokeWidth="5"
            fill="none"
          />
          <rect x="84" y="-6" width="6" height="86" fill="#3b4a5c" />
          <rect x="88" y="66" width="30" height="5" fill="#3b4a5c" />
          <circle cx="26" cy="78" r="11" fill="#1b2433" />
          <circle cx="68" cy="78" r="11" fill="#1b2433" />
          <text
            x="24"
            y="58"
            fontFamily="Poppins, sans-serif"
            fontWeight="800"
            fontSize="12"
            fill={NAVY}
          >
            RLX
          </text>
        </g>
      </g>
      <ellipse
        cx="500"
        cy="356"
        rx="280"
        ry="26"
        fill="#fff6d6"
        opacity="0.45"
      />
    </>
  );
}

function BallparkScene({ live = false }: { live?: boolean }) {
  return (
    <>
      <defs>
        <linearGradient id="bp-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8fcdf2" />
          <stop offset="1" stopColor="#eaf6fc" />
        </linearGradient>
        <linearGradient id="bp-grass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2f9444" />
          <stop offset="1" stopColor="#4cb45e" />
        </linearGradient>
      </defs>
      <rect width="1000" height="400" fill="url(#bp-sky)" />
      <circle cx="140" cy="60" r="34" fill="#fff4c9" />
      <circle cx="140" cy="60" r="70" fill="#fff4c9" opacity="0.2" />
      <g className="rocky-float">
        <Cloud x={420} y={50} s={0.7} opacity={0.8} />
        <Cloud x={820} y={36} s={0.9} opacity={0.85} />
      </g>
      {/* Light towers. */}
      {[60, 940].map((x) => (
        <g key={x} transform={`translate(${x} 20)`}>
          <rect x="-4" y="40" width="8" height="120" fill="#6b7a8c" />
          <rect x="-30" y="0" width="60" height="40" rx="4" fill="#3b4a5c" />
          {[0, 1, 2].map((r) =>
            [0, 1, 2, 3].map((c) => (
              <circle
                key={`${r}${c}`}
                cx={-21 + c * 14}
                cy={9 + r * 11}
                r="4.5"
                fill="#fff8d6"
                className={live ? "rocky-twinkle" : undefined}
              />
            )),
          )}
        </g>
      ))}
      {/* Stands, packed with fans, and the scoreboard. */}
      <path d="M0 120 L1000 90 L1000 222 L0 232 Z" fill={NAVY2} />
      {Array.from({ length: 6 }, (_, row) => (
        <path
          key={row}
          d={`M0 ${136 + row * 16} L1000 ${108 + row * 19}`}
          stroke={NAVY}
          strokeWidth="3"
        />
      ))}
      {Array.from({ length: 12 }, (_, g) => (
        <g
          key={g}
          className="rocky-hop"
          style={{ animationDelay: `${g * 0.16}s` }}
        >
          {Array.from({ length: 40 }, (_, k) => {
            const i = g * 40 + k;
            const row = i % 7;
            const col = Math.floor(i / 7);
            const x = 6 + col * 14.6 + (row % 2) * 7 + ((i * 13) % 5);
            const y = 140 + row * 12.5 - x * 0.028 + ((i * 7) % 3);
            return (
              <circle
                key={k}
                cx={x}
                cy={y}
                r={2.6 + ((i * 11) % 3) * 0.5}
                fill={[GREEN2, WHITE, GOLD, "#d9695f", "#9fc6e8"][(i * 7) % 5]}
                opacity="0.9"
              />
            );
          })}
        </g>
      ))}
      <g className="rocky-cross" style={{ animationDuration: "48s" }}>
        <g transform="translate(0 70)">
          <ellipse cx="0" cy="0" rx="46" ry="15" fill="#d7dee6" />
          <path d="M40 0 L56 -10 L56 10 Z" fill="#b8c4cf" />
          <rect x="-12" y="12" width="22" height="7" rx="2" fill={NAVY} />
          <text
            x="-26"
            y="5"
            fontFamily="Poppins, sans-serif"
            fontWeight="800"
            fontSize="12"
            fill={GREEN}
          >
            RLX
          </text>
        </g>
      </g>
      <g transform="translate(410 20)">
        <rect x="-6" y="-6" width="192" height="90" rx="8" fill={NAVY} />
        <rect x="0" y="0" width="180" height="56" rx="4" fill="#0b1a33" />
        <text
          x="14"
          y="24"
          fontFamily="Poppins, sans-serif"
          fontWeight="800"
          fontSize="15"
          fill={GOLD}
        >
          RLX 7 · QA 3
        </text>
        <text
          x="14"
          y="46"
          fontFamily="Poppins, sans-serif"
          fontWeight="700"
          fontSize="12"
          fill={GREEN2}
        >
          <tspan className="rocky-blink">NOTES: PERFECT ★</tspan>
        </text>
        <rect x="80" y="84" width="20" height="20" fill={NAVY} />
      </g>
      <rect y="222" width="1000" height="16" fill={GREEN} />
      {Array.from({ length: 10 }, (_, i) => (
        <rect
          key={i}
          x={i * 100 + 20}
          y="225"
          width="60"
          height="10"
          rx="2"
          fill={i % 2 ? GOLD : WHITE}
          opacity="0.85"
        />
      ))}
      {/* The field, mowed in stripes, with the diamond. */}
      <rect y="236" width="1000" height="164" fill="url(#bp-grass)" />
      {Array.from({ length: 10 }, (_, i) => (
        <path
          key={i}
          d={`M${i * 100} 236 L${i * 100 + 50} 236 L${i * 110 + 20} 400 L${i * 110 - 30} 400 Z`}
          fill="#ffffff"
          opacity="0.06"
        />
      ))}
      <path d="M250 400 L500 290 L750 400 Z" fill="#c9905a" opacity="0.9" />
      <path d="M340 400 L500 330 L660 400 Z" fill="url(#bp-grass)" />
      <path
        d="M300 400 L500 312 L700 400"
        stroke={WHITE}
        strokeWidth="3"
        fill="none"
      />
      {[
        [500, 300],
        [400, 350],
        [600, 350],
      ].map(([x, y]) => (
        <rect
          key={x}
          x={x - 6}
          y={y - 6}
          width="12"
          height="12"
          fill={WHITE}
          transform={`rotate(45 ${x} ${y})`}
        />
      ))}
      <ellipse cx="500" cy="352" rx="22" ry="8" fill="#d9a56c" />
    </>
  );
}

function OfficeScene() {
  return (
    <>
      <defs>
        <linearGradient id="office-wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e6eef3" />
          <stop offset="1" stopColor="#f7fafb" />
        </linearGradient>
        <linearGradient id="office-city" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#9fd3f2" />
          <stop offset="1" stopColor="#e0f2fb" />
        </linearGradient>
        <linearGradient id="office-floor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c9a57a" />
          <stop offset="1" stopColor="#dcbf98" />
        </linearGradient>
      </defs>
      <rect width="1000" height="400" fill="url(#office-wall)" />
      {/* Floor-to-ceiling windows onto the city. */}
      <rect
        x="120"
        y="30"
        width="440"
        height="200"
        rx="6"
        fill="url(#office-city)"
      />
      <g fill="#b6cfe2">
        {[
          [130, 120, 40, 110],
          [176, 90, 50, 140],
          [232, 130, 36, 100],
          [272, 70, 60, 160],
          [338, 110, 44, 120],
          [388, 60, 56, 170],
          [450, 120, 40, 110],
          [494, 96, 60, 134],
        ].map(([x, y, w, h], i) => (
          <g key={i}>
            <rect
              x={x}
              y={y}
              width={w}
              height={h}
              fill={i % 2 ? "#a9c5dc" : "#bcd4e6"}
            />
            {Array.from({ length: Math.floor(h! / 18) }, (_, k) => (
              <rect
                key={k}
                x={x! + 6}
                y={y! + 8 + k * 18}
                width={w! - 12}
                height="6"
                fill="#ffffff"
                opacity="0.35"
              />
            ))}
          </g>
        ))}
      </g>
      <g className="rocky-float">
        <Cloud x={200} y={62} s={0.6} opacity={0.8} />
        <Cloud x={500} y={48} s={0.5} opacity={0.7} />
      </g>
      {[120, 267, 413, 560].map((x) => (
        <rect key={x} x={x - 4} y="30" width="8" height="200" fill="#ffffff" />
      ))}
      <rect
        x="116"
        y="26"
        width="448"
        height="208"
        rx="8"
        fill="none"
        stroke="#ffffff"
        strokeWidth="8"
      />
      {/* RLX wall and a whiteboard with a "great notes" checklist. */}
      <rect x="590" y="30" width="230" height="200" fill={NAVY} />
      <text
        x="612"
        y="112"
        fontFamily="Poppins, sans-serif"
        fontWeight="800"
        fontSize="30"
        fill={WHITE}
      >
        RLX
      </text>
      <rect x="694" y="100" width="100" height="6" fill={GREEN2} />
      <rect x="608" y="124" width="194" height="96" rx="6" fill="#ffffff" />
      <text
        x="618"
        y="140"
        fontFamily="Poppins, sans-serif"
        fontWeight="800"
        fontSize="10"
        fill={NAVY}
        opacity="0.6"
      >
        GREAT NOTES
      </text>
      {["Who & how", "What happened", "Next step"].map((t, i) => (
        <g key={t}>
          <rect
            x="618"
            y={148 + i * 22}
            width="12"
            height="12"
            rx="2"
            fill="none"
            stroke={GREEN}
            strokeWidth="2"
          />
          <path
            d={`M620 ${154 + i * 22} l3 3 l6 -7`}
            stroke={GREEN}
            strokeWidth="2"
            fill="none"
          />
          <text
            x="638"
            y={159 + i * 22}
            fontFamily="Caveat, cursive"
            fontWeight="700"
            fontSize="17"
            fill={NAVY}
          >
            {t}
          </text>
        </g>
      ))}
      {/* A wall clock and a paper plane (a note!) gliding past the window. */}
      <g transform="translate(575 60)">
        <circle r="16" fill="#ffffff" stroke={NAVY} strokeWidth="3" />
        <path
          d="M0 0 L0 -9"
          stroke={NAVY}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <g className="rocky-spin">
          <circle r="13" fill="none" />
          <path
            d="M0 2 L0 -12"
            stroke="#e2445c"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </g>
      </g>
      <g className="rocky-cross" style={{ animationDuration: "16s" }}>
        <g transform="translate(0 70)">
          <g className="rocky-bob">
            <path
              d="M0 0 L26 8 L0 14 L6 8 Z"
              fill="#ffffff"
              stroke="#9fb0c0"
              strokeWidth="1"
            />
          </g>
        </g>
      </g>
      <rect y="230" width="1000" height="10" fill={GREEN} />
      {/* Wooden floor, desks with screens, plants and a lamp. */}
      <rect y="240" width="1000" height="160" fill="url(#office-floor)" />
      {Array.from({ length: 14 }, (_, i) => (
        <rect
          key={i}
          x={i * 75}
          y="240"
          width="2"
          height="160"
          fill="#b89166"
          opacity="0.6"
        />
      ))}
      {[180, 660].map((x) => (
        <g key={x} transform={`translate(${x} 190)`}>
          <ellipse cx="80" cy="102" rx="90" ry="8" fill="#000" opacity="0.08" />
          <rect x="0" y="46" width="160" height="12" rx="3" fill="#ffffff" />
          <rect x="10" y="58" width="6" height="44" fill={NAVY2} />
          <rect x="144" y="58" width="6" height="44" fill={NAVY2} />
          <rect x="30" y="4" width="70" height="42" rx="3" fill={NAVY} />
          <rect x="35" y="9" width="60" height="30" rx="2" fill="#dff1ff" />
          <rect
            x="40"
            y="14"
            width="34"
            height="4"
            rx="2"
            fill={GREEN}
            className="rocky-blink"
          />
          <rect x="40" y="22" width="46" height="3" rx="1.5" fill="#9fb0c0" />
          <rect x="40" y="28" width="40" height="3" rx="1.5" fill="#9fb0c0" />
          <rect x="60" y="46" width="10" height="4" fill={NAVY} />
          <rect x="108" y="36" width="12" height="10" rx="2" fill="#e2445c" />
          <path
            d="M120 38 q5 2 0 6"
            stroke="#e2445c"
            strokeWidth="2"
            fill="none"
          />
        </g>
      ))}
      {[150, 850].map((x) => (
        <g key={x} transform={`translate(${x} 250)`}>
          <path d="M-14 50 L14 50 L10 80 L-10 80 Z" fill={NAVY} />
          <path
            className="rocky-sway"
            d="M0 50 C-20 36 -22 12 -8 2 C-4 20 -2 34 0 50 Z M0 50 C20 36 22 12 8 2 C4 20 2 34 0 50 Z M0 50 C-4 30 0 8 0 -6 C6 12 6 34 0 50 Z"
            fill={GREEN}
          />
        </g>
      ))}
      <ellipse cx="500" cy="352" rx="260" ry="26" fill={WHITE} opacity="0.35" />
    </>
  );
}

function BeachScene({ live = false }: { live?: boolean }) {
  return (
    <>
      <defs>
        <linearGradient id="beach-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5cc2ee" />
          <stop offset="1" stopColor="#e6f7fc" />
        </linearGradient>
        <linearGradient id="beach-sea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1a8fb8" />
          <stop offset="0.6" stopColor="#35b8d0" />
          <stop offset="1" stopColor="#7fe0e4" />
        </linearGradient>
        <linearGradient id="beach-sand" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f0d49a" />
          <stop offset="1" stopColor="#f8e7c0" />
        </linearGradient>
      </defs>
      <rect width="1000" height="400" fill="url(#beach-sky)" />
      <circle cx="820" cy="80" r="40" fill="#fff4c9" />
      <circle cx="820" cy="80" r="90" fill="#fff4c9" opacity="0.2" />
      <g className="rocky-float">
        <Cloud x={220} y={70} s={0.9} />
        <Cloud x={600} y={50} s={0.7} opacity={0.8} />
      </g>
      <Birds x={420} y={110} live={live} />
      {/* A far island and a sailboat on the horizon. */}
      <path
        d="M560 200 C600 170 660 168 700 200 Z"
        fill="#3f9a6a"
        opacity="0.7"
      />
      <path
        d="M640 176 L642 150 M642 150 C650 150 658 160 660 168"
        stroke="#6b4a2f"
        strokeWidth="2"
        fill="none"
        opacity="0.7"
      />
      <g transform="translate(250 176)">
        <g className="rocky-bob">
          <path d="M0 22 L40 22 L34 30 L6 30 Z" fill={NAVY} />
          <path d="M20 22 L20 -12 L38 18 Z" fill={WHITE} />
          <path d="M18 22 L18 -6 L4 18 Z" fill={GREEN2} />
        </g>
      </g>
      <rect y="200" width="1000" height="80" fill="url(#beach-sea)" />
      {[208, 226, 246, 262].map((y, i) => (
        <path
          key={y}
          d={`M${-20 + i * 12} ${y} q25 -6 50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0`}
          stroke={WHITE}
          strokeWidth="2"
          fill="none"
          opacity={0.55 - i * 0.1}
          className="rocky-waves"
          style={{ animationDuration: `${4 + i * 1.3}s` }}
        />
      ))}
      <path
        d="M0 272 C200 262 400 280 600 270 C780 262 900 274 1000 268 L1000 400 L0 400 Z"
        fill="url(#beach-sand)"
      />
      <path
        d="M0 276 C200 266 400 284 600 274 C780 266 900 278 1000 272"
        stroke={WHITE}
        strokeWidth="7"
        fill="none"
        opacity="0.8"
      />
      {/* Shells, a starfish, a sandcastle. */}
      {Array.from({ length: 16 }, (_, i) => (
        <circle
          key={i}
          cx={(i * 67) % 1000}
          cy={300 + ((i * 29) % 80)}
          r="1.6"
          fill="#d9b779"
        />
      ))}
      <path
        d="M380 360 l4 -10 l4 10 l10 1 l-8 6 l3 10 l-9 -6 l-9 6 l3 -10 l-8 -6 Z"
        fill="#ff8f6b"
      />
      <path d="M640 368 C640 358 656 358 656 368 Z" fill="#ffd1dc" />
      <g transform="translate(470 372)">
        <g className="rocky-patrol" style={{ animationDuration: "6s" }}>
          <ellipse cx="0" cy="0" rx="9" ry="6" fill="#e2552b" />
          <path
            d="M-8 -2 l-7 -6 M8 -2 l7 -6 M-6 4 l-6 4 M6 4 l6 4"
            stroke="#e2552b"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="-3" cy="-6" r="1.6" fill="#1b2433" />
          <circle cx="3" cy="-6" r="1.6" fill="#1b2433" />
        </g>
      </g>
      <g transform="translate(560 316)">
        <rect x="0" y="16" width="60" height="30" fill="#e8c98a" />
        <rect x="-6" y="0" width="18" height="46" fill="#e8c98a" />
        <rect x="48" y="0" width="18" height="46" fill="#e8c98a" />
        <path
          d="M-6 0 l3 -5 l3 5 l3 -5 l3 5 l3 -5 l3 5 M48 0 l3 -5 l3 5 l3 -5 l3 5 l3 -5 l3 5"
          stroke="#e8c98a"
          strokeWidth="3"
          fill="none"
        />
        <path d="M24 46 L24 30 C24 24 36 24 36 30 L36 46 Z" fill="#c9a766" />
        <path
          d="M3 -5 L3 -20 L14 -15 L3 -12"
          fill="#e2445c"
          stroke="#8a5a2b"
          strokeWidth="1.2"
        />
      </g>
      {/* Palm trees */}
      {[
        [900, 300, 1],
        [990, 290, 0.8],
      ].map(([px, py, k], j) => (
        <g key={j} transform={`translate(${px} ${py}) scale(${k})`}>
          <path
            d="M0 40 C-6 0 -4 -60 10 -120"
            stroke="#8a5a2b"
            strokeWidth="12"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M-4 10 l12 -3 M-5 -20 l12 -3 M-2 -50 l12 -3 M3 -80 l11 -3"
            stroke="#6b4423"
            strokeWidth="2"
          />
          <g className="rocky-sway" style={{ animationDelay: `${-j * 1.7}s` }}>
            {[-150, -110, -60, -20, 20].map((a) => (
              <path
                key={a}
                d="M10 -120 C40 -140 80 -130 100 -100 C70 -118 40 -118 10 -120 Z"
                fill={a % 40 ? "#2e8b3e" : "#3aa14c"}
                transform={`rotate(${a + 60} 10 -120)`}
              />
            ))}
          </g>
          <circle cx="4" cy="-112" r="6" fill="#6b4a2f" />
          <circle cx="16" cy="-110" r="6" fill="#6b4a2f" />
        </g>
      ))}
      {/* Umbrella, towel, beach ball. */}
      <g transform="translate(90 300)">
        <path d="M40 60 L52 -20" stroke={NAVY} strokeWidth="4" />
        <path d="M-10 -10 C10 -50 90 -50 110 -24 Z" fill={GREEN} />
        <path
          d="M24 -24 C30 -40 60 -44 76 -30 L60 -18 Z"
          fill={WHITE}
          opacity="0.9"
        />
        <rect
          x="0"
          y="50"
          width="90"
          height="20"
          rx="4"
          fill={GOLD}
          transform="skewX(-20)"
        />
        <rect
          x="10"
          y="54"
          width="70"
          height="4"
          fill="#e2445c"
          transform="skewX(-20)"
        />
      </g>
      <g transform="translate(260 356)">
        <circle r="13" fill={WHITE} />
        <path d="M0 -13 A13 13 0 0 1 13 0 L0 0 Z" fill="#e2445c" />
        <path d="M0 13 A13 13 0 0 1 -13 0 L0 0 Z" fill={GOLD} />
        <path d="M-13 0 A13 13 0 0 1 0 -13 L0 0 Z" fill="#35b8d0" />
      </g>
    </>
  );
}

/** A red-and-white stadium (a tribute to Barranquilla's rojiblanco colours — no crests or sponsors). */
function JrStadiumScene({ live = false }: { live?: boolean }) {
  return (
    <>
      <defs>
        <linearGradient id="jr-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0f2341" />
          <stop offset="0.7" stopColor="#274b7c" />
          <stop offset="1" stopColor="#3f6aa2" />
        </linearGradient>
        <linearGradient id="jr-pitch" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1f8a3c" />
          <stop offset="1" stopColor="#39b057" />
        </linearGradient>
        <radialGradient id="jr-glow">
          <stop offset="0" stopColor="#fff8d6" stopOpacity="0.8" />
          <stop offset="1" stopColor="#fff8d6" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="1000" height="400" fill="url(#jr-sky)" />
      <Stars live={live} count={10} seed={7} />
      {/* Floodlights. */}
      {[70, 930].map((x) => (
        <g key={x}>
          <circle cx={x} cy="40" r="90" fill="url(#jr-glow)" />
          <rect x={x - 4} y="60" width="8" height="120" fill="#6b7a8c" />
          <rect
            x={x - 32}
            y="20"
            width="64"
            height="40"
            rx="4"
            fill="#1b2433"
          />
          {[0, 1, 2].map((r) =>
            [0, 1, 2, 3].map((c) => (
              <circle
                key={`${r}${c}`}
                cx={x - 23 + c * 15}
                cy={29 + r * 11}
                r="5"
                fill="#fffbe6"
                className={live ? "rocky-twinkle" : undefined}
              />
            )),
          )}
        </g>
      ))}
      {/* Stands in red-and-white stripes, packed with fans. */}
      <path d="M0 110 L1000 110 L1000 232 L0 232 Z" fill="#b40e24" />
      {Array.from({ length: 20 }, (_, i) => (
        <rect
          key={i}
          x={i * 50}
          y="110"
          width="25"
          height="122"
          fill="#ffffff"
          opacity="0.9"
        />
      ))}
      {Array.from({ length: 14 }, (_, g) => (
        <g
          key={g}
          className="rocky-hop"
          style={{ animationDelay: `${g * 0.14}s`, animationDuration: "1.6s" }}
        >
          {Array.from({ length: 40 }, (_, k) => {
            const i = g * 40 + k;
            const row = i % 8;
            const col = Math.floor(i / 8);
            const x = 6 + col * 14.5 + (row % 2) * 7 + ((i * 13) % 5);
            return (
              <circle
                key={k}
                cx={x}
                cy={122 + row * 13.5 + ((i * 7) % 3)}
                r={2.6 + ((i * 11) % 3) * 0.5}
                fill={
                  ["#d0112b", "#ffffff", "#12234a", "#d0112b", "#f5b82e"][
                    (i * 7) % 5
                  ]
                }
                opacity="0.95"
                className={live && i % 9 === 0 ? "rocky-twinkle" : undefined}
              />
            );
          })}
        </g>
      ))}
      {/* Banners along the stand. */}
      <g className="rocky-bob">
        <rect x="215" y="92" width="270" height="26" rx="4" fill="#12234a" />
        <text
          x="232"
          y="111"
          fontFamily="Poppins, sans-serif"
          fontWeight="800"
          fontSize="16"
          fill="#ffffff"
        >
          ¡VAMOS TIBURÓN! 🦈
        </text>
        <rect x="515" y="92" width="240" height="26" rx="4" fill="#ffffff" />
        <text
          x="534"
          y="111"
          fontFamily="Poppins, sans-serif"
          fontWeight="800"
          fontSize="16"
          fill="#d0112b"
        >
          ROJIBLANCO · RLX
        </text>
      </g>
      <rect y="228" width="1000" height="14" fill="#12234a" />
      {Array.from({ length: 10 }, (_, i) => (
        <rect
          key={i}
          x={i * 100 + 14}
          y="230"
          width="72"
          height="10"
          rx="2"
          fill={i % 2 ? "#d0112b" : "#ffffff"}
        />
      ))}
      {/* The pitch, mowed in stripes, with its lines. */}
      <rect y="242" width="1000" height="158" fill="url(#jr-pitch)" />
      {Array.from({ length: 10 }, (_, i) => (
        <rect
          key={i}
          x={i * 100}
          y="242"
          width="50"
          height="158"
          fill="#ffffff"
          opacity="0.06"
        />
      ))}
      <path
        d="M0 330 L1000 330"
        stroke="#ffffff"
        strokeWidth="3"
        opacity="0.8"
      />
      <ellipse
        cx="500"
        cy="330"
        rx="120"
        ry="30"
        stroke="#ffffff"
        strokeWidth="3"
        fill="none"
        opacity="0.8"
      />
      <circle cx="500" cy="330" r="4" fill="#ffffff" />
      <path
        d="M0 262 L140 262 L140 310 L0 310 M1000 262 L860 262 L860 310 L1000 310"
        stroke="#ffffff"
        strokeWidth="3"
        fill="none"
        opacity="0.8"
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Seasonal scenes (1000x400, floor line around y≈340).
// ---------------------------------------------------------------------------
function Stars({
  live,
  count = 14,
  seed = 3,
}: {
  live: boolean;
  count?: number;
  seed?: number;
}) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <circle
          key={i}
          cx={(i * 71 * seed) % 1000}
          cy={20 + ((i * 37 * seed) % 150)}
          r={i % 3 === 0 ? 2.4 : 1.4}
          fill="#ffffff"
          opacity={0.45 + (i % 3) * 0.2}
          className={live ? "rocky-twinkle" : undefined}
          style={{ animationDelay: `${i * 0.31}s` }}
        />
      ))}
    </>
  );
}

function Pumpkin({
  x,
  y,
  s = 1,
  face = false,
}: {
  x: number;
  y: number;
  s?: number;
  face?: boolean;
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx="0" cy="0" rx="26" ry="18" fill="#f28c28" />
      <path
        d="M-12 -16 C-18 -6 -18 8 -12 16 M0 -18 L0 18 M12 -16 C18 -6 18 8 12 16"
        stroke="#d0661a"
        strokeWidth="2.5"
        fill="none"
      />
      <path
        d="M-2 -18 C-2 -24 2 -28 6 -28"
        stroke="#3f7d2a"
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
      />
      {face && (
        <>
          <path
            d="M-14 -4 L-9 -10 L-4 -4 Z M4 -4 L9 -10 L14 -4 Z"
            fill="#ffd54a"
          />
          <path
            d="M-14 4 L-8 8 L-3 4 L2 8 L7 4 L14 4 C10 14 -10 14 -14 4 Z"
            fill="#ffd54a"
          />
        </>
      )}
    </g>
  );
}

function Pine({
  x,
  y,
  s = 1,
  snow = false,
}: {
  x: number;
  y: number;
  s?: number;
  snow?: boolean;
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x="-5" y="-6" width="10" height="16" fill="#6b4423" />
      <path
        d="M0 -90 L28 -44 L16 -44 L36 -8 L-36 -8 L-16 -44 L-28 -44 Z"
        fill="#1f5f3f"
      />
      {snow && (
        <path
          d="M0 -90 L14 -67 L6 -64 L0 -70 L-6 -64 L-14 -67 Z M-22 -44 L22 -44 L26 -38 L10 -36 L0 -40 L-10 -36 L-26 -38 Z"
          fill="#ffffff"
        />
      )}
    </g>
  );
}

function HauntedScene({ live }: { live: boolean }) {
  return (
    <>
      <defs>
        <linearGradient id="haunt-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1d1236" />
          <stop offset="1" stopColor="#4a2a5e" />
        </linearGradient>
        <radialGradient id="haunt-moon">
          <stop offset="0" stopColor="#fff6c9" stopOpacity="0.9" />
          <stop offset="1" stopColor="#fff6c9" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="1000" height="400" fill="url(#haunt-sky)" />
      <Stars live={live} />
      <circle cx="780" cy="90" r="130" fill="url(#haunt-moon)" />
      <circle cx="780" cy="90" r="54" fill="#fff1b8" />
      <circle cx="764" cy="80" r="8" fill="#efdc97" />
      <circle cx="792" cy="104" r="6" fill="#efdc97" />
      {/* Bats crossing the moon. */}
      <g
        className="rocky-cross-back"
        style={{ animationDuration: "22s" }}
        fill="#1d1236"
      >
        {[
          [730, 70, 1],
          [820, 60, 0.7],
          [760, 120, 0.8],
        ].map(([x, y, k], i) => (
          <path
            key={i}
            transform={`translate(${x} ${y}) scale(${k})`}
            d="M0 0 C-6 -8 -16 -8 -22 -2 C-16 -2 -14 2 -14 6 C-10 2 -4 2 0 6 C4 2 10 2 14 6 C14 2 16 -2 22 -2 C16 -8 6 -8 0 0 Z"
          />
        ))}
      </g>
      {/* The haunted house on the hill. */}
      <path
        d="M0 250 C180 170 340 180 480 216 C620 250 760 200 1000 226 L1000 400 L0 400 Z"
        fill="#2b1d3f"
      />
      <g transform="translate(180 120)">
        <path d="M0 110 L0 40 L50 0 L100 40 L100 110 Z" fill="#241634" />
        <path d="M62 18 L62 -18 L78 -18 L78 30 Z" fill="#241634" />
        <path
          d="M-8 44 L50 -6 L108 44"
          stroke="#3b2a5a"
          strokeWidth="6"
          fill="none"
        />
        {[
          [18, 54],
          [64, 54],
          [18, 84],
        ].map(([x, y], i) => (
          <rect
            key={i}
            x={x}
            y={y}
            width="18"
            height="18"
            fill="#ffd54a"
            opacity="0.85"
            className={live ? "rocky-twinkle" : undefined}
            style={{ animationDelay: `${i * 0.8}s` }}
          />
        ))}
        <path d="M60 110 L60 82 C60 74 80 74 80 82 L80 110 Z" fill="#120a1c" />
      </g>
      <path
        d="M0 290 C200 262 380 300 540 282 C720 262 860 290 1000 276 L1000 400 L0 400 Z"
        fill="#3a2a4e"
      />
      {/* Crooked trees and a fence. */}
      <path
        d="M860 290 L870 200 C850 180 830 186 820 170 M870 200 C890 176 910 180 922 164 M866 240 C890 232 900 220 912 222"
        stroke="#150d20"
        strokeWidth="9"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M60 300 L66 220 C50 206 38 210 28 196 M66 220 C80 200 96 204 104 190"
        stroke="#150d20"
        strokeWidth="8"
        fill="none"
        strokeLinecap="round"
      />
      {Array.from({ length: 12 }, (_, i) => (
        <path
          key={i}
          d={`M${420 + i * 22} 300 L${420 + i * 22} 268 L${426 + i * 22} 262 L${432 + i * 22} 268 L${432 + i * 22} 300 Z`}
          fill="#241634"
        />
      ))}
      <rect x="416" y="276" width="270" height="5" fill="#241634" />
      <path
        d="M0 330 C240 312 520 344 760 322 C860 314 940 322 1000 318 L1000 400 L0 400 Z"
        fill="#2e2140"
      />
      <g className="rocky-cross" style={{ animationDuration: "30s" }}>
        <g transform="translate(0 230)">
          <g className="rocky-bob">
            <path
              d="M0 18 C0 0 30 0 30 18 L30 40 L25 36 L20 40 L15 36 L10 40 L5 36 L0 40 Z"
              fill="#ffffff"
              opacity="0.85"
            />
            <circle cx="10" cy="17" r="2.4" fill="#2a1f3d" />
            <circle cx="20" cy="17" r="2.4" fill="#2a1f3d" />
          </g>
        </g>
      </g>
      <Pumpkin x={120} y={336} s={1.1} face />
      <Pumpkin x={610} y={330} s={0.8} face />
      <Pumpkin x={940} y={338} s={1} />
      {/* Low mist. */}
      <g className="rocky-float" opacity="0.35">
        <ellipse cx="220" cy="350" rx="260" ry="22" fill="#c9b8e8" />
        <ellipse cx="760" cy="356" rx="300" ry="20" fill="#c9b8e8" />
      </g>
    </>
  );
}

function PumpkinPatchScene({ live }: { live: boolean }) {
  return (
    <>
      <defs>
        <linearGradient id="patch-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f6a15b" />
          <stop offset="0.6" stopColor="#ffd39a" />
          <stop offset="1" stopColor="#ffe9c4" />
        </linearGradient>
      </defs>
      <rect width="1000" height="400" fill="url(#patch-sky)" />
      <circle cx="200" cy="150" r="46" fill="#ffe08a" />
      <circle cx="200" cy="150" r="90" fill="#ffe08a" opacity="0.25" />
      <g className="rocky-float">
        <Cloud x={560} y={70} s={0.9} opacity={0.8} />
        <Cloud x={880} y={110} s={0.7} opacity={0.7} />
      </g>
      <path
        d="M0 220 C160 190 320 206 480 196 C660 184 820 206 1000 196 L1000 400 L0 400 Z"
        fill="#d98b4a"
        opacity="0.6"
      />
      <path
        d="M0 250 C220 226 420 256 600 240 C780 226 900 244 1000 238 L1000 400 L0 400 Z"
        fill="#b8753a"
      />
      {/* The red barn and the scarecrow. */}
      <g transform="translate(720 150)">
        <path d="M0 100 L0 40 L60 0 L120 40 L120 100 Z" fill="#b93b32" />
        <path
          d="M-6 44 L60 -4 L126 44"
          stroke="#ffffff"
          strokeWidth="5"
          fill="none"
        />
        <rect x="40" y="52" width="40" height="48" fill="#8f2c25" />
        <path
          d="M40 52 L80 100 M80 52 L40 100"
          stroke="#ffffff"
          strokeWidth="4"
        />
      </g>
      <Birds x={520} y={120} live={live} />
      <g transform="translate(300 170)">
        <g className="rocky-sway" style={{ animationDuration: "3.2s" }}>
          <path d="M30 0 L30 130" stroke="#6b4423" strokeWidth="6" />
          <path d="M0 40 L60 40" stroke="#6b4423" strokeWidth="6" />
          <circle cx="30" cy="20" r="16" fill="#e3b94f" />
          <path d="M8 16 L52 16 L42 0 L18 0 Z" fill="#6b4423" />
          <rect x="14" y="36" width="32" height="44" rx="6" fill="#3a78c2" />
          <path
            d="M0 40 L-8 50 M60 40 L68 50"
            stroke="#e3b94f"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <circle cx="24" cy="20" r="2" fill="#1b2433" />
          <circle cx="36" cy="20" r="2" fill="#1b2433" />
        </g>
      </g>
      {/* Rows of pumpkins and vines. */}
      <path
        d="M0 300 C200 284 480 312 700 294 C840 284 930 296 1000 290 L1000 400 L0 400 Z"
        fill="#8f5a2a"
      />
      <path
        d="M0 330 C180 320 420 340 640 326 C820 316 920 326 1000 322"
        stroke="#3f7d2a"
        strokeWidth="5"
        fill="none"
      />
      {[
        [70, 318, 0.9],
        [190, 332, 1.2],
        [330, 318, 0.8],
        [470, 336, 1.1],
        [560, 320, 0.7],
        [860, 334, 1.2],
        [960, 320, 0.8],
      ].map(([x, y, k], i) => (
        <Pumpkin key={i} x={x} y={y} s={k} face={i === 3} />
      ))}
      {Array.from({ length: 14 }, (_, i) => (
        <path
          key={i}
          d={`M${i * 75 + 20} 360 q10 -14 20 0`}
          stroke="#5f8f2a"
          strokeWidth="3"
          fill="none"
        />
      ))}
    </>
  );
}

function WinterScene({ live }: { live: boolean }) {
  return (
    <>
      <defs>
        <linearGradient id="winter-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#9fc6e8" />
          <stop offset="1" stopColor="#e6f2fb" />
        </linearGradient>
      </defs>
      <rect width="1000" height="400" fill="url(#winter-sky)" />
      <g className="rocky-float">
        <Cloud x={200} y={60} s={1} opacity={0.9} />
        <Cloud x={700} y={80} s={1.2} opacity={0.85} />
      </g>
      <path
        d="M0 200 L120 120 L220 190 L340 100 L470 200 L600 130 L720 200 L860 110 L1000 190 L1000 400 L0 400 Z"
        fill="#c9dcec"
      />
      <path
        d="M100 133 L120 120 L140 133 L130 140 L120 134 L110 140 Z M320 112 L340 100 L360 112 L350 120 L340 114 L330 120 Z M840 122 L860 110 L880 122 L870 130 L860 124 L850 130 Z"
        fill="#ffffff"
      />
      <path
        d="M0 250 C200 230 400 260 600 244 C780 230 900 246 1000 240 L1000 400 L0 400 Z"
        fill="#eef5fb"
      />
      {/* Cabins with warm windows and smoke. */}
      {[
        [140, 200, "#b93b32"],
        [620, 190, "#3a78c2"],
      ].map(([x, y, c], i) => (
        <g key={i} transform={`translate(${x} ${y})`}>
          <rect x="0" y="30" width="110" height="60" fill={c as string} />
          <path d="M-12 34 L55 -8 L122 34 Z" fill="#ffffff" />
          <rect
            x="16"
            y="46"
            width="22"
            height="20"
            fill="#ffd54a"
            className={live ? "rocky-twinkle" : undefined}
          />
          <rect
            x="72"
            y="46"
            width="22"
            height="20"
            fill="#ffd54a"
            className={live ? "rocky-twinkle" : undefined}
            style={{ animationDelay: "1.2s" }}
          />
          <rect x="44" y="60" width="20" height="30" fill="#6b4423" />
          <rect x="80" y="-2" width="12" height="22" fill="#6b4423" />
          {[0, 1.4, 2.8].map((d) => (
            <circle
              key={d}
              cx="86"
              cy="-10"
              r="7"
              fill="#ffffff"
              opacity="0"
              className="rocky-smoke"
              style={{ animationDelay: `${d}s` }}
            />
          ))}
        </g>
      ))}
      <Pine x={60} y={300} s={1.1} snow />
      <Pine x={420} y={290} s={0.9} snow />
      <Pine x={520} y={300} s={1.2} snow />
      <Pine x={900} y={300} s={1.3} snow />
      <path
        d="M0 310 C240 292 520 324 760 304 C860 296 940 304 1000 300 L1000 400 L0 400 Z"
        fill="#ffffff"
      />
      {Array.from({ length: 40 }, (_, i) => (
        <circle
          key={i}
          cx={(i * 59) % 1000}
          cy={400 - ((i * 43) % 60)}
          r={i % 2 ? 2 : 3}
          fill="#ffffff"
          opacity="0.9"
          className="rocky-snowfall"
          style={{
            animationDelay: `${-((i * 7) % 90) / 10}s`,
            animationDuration: `${7 + (i % 5)}s`,
          }}
        />
      ))}
    </>
  );
}

function NorthPoleScene({ live }: { live: boolean }) {
  return (
    <>
      <defs>
        <linearGradient id="pole-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0b1a3a" />
          <stop offset="1" stopColor="#1f3f6e" />
        </linearGradient>
        <linearGradient id="pole-aurora" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#3ff2a4" stopOpacity="0" />
          <stop offset="0.3" stopColor="#3ff2a4" stopOpacity="0.6" />
          <stop offset="0.6" stopColor="#7a8bff" stopOpacity="0.5" />
          <stop offset="1" stopColor="#d27aff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="1000" height="400" fill="url(#pole-sky)" />
      <Stars live={live} count={22} seed={5} />
      <g className="rocky-float">
        <path
          className="rocky-pulse"
          d="M-40 120 C120 40 260 150 420 80 C580 10 700 130 860 60 C940 30 1000 60 1060 40 L1060 110 C980 140 900 110 820 150 C660 220 560 90 400 160 C240 230 120 120 -40 190 Z"
          fill="url(#pole-aurora)"
          opacity="0.75"
        />
      </g>
      <path
        d="M0 250 C200 230 420 262 620 242 C800 226 900 246 1000 240 L1000 400 L0 400 Z"
        fill="#d7e8f7"
      />
      {/* The striped pole and a workshop full of lights. */}
      <g transform="translate(470 150)">
        <rect x="0" y="0" width="16" height="170" fill="#ffffff" />
        {Array.from({ length: 8 }, (_, i) => (
          <path
            key={i}
            d={`M0 ${i * 22 + 4} L16 ${i * 22 - 6} L16 ${i * 22 + 4} L0 ${i * 22 + 14} Z`}
            fill="#d6333a"
          />
        ))}
        <circle cx="8" cy="-6" r="12" fill="#f5b82e" />
      </g>
      <g transform="translate(640 170)">
        <rect x="0" y="36" width="180" height="84" fill="#b93b32" />
        <path d="M-16 40 L90 -20 L196 40 Z" fill="#ffffff" />
        {[20, 70, 120].map((x, i) => (
          <rect
            key={i}
            x={x}
            y="56"
            width="30"
            height="26"
            fill="#ffd54a"
            className={live ? "rocky-twinkle" : undefined}
            style={{ animationDelay: `${i * 0.6}s` }}
          />
        ))}
        {Array.from({ length: 9 }, (_, i) => (
          <circle
            key={i}
            cx={4 + i * 21}
            cy={38 + (i % 2) * 5}
            r="4"
            fill={["#e2445c", "#f5b82e", "#3ff2a4", "#7a8bff"][i % 4]}
            className={live ? "rocky-twinkle" : undefined}
            style={{ animationDelay: `${i * 0.25}s` }}
          />
        ))}
      </g>
      <Pine x={120} y={300} s={1.2} snow />
      <Pine x={250} y={290} s={0.9} snow />
      <Pine x={930} y={300} s={1.1} snow />
      {Array.from({ length: 30 }, (_, i) => (
        <circle
          key={i}
          cx={(i * 71) % 1000}
          cy={400 - ((i * 37) % 60)}
          r={i % 3 ? 2 : 3}
          fill="#ffffff"
          opacity="0.85"
          className="rocky-snowfall"
          style={{
            animationDelay: `${-((i * 11) % 90) / 10}s`,
            animationDuration: `${8 + (i % 4)}s`,
          }}
        />
      ))}
      <path
        d="M0 312 C240 294 520 326 760 306 C860 298 940 306 1000 302 L1000 400 L0 400 Z"
        fill="#f4f9fe"
      />
    </>
  );
}

export function SceneArt({ id, live = false }: { id: string; live?: boolean }) {
  const Third = THIRD_SCENES[id] ?? FOURTH_SCENES[id] ?? SPOOKY_SCENES[id] ?? COLOMBIA_SCENES[id];
  return (
    <svg
      viewBox="0 0 1000 400"
      preserveAspectRatio="xMidYMax slice"
      width="100%"
      height="100%"
      aria-hidden="true"
    >
      <g className={live ? "rocky-live" : undefined}>
        {Third ? (
          <Third live={live} />
        ) : id === "scene-haunted" ? (
          <HauntedScene live={live} />
        ) : id === "scene-pumpkin-patch" ? (
          <PumpkinPatchScene live={live} />
        ) : id === "scene-winter" ? (
          <WinterScene live={live} />
        ) : id === "scene-north-pole" ? (
          <NorthPoleScene live={live} />
        ) : id === "scene-jr-stadium" ? (
          <JrStadiumScene live={live} />
        ) : id === "scene-warehouse" ? (
          <WarehouseScene />
        ) : id === "scene-ballpark" ? (
          <BallparkScene live={live} />
        ) : id === "scene-night" ? (
          <RouteScene time="night" live={live} />
        ) : id === "scene-office" ? (
          <OfficeScene />
        ) : id === "scene-beach" ? (
          <BeachScene live={live} />
        ) : id === "scene-sunset" ? (
          <RouteScene time="sunset" live={live} />
        ) : (
          <RouteScene live={live} />
        )}
      </g>
    </svg>
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
