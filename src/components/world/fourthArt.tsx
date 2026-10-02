// The fourth wave of shop art (three of each kind): a tropical / coffee-
// country theme. Same boxes as the earlier waves (hats 100x60 with the brim
// at the bottom; glasses 100x40 with the lenses at (25,20) and (75,20);
// neck 100x70 with the knot at the top centre; back 100x120 drawn behind
// Rocky; scenes 1000x400 with the floor from about y 290; foods and soaps
// 40x40). Merged into the art maps, so nothing else changes.
import type { ReactElement } from "react";
import type { DecorArt, HatArt } from "./art";

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

// ---------------------------------------------------------------------------
// Hats
// ---------------------------------------------------------------------------
export const FOURTH_HATS: Record<string, HatArt> = {
  "hat-straw": {
    width: 1.05,
    sink: 0.34,
    svg: (
      <>
        <ellipse cx="50" cy="50" rx="48" ry="9" fill="#e9c46a" />
        <ellipse cx="50" cy="50" rx="48" ry="9" fill="none" stroke="#c99a3a" strokeWidth="1.5" strokeDasharray="3 3" />
        <path d="M28 48 C28 22 38 14 50 14 C62 14 72 22 72 48 Z" fill="#f2d27c" />
        <path d="M28 40 C40 44 60 44 72 40 L72 47 C60 51 40 51 28 47 Z" fill="#e2445c" />
        {[34, 42, 50, 58, 66].map((x) => (
          <path key={x} d={`M${x} 18 L${x - 1} 38`} stroke="#d9b25a" strokeWidth="1.2" />
        ))}
        <circle cx="66" cy="42" r="5" fill={WHITE} />
        <circle cx="66" cy="42" r="2" fill={GOLD} />
      </>
    ),
  },
  "hat-frog": {
    width: 0.9,
    sink: 0.3,
    svg: (
      <>
        <path d="M14 58 C14 30 30 20 50 20 C70 20 86 30 86 58 Z" fill="#4caf50" />
        <path d="M14 58 C30 52 70 52 86 58" stroke="#3a8f3e" strokeWidth="3" fill="none" />
        {pair(
          <>
            <circle cx="32" cy="20" r="13" fill="#4caf50" />
            <circle cx="32" cy="20" r="8" fill={WHITE} />
            <circle cx="33" cy="21" r="4.2" fill={INK} />
            <circle cx="34.5" cy="19" r="1.4" fill={WHITE} />
          </>,
        )}
        <path d="M38 42 C44 48 56 48 62 42" stroke="#2e7031" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <circle cx="26" cy="44" r="3" fill="#ff9ecb" opacity="0.7" />
        <circle cx="74" cy="44" r="3" fill="#ff9ecb" opacity="0.7" />
      </>
    ),
  },
  "hat-bee": {
    width: 0.8,
    sink: 0.16,
    svg: (
      <>
        <path d="M14 58 C20 34 34 26 50 26 C66 26 80 34 86 58" stroke={INK} strokeWidth="6" fill="none" strokeLinecap="round" />
        {pair(
          <>
            <path d="M32 30 C28 18 22 10 16 6" stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" />
            <circle cx="15" cy="6" r="6" fill={GOLD} stroke={INK} strokeWidth="2" />
          </>,
        )}
        <g className="rocky-pulse">
          <path d="M44 22 C40 12 46 8 50 14 C54 8 60 12 56 22 Z" fill="#cfeaff" opacity="0.85" />
        </g>
      </>
    ),
  },
};

