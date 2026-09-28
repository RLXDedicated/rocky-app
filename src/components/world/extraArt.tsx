// The second wave of shop art: wing sets, more hats, glasses and neckwear,
// and a much bigger Spooky / Holidays range. Same boxes as the originals
// (hats 100x60 with the brim at the bottom; glasses 100x40 with the lenses
// at (25,20) and (75,20); neck 100x70 with the knot at the top centre;
// back 100x120 drawn behind Rocky) so every item reuses the measured rig.
// Merged into HAT_ART / WEAR_ART / DECOR_ART, so nothing else changes.
import type { ReactElement } from "react";
import type { DecorArt, HatArt } from "./art";

const NAVY = "#0f2341";
const GOLD = "#f5b82e";
const WHITE = "#ffffff";

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
export const EXTRA_HATS: Record<string, HatArt> = {
  "hat-top": {
    width: 0.66,
    sink: 0.34,
    svg: (
      <>
        <rect x="24" y="2" width="52" height="46" rx="4" fill="#1b1b24" />
        <rect x="24" y="34" width="52" height="9" fill="#c9352b" />
        <ellipse cx="50" cy="52" rx="48" ry="7" fill="#1b1b24" />
        <path
          d="M30 6 L30 30"
          stroke="#3a3a48"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </>
    ),
  },
  "hat-viking": {
    width: 1.2,
    sink: 0.42,
    svg: (
      <>
        {pair(
          <path
            d="M28 40 C16 38 8 28 6 10 C14 18 22 22 32 26 Z"
            fill="#f4ead2"
            stroke="#c9b58a"
            strokeWidth="2"
          />,
        )}
        <path
          d="M26 54 C26 24 38 14 50 14 C62 14 74 24 74 54 Z"
          fill="#9aa4b1"
        />
        <path d="M50 14 L50 54" stroke="#7b8594" strokeWidth="5" />
        <rect x="22" y="48" width="56" height="9" rx="3" fill="#b88650" />
        {[30, 42, 58, 70].map((x) => (
          <circle key={x} cx={x} cy="52.5" r="1.8" fill={GOLD} />
        ))}
      </>
    ),
  },
  "hat-pirate": {
    width: 1.0,
    sink: 0.38,
    svg: (
      <>
        <path
          d="M4 50 C16 30 30 18 50 16 C70 18 84 30 96 50 C80 42 64 44 50 50 C36 44 20 42 4 50 Z"
          fill="#1b1b24"
        />
        <path
          d="M4 50 C20 42 36 44 50 50 C64 44 80 42 96 50"
          stroke={GOLD}
          strokeWidth="3"
          fill="none"
        />
        <circle cx="50" cy="32" r="7" fill={WHITE} />
        <circle cx="47.5" cy="31" r="1.6" fill="#1b1b24" />
        <circle cx="52.5" cy="31" r="1.6" fill="#1b1b24" />
        <path
          d="M42 42 L58 36 M42 36 L58 42"
          stroke={WHITE}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </>
    ),
  },
  "hat-halo": {
    width: 0.74,
    sink: 0.02,
    svg: (
      <>
        <ellipse
          cx="50"
          cy="26"
          rx="42"
          ry="11"
          fill="none"
          stroke="#ffe27a"
          strokeWidth="9"
          opacity="0.35"
        />
        <ellipse
          cx="50"
          cy="26"
          rx="42"
          ry="11"
          fill="none"
          stroke={GOLD}
          strokeWidth="5"
        />
        <ellipse
          cx="50"
          cy="24"
          rx="40"
          ry="9"
          fill="none"
          stroke="#fff6c2"
          strokeWidth="1.6"
        />
        <path
          d="M14 10 L16 4 L18 10 L24 12 L18 14 L16 20 L14 14 L8 12 Z"
          fill="#fff6c2"
        />
      </>
    ),
  },
  "hat-bunny": {
    width: 0.9,
    sink: 0.46,
    svg: (
      <>
        {pair(
          <>
            <path
              d="M34 56 C22 44 16 20 22 4 C30 0 40 24 42 54 Z"
              fill={WHITE}
              stroke="#e3d6de"
              strokeWidth="2"
            />
            <path
              d="M34 50 C27 40 24 24 26 10 C31 12 36 30 38 50 Z"
              fill="#ffc6da"
            />
          </>,
        )}
        <path
          d="M20 58 C30 48 70 48 80 58"
          stroke="#ff8fb8"
          strokeWidth="5"
          fill="none"
          strokeLinecap="round"
        />
      </>
    ),
  },
  "hat-propeller": {
    width: 0.8,
    sink: 0.42,
    svg: (
      <>
        <path
          d="M14 50 C14 22 32 14 50 14 C68 14 86 22 86 50 Z"
          fill="#e2445c"
        />
        <path d="M14 50 C14 30 22 20 34 16 L50 14 L50 50 Z" fill="#f5b82e" />
        <path d="M50 14 L66 16 C78 20 86 30 86 50 L50 50 Z" fill="#4aa3ff" />
        <rect x="10" y="46" width="80" height="8" rx="4" fill={NAVY} />
        <rect x="48" y="4" width="4" height="11" fill={NAVY} />
        <g
          className="rocky-spin"
          style={{ transformOrigin: "50px 5px", transformBox: "view-box" }}
        >
          <ellipse cx="34" cy="5" rx="16" ry="3.5" fill="#1fbf68" />
          <ellipse cx="66" cy="5" rx="16" ry="3.5" fill="#e2445c" />
        </g>
        <circle cx="50" cy="5" r="3" fill={GOLD} />
      </>
    ),
  },
  "hat-beret": {
    width: 0.86,
    sink: 0.42,
    svg: (
      <>
        <path
          d="M6 44 C4 24 30 12 56 14 C82 16 98 30 90 44 C80 54 20 54 6 44 Z"
          fill="#c9352b"
        />
        <path
          d="M14 46 C30 52 70 52 86 46 L84 52 C70 58 30 58 16 52 Z"
          fill="#9e2620"
        />
        <path
          d="M54 14 L58 6"
          stroke="#9e2620"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </>
    ),
  },
  "hat-tiara": {
    width: 0.6,
    sink: 0.3,
    svg: (
      <>
        <path
          d="M6 56 C20 50 80 50 94 56"
          stroke="#d6dbe6"
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M18 52 L26 34 L36 46 L50 20 L64 46 L74 34 L82 52"
          stroke="#d6dbe6"
          strokeWidth="5"
          fill="none"
          strokeLinejoin="round"
        />
        <path d="M50 20 L55 32 L50 42 L45 32 Z" fill="#ff8fb8" />
        <circle cx="26" cy="36" r="4" fill="#9fc6e8" />
        <circle cx="74" cy="36" r="4" fill="#9fc6e8" />
        <circle cx="50" cy="16" r="3" fill={WHITE} />
      </>
    ),
  },
  "hat-astronaut": {
    width: 1.12,
    sink: 0.62,
    svg: (
      <>
        <path
          d="M8 60 C8 20 28 2 50 2 C72 2 92 20 92 60"
          fill="rgba(210,235,255,0.35)"
          stroke="#e9eef5"
          strokeWidth="6"
        />
        <path
          d="M22 22 C28 14 36 10 44 9"
          stroke={WHITE}
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
          opacity="0.8"
        />
        <rect x="4" y="52" width="92" height="8" rx="4" fill="#c7d0dc" />
        <rect x="80" y="18" width="8" height="18" rx="3" fill="#e2445c" />
      </>
    ),
  },
  // Spooky
  "hat-spider": {
    width: 0.9,
    sink: 0.44,
    svg: (
      <>
        <path
          d="M14 58 C22 44 78 44 86 58"
          stroke="#2a1f3d"
          strokeWidth="5"
          fill="none"
          strokeLinecap="round"
        />
        <path d="M50 46 L50 30" stroke="#2a1f3d" strokeWidth="2" />
        {pair(
          <path
            d="M44 28 C36 20 30 22 26 30 M44 32 C34 30 28 34 26 42 M45 24 C40 12 32 12 28 16"
            stroke="#2a1f3d"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />,
        )}
        <ellipse cx="50" cy="26" rx="10" ry="9" fill="#2a1f3d" />
        <circle cx="46" cy="24" r="2.2" fill="#f28c28" />
        <circle cx="54" cy="24" r="2.2" fill="#f28c28" />
      </>
    ),
  },
  "hat-mummy": {
    width: 0.86,
    sink: 0.48,
    svg: (
      <>
        <path
          d="M12 58 C12 22 30 10 50 10 C70 10 88 22 88 58 Z"
          fill="#efe7d4"
        />
        {[
          "M12 50 C40 42 60 56 88 46",
          "M14 38 C40 30 64 44 86 34",
          "M22 26 C44 20 62 30 80 22",
          "M34 15 C46 12 58 16 68 13",
        ].map((d) => (
          <path key={d} d={d} stroke="#cfc4a8" strokeWidth="3" fill="none" />
        ))}
        <path
          d="M84 46 C92 50 96 56 94 60"
          stroke="#efe7d4"
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
        />
      </>
    ),
  },
  "hat-bolts": {
    width: 1.18,
    sink: 0.5,
    svg: (
      <>
        <path
          d="M12 56 C22 40 78 40 88 56"
          stroke="#3d5e3a"
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
        />
        {pair(
          <>
            <rect
              x="0"
              y="42"
              width="16"
              height="14"
              rx="3"
              fill="#9aa4b1"
              stroke="#5c6572"
              strokeWidth="2"
            />
            <rect x="14" y="46" width="8" height="6" fill="#5c6572" />
            <path
              d="M6 36 L2 30 M8 34 L10 28"
              stroke="#ffe27a"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </>,
        )}
      </>
    ),
  },
  // Holidays
  "hat-pompom": {
    width: 0.82,
    sink: 0.46,
    svg: (
      <>
        <circle cx="50" cy="9" r="9" fill={WHITE} />
        <path
          d="M14 50 C14 22 30 14 50 14 C70 14 86 22 86 50 Z"
          fill="#d6333a"
        />
        {[24, 36].map((y) => (
          <path
            key={y}
            d={`M16 ${y} L84 ${y}`}
            stroke={WHITE}
            strokeWidth="3"
            strokeDasharray="6 5"
          />
        ))}
        <rect x="10" y="42" width="80" height="14" rx="6" fill={WHITE} />
        <path
          d="M18 49 L82 49"
          stroke="#1f9d55"
          strokeWidth="3"
          strokeDasharray="4 4"
        />
      </>
    ),
  },
  "hat-earmuffs": {
    width: 1.08,
    sink: 0.62,
    svg: (
      <>
        <path
          d="M12 44 C12 0 88 0 88 44"
          stroke="#c9463d"
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
        />
        {pair(
          <>
            <circle cx="12" cy="46" r="12" fill={WHITE} />
            <circle cx="12" cy="46" r="7" fill="#f3e6f0" />
          </>,
        )}
      </>
    ),
  },
  "hat-star-band": {
    width: 0.8,
    sink: 0.44,
    svg: (
      <>
        <path
          d="M14 58 C22 44 78 44 86 58"
          stroke="#1f9d55"
          strokeWidth="5"
          fill="none"
          strokeLinecap="round"
        />
        {pair(
          <path
            d="M34 46 C30 34 26 24 24 16"
            stroke="#1f9d55"
            strokeWidth="2.5"
            fill="none"
          />,
        )}
        <polygon
          points="50,6 54,17 66,17 56,24 60,35 50,28 40,35 44,24 34,17 46,17"
          fill={GOLD}
          stroke="#e0a21a"
          strokeWidth="1.5"
        />
        {pair(
          <polygon
            points="24,6 26.5,12 33,12 28,16 30,22 24,18 18,22 20,16 15,12 21.5,12"
            fill={GOLD}
          />,
        )}
      </>
    ),
  },
  "hat-new-year": {
    width: 0.66,
    sink: 0.3,
    svg: (
      <>
        <rect x="24" y="8" width="52" height="42" rx="4" fill="#1b1b24" />
        <rect x="24" y="36" width="52" height="7" fill={GOLD} />
        <ellipse cx="50" cy="52" rx="46" ry="6" fill="#1b1b24" />
        {[
          [30, 18],
          [44, 26],
          [62, 14],
          [68, 28],
        ].map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="2" fill={GOLD} />
        ))}
        <path
          d="M60 8 C64 0 72 0 74 4"
          stroke={GOLD}
          strokeWidth="2"
          fill="none"
        />
      </>
    ),
  },
};

