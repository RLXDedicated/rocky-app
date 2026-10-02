// The third wave of shop art: more hats, glasses and neckwear, new home
// items and backgrounds, the testers' wings and the Rocky developer's
// wings. Same boxes as the originals (hats 100x60 with the brim at the
// bottom; glasses 100x40 with the lenses at (25,20) and (75,20); neck 100x70
// with the knot at the top centre; back 100x120 drawn behind Rocky; scenes
// 1000x400 with the floor from about y 290). Merged into the art maps, so
// nothing else changes.
import type { ReactElement } from "react";
import type { DecorArt, HatArt } from "./art";

const NAVY = "#0f2341";
const GOLD = "#f5b82e";
const WHITE = "#ffffff";
const INK = "#1b1b24";

/** Draws the left half (x 0–50) and mirrors it to the right. */
const pair = (half: ReactElement) => (
  <>
    {["", "translate(100 0) scale(-1 1)"].map((t) => (
      <g key={t} transform={t || undefined}>
        {half}
      </g>
    ))}
  </>
);

/** A four-point sparkle. */
const spark = (x: number, y: number, r: number, fill = WHITE, key?: string | number, delay = 0) => (
  <path
    key={key ?? `${x}-${y}`}
    className="rocky-twinkle"
    style={delay ? { animationDelay: `${delay}s` } : undefined}
    d={`M${x} ${y - r} L${x + r * 0.3} ${y - r * 0.3} L${x + r} ${y} L${x + r * 0.3} ${y + r * 0.3} L${x} ${y + r} L${x - r * 0.3} ${y + r * 0.3} L${x - r} ${y} L${x - r * 0.3} ${y - r * 0.3} Z`}
    fill={fill}
  />
);

// ---------------------------------------------------------------------------
// Hats
// ---------------------------------------------------------------------------
export const THIRD_HATS: Record<string, HatArt> = {
  "hat-bucket": {
    width: 0.86,
    sink: 0.36,
    svg: (
      <>
        <path d="M24 44 C24 18 36 10 50 10 C64 10 76 18 76 44 Z" fill="#8fbf6a" />
        <path d="M6 56 C14 42 30 40 50 40 C70 40 86 42 94 56 C80 52 64 50 50 50 C36 50 20 52 6 56 Z" fill="#6f9e4c" />
        <rect x="24" y="36" width="52" height="7" fill="#5a7f3c" />
        {[32, 44, 56, 68].map((x) => (
          <path key={x} d={`M${x} 16 L${x - 2} 34`} stroke="#7aab56" strokeWidth="1.4" strokeDasharray="2 2" />
        ))}
      </>
    ),
  },
  "hat-fez": {
    width: 0.52,
    sink: 0.26,
    svg: (
      <>
        <path d="M30 56 L34 12 C44 8 56 8 66 12 L70 56 Z" fill="#c62f3a" />
        <ellipse cx="50" cy="12" rx="16" ry="4" fill="#a52531" />
        <path d="M50 12 C54 22 60 30 62 42" stroke={INK} strokeWidth="2" fill="none" />
        <path d="M59 40 L65 40 L64 50 L60 50 Z" fill={GOLD} />
        <rect x="30" y="50" width="40" height="6" fill="#8e1f29" />
      </>
    ),
  },
  "hat-cat-ears": {
    width: 0.92,
    sink: 0.2,
    svg: (
      <>
        <path d="M10 56 C18 30 34 22 50 22 C66 22 82 30 90 56" stroke="#2b2b36" strokeWidth="6" fill="none" strokeLinecap="round" />
        {pair(
          <>
            <path d="M14 42 L20 6 L40 30 Z" fill="#2b2b36" />
            <path d="M19 36 L22 14 L34 29 Z" fill="#ff9ecb" />
          </>,
        )}
        <g className="rocky-pulse">
          <path d="M50 30 C47 26 42 28 44 32 L50 37 L56 32 C58 28 53 26 50 30 Z" fill="#ff5c8a" />
        </g>
      </>
    ),
  },
  "hat-mushroom": {
    width: 1.0,
    sink: 0.36,
    svg: (
      <>
        <path d="M4 50 C4 18 28 4 50 4 C72 4 96 18 96 50 C80 56 20 56 4 50 Z" fill="#e2445c" />
        <path d="M8 48 C24 54 76 54 92 48" stroke="#b82f45" strokeWidth="3" fill="none" />
        {[
          [26, 22, 7],
          [52, 14, 6],
          [74, 26, 8],
          [40, 36, 5],
          [84, 42, 4],
          [14, 40, 4],
        ].map(([x, y, r]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r={r} fill={WHITE} opacity="0.95" />
        ))}
      </>
    ),
  },
  "hat-sailor": {
    width: 0.8,
    sink: 0.3,
    svg: (
      <>
        <path d="M14 40 C14 22 30 16 50 16 C70 16 86 22 86 40 Z" fill={WHITE} stroke="#d6dee8" strokeWidth="2" />
        <path d="M8 56 C8 44 20 38 50 38 C80 38 92 44 92 56 C80 50 20 50 8 56 Z" fill="#f4f7fb" stroke="#c9d3df" strokeWidth="2" />
        <rect x="14" y="36" width="72" height="7" fill={NAVY} />
        <path d="M84 40 L92 54 L86 52 L82 58 Z" fill={NAVY} />
        <circle cx="50" cy="28" r="5" fill="none" stroke={NAVY} strokeWidth="2" />
        <path d="M50 23 L50 34 M45 30 C46 35 54 35 55 30" stroke={NAVY} strokeWidth="2" fill="none" />
      </>
    ),
  },
  "hat-detective": {
    width: 0.92,
    sink: 0.36,
    svg: (
      <>
        <path d="M16 50 C14 22 32 10 50 10 C68 10 86 22 84 50 Z" fill="#a0784f" />
        {[24, 36, 50, 64, 76].map((x) => (
          <path key={x} d={`M${x} 14 L${x} 50`} stroke="#7e5b38" strokeWidth="1.4" />
        ))}
        {[22, 32, 42].map((y) => (
          <path key={y} d={`M18 ${y} L82 ${y}`} stroke="#7e5b38" strokeWidth="1.2" opacity="0.7" />
        ))}
        <path d="M2 54 C14 46 30 48 38 52 L36 58 C24 56 12 58 2 54 Z" fill="#8c673f" />
        <path d="M98 54 C86 46 70 48 62 52 L64 58 C76 56 88 58 98 54 Z" fill="#8c673f" />
        <path d="M50 10 C54 6 60 6 62 10" stroke="#5a3f24" strokeWidth="2.4" fill="none" />
      </>
    ),
  },
  "hat-unicorn": {
    width: 0.78,
    sink: 0.14,
    svg: (
      <>
        <defs>
          <linearGradient id="uni-horn" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#ffd1f0" />
            <stop offset="0.5" stopColor="#c4b5fd" />
            <stop offset="1" stopColor="#fff7c2" />
          </linearGradient>
        </defs>
        <path d="M12 58 C18 44 34 38 50 38 C66 38 82 44 88 58" stroke="#ff9ecb" strokeWidth="7" fill="none" strokeLinecap="round" />
        <path d="M40 42 L50 0 L60 42 Z" fill="url(#uni-horn)" stroke="#e7b6ff" strokeWidth="1.4" />
        {[12, 22, 32].map((y) => (
          <path key={y} d={`M${44 - (y - 12) * 0.12} ${y + 6} L${56 + (y - 12) * 0.12} ${y}`} stroke="#b890f5" strokeWidth="1.6" />
        ))}
        {[
          [22, 42, "#ff9ecb"],
          [30, 38, "#fff1a8"],
          [70, 38, "#a7f3d0"],
          [78, 42, "#c4b5fd"],
        ].map(([x, y, c]) => (
          <circle key={x as number} cx={x as number} cy={y as number} r="5" fill={c as string} />
        ))}
        {spark(66, 8, 5, "#fff6c2", "s1")}
        {spark(30, 16, 4, "#ffffff", "s2", 0.8)}
      </>
    ),
  },
  "hat-knight": {
    width: 0.78,
    sink: 0.46,
    svg: (
      <>
        <g className="rocky-sway">
          <path d="M52 12 C60 -4 82 -2 90 10 C80 8 70 12 64 22 Z" fill="#e2445c" />
          <path d="M54 14 C62 4 76 4 84 12" stroke="#ff8fa3" strokeWidth="2" fill="none" />
        </g>
        <path d="M20 58 L20 30 C20 12 34 6 50 6 C66 6 80 12 80 30 L80 58 Z" fill="#b8c1cc" stroke="#7d8793" strokeWidth="2" />
        <path d="M50 6 L50 58" stroke="#9aa4b1" strokeWidth="4" />
        <rect x="24" y="36" width="52" height="5" rx="2" fill={INK} />
        <rect x="24" y="44" width="52" height="3" rx="1.5" fill={INK} opacity="0.7" />
        <path d="M26 16 C30 12 36 10 40 10" stroke={WHITE} strokeWidth="2.4" strokeLinecap="round" opacity="0.7" />
      </>
    ),
  },
};