// ---------------------------------------------------------------------------
// Glasses (100x40, lenses at (25,20) and (75,20))
// ---------------------------------------------------------------------------
export const FOURTH_GLASSES: Record<string, ReactElement> = {
  "glasses-sunset": (
    <>
      <defs>
        <linearGradient id="sunset-lens" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f97316" />
          <stop offset="0.55" stopColor="#ec4899" />
          <stop offset="1" stopColor="#7c3aed" />
        </linearGradient>
      </defs>
      {pair(<circle cx="25" cy="20" r="15" fill="url(#sunset-lens)" stroke="#f5d0a9" strokeWidth="3" />)}
      <path d="M40 18 C46 14 54 14 60 18" stroke="#f5d0a9" strokeWidth="3" fill="none" />
      {pair(<path d="M16 13 C20 9 26 9 30 11" stroke={WHITE} strokeWidth="2.2" fill="none" strokeLinecap="round" opacity="0.7" />)}
    </>
  ),
  "glasses-butterfly": (
    <>
      {pair(
        <>
          <path d="M44 20 C40 4 18 0 8 8 C2 14 6 24 16 26 C8 30 12 38 22 36 C32 34 40 28 44 20 Z" fill="#a78bfa" stroke="#6d28d9" strokeWidth="2" />
          <path d="M42 20 C36 10 22 8 14 12" stroke="#ddd6fe" strokeWidth="2" fill="none" />
          <circle cx="25" cy="20" r="9" fill="#ede9fe" opacity="0.55" />
        </>,
      )}
      <rect x="44" y="16" width="12" height="8" rx="4" fill="#6d28d9" />
    </>
  ),
  "glasses-robot": (
    <>
      <rect x="4" y="6" width="92" height="28" rx="8" fill="#334155" />
      <rect x="8" y="10" width="84" height="20" rx="5" fill="#0f172a" />
      {pair(
        <g className="rocky-pulse">
          <rect x="16" y="15" width="18" height="10" rx="3" fill="#22d3ee" />
          <rect x="18" y="17" width="5" height="3" rx="1" fill={WHITE} opacity="0.8" />
        </g>,
      )}
      <circle cx="50" cy="20" r="2.2" fill="#f43f5e" className="rocky-twinkle" />
    </>
  ),
};

// ---------------------------------------------------------------------------
// Neck (100x70, knot at the top centre)
// ---------------------------------------------------------------------------
export const FOURTH_NECK: Record<string, ReactElement> = {
  "neck-coffee": (
    <>
      <path d="M16 4 C20 36 80 36 84 4" stroke="#7c5236" strokeWidth="2" fill="none" />
      {Array.from({ length: 9 }, (_, i) => {
        const t = (i + 1) / 10;
        const x = 16 + 68 * t;
        const y = 4 + 64 * t * (1 - t) * 1.0;
        return (
          <g key={i} transform={`translate(${x} ${y}) rotate(${(t - 0.5) * 70})`}>
            <ellipse rx="4.4" ry="5.6" fill="#5b3a22" />
            <path d="M0 -4.6 C-1.6 -1 1.6 1 0 4.6" stroke="#2e1b0e" strokeWidth="1.2" fill="none" />
          </g>
        );
      })}
      <g transform="translate(50 46)">
        <path d="M-9 -6 L9 -6 L7 8 C6 12 -6 12 -7 8 Z" fill={WHITE} stroke="#7c5236" strokeWidth="1.6" />
        <path d="M9 -2 C14 -2 14 5 8 5" stroke="#7c5236" strokeWidth="1.6" fill="none" />
        <path d="M-3 -10 C-5 -13 -1 -15 -3 -18 M2 -10 C0 -13 4 -15 2 -18" stroke="#c7b199" strokeWidth="1.2" fill="none" className="rocky-smoke" />
      </g>
    </>
  ),
  "neck-knit-scarf": (
    <>
      <path d="M8 6 C20 26 80 26 92 6 L92 20 C80 38 20 38 8 20 Z" fill="#f59e0b" />
      {[16, 28, 40, 52, 64, 76, 88].map((x) => (
        <path key={x} d={`M${x - 4} ${12 + Math.abs(50 - x) * -0.1} l4 6 l4 -6`} stroke="#d97706" strokeWidth="1.6" fill="none" />
      ))}
      <path d="M60 26 L72 26 L76 64 L62 64 Z" fill="#f59e0b" />
      <path d="M62 36 L74 36 M63 46 L75 46 M63 56 L75 56" stroke="#d97706" strokeWidth="2" />
      {[63, 67, 71, 75].map((x) => (
        <path key={x} d={`M${x} 64 L${x} 70`} stroke="#b45309" strokeWidth="2" strokeLinecap="round" />
      ))}
    </>
  ),
  "neck-star-pendant": (
    <>
      <path d="M18 2 C24 30 76 30 82 2" stroke="#e5e7eb" strokeWidth="2" fill="none" />
      <path d="M50 28 L50 34" stroke="#e5e7eb" strokeWidth="2" />
      <g transform="translate(50 46)">
        <circle r="13" fill={GOLD} opacity="0.25" className="rocky-pulse" />
        <polygon points="0,-11 3,-3.5 11,-3.4 4.8,1.6 7,9.5 0,5 -7,9.5 -4.8,1.6 -11,-3.4 -3,-3.5" fill={GOLD} stroke="#b7791f" strokeWidth="1.2" />
        <circle cx="-2" cy="-3" r="1.6" fill={WHITE} opacity="0.8" />
      </g>
    </>
  ),
};