// ---------------------------------------------------------------------------
// Glasses (100x40)
// ---------------------------------------------------------------------------
export const EXTRA_GLASSES: Record<string, ReactElement> = {
  "glasses-aviator": (
    <>
      {pair(
        <path
          d="M8 12 C18 8 36 8 42 12 C44 24 36 34 24 34 C12 34 6 24 8 12 Z"
          fill="#6a7d91"
          opacity="0.85"
          stroke="#c9a14a"
          strokeWidth="2.5"
        />,
      )}
      <path
        d="M42 12 L58 12 M40 8 Q50 4 60 8"
        stroke="#c9a14a"
        strokeWidth="2.5"
        fill="none"
      />
      <path d="M8 12 L0 10 M92 12 L100 10" stroke="#c9a14a" strokeWidth="2.5" />
      {pair(
        <path
          d="M14 16 L22 14"
          stroke={WHITE}
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.7"
        />,
      )}
    </>
  ),
  "glasses-monocle": (
    <>
      <circle
        cx="75"
        cy="20"
        r="15"
        fill="#dff1ff"
        opacity="0.35"
        stroke={GOLD}
        strokeWidth="3.5"
      />
      <path
        d="M68 12 L73 10"
        stroke={WHITE}
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.8"
      />
      <path
        d="M86 32 C92 44 80 60 70 70"
        stroke={GOLD}
        strokeWidth="1.5"
        fill="none"
      />
    </>
  ),
  "glasses-nerd": (
    <>
      {pair(
        <rect
          x="8"
          y="6"
          width="34"
          height="28"
          rx="6"
          fill="#dff1ff"
          opacity="0.3"
          stroke="#1b1b24"
          strokeWidth="5"
        />,
      )}
      <path d="M42 16 L58 16" stroke="#1b1b24" strokeWidth="4" />
      <rect
        x="46"
        y="12"
        width="8"
        height="8"
        fill={WHITE}
        stroke="#d0d6de"
        strokeWidth="1"
      />
      <path d="M8 14 L0 12 M92 14 L100 12" stroke="#1b1b24" strokeWidth="4" />
    </>
  ),
  "glasses-cat-eye": (
    <>
      {pair(
        <path
          d="M4 8 C16 12 34 10 44 14 C44 28 36 34 24 34 C12 34 6 26 4 8 Z"
          fill="#2a1f3d"
          opacity="0.85"
          stroke="#7a4fd1"
          strokeWidth="2.5"
        />,
      )}
      <path
        d="M44 16 Q50 12 56 16"
        stroke="#7a4fd1"
        strokeWidth="2.5"
        fill="none"
      />
      {pair(<circle cx="24" cy="22" r="3.5" fill="#f28c28" />)}
    </>
  ),
  "glasses-star-gold": (
    <>
      {pair(
        <polygon
          points="25,2 30,13 42,14 33,22 36,34 25,28 14,34 17,22 8,14 20,13"
          fill="#fff3c9"
          opacity="0.6"
          stroke={GOLD}
          strokeWidth="3"
          strokeLinejoin="round"
        />,
      )}
      <path d="M40 18 Q50 13 60 18" stroke={GOLD} strokeWidth="3" fill="none" />
    </>
  ),
};