// ---------------------------------------------------------------------------
// Glasses (100x40, lenses at (25,20) and (75,20))
// ---------------------------------------------------------------------------
export const THIRD_GLASSES: Record<string, ReactElement> = {
  "glasses-visor": (
    <>
      <defs>
        <linearGradient id="visor-glass" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#22d3ee" />
          <stop offset="0.5" stopColor="#818cf8" />
          <stop offset="1" stopColor="#f472b6" />
        </linearGradient>
        <clipPath id="visor-clip">
          <path d="M4 12 C20 6 80 6 96 12 L92 30 C70 34 30 34 8 30 Z" />
        </clipPath>
      </defs>
      <path d="M4 12 C20 6 80 6 96 12 L92 30 C70 34 30 34 8 30 Z" fill="url(#visor-glass)" opacity="0.88" stroke="#334155" strokeWidth="2.4" />
      <g clipPath="url(#visor-clip)">
        <rect x="0" y="10" width="100" height="2.4" fill={WHITE} opacity="0.8">
          <animate attributeName="y" values="8;30;8" dur="2.4s" repeatCount="indefinite" />
        </rect>
      </g>
      <path d="M12 14 L30 12" stroke={WHITE} strokeWidth="2" strokeLinecap="round" opacity="0.7" />
    </>
  ),
  "glasses-shutter": (
    <>
      {pair(
        <>
          <rect x="8" y="6" width="36" height="28" rx="6" fill="none" stroke="#ff3fa4" strokeWidth="3" />
          {[12, 18, 24, 30].map((y) => (
            <rect key={y} x="9" y={y - 1.4} width="34" height="2.8" fill="#ff3fa4" />
          ))}
        </>,
      )}
      <path d="M44 16 L56 16" stroke="#ff3fa4" strokeWidth="3" />
    </>
  ),
  "glasses-pixel": (
    <>
      {pair(
        <>
          {[
            [8, 10, 36, 6],
            [10, 16, 32, 6],
            [14, 22, 24, 6],
            [18, 28, 16, 4],
          ].map(([x, y, w, h]) => (
            <rect key={y} x={x} y={y} width={w} height={h} fill={INK} />
          ))}
          <rect x="14" y="16" width="4" height="4" fill={WHITE} />
          <rect x="18" y="20" width="4" height="4" fill={WHITE} />
        </>,
      )}
      <rect x="44" y="10" width="12" height="5" fill={INK} />
      <rect x="0" y="10" width="8" height="4" fill={INK} />
      <rect x="92" y="10" width="8" height="4" fill={INK} />
    </>
  ),
  "glasses-rainbow": (
    <>
      <defs>
        <linearGradient id="rainbow-lens" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff5c8a" />
          <stop offset="0.25" stopColor="#ffb13b" />
          <stop offset="0.5" stopColor="#ffe45c" />
          <stop offset="0.75" stopColor="#3ecf8e" />
          <stop offset="1" stopColor="#5b8cff" />
        </linearGradient>
      </defs>
      {pair(<circle cx="25" cy="20" r="14" fill="url(#rainbow-lens)" opacity="0.8" stroke={WHITE} strokeWidth="3" />)}
      <path d="M39 18 Q50 12 61 18" stroke={WHITE} strokeWidth="3" fill="none" />
      {pair(<path d="M17 14 L23 11" stroke={WHITE} strokeWidth="2.4" strokeLinecap="round" />)}
    </>
  ),
  "glasses-steampunk": (
    <>
      <path d="M0 14 L100 14 L100 24 L0 24 Z" fill="#6b4a2f" />
      {pair(
        <>
          <circle cx="25" cy="20" r="16" fill="#b88650" stroke="#7a5230" strokeWidth="2" />
          <circle cx="25" cy="20" r="11" fill="#ffcf6b" opacity="0.75" stroke="#8a5a2a" strokeWidth="2.4" />
          {[0, 60, 120, 180, 240, 300].map((a) => (
            <circle key={a} cx={25 + Math.cos((a * Math.PI) / 180) * 14} cy={20 + Math.sin((a * Math.PI) / 180) * 14} r="1.4" fill="#f0d5a8" />
          ))}
          <path d="M19 15 L24 13" stroke={WHITE} strokeWidth="2" strokeLinecap="round" opacity="0.8" />
        </>,
      )}
    </>
  ),
  "glasses-swim": (
    <>
      <path d="M0 18 L100 18" stroke="#1f9d55" strokeWidth="4" />
      {pair(
        <>
          <ellipse cx="25" cy="20" rx="15" ry="11" fill="#7dd3fc" opacity="0.7" stroke="#0ea5e9" strokeWidth="4" />
          <path d="M16 16 L22 14" stroke={WHITE} strokeWidth="2.4" strokeLinecap="round" />
        </>,
      )}
      <path d="M40 20 Q50 14 60 20" stroke="#0ea5e9" strokeWidth="3" fill="none" />
    </>
  ),
  "glasses-flower": (
    <>
      {pair(
        <>
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
            <ellipse
              key={a}
              cx={25 + Math.cos((a * Math.PI) / 180) * 14}
              cy={20 + Math.sin((a * Math.PI) / 180) * 14}
              rx="5.5"
              ry="4"
              transform={`rotate(${a} ${25 + Math.cos((a * Math.PI) / 180) * 14} ${20 + Math.sin((a * Math.PI) / 180) * 14})`}
              fill={a % 90 ? "#ffd166" : "#ff9ecb"}
            />
          ))}
          <circle cx="25" cy="20" r="10" fill="#fff6c2" opacity="0.55" />
        </>,
      )}
      <path d="M38 18 Q50 12 62 18" stroke="#3f9a6a" strokeWidth="3" fill="none" />
    </>
  ),
  "glasses-diamond": (
    <>
      {pair(
        <>
          <path d="M25 4 L42 20 L25 36 L8 20 Z" fill="#bae6fd" opacity="0.7" stroke="#c0c7d1" strokeWidth="3" />
          <path d="M25 4 L25 36 M8 20 L42 20" stroke={WHITE} strokeWidth="1" opacity="0.6" />
        </>,
      )}
      <path d="M42 20 L58 20" stroke="#c0c7d1" strokeWidth="3" />
      {spark(16, 10, 4, WHITE, "d1")}
      {spark(84, 28, 4, WHITE, "d2", 1.2)}
    </>
  ),
  "glasses-laser": (
    <>
      <path d="M2 12 C20 8 80 8 98 12 L96 26 C70 30 30 30 4 26 Z" fill={INK} stroke="#3a3a48" strokeWidth="2" />
      <g className="rocky-pulse">
        <rect x="10" y="15" width="80" height="6" rx="3" fill="#ff2d2d" />
        <rect x="6" y="13" width="88" height="10" rx="5" fill="#ff2d2d" opacity="0.3" />
      </g>
      <rect x="10" y="15" width="16" height="6" rx="3" fill="#ffd0d0">
        <animate attributeName="x" values="10;74;10" dur="1.6s" repeatCount="indefinite" />
      </rect>
    </>
  ),
  "glasses-hipster": (
    <>
      {pair(<rect x="9" y="7" width="32" height="26" rx="8" fill="#e8d5b8" fillOpacity="0.25" stroke="#6b3f1f" strokeWidth="5" />)}
      <path d="M41 16 Q50 11 59 16" stroke="#6b3f1f" strokeWidth="4.5" fill="none" />
      <path d="M9 12 L0 10 M91 12 L100 10" stroke="#6b3f1f" strokeWidth="4" />
    </>
  ),
  "glasses-sport": (
    <>
      <defs>
        <linearGradient id="sport-lens" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#f97316" />
          <stop offset="0.5" stopColor="#facc15" />
          <stop offset="1" stopColor="#f97316" />
        </linearGradient>
      </defs>
      <path d="M2 16 C14 6 40 6 50 12 C60 6 86 6 98 16 L94 26 C80 32 60 30 50 22 C40 30 20 32 6 26 Z" fill="url(#sport-lens)" stroke={INK} strokeWidth="2.6" />
      <path d="M14 14 L34 11" stroke={WHITE} strokeWidth="2.4" strokeLinecap="round" opacity="0.8" />
    </>
  ),
  "glasses-reading": (
    <>
      {pair(<path d="M10 20 L40 20 C40 30 34 34 25 34 C16 34 10 30 10 20 Z" fill="#e0f2fe" opacity="0.5" stroke="#b8860b" strokeWidth="2.4" />)}
      <path d="M40 22 Q50 18 60 22" stroke="#b8860b" strokeWidth="2.4" fill="none" />
      <path d="M10 20 L0 16 M90 20 L100 16" stroke="#b8860b" strokeWidth="2" />
      <path d="M4 18 C0 30 6 40 16 40" stroke="#b8860b" strokeWidth="1.2" fill="none" opacity="0.6" />
    </>
  ),
};