// ---------------------------------------------------------------------------
// Back (100x120, shoulders across the top; drawn behind Rocky)
// ---------------------------------------------------------------------------
export const FOURTH_BACK: Record<string, ReactElement> = {
  "back-guitar": (
    <g transform="rotate(-24 50 60)">
      <rect x="46" y="-6" width="8" height="58" rx="2" fill="#6b4a2f" />
      {[0, 8, 16, 24, 32, 40].map((y) => (
        <rect key={y} x="46" y={y} width="8" height="1.4" fill="#d6c2a0" />
      ))}
      <rect x="43" y="-14" width="14" height="12" rx="3" fill="#4a3322" />
      <path d="M50 48 C30 48 26 66 34 74 C24 82 26 112 50 112 C74 112 76 82 66 74 C74 66 70 48 50 48 Z" fill="#d97706" stroke="#92400e" strokeWidth="2.5" />
      <circle cx="50" cy="78" r="8" fill="#3b2412" />
      <rect x="40" y="96" width="20" height="5" rx="2" fill="#3b2412" />
      <path d="M48 -2 L48 98 M52 -2 L52 98" stroke="#f1f5f9" strokeWidth="0.8" />
    </g>
  ),
  "back-surfboard": (
    <g transform="rotate(16 50 60)">
      <path d="M50 -8 C68 10 72 60 62 124 L38 124 C28 60 32 10 50 -8 Z" fill="#22d3ee" stroke="#0e7490" strokeWidth="2.5" />
      <path d="M50 -8 L50 124" stroke={WHITE} strokeWidth="3" opacity="0.8" />
      <path d="M40 40 C46 46 54 46 60 40 M38 70 C46 76 54 76 62 70" stroke="#f97316" strokeWidth="4" fill="none" />
      <circle cx="50" cy="100" r="5" fill={GOLD} />
    </g>
  ),
  "back-balloons": (
    <>
      <path d="M50 70 C40 50 26 36 22 20 M50 70 C50 50 52 30 50 8 M50 70 C60 50 74 38 80 22" stroke="#94a3b8" strokeWidth="1.2" fill="none" />
      {[
        [22, 14, "#e2445c"],
        [50, 2, GOLD],
        [80, 16, "#1fbf68"],
      ].map(([x, y, c]) => (
        <g key={String(c)} className="rocky-bob">
          <ellipse cx={x as number} cy={y as number} rx="14" ry="17" fill={c as string} />
          <path d={`M${(x as number) - 3} ${(y as number) + 16} L${x} ${(y as number) + 20} L${(x as number) + 3} ${(y as number) + 16} Z`} fill={c as string} />
          <ellipse cx={(x as number) - 5} cy={(y as number) - 6} rx="3.5" ry="6" fill={WHITE} opacity="0.4" />
        </g>
      ))}
    </>
  ),
};