// ---------------------------------------------------------------------------
// Neck (100x70, knot at the top centre)
// ---------------------------------------------------------------------------
export const EXTRA_NECK: Record<string, ReactElement> = {
  "neck-pearls": (
    <>
      {Array.from({ length: 11 }, (_, i) => {
        const t = i / 10;
        const x = 18 + t * 64;
        const y = 4 + Math.sin(t * Math.PI) * 30;
        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            r="5"
            fill="#fbf6ee"
            stroke="#d9cfc0"
            strokeWidth="1.2"
          />
        );
      })}
    </>
  ),
  "neck-lei": (
    <>
      {Array.from({ length: 12 }, (_, i) => {
        const t = i / 11;
        const x = 12 + t * 76;
        const y = 2 + Math.sin(t * Math.PI) * 34;
        const c = ["#ff6b8a", "#f5b82e", "#ff9ecb", "#ffd166"][i % 4];
        return (
          <g key={i} transform={`translate(${x} ${y})`}>
            {[0, 72, 144, 216, 288].map((a) => (
              <ellipse
                key={a}
                cx="0"
                cy="-4"
                rx="3"
                ry="4.5"
                fill={c}
                transform={`rotate(${a})`}
              />
            ))}
            <circle r="2" fill="#fff3c9" />
          </g>
        );
      })}
    </>
  ),
  "neck-chain": (
    <>
      <path
        d="M18 2 C24 36 76 36 82 2"
        stroke={GOLD}
        strokeWidth="5"
        fill="none"
        strokeDasharray="5 2"
      />
      <circle
        cx="50"
        cy="42"
        r="12"
        fill={GOLD}
        stroke="#c07a0c"
        strokeWidth="2.5"
      />
      <text
        x="42.5"
        y="47"
        fontFamily="Poppins, sans-serif"
        fontWeight="800"
        fontSize="13"
        fill="#8a5a00"
      >
        R
      </text>
    </>
  ),
  "neck-vampire": (
    <>
      {pair(
        <path
          d="M50 14 L10 -4 L4 30 C18 22 34 22 50 26 Z"
          fill="#1b1b24"
          stroke="#c9352b"
          strokeWidth="2"
        />,
      )}
      <circle
        cx="50"
        cy="20"
        r="6"
        fill="#c9352b"
        stroke={GOLD}
        strokeWidth="2"
      />
    </>
  ),
  "neck-candy-corn": (
    <>
      <path
        d="M16 2 C24 34 76 34 84 2"
        stroke="#3a2a1e"
        strokeWidth="2"
        fill="none"
      />
      {[0.2, 0.4, 0.6, 0.8].map((t) => {
        const x = 16 + t * 68;
        const y = 2 + Math.sin(t * Math.PI) * 24;
        return (
          <g key={t} transform={`translate(${x} ${y})`}>
            <path d="M-6 0 L6 0 L0 14 Z" fill="#fff6e0" />
            <path d="M-6 0 L6 0 L4 5 L-4 5 Z" fill="#f5b82e" />
            <path d="M-4 5 L4 5 L2 10 L-2 10 Z" fill="#f28c28" />
          </g>
        );
      })}
    </>
  ),
  "neck-holly": (
    <>
      {pair(
        <path
          d="M50 14 C40 2 26 4 20 10 C26 12 28 18 26 22 C32 20 38 22 40 28 C42 22 46 18 50 14 Z"
          fill="#1f9d55"
          stroke="#12663a"
          strokeWidth="1.5"
        />,
      )}
      <circle cx="46" cy="16" r="5" fill="#d6333a" />
      <circle cx="54" cy="16" r="5" fill="#d6333a" />
      <circle cx="50" cy="10" r="5" fill="#e2445c" />
    </>
  ),
  "neck-lights": (
    <>
      <path
        d="M14 2 C22 36 78 36 86 2"
        stroke="#1b3358"
        strokeWidth="2"
        fill="none"
      />
      {Array.from({ length: 7 }, (_, i) => {
        const t = (i + 0.5) / 7;
        const x = 14 + t * 72;
        const y = 2 + Math.sin(t * Math.PI) * 26;
        const c = ["#e2445c", "#f5b82e", "#1fbf68", "#4aa3ff"][i % 4];
        return (
          <ellipse
            key={i}
            className="rocky-blink"
            cx={x}
            cy={y + 5}
            rx="3.5"
            ry="5"
            fill={c}
            style={{ animationDelay: `${i * 0.3}s` }}
          />
        );
      })}
    </>
  ),
};