// ---------------------------------------------------------------------------
// Neck (100x70, knot at the top centre)
// ---------------------------------------------------------------------------
export const THIRD_NECK: Record<string, ReactElement> = {
  "neck-headphones": (
    <>
      <path d="M16 14 C18 44 82 44 84 14" stroke="#2b2b36" strokeWidth="7" fill="none" strokeLinecap="round" />
      {pair(
        <>
          <rect x="4" y="8" width="20" height="24" rx="9" fill="#2b2b36" />
          <rect x="8" y="12" width="12" height="16" rx="6" fill="#5b8cff" />
        </>,
      )}
      <g className="rocky-pulse">
        <circle cx="14" cy="20" r="2.4" fill="#bfe0ff" />
        <circle cx="86" cy="20" r="2.4" fill="#bfe0ff" />
      </g>
    </>
  ),
  "neck-bolo": (
    <>
      <path d="M18 2 C22 26 40 36 50 38 C60 36 78 26 82 2" stroke="#4a3322" strokeWidth="3" fill="none" />
      <path d="M46 44 L44 66 M54 44 L56 66" stroke="#4a3322" strokeWidth="3" />
      <path d="M42 64 L46 70 L42 70 Z M58 64 L54 70 L58 70 Z" fill="#c0c7d1" />
      <ellipse cx="50" cy="40" rx="11" ry="9" fill="#c0c7d1" stroke="#8a93a0" strokeWidth="2" />
      <ellipse cx="50" cy="40" rx="6" ry="5" fill="#14b8a6" />
    </>
  ),
  "neck-camera": (
    <>
      <path d="M20 2 C26 30 40 40 50 40 C60 40 74 30 80 2" stroke="#6b4a2f" strokeWidth="3.4" fill="none" />
      <rect x="32" y="34" width="36" height="26" rx="4" fill="#2b2b36" />
      <rect x="36" y="30" width="12" height="6" rx="2" fill="#2b2b36" />
      <circle cx="50" cy="47" r="9" fill="#44485a" stroke="#c0c7d1" strokeWidth="2" />
      <circle cx="50" cy="47" r="5" fill="#1e3a8a" />
      <circle cx="48" cy="45" r="1.6" fill={WHITE} />
      <circle cx="62" cy="38" r="2" fill="#e2445c" className="rocky-blink" />
    </>
  ),
  "neck-whistle": (
    <>
      <path d="M18 2 C22 30 42 42 50 44 C58 42 78 30 82 2" stroke="#e2445c" strokeWidth="3" fill="none" />
      <path d="M44 44 L58 44 C66 44 68 54 60 56 L44 56 Z" fill="#c0c7d1" stroke="#8a93a0" strokeWidth="1.6" />
      <rect x="36" y="46" width="10" height="6" rx="1.4" fill="#aeb6c1" />
      <circle cx="58" cy="50" r="2.4" fill="#8a93a0" />
    </>
  ),
  "neck-rainbow-scarf": (
    <>
      {["#ff5c8a", "#ffb13b", "#ffe45c", "#3ecf8e", "#5b8cff"].map((c, i) => (
        <path key={c} d={`M${10 + i * 2} ${4 + i * 3.4} C30 ${26 + i * 3.4} 70 ${26 + i * 3.4} ${90 - i * 2} ${4 + i * 3.4}`} stroke={c} strokeWidth="4" fill="none" strokeLinecap="round" />
      ))}
      <g className="rocky-sway">
        {["#ff5c8a", "#ffb13b", "#ffe45c", "#3ecf8e", "#5b8cff"].map((c, i) => (
          <rect key={c} x={62 + i * 3.2} y="30" width="3.4" height="36" fill={c} />
        ))}
      </g>
    </>
  ),
  "neck-gem": (
    <>
      <defs>
        <linearGradient id="gem-cut" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e9d5ff" />
          <stop offset="0.5" stopColor="#a855f7" />
          <stop offset="1" stopColor="#581c87" />
        </linearGradient>
      </defs>
      <path d="M16 2 C22 30 40 38 50 40 C60 38 78 30 84 2" stroke={GOLD} strokeWidth="2" fill="none" />
      <path d="M50 40 L60 50 L50 66 L40 50 Z" fill="url(#gem-cut)" stroke={GOLD} strokeWidth="2" />
      <path d="M40 50 L60 50 M50 40 L46 50 L50 66 M50 40 L54 50" stroke={WHITE} strokeWidth="0.8" opacity="0.6" fill="none" />
      <circle cx="50" cy="53" r="14" fill="#a855f7" opacity="0.18" className="rocky-pulse" />
      {spark(58, 42, 4, WHITE, "g1")}
    </>
  ),
};