/** How wide each back item is relative to the face. */
export const FOURTH_BACK_WIDTH: Record<string, number> = {
  "back-guitar": 1.3,
  "back-surfboard": 1.2,
  "back-balloons": 1.8,
};

// ---------------------------------------------------------------------------
// Home items
// ---------------------------------------------------------------------------
const shadow = (cx: number, cy: number, rx: number) => <ellipse cx={cx} cy={cy} rx={rx} ry="4" fill="#000" opacity="0.08" />;

export const FOURTH_DECOR: Record<string, DecorArt> = {
  "decor-cup-gold": {
    play: "cheer",
    viewBox: "0 0 100 120",
    left: 60,
    width: 7,
    svg: (
      <>
        {shadow(50, 116, 34)}
        <rect x="26" y="96" width="48" height="16" rx="3" fill="#4a3322" />
        <rect x="32" y="100" width="36" height="6" rx="2" fill="#a16207" />
        <rect x="44" y="72" width="12" height="26" fill="#f5b82e" />
        <path d="M18 10 L82 10 L76 52 C72 68 60 76 50 76 C40 76 28 68 24 52 Z" fill="#f5b82e" stroke="#a16207" strokeWidth="2.5" />
        <path d="M18 18 C4 18 4 46 26 48 M82 18 C96 18 96 46 74 48" stroke="#f5b82e" strokeWidth="5" fill="none" />
        <path d="M32 18 L36 50" stroke="#fff" strokeWidth="4" opacity="0.45" strokeLinecap="round" />
        <text x="50" y="44" textAnchor="middle" fontFamily="Poppins, sans-serif" fontWeight="900" fontSize="20" fill="#a16207">1</text>
        <path className="rocky-twinkle" d="M70 6 l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2 l5 -2 Z" fill="#fff" />
      </>
    ),
  },
  "decor-cup-silver": {
    play: "cheer",
    viewBox: "0 0 100 120",
    left: 64,
    width: 7,
    svg: (
      <>
        {shadow(50, 116, 34)}
        <rect x="26" y="96" width="48" height="16" rx="3" fill="#4a3322" />
        <rect x="32" y="100" width="36" height="6" rx="2" fill="#64748b" />
        <rect x="44" y="72" width="12" height="26" fill="#cbd5e1" />
        <path d="M18 10 L82 10 L76 52 C72 68 60 76 50 76 C40 76 28 68 24 52 Z" fill="#cbd5e1" stroke="#64748b" strokeWidth="2.5" />
        <path d="M18 18 C4 18 4 46 26 48 M82 18 C96 18 96 46 74 48" stroke="#cbd5e1" strokeWidth="5" fill="none" />
        <path d="M32 18 L36 50" stroke="#fff" strokeWidth="4" opacity="0.45" strokeLinecap="round" />
        <text x="50" y="44" textAnchor="middle" fontFamily="Poppins, sans-serif" fontWeight="900" fontSize="20" fill="#64748b">2</text>
        <path className="rocky-twinkle" d="M70 6 l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2 l5 -2 Z" fill="#fff" />
      </>
    ),
  },
  "decor-cup-bronze": {
    play: "cheer",
    viewBox: "0 0 100 120",
    left: 68,
    width: 7,
    svg: (
      <>
        {shadow(50, 116, 34)}
        <rect x="26" y="96" width="48" height="16" rx="3" fill="#4a3322" />
        <rect x="32" y="100" width="36" height="6" rx="2" fill="#7c3f12" />
        <rect x="44" y="72" width="12" height="26" fill="#d6904f" />
        <path d="M18 10 L82 10 L76 52 C72 68 60 76 50 76 C40 76 28 68 24 52 Z" fill="#d6904f" stroke="#7c3f12" strokeWidth="2.5" />
        <path d="M18 18 C4 18 4 46 26 48 M82 18 C96 18 96 46 74 48" stroke="#d6904f" strokeWidth="5" fill="none" />
        <path d="M32 18 L36 50" stroke="#fff" strokeWidth="4" opacity="0.45" strokeLinecap="round" />
        <text x="50" y="44" textAnchor="middle" fontFamily="Poppins, sans-serif" fontWeight="900" fontSize="20" fill="#7c3f12">3</text>
        <path className="rocky-twinkle" d="M70 6 l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2 l5 -2 Z" fill="#fff" />
      </>
    ),
  },
  "decor-hammock": {
    play: "nap",
    viewBox: "0 0 200 100",
    left: 12,
    width: 20,
    svg: (
      <>
        {shadow(100, 96, 90)}
        {[14, 186].map((x) => (
          <g key={x}>
            <rect x={x - 5} y="8" width="10" height="88" rx="4" fill="#8a5a3a" />
            <path d={`M${x - 14} 14 C${x - 8} 2 ${x + 8} 2 ${x + 14} 14`} fill="#3f9a6a" />
          </g>
        ))}
        <g className="rocky-sway" style={{ transformOrigin: "100px 26px" }}>
          <path d="M18 26 C60 82 140 82 182 26" stroke="#e2445c" strokeWidth="4" fill="none" />
          <path d="M26 30 C64 86 136 86 174 30 C140 64 60 64 26 30 Z" fill="#f59e0b" />
          {[50, 76, 100, 124, 150].map((x) => (
            <path key={x} d={`M${x} ${40 + (100 - Math.abs(100 - x)) * 0.18} l0 8`} stroke="#e2445c" strokeWidth="3" />
          ))}
        </g>
      </>
    ),
  },
  "decor-coffee-cart": {
    play: "eat",
    viewBox: "0 0 140 120",
    left: 74,
    width: 13,
    svg: (
      <>
        {shadow(70, 116, 60)}
        <path d="M12 30 L128 30 L120 10 L20 10 Z" fill="#e2445c" />
        {[20, 44, 68, 92, 116].map((x) => (
          <path key={x} d={`M${x} 30 a12 8 0 0 0 24 0`} fill={x % 48 === 20 ? WHITE : "#e2445c"} />
        ))}
        <rect x="22" y="30" width="4" height="40" fill="#6b4a2f" />
        <rect x="114" y="30" width="4" height="40" fill="#6b4a2f" />
        <rect x="14" y="66" width="112" height="38" rx="5" fill="#8a5a3a" />
        <rect x="20" y="72" width="100" height="10" rx="3" fill="#6b4a2f" />
        <text x="70" y="98" textAnchor="middle" fontFamily="Poppins, sans-serif" fontWeight="800" fontSize="11" fill={GOLD}>
          CAFÉ
        </text>
        <circle cx="30" cy="108" r="9" fill={INK} />
        <circle cx="110" cy="108" r="9" fill={INK} />
        <circle cx="30" cy="108" r="3" fill="#9ca3af" />
        <circle cx="110" cy="108" r="3" fill="#9ca3af" />
        <g transform="translate(52 50)">
          <path d="M0 0 L16 0 L14 16 L2 16 Z" fill={WHITE} stroke="#7c5236" strokeWidth="1.5" />
          <path d="M5 -4 C3 -8 7 -10 5 -14 M10 -4 C8 -8 12 -10 10 -14" stroke="#c7b199" strokeWidth="1.4" fill="none" className="rocky-smoke" />
        </g>
        <g transform="translate(74 52)">
          <rect width="14" height="14" rx="2" fill="#5b3a22" />
          <path d="M3 4 L11 4 M3 8 L11 8" stroke="#3b2412" strokeWidth="1.4" />
        </g>
      </>
    ),
  },
  "decor-campfire": {
    play: "rest",
    viewBox: "0 0 120 100",
    left: 46,
    width: 10,
    svg: (
      <>
        {shadow(60, 96, 46)}
        <circle cx="60" cy="62" r="40" fill={GOLD} opacity="0.12" className="rocky-pulse" />
        <path d="M22 86 L98 74 M22 74 L98 86" stroke="#6b4a2f" strokeWidth="9" strokeLinecap="round" />
        {[20, 36, 52, 68, 84, 100].map((x, i) => (
          <circle key={x} cx={x} cy={90 - (i % 2) * 2} r="6" fill="#9ca3af" />
        ))}
        <g className="rocky-flap" style={{ transformOrigin: "60px 82px" }}>
          <path d="M60 18 C74 38 84 52 78 70 C74 82 46 82 42 70 C36 52 50 40 60 18 Z" fill="#f97316" />
          <path d="M60 38 C68 50 72 60 68 70 C64 78 56 78 52 70 C48 60 54 50 60 38 Z" fill={GOLD} />
          <path d="M60 56 C63 62 64 66 62 72 C60 74 58 72 58 70 C57 66 58 62 60 56 Z" fill="#fff7c2" />
        </g>
        {[48, 66, 74].map((x, i) => (
          <circle key={x} cx={x} cy={24 - i * 6} r="1.8" fill={GOLD} className="rocky-twinkle" style={{ animationDelay: `${i * 0.4}s` }} />
        ))}
      </>
    ),
  },
};
// ---------------------------------------------------------------------------
// Foods and soaps (40x40)
// ---------------------------------------------------------------------------
export const FOURTH_FOOD_ART: Record<string, ReactElement> = {
  "food-empanada": (
    <>
      <path d="M6 28 C6 14 16 8 20 8 C24 8 34 14 34 28 Z" fill="#f2b04a" />
      <path d="M6 28 L34 28" stroke="#c97b1e" strokeWidth="2" />
      {[9, 13, 17, 21, 25, 29].map((x) => (
        <path key={x} d={`M${x} 28 l2 3 l2 -3`} stroke="#c97b1e" strokeWidth="1.6" fill="none" />
      ))}
      <ellipse cx="16" cy="18" rx="4" ry="2" fill="#fff" opacity="0.35" />
      <circle cx="31" cy="12" r="3.5" fill="#fde047" stroke="#16a34a" strokeWidth="1.4" />
    </>
  ),
  "food-mango": (
    <>
      <path d="M12 12 C22 4 34 12 32 24 C30 34 18 36 12 30 C6 24 6 16 12 12 Z" fill="#fbbf24" />
      <path d="M12 12 C18 10 22 14 22 20 C22 26 16 30 12 30 C6 24 6 16 12 12 Z" fill="#f97316" opacity="0.7" />
      <path d="M22 8 C24 4 28 3 30 4" stroke="#6b4423" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M24 7 C28 2 34 4 34 8 C30 10 26 10 24 7 Z" fill="#16a34a" />
      <ellipse cx="26" cy="16" rx="2.5" ry="4" fill="#fff" opacity="0.35" />
    </>
  ),
  "food-lulo-juice": (
    <>
      <path d="M11 10 L29 10 L26 36 L14 36 Z" fill="#fef3c7" stroke="#cbd5e1" strokeWidth="1.5" />
      <path d="M12.5 17 L27.5 17 L26 34 L14 34 Z" fill="#a3e635" />
      <rect x="22" y="2" width="2.4" height="20" rx="1" fill="#e2445c" transform="rotate(12 23 12)" />
      <circle cx="29" cy="12" r="5" fill="#fbbf24" stroke="#16a34a" strokeWidth="1.2" />
      <path d="M26 12 L32 12 M29 9 L29 15" stroke="#16a34a" strokeWidth="0.8" />
      {[17, 21, 24].map((x, i) => (
        <circle key={x} cx={x} cy={22 + i * 4} r="1" fill="#3f6212" />
      ))}
    </>
  ),
};