// ---------------------------------------------------------------------------
// Back (100x120, behind Rocky) — the wing sets.
// ---------------------------------------------------------------------------
export const EXTRA_BACK: Record<string, ReactElement> = {
  "back-butterfly-wings": pair(
    <>
      <path
        d="M46 40 C30 6 4 0 2 22 C0 38 16 48 44 48 Z"
        fill="#f28c28"
        stroke="#3a2a1e"
        strokeWidth="2.5"
      />
      <path
        d="M44 52 C20 52 6 66 12 82 C18 96 36 86 46 58 Z"
        fill="#f5b82e"
        stroke="#3a2a1e"
        strokeWidth="2.5"
      />
      <circle cx="16" cy="20" r="5" fill={WHITE} />
      <circle cx="24" cy="72" r="4" fill={WHITE} />
      <path
        d="M44 42 C34 30 22 22 12 22 M44 56 C34 62 26 70 22 80"
        stroke="#3a2a1e"
        strokeWidth="1.6"
        fill="none"
      />
    </>,
  ),
  "back-fairy-wings": pair(
    <>
      <path
        d="M46 44 C34 14 10 -2 4 10 C0 24 20 42 46 50 Z"
        fill="rgba(190,230,255,0.55)"
        stroke="#9fd0f2"
        strokeWidth="2"
      />
      <path
        d="M46 54 C26 58 8 76 14 90 C20 100 40 84 46 60 Z"
        fill="rgba(255,200,235,0.55)"
        stroke="#f3a9d4"
        strokeWidth="2"
      />
      <path
        d="M44 46 C30 30 18 16 8 10 M44 58 C34 70 24 80 16 88"
        stroke={WHITE}
        strokeWidth="1.5"
        fill="none"
        opacity="0.9"
      />
      {[
        [14, 18],
        [24, 34],
        [20, 82],
      ].map(([x, y]) => (
        <circle
          key={`${x}-${y}`}
          className="rocky-twinkle"
          cx={x}
          cy={y}
          r="2"
          fill={WHITE}
        />
      ))}
    </>,
  ),
  "back-dragon-wings": pair(
    <>
      <path
        d="M46 30 L20 6 L2 20 C8 26 8 34 4 42 C12 40 16 46 14 54 C22 50 28 54 28 62 C34 56 40 56 46 62 Z"
        fill="#2f8f5b"
        stroke="#1d5e3a"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d="M46 30 L4 42 M46 34 L14 54 M46 40 L28 62"
        stroke="#1d5e3a"
        strokeWidth="2"
      />
      <path
        d="M20 6 L16 0"
        stroke="#e8dcc0"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </>,
  ),
  "back-phoenix-wings": pair(
    <>
      <path
        d="M46 36 C30 10 12 2 2 6 C10 12 12 18 8 24 C16 24 18 30 14 36 C22 36 26 42 22 50 C30 48 36 52 34 60 C40 54 44 50 46 50 Z"
        fill="#f28c28"
      />
      <path
        d="M46 40 C34 22 22 14 12 12 C18 18 18 24 16 28 C24 30 26 36 24 42 C32 42 36 48 36 54 C42 50 46 48 46 48 Z"
        fill="#f5b82e"
      />
      <path
        d="M46 44 C38 34 30 28 24 26 C28 32 28 36 28 40 C34 42 36 46 38 50 Z"
        fill="#fff3c9"
      />
    </>,
  ),
  "back-angel-gold": pair(
    <>
      <path
        d="M44 26 C30 4 8 2 3 20 C-1 32 4 40 12 42 C4 48 4 60 14 62 C8 70 12 82 24 80 C26 90 38 92 44 80 Z"
        fill="#fff3c9"
        stroke={GOLD}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d="M40 34 C30 26 18 26 12 30 M42 50 C32 44 22 46 16 52 M44 66 C36 62 30 64 24 70"
        stroke={GOLD}
        strokeWidth="2"
        fill="none"
      />
    </>,
  ),
  "back-jetpack": (
    <>
      {pair(
        <>
          <rect
            x="16"
            y="14"
            width="28"
            height="70"
            rx="12"
            fill="#c7d0dc"
            stroke="#8b96a6"
            strokeWidth="2.5"
          />
          <rect x="20" y="24" width="20" height="8" rx="3" fill="#e2445c" />
          <path d="M20 84 L40 84 L36 94 L24 94 Z" fill="#5c6572" />
          <path
            className="rocky-pulse"
            d="M24 96 C22 106 30 118 30 118 C30 118 38 106 36 96 Z"
            fill="#f5b82e"
            style={{ transformOrigin: "30px 96px" }}
          />
          <path
            d="M27 96 C26 102 30 110 30 110 C30 110 34 102 33 96 Z"
            fill="#fff3c9"
          />
        </>,
      )}
      <rect x="40" y="30" width="20" height="30" rx="4" fill="#8b96a6" />
      <text
        x="42.5"
        y="49"
        fontFamily="Poppins, sans-serif"
        fontWeight="800"
        fontSize="8"
        fill={WHITE}
      >
        RLX
      </text>
    </>
  ),
  "back-vampire-cape": (
    <>
      <path
        d="M14 4 Q50 16 86 4 L98 110 L78 100 L64 114 L50 102 L36 114 L22 100 L2 110 Z"
        fill="#1b1b24"
      />
      <path
        d="M18 6 Q50 16 82 6 L88 60 Q50 70 12 60 Z"
        fill="#9e2620"
        opacity="0.85"
      />
    </>
  ),
  "back-broom": (
    <>
      <path
        d="M4 108 L92 12"
        stroke="#8a5a2b"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path
        d="M14 94 L-2 118 L10 120 L22 116 L30 104 Z"
        fill="#d9b35e"
        stroke="#a88630"
        strokeWidth="2"
      />
      <path
        d="M12 100 L22 106 M8 106 L20 112"
        stroke="#a88630"
        strokeWidth="1.5"
      />
      <path d="M16 90 L28 100" stroke="#6b3b8c" strokeWidth="4" />
    </>
  ),
  "back-ice-wings": pair(
    <>
      <path
        d="M46 40 L26 2 L20 18 L6 10 L10 28 L0 32 L12 42 L4 56 L20 54 L18 70 L32 60 L36 76 L46 56 Z"
        fill="rgba(200,235,255,0.7)"
        stroke="#8fc7ef"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M46 44 L20 18 M46 46 L12 42 M46 50 L20 54 M46 52 L32 60"
        stroke={WHITE}
        strokeWidth="1.5"
      />
    </>,
  ),
  "back-gift-bow": (
    <>
      {pair(
        <path
          d="M50 30 C34 6 8 6 8 26 C8 42 30 44 50 34 Z"
          fill="#d6333a"
          stroke="#a8272e"
          strokeWidth="2.5"
        />,
      )}
      {pair(
        <path
          d="M48 36 L30 72 L40 70 L44 80 Z"
          fill="#d6333a"
          stroke="#a8272e"
          strokeWidth="2"
        />,
      )}
      <circle
        cx="50"
        cy="32"
        r="9"
        fill="#e2445c"
        stroke="#a8272e"
        strokeWidth="2.5"
      />
    </>
  ),
};

/** Back items' width relative to the face (wings spread past the body). */
export const EXTRA_BACK_WIDTH: Record<string, number> = {
  "back-butterfly-wings": 2.0,
  "back-fairy-wings": 2.0,
  "back-dragon-wings": 2.3,
  "back-phoenix-wings": 2.3,
  "back-angel-gold": 2.0,
  "back-jetpack": 1.3,
  "back-vampire-cape": 1.35,
  "back-broom": 1.5,
  "back-ice-wings": 2.1,
  "back-gift-bow": 1.3,
};

// ---------------------------------------------------------------------------
// Decor
// ---------------------------------------------------------------------------
const shadow = (cx: number, cy: number, rx: number) => (
  <ellipse cx={cx} cy={cy} rx={rx} ry="4" fill="#000" opacity="0.08" />
);