// ---------------------------------------------------------------------------
// Wings
// ---------------------------------------------------------------------------
/** A wing half that flaps around its root (x 48): SMIL, so it moves in the shop preview too. */
const flap = (half: ReactElement, values: string, dur: string, begin = "0s") => (
  <g>
    <animateTransform attributeName="transform" type="rotate" values={values} dur={dur} begin={begin} repeatCount="indefinite" calcMode="spline" keySplines="0.45 0 0.55 1;0.45 0 0.55 1" keyTimes="0;0.5;1" additive="sum" />
    {half}
  </g>
);

/** One prism feather pointing left from the wing root (length 44). */
const FEATHER = "M0 0 C-8 -9 -28 -12 -46 -2 C-32 9 -12 8 0 0 Z";
const TESTER_BACK_TIER = [84, 68, 52, 36, 20, 4, -12];
const featherAt = (angle: number, i: number) => `translate(48 46) rotate(${angle}) scale(${1.2 - i * 0.06} ${1.35 - i * 0.04})`;

/**
 * Testers' wings: fanned prism-glass feathers in two tiers, a holographic
 * sheen, circuit traces that pulse like a test run, a scanner line sweeping
 * the wing and little green checks drifting up — "all tests passing".
 */
const testerHalf = (
  <>
    {/* Back tier: long feathers */}
    {TESTER_BACK_TIER.map((a, i) => (
      <path
        key={`b${a}`}
        d={FEATHER}
        transform={featherAt(a, i)}
        fill="url(#tw-glass)"
        stroke="#0e7490"
        strokeWidth="1"
      />
    ))}
    {/* Front tier: short bright feathers */}
    {[74, 56, 38, 20, 2].map((a) => (
      <path key={`f${a}`} d={FEATHER} transform={`translate(48 46) rotate(${a}) scale(0.74 1.1)`} fill="url(#tw-bright)" stroke="#ecfeff" strokeWidth="0.9" />
    ))}
    {/* Holographic sheen and the scanner line, kept inside the wing */}
    <g clipPath="url(#tw-clip)">
      <rect x="-20" y="-40" width="80" height="140" fill="url(#tw-holo)" opacity="0.7" />
      <rect x="-20" y="0" width="80" height="3" fill="#ecfeff" opacity="0.9">
        <animate attributeName="y" values="-6;92;-6" dur="3.4s" repeatCount="indefinite" />
      </rect>
    </g>
    {/* Circuit traces */}
    <path
      d="M46 40 L40 26 L40 12 L32 2 M46 44 L30 32 L22 14 L14 10 M46 48 L24 42 L10 36 M46 50 L22 50 L8 52"
      stroke="#99f6e4"
      strokeWidth="1.2"
      fill="none"
      strokeLinejoin="round"
      strokeDasharray="4 5"
    >
      <animate attributeName="stroke-dashoffset" values="27;0" dur="1.1s" repeatCount="indefinite" />
    </path>
    {[
      [32, 2],
      [14, 10],
      [10, 36],
      [8, 52],
      [40, 12],
    ].map(([x, y], i) => (
      <rect key={i} x={x! - 2.2} y={y! - 2.2} width="4.4" height="4.4" rx="1" fill="#ccfbf1" transform={`rotate(45 ${x} ${y})`}>
        <animate attributeName="opacity" values="0.25;1;0.25" dur="1.4s" begin={`${i * 0.28}s`} repeatCount="indefinite" />
      </rect>
    ))}
    {/* Checks drifting up off the wing */}
    {[
      [14, 2.6],
      [28, 3.4],
      [4, 4.1],
    ].map(([x, dur], i) => (
      <g key={`c${i}`} opacity="0">
        <animateTransform attributeName="transform" type="translate" values={`${x} 70;${x! - 6} 0`} dur={`${dur}s`} begin={`${i * 0.9}s`} repeatCount="indefinite" />
        <animate attributeName="opacity" values="0;1;0" dur={`${dur}s`} begin={`${i * 0.9}s`} repeatCount="indefinite" />
        <circle r="3.2" fill="#10b981" />
        <path d="M-1.6 0 L-0.4 1.3 L1.8 -1.3" stroke="#ffffff" strokeWidth="1" fill="none" strokeLinecap="round" />
      </g>
    ))}
    {/* Root badge: a green check — tests passing */}
    <circle cx="45" cy="46" r="4.8" fill="#10b981" stroke="#d1fae5" strokeWidth="1.3">
      <animate attributeName="r" values="4.4;5.2;4.4" dur="1.8s" repeatCount="indefinite" />
    </circle>
    <path d="M42.8 46 L44.4 47.8 L47.4 44.2" stroke="#ffffff" strokeWidth="1.4" fill="none" strokeLinecap="round" />
  </>
);

/** Nova wings (the Rocky developer's): three tiers of cosmic feathers flapping out of phase, energy veins, a rune ring, lightning and falling stardust. */
const novaOuter = (
  <>
    <path
      d="M48 30 C36 2 14 -16 -10 -8 C-2 0 -6 8 -12 14 C-2 16 -2 24 -10 30 C0 32 0 40 -8 46 C2 48 4 56 -2 62 C10 62 14 70 10 78 C22 74 32 72 40 64 L48 52 Z"
      fill="url(#nova-deep)"
      stroke="#c084fc"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
    <path d="M46 32 C32 12 12 -4 -6 -6 M46 40 C30 30 10 22 -8 22 M46 48 C32 46 12 44 -4 52 M44 56 C32 60 20 66 8 74" stroke="url(#nova-vein)" strokeWidth="1.6" fill="none" strokeDasharray="6 5">
      <animate attributeName="stroke-dashoffset" values="44;0" dur="1.1s" repeatCount="indefinite" />
    </path>
  </>
);
const novaMiddle = (
  <>
    <path
      d="M48 34 C38 14 20 2 4 6 C10 12 8 18 3 24 C11 25 13 31 7 37 C15 38 17 44 12 50 C20 50 23 56 19 62 C29 60 38 58 48 50 Z"
      fill="url(#nova-mid)"
      stroke="#67e8f9"
      strokeWidth="1.4"
      strokeLinejoin="round"
    />
    <path d="M48 34 C38 14 20 2 4 6 C16 30 28 48 48 50 Z" fill="url(#nova-shine)" opacity="0.8" />
  </>
);
const novaLow = (
  <path
    d="M48 50 C40 58 30 64 20 84 C28 82 32 86 30 94 C38 88 42 90 44 98 C46 84 48 70 48 58 Z"
    fill="url(#nova-mid)"
    stroke="#f0abfc"
    strokeWidth="1.2"
    strokeLinejoin="round"
    opacity="0.92"
  />
);