/** A soap bar in its own colour, with a little shine. */
const soapBar = (color: string, stripe: string, extra?: ReactElement) => (
  <>
    <circle cx="30" cy="9" r="4" fill="#fff" stroke="#bcd9ef" strokeWidth="1" opacity="0.9" />
    <circle cx="34" cy="16" r="2.4" fill="#fff" stroke="#bcd9ef" strokeWidth="1" opacity="0.9" />
    <rect x="5" y="15" width="28" height="18" rx="7" fill={color} />
    <rect x="5" y="15" width="28" height="18" rx="7" fill="none" stroke={stripe} strokeWidth="1.5" />
    <rect x="10" y="19" width="12" height="3" rx="1.5" fill="#fff" opacity="0.6" />
    {extra}
  </>
);

export const FOURTH_SOAP_ART: Record<string, ReactElement> = {
  "soap-coconut": soapBar("#f8f4ec", "#8a5a3a", <circle cx="25" cy="27" r="3.4" fill="#8a5a3a" />),
  "soap-ocean": soapBar("#7dd3fc", "#0284c7", <path d="M8 28 q4 -3 8 0 t8 0 t8 0" stroke="#0369a1" strokeWidth="1.4" fill="none" />),
  "soap-honey": soapBar("#fcd34d", "#b45309", <path d="M20 24 l3 2 v3 l-3 2 l-3 -2 v-3 Z" fill="none" stroke="#b45309" strokeWidth="1.2" />),
};