export const EXTRA_DECOR: Record<string, DecorArt> = {
  "decor-arcade": {
    play: "peek",
    viewBox: "0 0 80 120",
    left: 86,
    width: 8,
    svg: (
      <>
        {shadow(40, 116, 32)}
        <path d="M14 20 L66 20 L70 116 L10 116 Z" fill={NAVY} />
        <rect x="10" y="4" width="60" height="18" rx="4" fill="#e2445c" />
        <text
          x="17"
          y="17"
          fontFamily="Poppins, sans-serif"
          fontWeight="800"
          fontSize="10"
          fill={WHITE}
        >
          ROCKY
        </text>
        <rect x="18" y="28" width="44" height="34" rx="3" fill="#1d3a5c" />
        <rect
          className="rocky-blink"
          x="24"
          y="36"
          width="10"
          height="8"
          fill="#1fbf68"
        />
        <circle cx="48" cy="46" r="4" fill={GOLD} />
        <path d="M12 70 L68 70 L70 84 L10 84 Z" fill="#2a3f63" />
        <circle cx="28" cy="76" r="4" fill="#e2445c" />
        <circle cx="44" cy="77" r="3" fill="#4aa3ff" />
        <circle cx="54" cy="77" r="3" fill={GOLD} />
      </>
    ),
  },
  "decor-rocket": {
    play: "cheer",
    viewBox: "0 0 70 130",
    left: 14,
    width: 7,
    svg: (
      <>
        {shadow(35, 126, 26)}
        <path
          d="M35 4 C52 20 54 60 50 96 L20 96 C16 60 18 20 35 4 Z"
          fill="#e9eef5"
          stroke="#b9c3d0"
          strokeWidth="2"
        />
        <path
          d="M35 4 C42 10 46 18 48 28 L22 28 C24 18 28 10 35 4 Z"
          fill="#e2445c"
        />
        <circle
          cx="35"
          cy="50"
          r="9"
          fill="#4aa3ff"
          stroke="#b9c3d0"
          strokeWidth="3"
        />
        <path
          d="M20 76 L6 104 L20 98 Z M50 76 L64 104 L50 98 Z"
          fill="#e2445c"
        />
        <path
          className="rocky-pulse"
          d="M24 98 C24 112 35 124 35 124 C35 124 46 112 46 98 Z"
          fill={GOLD}
          style={{ transformOrigin: "35px 98px" }}
        />
      </>
    ),
  },
  "decor-flowerbed": {
    play: "sniff",
    viewBox: "0 0 130 70",
    left: 58,
    width: 12,
    svg: (
      <>
        {shadow(65, 66, 60)}
        <rect x="6" y="46" width="118" height="20" rx="4" fill="#8a5a2b" />
        <rect x="6" y="46" width="118" height="6" fill="#a8703a" />
        {[18, 36, 54, 72, 90, 108].map((x, i) => (
          <g key={x} className="rocky-sway" transform={`translate(${x} 0)`}>
            <path d="M0 46 L0 24" stroke="#1f9d55" strokeWidth="3" />
            <path d="M0 36 C-8 32 -8 28 -2 30" fill="#1fbf68" />
            {[0, 72, 144, 216, 288].map((a) => (
              <ellipse
                key={a}
                cx="0"
                cy="-6"
                rx="4"
                ry="6"
                fill={["#ff8fb8", "#f5b82e", "#b28dff"][i % 3]}
                transform={`translate(0 22) rotate(${a})`}
              />
            ))}
            <circle cx="0" cy="22" r="3.5" fill="#fff3c9" />
          </g>
        ))}
      </>
    ),
  },
  // Spooky
  "decor-black-cat": {
    play: "sniff",
    viewBox: "0 0 80 90",
    left: 70,
    width: 7,
    svg: (
      <>
        {shadow(40, 86, 26)}
        <path
          d="M58 80 C76 76 78 54 66 50"
          stroke="#1b1b24"
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
        />
        <ellipse cx="40" cy="66" rx="22" ry="20" fill="#1b1b24" />
        <circle cx="40" cy="36" r="17" fill="#1b1b24" />
        <path
          d="M26 28 L24 10 L36 22 Z M54 28 L56 10 L44 22 Z"
          fill="#1b1b24"
        />
        <ellipse cx="33" cy="36" rx="4" ry="5" fill="#b8f25a" />
        <ellipse cx="47" cy="36" rx="4" ry="5" fill="#b8f25a" />
        <ellipse cx="33" cy="36" rx="1.2" ry="4" fill="#1b1b24" />
        <ellipse cx="47" cy="36" rx="1.2" ry="4" fill="#1b1b24" />
        <path d="M38 44 L42 44 L40 46 Z" fill="#ff8fb8" />
        <path
          d="M22 56 C30 50 50 50 58 56"
          stroke="#f28c28"
          strokeWidth="4"
          fill="none"
        />
      </>
    ),
  },
  "decor-spider-web": {
    play: "peek",
    viewBox: "0 0 100 100",
    left: 84,
    width: 11,
    lift: 55,
    svg: (
      <>
        <g stroke="#e9e1ff" strokeWidth="1.4" fill="none" opacity="0.9">
          {[0, 30, 60, 90, 120, 150].map((a) => (
            <path
              key={a}
              d="M50 50 L50 2"
              transform={`rotate(${a * 2} 50 50)`}
            />
          ))}
          {[12, 24, 36, 46].map((r) => (
            <polygon
              key={r}
              points={Array.from({ length: 6 }, (_, i) => {
                const a = (i * 60 * Math.PI) / 180;
                return `${50 + Math.sin(a) * r},${50 - Math.cos(a) * r}`;
              }).join(" ")}
            />
          ))}
        </g>
        <g className="rocky-bob">
          <path d="M70 30 L70 62" stroke="#e9e1ff" strokeWidth="1" />
          <circle cx="70" cy="66" r="6" fill="#2a1f3d" />
          <path
            d="M64 62 L58 58 M64 66 L57 66 M64 70 L58 74 M76 62 L82 58 M76 66 L83 66 M76 70 L82 74"
            stroke="#2a1f3d"
            strokeWidth="1.8"
          />
          <circle cx="68" cy="65" r="1.2" fill={WHITE} />
          <circle cx="72" cy="65" r="1.2" fill={WHITE} />
        </g>
      </>
    ),
  },
  "decor-scarecrow": {
    play: "cheer",
    viewBox: "0 0 100 130",
    left: 22,
    width: 10,
    svg: (
      <>
        {shadow(50, 126, 30)}
        <rect x="47" y="40" width="6" height="86" fill="#8a5a2b" />
        <rect x="10" y="50" width="80" height="6" fill="#8a5a2b" />
        <path d="M30 50 L70 50 L66 96 L34 96 Z" fill="#4a7ab5" />
        <path
          d="M30 50 L20 70 M70 50 L80 70"
          stroke="#d9b35e"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <rect x="40" y="62" width="10" height="10" fill="#c9352b" />
        <circle cx="50" cy="34" r="15" fill="#e8c998" />
        <path d="M28 24 L72 24 L62 10 L38 10 Z" fill="#8a5a2b" />
        <rect x="24" y="22" width="52" height="5" rx="2" fill="#6b4423" />
        <path
          d="M43 32 L47 36 M47 32 L43 36 M53 32 L57 36 M57 32 L53 36"
          stroke="#3a2a1e"
          strokeWidth="2"
        />
        <path
          d="M42 42 C46 46 54 46 58 42"
          stroke="#3a2a1e"
          strokeWidth="2"
          fill="none"
        />
      </>
    ),
  },
  "decor-coffin-candy": {
    play: "eat",
    viewBox: "0 0 90 90",
    left: 44,
    width: 8,
    svg: (
      <>
        {shadow(45, 86, 34)}
        <path
          d="M30 20 L60 20 L74 40 L64 84 L26 84 L16 40 Z"
          fill="#6b3b8c"
          stroke="#3b2a5a"
          strokeWidth="3"
        />
        <path
          d="M40 38 L50 38 M45 32 L45 50"
          stroke="#f5b82e"
          strokeWidth="4"
          strokeLinecap="round"
        />
        {[
          [22, 18, "#f28c28"],
          [44, 10, "#1fbf68"],
          [62, 16, "#e2445c"],
        ].map(([x, y, c]) => (
          <rect
            key={`${x}`}
            x={x as number}
            y={y as number}
            width="12"
            height="8"
            rx="3"
            fill={c as string}
          />
        ))}
      </>
    ),
  },
  "decor-lantern-orange": {
    play: "sniff",
    viewBox: "0 0 60 100",
    left: 92,
    width: 5,
    svg: (
      <>
        {shadow(30, 96, 20)}
        <path d="M30 2 L30 12" stroke="#3a2a1e" strokeWidth="3" />
        <rect x="16" y="12" width="28" height="8" rx="2" fill="#3a2a1e" />
        <rect
          className="rocky-pulse"
          x="14"
          y="20"
          width="32"
          height="56"
          rx="10"
          fill="#f28c28"
          style={{ transformOrigin: "30px 48px" }}
        />
        <path
          d="M22 24 L22 72 M30 22 L30 74 M38 24 L38 72"
          stroke="#c75c14"
          strokeWidth="2"
        />
        <rect x="16" y="76" width="28" height="8" rx="2" fill="#3a2a1e" />
        <rect x="24" y="84" width="12" height="12" fill="#3a2a1e" />
      </>
    ),
  },
  // Holidays
  "decor-gingerbread-house": {
    play: "eat",
    viewBox: "0 0 110 100",
    left: 72,
    width: 11,
    svg: (
      <>
        {shadow(55, 96, 50)}
        <rect x="16" y="46" width="78" height="50" fill="#b86b35" />
        <path d="M6 50 L55 8 L104 50 Z" fill="#8a4a22" />
        <path
          d="M6 50 L55 8 L104 50"
          stroke={WHITE}
          strokeWidth="5"
          fill="none"
          strokeLinejoin="round"
          strokeDasharray="7 4"
        />
        <rect x="46" y="64" width="18" height="32" rx="9" fill="#6b3b1e" />
        <rect
          x="24"
          y="58"
          width="14"
          height="14"
          fill="#fff3c9"
          stroke={WHITE}
          strokeWidth="2"
        />
        <rect
          x="72"
          y="58"
          width="14"
          height="14"
          fill="#fff3c9"
          stroke={WHITE}
          strokeWidth="2"
        />
        {[22, 40, 58, 76].map((x, i) => (
          <circle
            key={x}
            cx={x + 6}
            cy="90"
            r="3"
            fill={["#e2445c", "#1fbf68", GOLD, "#4aa3ff"][i]}
          />
        ))}
        <path
          d="M44 30 C50 26 60 26 66 30"
          stroke={WHITE}
          strokeWidth="3"
          fill="none"
        />
      </>
    ),
  },
  "decor-stocking": {
    play: "peek",
    viewBox: "0 0 60 90",
    left: 60,
    width: 5,
    lift: 50,
    svg: (
      <>
        <path
          d="M14 14 L42 14 L42 56 C42 70 36 80 22 82 C10 84 4 76 8 68 C12 62 18 60 14 54 Z"
          fill="#d6333a"
        />
        <rect x="10" y="4" width="36" height="14" rx="4" fill={WHITE} />
        <path
          d="M18 34 L38 34 M18 46 L38 46"
          stroke={WHITE}
          strokeWidth="3"
          strokeDasharray="4 3"
        />
        <rect
          x="30"
          y="0"
          width="10"
          height="10"
          rx="2"
          fill="#1f9d55"
          transform="rotate(12 35 5)"
        />
      </>
    ),
  },
  "decor-nutcracker": {
    play: "cheer",
    viewBox: "0 0 60 130",
    left: 12,
    width: 6,
    svg: (
      <>
        {shadow(30, 126, 22)}
        <rect x="18" y="6" width="24" height="22" rx="3" fill="#1b1b24" />
        <rect x="18" y="24" width="24" height="4" fill={GOLD} />
        <rect x="20" y="28" width="20" height="20" rx="3" fill="#f2d4b4" />
        <circle cx="26" cy="36" r="2" fill="#1b1b24" />
        <circle cx="34" cy="36" r="2" fill="#1b1b24" />
        <rect x="22" y="42" width="16" height="6" fill={WHITE} />
        <rect x="16" y="48" width="28" height="36" rx="4" fill="#d6333a" />
        <path d="M30 48 L30 84" stroke={GOLD} strokeWidth="3" />
        <rect x="16" y="78" width="28" height="6" fill="#1b1b24" />
        <rect x="18" y="84" width="10" height="36" fill="#1f4f9c" />
        <rect x="32" y="84" width="10" height="36" fill="#1f4f9c" />
        <rect x="16" y="116" width="28" height="8" rx="2" fill="#1b1b24" />
      </>
    ),
  },
  "decor-snow-globe": {
    play: "peek",
    viewBox: "0 0 80 90",
    left: 36,
    width: 7,
    svg: (
      <>
        {shadow(40, 86, 30)}
        <circle
          cx="40"
          cy="40"
          r="32"
          fill="rgba(210,235,255,0.55)"
          stroke="#bcd9ef"
          strokeWidth="2"
        />
        <path d="M12 52 C24 46 56 46 68 52 C62 64 18 64 12 52 Z" fill={WHITE} />
        <path d="M40 22 L28 50 L52 50 Z" fill="#1f9d55" />
        <polygon
          points="40,16 42,21 47,21 43,24 45,29 40,26 35,29 37,24 33,21 38,21"
          fill={GOLD}
        />
        {[
          [24, 28],
          [56, 24],
          [50, 40],
          [28, 42],
          [44, 32],
        ].map(([x, y]) => (
          <circle
            key={`${x}-${y}`}
            className="rocky-twinkle"
            cx={x}
            cy={y}
            r="1.8"
            fill={WHITE}
          />
        ))}
        <path d="M14 70 L66 70 L60 86 L20 86 Z" fill="#8a4a22" />
        <path
          d="M24 16 C28 12 34 10 38 10"
          stroke={WHITE}
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
          opacity="0.8"
        />
      </>
    ),
  },
  "decor-reindeer-plush": {
    play: "rest",
    viewBox: "0 0 90 90",
    left: 50,
    width: 8,
    svg: (
      <>
        {shadow(45, 86, 30)}
        <path
          d="M30 18 C26 8 20 6 16 2 M26 12 C22 12 18 10 16 8 M60 18 C64 8 70 6 74 2 M64 12 C68 12 72 10 74 8"
          stroke="#8a5a2b"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
        />
        <ellipse cx="45" cy="66" rx="26" ry="20" fill="#a8703a" />
        <circle cx="45" cy="36" r="18" fill="#b8804a" />
        <ellipse cx="45" cy="44" rx="10" ry="7" fill="#e8c998" />
        <circle cx="45" cy="42" r="5" fill="#e2445c" />
        <circle cx="38" cy="32" r="2.5" fill="#1b1b24" />
        <circle cx="52" cy="32" r="2.5" fill="#1b1b24" />
        <path
          d="M30 56 C38 60 52 60 60 56"
          stroke="#1f9d55"
          strokeWidth="5"
          fill="none"
          strokeLinecap="round"
        />
      </>
    ),
  },
  "decor-fireplace": {
    play: "nap",
    viewBox: "0 0 140 110",
    left: 80,
    width: 14,
    svg: (
      <>
        {shadow(70, 106, 64)}
        <rect x="10" y="20" width="120" height="86" fill="#b2533d" />
        {[34, 52, 70, 88].map((y) => (
          <path
            key={y}
            d={`M10 ${y} L130 ${y}`}
            stroke="#8e3f2d"
            strokeWidth="2"
          />
        ))}
        <rect x="2" y="12" width="136" height="12" rx="3" fill="#6b4423" />
        <path
          d="M40 106 L40 60 C40 44 100 44 100 60 L100 106 Z"
          fill="#1b1b24"
        />
        <g className="rocky-pulse" style={{ transformOrigin: "70px 100px" }}>
          <path
            d="M54 100 C50 86 60 80 58 68 C66 76 70 70 70 60 C80 72 90 82 84 100 Z"
            fill="#f28c28"
          />
          <path
            d="M62 100 C60 92 66 88 66 80 C72 86 78 92 76 100 Z"
            fill="#f5b82e"
          />
        </g>
        <rect x="46" y="98" width="48" height="6" rx="3" fill="#6b4423" />
        {[24, 112].map((x) => (
          <g key={x}>
            <path
              d={`M${x - 6} 24 L${x + 6} 24 L${x + 6} 40 C${x + 6} 48 ${x - 2} 50 ${x - 6} 46 Z`}
              fill="#d6333a"
            />
            <rect x={x - 7} y="22" width="14" height="5" fill={WHITE} />
          </g>
        ))}
      </>
    ),
  },
};