export const THIRD_BACK: Record<string, ReactElement> = {
  "back-tester-wings": (
    <>
      <defs>
        <linearGradient id="tw-glass" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5eead4" />
          <stop offset="0.5" stopColor="#0ea5e9" />
          <stop offset="1" stopColor="#4f46e5" />
        </linearGradient>
        <linearGradient id="tw-bright" x1="1" y1="0" x2="0" y2="0">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#99f6e4" />
        </linearGradient>
        <linearGradient id="tw-holo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f0abfc" stopOpacity="0" />
          <stop offset="0.5" stopColor="#f0abfc" stopOpacity="0.85">
            <animate attributeName="offset" values="0.1;0.9;0.1" dur="3.6s" repeatCount="indefinite" />
          </stop>
          <stop offset="1" stopColor="#5eead4" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="tw-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#5eead4" stopOpacity="0.5" />
          <stop offset="1" stopColor="#5eead4" stopOpacity="0" />
        </radialGradient>
        {/* The feathers themselves: the sheen and the scanner line only ever touch the wing. */}
        <clipPath id="tw-clip">
          {TESTER_BACK_TIER.map((a, i) => (
            <path key={a} d={FEATHER} transform={featherAt(a, i)} />
          ))}
        </clipPath>
      </defs>
      {/* Soft teal glow behind the wings */}
      <ellipse cx="50" cy="34" rx="50" ry="46" fill="url(#tw-glow)">
        <animate attributeName="opacity" values="0.6;1;0.6" dur="2.4s" repeatCount="indefinite" />
      </ellipse>
      {/* The back box is wide and short, so the wings are stretched up to stand tall behind Rocky. */}
      <g transform="translate(0 -62) scale(1 2.2)">
        {pair(flap(testerHalf, "6 48 46;-10 48 46;6 48 46", "1.9s"))}
      </g>
      {spark(6, 6, 4, "#ccfbf1", "t1")}
      {spark(96, 22, 3.6, "#ccfbf1", "t2", 1.1)}
      {spark(90, 84, 3, "#a7f3d0", "t3", 0.5)}
    </>
  ),
  "back-nova-wings": (
    <>
      <defs>
        <linearGradient id="nova-deep" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1e1b4b" />
          <stop offset="0.45" stopColor="#6d28d9" />
          <stop offset="1" stopColor="#db2777" />
        </linearGradient>
        <linearGradient id="nova-mid" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ecfeff" />
          <stop offset="0.4" stopColor="#22d3ee" />
          <stop offset="1" stopColor="#7c3aed" />
        </linearGradient>
        <linearGradient id="nova-vein" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#f0abfc" />
          <stop offset="1" stopColor="#67e8f9" />
        </linearGradient>
        <linearGradient id="nova-shine" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#ffffff" stopOpacity="0.95">
            <animate attributeName="offset" values="-0.3;1.3" dur="2.2s" repeatCount="indefinite" />
          </stop>
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="nova-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#f0abfc" stopOpacity="0.75" />
          <stop offset="0.45" stopColor="#8b5cf6" stopOpacity="0.35" />
          <stop offset="1" stopColor="#22d3ee" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* A breathing nebula behind everything. */}
      <ellipse cx="50" cy="46" rx="62" ry="54" fill="url(#nova-glow)">
        <animate attributeName="rx" values="54;66;54" dur="2.6s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.7;1;0.7" dur="2.6s" repeatCount="indefinite" />
      </ellipse>
      {/* A rune ring turning slowly behind Rocky's shoulders. */}
      <g opacity="0.85">
        <animateTransform attributeName="transform" type="rotate" values="0 50 44;360 50 44" dur="14s" repeatCount="indefinite" />
        <circle cx="50" cy="44" r="30" fill="none" stroke="#e9d5ff" strokeWidth="1" strokeDasharray="2 3" />
        <circle cx="50" cy="44" r="25" fill="none" stroke="#67e8f9" strokeWidth="0.8" opacity="0.8" />
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i / 8) * Math.PI * 2;
          return <path key={i} d={`M${50 + Math.cos(a) * 27.5} ${44 + Math.sin(a) * 27.5} l2 -2 l2 2 l-2 2 Z`} fill="#f0abfc" />;
        })}
      </g>
      <g transform="translate(0 -24) scale(1 1.5)">
        {pair(
          <>
            {flap(novaOuter, "6 48 44;-16 48 44;6 48 44", "1.7s")}
            {flap(novaMiddle, "2 48 44;-11 48 44;2 48 44", "1.7s", "-0.25s")}
            {flap(novaLow, "-3 48 52;7 48 52;-3 48 52", "1.7s", "-0.5s")}
            {/* Lightning licking along the wing edge. */}
            <path d="M-8 14 L0 20 L-4 24 L6 32 L2 36 L12 44" stroke="#e0f2fe" strokeWidth="1.6" fill="none" strokeLinejoin="round" opacity="0">
              <animate attributeName="opacity" values="0;0;1;0.2;1;0;0" dur="2.3s" repeatCount="indefinite" />
            </path>
            <circle cx="46" cy="42" r="3.6" fill="#f0abfc" stroke="#ffffff" strokeWidth="1.2">
              <animate attributeName="r" values="3;4.4;3" dur="1.2s" repeatCount="indefinite" />
            </circle>
          </>,
        )}
      </g>
      {/* Stardust falling off the feathers. */}
      {Array.from({ length: 12 }, (_, i) => {
        const x = i % 2 ? 100 - ((i * 13) % 48) : (i * 13) % 48;
        const c = ["#f0abfc", "#67e8f9", "#fef08a", "#ffffff"][i % 4];
        return (
          <circle key={i} cx={x} cy="20" r={i % 3 ? 1.3 : 2} fill={c}>
            <animate attributeName="cy" values={`${10 + (i % 4) * 8};${110 + (i % 3) * 6}`} dur={`${2.2 + (i % 5) * 0.5}s`} begin={`${-i * 0.37}s`} repeatCount="indefinite" />
            <animate attributeName="opacity" values="0;1;1;0" dur={`${2.2 + (i % 5) * 0.5}s`} begin={`${-i * 0.37}s`} repeatCount="indefinite" />
          </circle>
        );
      })}
      {/* Two stars orbiting Rocky. */}
      {[0, 180].map((start, i) => (
        <g key={start}>
          <animateTransform attributeName="transform" type="rotate" values={`${start} 50 50;${start + 360} 50 50`} dur="5s" repeatCount="indefinite" />
          {spark(50, -6, 5, i ? "#67e8f9" : "#fef08a", `o${i}`)}
        </g>
      ))}
    </>
  ),
};

export const THIRD_BACK_WIDTH: Record<string, number> = {
  "back-tester-wings": 2.3,
  "back-nova-wings": 3.4,
};

// ---------------------------------------------------------------------------
// Home items
// ---------------------------------------------------------------------------
const shadow = (cx: number, cy: number, rx: number) => <ellipse cx={cx} cy={cy} rx={rx} ry="4" fill="#000" opacity="0.08" />;