// ---------------------------------------------------------------------------
// Spooky season additions (so every kind has a Halloween option)
// ---------------------------------------------------------------------------
export const SPOOKY_GLASSES: Record<string, ReactElement> = {
  "glasses-skull": (
    <>
      {pair(
        <>
          <path d="M10 8 C10 4 40 4 40 8 L40 26 C40 34 10 34 10 26 Z" fill={INK} />
          <circle cx="25" cy="18" r="7" fill="#f8fafc" />
          <circle cx="23" cy="16" r="2.4" fill={INK} />
          <circle cx="27.5" cy="16" r="2.4" fill={INK} />
          <path d="M22 21 L28 21" stroke={INK} strokeWidth="1.2" />
        </>,
      )}
      <path d="M40 14 C46 10 54 10 60 14" stroke={INK} strokeWidth="3" fill="none" />
    </>
  ),
  "glasses-bat": (
    <>
      <path
        d="M50 14 C44 6 36 4 30 8 C26 2 16 2 10 6 C12 10 8 14 2 14 C8 20 6 28 12 32 C18 28 24 30 28 34 C34 30 42 30 50 34 C58 30 66 30 72 34 C76 30 82 28 88 32 C94 28 92 20 98 14 C92 14 88 10 90 6 C84 2 74 2 70 8 C64 4 56 6 50 14 Z"
        fill="#1e1b2e"
      />
      {pair(<ellipse cx="27" cy="20" rx="9" ry="6" fill="#fbbf24" className="rocky-pulse" />)}
      {pair(<ellipse cx="27" cy="20" rx="3" ry="5" fill={INK} />)}
    </>
  ),
};

export const SPOOKY_NECK: Record<string, ReactElement> = {
  "neck-bone": (
    <>
      <path d="M14 4 C20 34 80 34 86 4" stroke="#57534e" strokeWidth="2" fill="none" />
      {[0.2, 0.35, 0.65, 0.8].map((t) => (
        <circle key={t} cx={14 + 72 * t} cy={4 + 120 * t * (1 - t) * 0.95} r="3.4" fill="#e7e5e4" stroke="#a8a29e" strokeWidth="1" />
      ))}
      <g transform="translate(50 44) rotate(-20)">
        <rect x="-12" y="-3.5" width="24" height="7" rx="3" fill="#f5f5f4" />
        {[-12, 12].map((x) => (
          <g key={x}>
            <circle cx={x} cy="-4" r="4.6" fill="#f5f5f4" />
            <circle cx={x} cy="4" r="4.6" fill="#f5f5f4" />
          </g>
        ))}
      </g>
    </>
  ),
};

export const SPOOKY_SOAP_ART: Record<string, ReactElement> = {
  "soap-midnight": soapBar("#6d28d9", "#3b0764", <path d="M24 22 a5 5 0 1 0 4 7 a4 4 0 1 1 -4 -7 Z" fill="#fde68a" />),
};