// ---------------------------------------------------------------------------
// Pantry (viewBox 0 0 40 40, like items.tsx)
// ---------------------------------------------------------------------------
export const EXTRA_FOOD_ART: Record<string, ReactElement> = {
  "food-arepa-huevo": (
    <>
      <ellipse cx="20" cy="22" rx="15" ry="12" fill="#e8b45c" />
      <ellipse
        cx="20"
        cy="22"
        rx="15"
        ry="12"
        fill="none"
        stroke="#c98b3a"
        strokeWidth="1.5"
      />
      <path
        d="M8 18 C12 12 28 12 32 18"
        stroke="#f5d38a"
        strokeWidth="2"
        fill="none"
      />
      <circle cx="14" cy="24" r="1.2" fill="#b0702a" />
      <circle cx="25" cy="27" r="1.2" fill="#b0702a" />
      <circle cx="22" cy="19" r="1" fill="#b0702a" />
      <path
        d="M27 11 C29 8 33 8 34 11"
        stroke="#f5b82e"
        strokeWidth="1.5"
        fill="none"
      />
    </>
  ),
  "food-ghost-cookie": (
    <>
      <path
        d="M8 18 C8 4 32 4 32 18 L32 34 L27 30 L22 35 L18 30 L13 35 L8 32 Z"
        fill="#fbf6ee"
        stroke="#e3d6c6"
        strokeWidth="1.5"
      />
      <ellipse cx="16" cy="18" rx="2.5" ry="3.5" fill="#2a1f3d" />
      <ellipse cx="24" cy="18" rx="2.5" ry="3.5" fill="#2a1f3d" />
      <ellipse cx="20" cy="25" rx="2.5" ry="2" fill="#2a1f3d" />
    </>
  ),
  "food-witch-brew": (
    <>
      <path d="M8 16 L32 16 L29 34 L11 34 Z" fill="#6b3b8c" />
      <ellipse cx="20" cy="16" rx="12" ry="3.5" fill="#8fe36a" />
      <circle
        className="rocky-twinkle"
        cx="16"
        cy="10"
        r="2.5"
        fill="#b8f25a"
      />
      <circle className="rocky-twinkle" cx="24" cy="7" r="1.8" fill="#b8f25a" />
      <path
        d="M26 16 L30 4"
        stroke="#e8dcc0"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </>
  ),
  "food-bunuelos": (
    <>
      <circle cx="14" cy="24" r="9" fill="#d99a3e" />
      <circle cx="26" cy="22" r="9" fill="#e6a94a" />
      <circle cx="20" cy="13" r="8" fill="#f0b85a" />
      <circle cx="17" cy="10" r="2.5" fill="#fff3c9" opacity="0.6" />
      <circle cx="23" cy="19" r="2" fill="#fff3c9" opacity="0.5" />
    </>
  ),
  "food-natilla": (
    <>
      <rect
        x="6"
        y="22"
        width="28"
        height="12"
        rx="3"
        fill={WHITE}
        stroke="#d0d6de"
        strokeWidth="1.2"
      />
      <path d="M8 14 L32 14 L32 24 L8 24 Z" fill="#e8b777" />
      <path d="M8 14 L32 14" stroke="#c98b43" strokeWidth="2" />
      <path
        d="M12 18 L16 18 M22 20 L26 20"
        stroke="#8a5a2b"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </>
  ),
  "food-tamal": (
    <>
      <path
        d="M6 30 L20 6 L34 30 Z"
        fill="#6aa84f"
        stroke="#3f7d2a"
        strokeWidth="1.5"
      />
      <path d="M10 30 L20 12 L30 30 Z" fill="#f5c451" />
      <path d="M4 30 L36 30 L32 36 L8 36 Z" fill="#3f7d2a" />
      <path
        d="M16 22 L24 22 M14 26 L26 26"
        stroke="#e2445c"
        strokeWidth="1.6"
      />
    </>
  ),
  "food-panettone": (
    <>
      <path d="M8 18 C8 6 32 6 32 18 Z" fill="#c9843a" />
      <rect x="8" y="17" width="24" height="17" rx="2" fill="#f5d38a" />
      <rect x="8" y="24" width="24" height="10" fill="#d6333a" />
      <path d="M8 29 L32 29" stroke={GOLD} strokeWidth="2" />
      <circle cx="15" cy="20" r="1.4" fill="#8a3b1e" />
      <circle cx="24" cy="21" r="1.4" fill="#1f9d55" />
    </>
  ),
};