export const THIRD_DECOR: Record<string, DecorArt> = {
  "decor-sofa": {
    play: "rest",
    viewBox: "0 0 160 90",
    left: 8,
    width: 17,
    svg: (
      <>
        {shadow(80, 86, 74)}
        <rect x="14" y="14" width="132" height="40" rx="12" fill="#3f6fb5" />
        <rect x="4" y="36" width="24" height="42" rx="10" fill="#2f5a99" />
        <rect x="132" y="36" width="24" height="42" rx="10" fill="#2f5a99" />
        <rect x="22" y="46" width="58" height="22" rx="7" fill="#5b8cd6" />
        <rect x="80" y="46" width="58" height="22" rx="7" fill="#5b8cd6" />
        <rect x="18" y="66" width="124" height="12" rx="4" fill="#2f5a99" />
        <rect x="24" y="78" width="6" height="8" fill="#6b4a2f" />
        <rect x="130" y="78" width="6" height="8" fill="#6b4a2f" />
        <rect x="100" y="26" width="26" height="22" rx="6" fill={GOLD} transform="rotate(-8 113 37)" />
      </>
    ),
  },
  "decor-tv": {
    play: "peek",
    viewBox: "0 0 120 110",
    left: 30,
    width: 12,
    svg: (
      <>
        {shadow(60, 106, 50)}
        <rect x="14" y="78" width="92" height="26" rx="3" fill="#8a5a3a" />
        <rect x="20" y="84" width="36" height="14" rx="2" fill="#6b4a2f" />
        <rect x="64" y="84" width="36" height="14" rx="2" fill="#6b4a2f" />
        <rect x="54" y="68" width="12" height="10" fill="#2b2b36" />
        <rect x="6" y="4" width="108" height="66" rx="5" fill="#2b2b36" />
        <rect x="11" y="9" width="98" height="56" rx="3" fill="#0ea5e9">
          <animate attributeName="fill" values="#0ea5e9;#22c55e;#f59e0b;#a855f7;#0ea5e9" dur="6s" repeatCount="indefinite" />
        </rect>
        <circle cx="60" cy="38" r="12" fill={WHITE} opacity="0.85" />
        <path d="M56 31 L67 38 L56 45 Z" fill={NAVY} />
        <path d="M16 14 L40 14" stroke={WHITE} strokeWidth="2" opacity="0.35" />
      </>
    ),
  },
  "decor-bookshelf": {
    play: "peek",
    viewBox: "0 0 100 140",
    left: 88,
    width: 10,
    svg: (
      <>
        {shadow(50, 136, 44)}
        <rect x="8" y="4" width="84" height="130" rx="3" fill="#8a5a3a" />
        {[8, 48, 88].map((y, r) => (
          <g key={y}>
            <rect x="14" y={y + 2} width="72" height="36" fill="#5a3a24" />
            {Array.from({ length: 6 }, (_, i) => (
              <rect
                key={i}
                x={16 + i * 11.5}
                y={y + 8 + ((i + r) % 3) * 3}
                width="9"
                height={30 - ((i + r) % 3) * 3}
                rx="1"
                fill={["#e2445c", "#f5b82e", "#3f6fb5", "#1f9d55", "#a855f7", "#f97316"][(i + r * 2) % 6]}
              />
            ))}
            <rect x="12" y={y + 38} width="76" height="4" fill="#a8744d" />
          </g>
        ))}
      </>
    ),
  },
  "decor-fridge": {
    play: "eat",
    viewBox: "0 0 80 150",
    left: 2,
    width: 8,
    svg: (
      <>
        {shadow(40, 146, 36)}
        <rect x="6" y="4" width="68" height="140" rx="8" fill="#e8eef5" stroke="#c3ccd8" strokeWidth="2" />
        <path d="M6 54 L74 54" stroke="#c3ccd8" strokeWidth="2" />
        <rect x="60" y="20" width="5" height="22" rx="2.5" fill="#9aa4b1" />
        <rect x="60" y="66" width="5" height="34" rx="2.5" fill="#9aa4b1" />
        <circle cx="22" cy="24" r="5" fill="#e2445c" />
        <rect x="30" y="18" width="10" height="12" rx="2" fill="#f5b82e" transform="rotate(10 35 24)" />
        <path d="M16 76 L34 76 L34 94 L16 94 Z" fill={WHITE} stroke="#1f9d55" strokeWidth="1.6" />
        <path d="M19 82 L31 82 M19 87 L28 87" stroke="#1f9d55" strokeWidth="1.4" />
      </>
    ),
  },
  "decor-aquarium": {
    play: "sniff",
    viewBox: "0 0 130 110",
    left: 58,
    width: 13,
    svg: (
      <>
        {shadow(65, 106, 56)}
        <rect x="16" y="76" width="98" height="28" rx="3" fill="#6b4a2f" />
        <rect x="8" y="10" width="114" height="68" rx="5" fill="#7dd3fc" opacity="0.55" stroke="#475569" strokeWidth="3" />
        <path d="M11 70 C30 64 50 72 70 66 C90 62 110 70 119 66 L119 75 L11 75 Z" fill="#f0d49a" />
        {[24, 40, 98].map((x, i) => (
          <path key={x} className="rocky-sway" d={`M${x} 72 C${x - 4} 60 ${x + 4} 50 ${x} ${38 + i * 4}`} stroke="#1f9d55" strokeWidth="3" fill="none" />
        ))}
        <g>
          <animateTransform attributeName="transform" type="translate" values="0 0;40 4;0 0" dur="7s" repeatCount="indefinite" />
          <path d="M40 36 C46 30 56 30 60 36 C56 42 46 42 40 36 Z M40 36 L34 31 L34 41 Z" fill="#f97316" />
          <circle cx="55" cy="35" r="1.3" fill={INK} />
        </g>
        <g>
          <animateTransform attributeName="transform" type="translate" values="0 0;-36 -6;0 0" dur="9s" repeatCount="indefinite" />
          <path d="M92 52 C86 47 78 47 74 52 C78 57 86 57 92 52 Z M92 52 L98 47 L98 57 Z" fill="#facc15" />
          <circle cx="78" cy="51" r="1.2" fill={INK} />
        </g>
        {[0, 1, 2].map((i) => (
          <circle key={i} cx={104} cy="60" r={1.6 + i * 0.4} fill={WHITE} opacity="0.8">
            <animate attributeName="cy" values="64;16" dur="2.6s" begin={`${i * 0.8}s`} repeatCount="indefinite" />
          </circle>
        ))}
        <rect x="8" y="6" width="114" height="8" rx="3" fill="#334155" />
      </>
    ),
  },
  "decor-guitar": {
    play: "cheer",
    viewBox: "0 0 60 140",
    left: 48,
    width: 6,
    svg: (
      <>
        {shadow(30, 136, 24)}
        <rect x="26" y="4" width="8" height="70" fill="#6b4a2f" />
        <rect x="22" y="0" width="16" height="14" rx="3" fill="#3a2718" />
        {[3, 7, 11].map((y) => (
          <circle key={y} cx="20" cy={y + 1} r="1.6" fill="#c0c7d1" />
        ))}
        <path d="M30 64 C12 64 8 80 16 92 C4 104 10 134 30 134 C50 134 56 104 44 92 C52 80 48 64 30 64 Z" fill="#e2445c" stroke="#8e1f29" strokeWidth="2" />
        <circle cx="30" cy="96" r="8" fill={INK} />
        <rect x="20" y="116" width="20" height="5" rx="2" fill="#3a2718" />
        <path d="M28 10 L28 118 M32 10 L32 118" stroke="#e5e7eb" strokeWidth="0.8" />
      </>
    ),
  },
  "decor-clock": {
    play: "peek",
    viewBox: "0 0 80 80",
    left: 40,
    width: 6,
    lift: 42,
    svg: (
      <>
        <circle cx="40" cy="40" r="36" fill={WHITE} stroke={NAVY} strokeWidth="6" />
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i / 12) * Math.PI * 2;
          return <circle key={i} cx={40 + Math.sin(a) * 28} cy={40 - Math.cos(a) * 28} r={i % 3 ? 1.4 : 2.6} fill={NAVY} />;
        })}
        <path d="M40 40 L40 22" stroke={NAVY} strokeWidth="4" strokeLinecap="round">
          <animateTransform attributeName="transform" type="rotate" values="0 40 40;360 40 40" dur="120s" repeatCount="indefinite" />
        </path>
        <path d="M40 40 L40 14" stroke="#e2445c" strokeWidth="2" strokeLinecap="round">
          <animateTransform attributeName="transform" type="rotate" values="0 40 40;360 40 40" dur="10s" repeatCount="indefinite" />
        </path>
        <circle cx="40" cy="40" r="3.6" fill={GOLD} />
      </>
    ),
  },
  "decor-piano": {
    play: "cheer",
    viewBox: "0 0 160 110",
    left: 66,
    width: 16,
    svg: (
      <>
        {shadow(80, 106, 72)}
        <rect x="10" y="6" width="140" height="60" rx="6" fill="#1b1b24" />
        <rect x="16" y="12" width="128" height="16" rx="3" fill="#2b2b36" />
        <rect x="56" y="14" width="48" height="12" rx="2" fill="#f4ead2" />
        <path d="M62 18 L98 18 M62 22 L90 22" stroke="#6b4a2f" strokeWidth="1" />
        <rect x="10" y="56" width="140" height="18" fill={WHITE} stroke="#1b1b24" strokeWidth="2" />
        {Array.from({ length: 13 }, (_, i) => (
          <path key={i} d={`M${20 + i * 10} 56 L${20 + i * 10} 74`} stroke="#9aa4b1" strokeWidth="1" />
        ))}
        {[0, 1, 3, 4, 5, 7, 8, 10, 11, 12].map((i) => (
          <rect key={i} x={17 + i * 10} y="56" width="6" height="11" fill="#1b1b24" />
        ))}
        <rect x="18" y="74" width="8" height="30" fill="#1b1b24" />
        <rect x="134" y="74" width="8" height="30" fill="#1b1b24" />
        {[0, 1].map((i) => (
          <text key={i} x={30 + i * 90} y="0" fontSize="14" fill="#a855f7">
            ♪
            <animate attributeName="y" values="46;0" dur="2.4s" begin={`${i * 1.2}s`} repeatCount="indefinite" />
            <animate attributeName="opacity" values="1;0" dur="2.4s" begin={`${i * 1.2}s`} repeatCount="indefinite" />
          </text>
        ))}
      </>
    ),
  },
  "decor-cactus": {
    play: "sniff",
    viewBox: "0 0 70 110",
    left: 22,
    width: 6,
    svg: (
      <>
        {shadow(35, 106, 24)}
        <path d="M28 80 L28 20 C28 8 42 8 42 20 L42 80 Z" fill="#3f9a6a" />
        <path d="M28 54 L18 54 C10 54 10 44 12 36 C14 30 20 30 20 36 L20 46 L28 46 Z" fill="#358a5c" />
        <path d="M42 46 L50 46 L50 32 C50 26 58 26 58 32 C60 42 58 54 50 54 L42 54 Z" fill="#358a5c" />
        {[
          [32, 26],
          [38, 40],
          [32, 58],
          [38, 70],
        ].map(([x, y]) => (
          <path key={y} d={`M${x} ${y} l-2 -2 M${x} ${y} l2 -2`} stroke="#e8f5e9" strokeWidth="1" />
        ))}
        <circle cx="35" cy="10" r="5" fill="#ff5c8a" />
        <path d="M18 78 L52 78 L48 104 L22 104 Z" fill="#e07a4b" />
        <rect x="16" y="74" width="38" height="8" rx="2" fill="#c9653a" />
      </>
    ),
  },
  "decor-beanbag": {
    play: "nap",
    viewBox: "0 0 120 80",
    left: 36,
    width: 11,
    svg: (
      <>
        {shadow(60, 76, 54)}
        <path d="M8 70 C2 40 24 10 58 12 C94 14 118 42 112 70 C90 80 30 80 8 70 Z" fill="#f97316" />
        <path d="M24 60 C30 44 50 38 70 42" stroke="#fdba74" strokeWidth="4" fill="none" strokeLinecap="round" />
        <path d="M58 12 C60 24 58 34 52 42" stroke="#c2410c" strokeWidth="2" fill="none" opacity="0.6" />
      </>
    ),
  },
  "decor-fountain": {
    play: "sniff",
    viewBox: "0 0 120 120",
    left: 72,
    width: 12,
    svg: (
      <>
        {shadow(60, 116, 54)}
        <ellipse cx="60" cy="96" rx="54" ry="16" fill="#aeb6c1" />
        <ellipse cx="60" cy="92" rx="46" ry="11" fill="#7dd3fc" />
        <rect x="54" y="50" width="12" height="44" fill="#c0c7d1" />
        <ellipse cx="60" cy="52" rx="24" ry="7" fill="#aeb6c1" />
        <ellipse cx="60" cy="50" rx="19" ry="4.6" fill="#7dd3fc" />
        {[-1, 1].map((d) => (
          <path key={d} d={`M60 30 C${60 + d * 12} 20 ${60 + d * 24} 34 ${60 + d * 30} 88`} stroke="#bae6fd" strokeWidth="3" fill="none" strokeDasharray="6 5">
            <animate attributeName="stroke-dashoffset" values="22;0" dur="0.8s" repeatCount="indefinite" />
          </path>
        ))}
        <path d="M60 50 L60 22" stroke="#bae6fd" strokeWidth="4" strokeDasharray="5 4">
          <animate attributeName="stroke-dashoffset" values="18;0" dur="0.6s" repeatCount="indefinite" />
        </path>
      </>
    ),
  },
  "decor-telescope": {
    play: "peek",
    viewBox: "0 0 110 120",
    left: 84,
    width: 10,
    svg: (
      <>
        {shadow(56, 116, 40)}
        <path d="M56 62 L30 116 M56 62 L82 116 M56 62 L56 116" stroke="#6b4a2f" strokeWidth="4" strokeLinecap="round" />
        <g transform="rotate(-28 56 58)">
          <rect x="14" y="48" width="84" height="20" rx="6" fill={NAVY} />
          <rect x="88" y="44" width="16" height="28" rx="4" fill="#3f6fb5" />
          <rect x="6" y="52" width="12" height="12" rx="3" fill="#2b2b36" />
          <rect x="40" y="46" width="6" height="24" fill={GOLD} />
        </g>
        {spark(100, 10, 5, "#fef08a", "ts")}
      </>
    ),
  },
  "decor-record-player": {
    play: "cheer",
    viewBox: "0 0 120 80",
    left: 50,
    width: 11,
    svg: (
      <>
        {shadow(60, 76, 54)}
        <rect x="8" y="30" width="104" height="44" rx="5" fill="#a8744d" />
        <rect x="8" y="30" width="104" height="8" rx="4" fill="#c9965f" />
        <ellipse cx="52" cy="34" rx="36" ry="10" fill={INK} />
        <g>
          <animateTransform attributeName="transform" type="rotate" values="0 52 34;360 52 34" dur="2s" repeatCount="indefinite" />
          <ellipse cx="52" cy="34" rx="10" ry="3" fill="#e2445c" />
          <path d="M26 34 C34 30 42 29 50 29" stroke="#44485a" strokeWidth="1.2" fill="none" />
        </g>
        <path d="M98 30 L98 20 L78 32" stroke="#c0c7d1" strokeWidth="3" fill="none" strokeLinecap="round" />
        <circle cx="98" cy="54" r="5" fill="#2b2b36" />
        <circle cx="84" cy="54" r="5" fill="#2b2b36" />
        <text x="18" y="0" fontSize="14" fill="#3f6fb5">
          ♫
          <animate attributeName="y" values="26;-4" dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="1;0" dur="2s" repeatCount="indefinite" />
        </text>
      </>
    ),
  },
  "decor-computer": {
    play: "peek",
    viewBox: "0 0 140 110",
    left: 14,
    width: 14,
    svg: (
      <>
        {shadow(70, 106, 62)}
        <rect x="6" y="62" width="128" height="8" rx="2" fill="#8a5a3a" />
        <rect x="12" y="70" width="6" height="36" fill="#6b4a2f" />
        <rect x="122" y="70" width="6" height="36" fill="#6b4a2f" />
        <rect x="30" y="4" width="80" height="50" rx="4" fill="#2b2b36" />
        <rect x="34" y="8" width="72" height="42" rx="2" fill="#0b1220" />
        {[0, 1, 2, 3, 4].map((i) => (
          <rect key={i} x={38 + (i % 2) * 8} y={13 + i * 7} width={[36, 26, 40, 18, 30][i]} height="3" rx="1.5" fill={["#4ade80", "#c4b5fd", "#67e8f9", "#fca5a5", "#4ade80"][i]} opacity="0.9" />
        ))}
        <rect x="80" y="41" width="4" height="5" fill="#4ade80" className="rocky-blink" />
        <rect x="64" y="54" width="12" height="8" fill="#2b2b36" />
        <rect x="40" y="56" width="44" height="6" rx="2" fill="#44485a" />
        <rect x="94" y="56" width="10" height="6" rx="3" fill="#44485a" />
        <rect x="112" y="46" width="12" height="16" rx="2" fill={WHITE} />
        <path d="M124 50 C130 50 130 58 124 58" stroke={WHITE} strokeWidth="2" fill="none" />
      </>
    ),
  },
  "decor-doghouse": {
    play: "nap",
    viewBox: "0 0 120 110",
    left: 92,
    width: 12,
    svg: (
      <>
        {shadow(60, 106, 54)}
        <path d="M10 44 L60 6 L110 44 Z" fill="#b93b32" />
        <rect x="18" y="42" width="84" height="62" fill="#e0a86a" />
        {[54, 66, 78, 90].map((y) => (
          <path key={y} d={`M18 ${y} L102 ${y}`} stroke="#c68a4c" strokeWidth="1.4" />
        ))}
        <path d="M44 104 L44 72 C44 58 76 58 76 72 L76 104 Z" fill="#3a2718" />
        <rect x="46" y="44" width="28" height="10" rx="2" fill={WHITE} />
        <text x="60" y="52" fontSize="8" fontWeight="800" textAnchor="middle" fill={NAVY} fontFamily="Poppins, sans-serif">
          ROCKY
        </text>
        <path d="M30 100 C34 94 42 94 42 100 Z" fill="#c0c7d1" />
      </>
    ),
  },
  "decor-arcade-trophy": {
    play: "cheer",
    viewBox: "0 0 90 120",
    left: 26,
    width: 8,
    svg: (
      <>
        <defs>
          <linearGradient id="arc-gold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fff3b0" />
            <stop offset="0.5" stopColor="#f5b82e" />
            <stop offset="1" stopColor="#b8780a" />
          </linearGradient>
        </defs>
        {shadow(45, 116, 34)}
        <rect x="18" y="92" width="54" height="22" rx="4" fill="#312e81" />
        <rect x="24" y="98" width="42" height="9" rx="2" fill="#4338ca" />
        <text x="45" y="105.5" fontSize="7" fontWeight="800" textAnchor="middle" fill="#e0e7ff" fontFamily="Poppins, sans-serif">
          ARCADE #1
        </text>
        <rect x="38" y="70" width="14" height="22" fill="url(#arc-gold)" />
        <path d="M16 12 L74 12 L70 44 C66 62 56 70 45 70 C34 70 24 62 20 44 Z" fill="url(#arc-gold)" stroke="#8a5a00" strokeWidth="1.6" />
        <path d="M16 18 C0 18 2 44 22 46 M74 18 C90 18 88 44 68 46" stroke="#f5b82e" strokeWidth="5" fill="none" />
        {/* A little joystick on the cup */}
        <rect x="36" y="32" width="18" height="12" rx="3" fill="#1e1b4b" />
        <path d="M45 32 L45 22" stroke="#1e1b4b" strokeWidth="3" />
        <circle cx="45" cy="21" r="4.5" fill="#e2445c" className="rocky-pulse" />
        {spark(22, 8, 5, "#fffbe0", "at1")}
        {spark(72, 30, 4, "#fffbe0", "at2", 0.9)}
      </>
    ),
  },
  "decor-disco-ball": {
    play: "cheer",
    viewBox: "0 0 80 110",
    left: 52,
    width: 6,
    lift: 50,
    svg: (
      <>
        <defs>
          <clipPath id="disco-clip">
            <circle cx="40" cy="62" r="30" />
          </clipPath>
        </defs>
        <path d="M40 0 L40 30" stroke="#9aa4b1" strokeWidth="2" />
        <g>
          <animateTransform attributeName="transform" type="rotate" values="-6 40 30;6 40 30;-6 40 30" dur="3s" repeatCount="indefinite" />
          <circle cx="40" cy="62" r="30" fill="#c0c7d1" />
          <g clipPath="url(#disco-clip)">
          {Array.from({ length: 8 }, (_, r) =>
            Array.from({ length: 8 }, (_, c) => (
              <rect key={`${r}-${c}`} x={8 + c * 8} y={30 + r * 8} width="7" height="7" fill={["#e5e7eb", "#94a3b8", "#f0abfc", "#67e8f9"][(r + c) % 4]}>
                <animate attributeName="opacity" values="1;0.4;1" dur="1.2s" begin={`${((r * 6 + c) % 5) * 0.2}s`} repeatCount="indefinite" />
              </rect>
            )),
          )}
          </g>
          <circle cx="40" cy="62" r="30" fill="none" stroke="#64748b" strokeWidth="1.4" />
        </g>
        {spark(10, 40, 5, "#f0abfc", "db1")}
        {spark(72, 86, 5, "#67e8f9", "db2", 0.8)}
        {spark(70, 30, 4, "#fef08a", "db3", 1.6)}
      </>
    ),
  },
};