// ---------------------------------------------------------------------------
// Rocky admins only (ClosetItem.staff): never sold, granted by the server.
// ---------------------------------------------------------------------------
/** Sovereign wings: three tiers of gold feathers over royal purple, with a moving shine and sparkles. */
const sovereignHalf = (
  <>
    {/* Back tier: royal purple */}
    <path
      d="M47 30 C36 8 16 -6 2 2 C8 8 6 16 1 22 C9 23 11 30 5 37 C13 38 15 45 9 52 C17 52 20 59 15 66 C24 64 29 70 26 78 C34 73 41 70 47 60 Z"
      fill="url(#sov-purple)"
      stroke="#3a1a6b"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
    {/* Middle tier: gold feathers */}
    <path
      d="M47 34 C38 16 22 6 10 10 C15 15 13 21 9 26 C16 27 18 33 13 39 C20 40 22 46 17 52 C25 51 28 57 25 63 C33 60 40 58 47 52 Z"
      fill="url(#sov-gold)"
      stroke="#9a6a08"
      strokeWidth="1.4"
      strokeLinejoin="round"
    />
    {/* Front tier: bright tips */}
    <path
      d="M47 38 C40 26 30 20 22 22 C26 26 25 30 22 34 C28 35 29 40 26 44 C32 44 34 49 32 53 C38 51 43 49 47 46 Z"
      fill="url(#sov-light)"
      stroke="#b8860b"
      strokeWidth="1.2"
      strokeLinejoin="round"
    />
    <path
      d="M46 34 C34 22 20 14 8 12 M46 42 C36 34 24 30 14 30 M46 48 C38 44 28 44 20 48"
      stroke="#fff6c2"
      strokeWidth="1.1"
      fill="none"
      opacity="0.8"
    />
    {/* A shine sweeping across the feathers */}
    <path d="M47 30 C36 8 16 -6 2 2 C8 30 20 60 47 60 Z" fill="url(#sov-shine)" opacity="0.7" />
    {/* Jewel at the wing root */}
    <circle cx="45" cy="44" r="3.4" fill="#e2445c" stroke="#fff3c9" strokeWidth="1.2" />
    {[
      [6, 6],
      [4, 30],
      [14, 58],
      [30, 12],
    ].map(([x, y]) => (
      <path
        key={`${x}-${y}`}
        className="rocky-twinkle"
        d={`M${x} ${y - 4} L${x + 1.2} ${y - 1.2} L${x + 4} ${y} L${x + 1.2} ${y + 1.2} L${x} ${y + 4} L${x - 1.2} ${y + 1.2} L${x - 4} ${y} L${x - 1.2} ${y - 1.2} Z`}
        fill="#fffbe0"
      />
    ))}
  </>
);

export const STAFF_BACK: Record<string, ReactElement> = {
  "back-sovereign-wings": (
    <>
      <defs>
        <linearGradient id="sov-purple" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8b5cf6" />
          <stop offset="1" stopColor="#4c1d95" />
        </linearGradient>
        <linearGradient id="sov-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff1a8" />
          <stop offset="0.45" stopColor="#f5b82e" />
          <stop offset="1" stopColor="#c07a0c" />
        </linearGradient>
        <linearGradient id="sov-light" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#ffd66b" />
        </linearGradient>
        <linearGradient id="sov-shine" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#ffffff" stopOpacity="0.9">
            <animate attributeName="offset" values="-0.3;1.3" dur="2.6s" repeatCount="indefinite" />
          </stop>
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Taller than the box they were drawn in: they rise above the shoulders and sweep down to the hips. */}
      <g transform="translate(0 -6) scale(1 1.45)">{pair(sovereignHalf)}</g>
    </>
  ),
};

export const STAFF_BACK_WIDTH: Record<string, number> = { "back-sovereign-wings": 2.5 };

export const STAFF_HATS: Record<string, HatArt> = {
  /** The royal crown: velvet cap, jewelled gold band and arches, a moving shine and sparkles. */
  "hat-vip-crown": {
    width: 0.74,
    sink: 0.34,
    svg: (
      <>
        <defs>
          <linearGradient id="crown-gold" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff6b8" />
            <stop offset="0.45" stopColor="#f7c531" />
            <stop offset="1" stopColor="#b8780a" />
          </linearGradient>
          <radialGradient id="crown-velvet" cx="0.5" cy="0.35" r="0.7">
            <stop offset="0" stopColor="#9b5cf6" />
            <stop offset="1" stopColor="#3b1476" />
          </radialGradient>
          <linearGradient id="crown-shine" x1="0" y1="0" x2="1" y2="0.2">
            <stop offset="0" stopColor="#fff" stopOpacity="0" />
            <stop offset="0.5" stopColor="#fff" stopOpacity="0.9">
              <animate attributeName="offset" values="-0.4;1.4" dur="2.8s" repeatCount="indefinite" />
            </stop>
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <clipPath id="crown-clip">
            <path d="M8 58 L8 40 L4 16 L22 30 L32 8 L42 26 L50 2 L58 26 L68 8 L78 30 L96 16 L92 40 L92 58 Z" />
          </clipPath>
        </defs>
        {/* Velvet cap showing between the points */}
        <path d="M14 44 C14 20 34 12 50 12 C66 12 86 20 86 44 Z" fill="url(#crown-velvet)" />
        {/* Points and arches */}
        <path
          d="M8 44 L4 16 L22 30 L32 8 L42 26 L50 2 L58 26 L68 8 L78 30 L96 16 L92 44 Z"
          fill="url(#crown-gold)"
          stroke="#7a4b00"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        {/* Pearls on every tip */}
        {[
          [4, 16],
          [32, 8],
          [50, 2],
          [68, 8],
          [96, 16],
        ].map(([x, y]) => (
          <circle key={x} cx={x} cy={y} r="3.6" fill="#fffdf2" stroke="#c9a14a" strokeWidth="1" />
        ))}
        {/* Jewelled band */}
        <rect x="6" y="42" width="88" height="16" rx="3" fill="url(#crown-gold)" stroke="#7a4b00" strokeWidth="2" />
        <path d="M8 46 L92 46" stroke="#fff3b0" strokeWidth="1.4" opacity="0.8" />
        <ellipse cx="50" cy="50" rx="7" ry="6" fill="#e2445c" stroke="#fff3b0" strokeWidth="1.4" />
        <ellipse cx="48" cy="48" rx="2" ry="1.5" fill="#fff" opacity="0.8" />
        {[
          [24, "#4aa3ff"],
          [76, "#1fbf68"],
        ].map(([x, c]) => (
          <path key={x as number} d={`M${x} 44 L${(x as number) + 5} 50 L${x} 56 L${(x as number) - 5} 50 Z`} fill={c as string} stroke="#fff3b0" strokeWidth="1.2" />
        ))}
        {[12, 37, 63, 88].map((x) => (
          <circle key={x} cx={x} cy="50" r="2" fill="#fffdf2" />
        ))}
        <path d="M50 12 L50 30 M42 21 L58 21" stroke="#fff3b0" strokeWidth="2.4" strokeLinecap="round" />
        {/* Moving shine */}
        <rect x="0" y="0" width="100" height="60" fill="url(#crown-shine)" clipPath="url(#crown-clip)" />
        {[
          [18, 6],
          [84, 4],
          [96, 36],
        ].map(([x, y], i) => (
          <path
            key={i}
            className="rocky-twinkle"
            style={{ animationDelay: `${i * 0.6}s` }}
            d={`M${x} ${y - 5} L${x + 1.5} ${y - 1.5} L${x + 5} ${y} L${x + 1.5} ${y + 1.5} L${x} ${y + 5} L${x - 1.5} ${y + 1.5} L${x - 5} ${y} L${x - 1.5} ${y - 1.5} Z`}
            fill="#ffffff"
          />
        ))}
      </>
    ),
  },
};
