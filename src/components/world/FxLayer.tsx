import type { CSSProperties, ReactElement } from "react";
import styles from "./World.module.css";

// The ambience layer over Rocky's scene (bought in the shop). Pure CSS
// animation on small SVG particles — no canvas, no per-frame JS — hidden
// with reduced motion. Each effect picks its shapes, how many, how they
// move, and a few special layers (aurora, mist, lights, fireworks, rainbow).

type Motion =
  | "fall"
  | "sway"
  | "rise"
  | "flutter"
  | "rain"
  | "float"
  | "streak"
  | "drift"
  | "haunt";

/** Extra layers that give an effect weight: settled snow, a spooky tint. */
type Overlay = "snow-ground" | "haunt" | "warm" | "royal";

interface ParticleFx {
  kind: "particles";
  count: number;
  motion: Motion;
  shapes: ReactElement[];
  size: [number, number];
  dur: [number, number];
  overlay?: Overlay;
  /** Depth of field: far particles are small, faint, blurred and slow;
   *  a few near ones are big and soft. Off for rain and streaks. */
  depth?: boolean;
}

interface SpecialFx {
  kind: "aurora" | "fog" | "lights" | "fireworks" | "rainbow";
}

/** Fireflies keep their original glowing CSS dots. */
const LEGACY: Record<string, { className: string; count: number }> = {
  "fx-fireflies": { className: styles.fxFirefly!, count: 22 },
};

const COLORS = ["#1fbf68", "#f5b82e", "#ffffff", "#e2445c", "#9fc6e8"];

// Shapes, drawn in a 20x20 box.
const maple = (c: string) => (
  <path
    d="M10 1 L12 6 L16 4 L15 9 L19 9 L16 12 L18 15 L12 14 L11 19 L9 19 L8 14 L2 15 L4 12 L1 9 L5 9 L4 4 L8 6 Z"
    fill={c}
    stroke="rgba(0,0,0,0.12)"
    strokeWidth="0.6"
  />
);
const petal = (c: string) => (
  <path
    d="M10 2 C16 6 16 14 10 18 C4 14 4 6 10 2 Z M10 5 L10 15"
    fill={c}
    stroke="#f5a3bf"
    strokeWidth="0.6"
  />
);
const butterfly = (c: string) => (
  <g>
    <path d="M10 10 C4 2 0 6 2 10 C0 14 4 18 10 10 Z" fill={c} />
    <path d="M10 10 C16 2 20 6 18 10 C20 14 16 18 10 10 Z" fill={c} />
    <path
      d="M10 5 L10 15"
      stroke="#3a2a1e"
      strokeWidth="1.4"
      strokeLinecap="round"
    />
  </g>
);
const bubble = (
  <circle
    cx="10"
    cy="10"
    r="8"
    fill="rgba(200,235,255,0.25)"
    stroke="rgba(255,255,255,0.9)"
    strokeWidth="1"
  />
);
const drop = (
  <path
    d="M10 1 C10 1 5 9 5 13 A5 5 0 0 0 15 13 C15 9 10 1 10 1 Z"
    fill="rgba(160,205,245,0.85)"
  />
);
const seed = (
  <g stroke="#ffffff" strokeWidth="0.8" strokeLinecap="round">
    <path d="M10 10 L10 19" />
    {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((a) => (
      <path
        key={a}
        d="M10 10 L10 3"
        transform={`rotate(${a} 10 10)`}
        opacity="0.9"
      />
    ))}
  </g>
);
const note = (c: string) => (
  <g>
    <rect x="3" y="3" width="14" height="14" rx="1.5" fill={c} />
    <path
      d="M6 8 L14 8 M6 11 L12 11"
      stroke="#0f2341"
      strokeWidth="1"
      opacity="0.5"
    />
    <path
      d="M9 14 L11 16 L15 12"
      stroke="#008c45"
      strokeWidth="1.4"
      fill="none"
      strokeLinecap="round"
    />
  </g>
);
const coin = (
  <g>
    <circle
      cx="10"
      cy="10"
      r="8"
      fill="#f5b82e"
      stroke="#c07a0c"
      strokeWidth="1.2"
    />
    <text
      x="7"
      y="13.5"
      fontFamily="Poppins, sans-serif"
      fontWeight="800"
      fontSize="9"
      fill="#8a5a00"
    >
      R
    </text>
  </g>
);
const bat = (
  <path
    d="M10 10 C7 6 3 6 0 9 C3 9 4 11 4 13 C6 11 8 11 10 13 C12 11 14 11 16 13 C16 11 17 9 20 9 C17 6 13 6 10 10 Z"
    fill="#1d1236"
    stroke="#c9a8ff"
    strokeWidth="0.8"
  />
);
const ghost = (
  <g>
    <path
      d="M3 9 C3 2 17 2 17 9 L17 18 L14.5 16 L12 18 L10 16 L8 18 L5.5 16 L3 18 Z"
      fill="rgba(255,255,255,0.9)"
    />
    <circle cx="7.5" cy="9" r="1.3" fill="#2a1f3d" />
    <circle cx="12.5" cy="9" r="1.3" fill="#2a1f3d" />
  </g>
);
const candy = (c: string) => (
  <g>
    <rect x="6" y="7" width="8" height="6" rx="2" fill={c} />
    <path d="M6 10 L2 7 L2 13 Z M14 10 L18 7 L18 13 Z" fill={c} opacity="0.8" />
  </g>
);
const flake = (
  <g stroke="#ffffff" strokeWidth="1.3" strokeLinecap="round" fill="none">
    {[0, 60, 120].map((a) => (
      <path
        key={a}
        d="M10 1 L10 19 M7 3.5 L10 6 L13 3.5 M7 16.5 L10 14 L13 16.5"
        transform={`rotate(${a} 10 10)`}
      />
    ))}
  </g>
);
/** Carnival confetti bits and curly streamers (serpentinas). */
const confettiBit = (c: string) => (
  <rect
    x="6"
    y="3"
    width="8"
    height="14"
    rx="1.5"
    fill={c}
    stroke="rgba(0,0,0,0.15)"
    strokeWidth="0.5"
  />
);
const streamer = (c: string) => (
  <path
    d="M3 2 C12 4 4 8 12 10 C20 12 8 16 17 18"
    stroke={c}
    strokeWidth="2.4"
    fill="none"
    strokeLinecap="round"
  />
);
const snowDot = (
  <g>
    <circle cx="10" cy="10" r="9" fill="rgba(255,255,255,0.35)" />
    <circle cx="10" cy="10" r="5.5" fill="#ffffff" />
  </g>
);
const leaf = (c: string) => (
  <g>
    <path
      d="M3 17 C3 8 9 3 18 2 C17 11 12 17 3 17 Z"
      fill={c}
      stroke="rgba(0,0,0,0.12)"
      strokeWidth="0.6"
    />
    <path d="M3 17 L14 6" stroke="rgba(0,0,0,0.2)" strokeWidth="0.8" />
  </g>
);
const heart = (c: string) => (
  <path
    d="M10 18 C10 18 1 12 1 6.5 C1 3 4 1 6.5 1 C8.4 1 10 2.6 10 3.6 C10 2.6 11.6 1 13.5 1 C16 1 19 3 19 6.5 C19 12 10 18 10 18 Z"
    fill={c}
  />
);
const pumpkinFace = (
  <g>
    <ellipse cx="10" cy="11" rx="9" ry="7.5" fill="#f28c28" />
    <path
      d="M10 4 L11 1.5"
      stroke="#3b5d1e"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
    <path
      d="M5.5 9 L7.5 8 L7.5 10 Z M14.5 9 L12.5 8 L12.5 10 Z M6 13 L8 14.5 L10 13 L12 14.5 L14 13 L12 16 L8 16 Z"
      fill="#ffe27a"
    />
  </g>
);
const gift = (c: string) => (
  <g>
    <rect x="3" y="7" width="14" height="11" rx="1.5" fill={c} />
    <rect
      x="2"
      y="5"
      width="16"
      height="4"
      rx="1"
      fill={c}
      stroke="rgba(0,0,0,0.15)"
      strokeWidth="0.5"
    />
    <path d="M10 5 L10 18" stroke="#f5b82e" strokeWidth="2" />
    <path
      d="M10 5 C7 1 4 3 6 5 M10 5 C13 1 16 3 14 5"
      stroke="#f5b82e"
      strokeWidth="1.5"
      fill="none"
    />
  </g>
);
const star = (c: string) => (
  <polygon
    points="10,1 12.4,7.2 19,7.6 13.8,11.8 15.6,18.4 10,14.6 4.4,18.4 6.2,11.8 1,7.6 7.6,7.2"
    fill={c}
  />
);

const sparkle = (c: string) => (
  <path d="M10 1 L11.8 8.2 L19 10 L11.8 11.8 L10 19 L8.2 11.8 L1 10 L8.2 8.2 Z" fill={c} />
);
const plane = (c: string) => (
  <g>
    <path d="M1 10 L19 3 L12 18 L10 12 Z" fill={c} stroke="rgba(15,35,65,0.35)" strokeWidth="0.7" strokeLinejoin="round" />
    <path d="M10 12 L19 3" stroke="rgba(15,35,65,0.35)" strokeWidth="0.7" />
  </g>
);
const balloon = (c: string) => (
  <g>
    <ellipse cx="10" cy="8" rx="6.5" ry="7.5" fill={c} />
    <path d="M10 15.5 L9 17 L11 17 Z" fill={c} />
    <path d="M10 17 C8 18 12 19 10 20" stroke="#94a3b8" strokeWidth="0.6" fill="none" />
    <ellipse cx="7.8" cy="5.5" rx="1.6" ry="2.6" fill="#ffffff" opacity="0.45" />
  </g>
);

const FX: Record<string, ParticleFx | SpecialFx> = {
  "fx-sparkles": {
    kind: "particles",
    count: 20,
    motion: "sway",
    shapes: ["#fff6c2", "#f5b82e", "#ffffff", "#bae6fd"].map(sparkle),
    size: [8, 14],
    dur: [6, 11],
    depth: true,
  },
  "fx-paper-planes": {
    kind: "particles",
    count: 7,
    motion: "float",
    shapes: ["#ffffff", "#fde68a", "#bfdbfe"].map(plane),
    size: [18, 26],
    dur: [9, 15],
  },
  "fx-balloons": {
    kind: "particles",
    count: 10,
    motion: "rise",
    shapes: ["#e2445c", "#f5b82e", "#1fbf68", "#5b8cff", "#f472b6"].map(balloon),
    size: [18, 28],
    dur: [10, 16],
  },
  // Rocky admins only: golden sparkles and crowns rising through light rays.
  "fx-royal-aura": {
    kind: "particles",
    count: 34,
    motion: "rise",
    shapes: [star("#f5b82e"), star("#fff6c2"), star("#ffd66b"), star("#c9a8ff")],
    size: [8, 20],
    dur: [5, 9],
    overlay: "royal",
    depth: true,
  },
  "fx-spooky-leaves": {
    kind: "particles",
    count: 30,
    motion: "sway",
    shapes: [...["#7a4fd1", "#f28c28", "#3b2a5a", "#e8963a"].map(leaf), bat],
    size: [14, 28],
    dur: [6, 11],
    overlay: "haunt",
    depth: true,
  },
  "fx-pumpkins": {
    kind: "particles",
    count: 22,
    motion: "fall",
    shapes: [pumpkinFace],
    size: [16, 30],
    dur: [5, 9],
    overlay: "haunt",
    depth: true,
  },
  "fx-gift-rain": {
    kind: "particles",
    count: 26,
    motion: "fall",
    shapes: ["#d6333a", "#1f9d55", "#3a78c2", "#b28dff"].map(gift),
    size: [16, 28],
    dur: [5, 9],
    overlay: "snow-ground",
    depth: true,
  },
  "fx-new-year": {
    kind: "particles",
    count: 46,
    motion: "sway",
    shapes: [
      ...["#f5b82e", "#fff3c9", "#e0a21a", "#ffffff"].map(confettiBit),
      star("#f5b82e"),
      star("#fff6c2"),
    ],
    size: [8, 18],
    dur: [5, 9],
    overlay: "warm",
    depth: true,
  },
  "fx-snow": {
    kind: "particles",
    count: 75,
    motion: "sway",
    shapes: [snowDot],
    size: [6, 16],
    dur: [7, 13],
    overlay: "snow-ground",
    depth: true,
  },
  "fx-leaves": {
    kind: "particles",
    count: 28,
    motion: "sway",
    shapes: ["#f5b82e", "#e8963a", "#c9352b", "#9bbf3a"].map(leaf),
    size: [16, 30],
    dur: [8, 14],
    overlay: "warm",
    depth: true,
  },
  "fx-confetti": {
    kind: "particles",
    count: 40,
    motion: "fall",
    shapes: COLORS.map(confettiBit),
    size: [8, 14],
    dur: [4, 7],
    depth: true,
  },
  "fx-hearts": {
    kind: "particles",
    count: 24,
    motion: "rise",
    shapes: ["#ff8fa3", "#ff6b8a", "#ffc2cf"].map(heart),
    size: [14, 26],
    dur: [7, 12],
    depth: true,
  },
  "fx-notes": {
    kind: "particles",
    count: 10,
    motion: "flutter",
    shapes: ["#fff6a8", "#c8f1d4", "#ffd6e5", "#d5e8ff"].map(note),
    size: [18, 26],
    dur: [9, 15],
  },
  "fx-maple": {
    kind: "particles",
    count: 16,
    motion: "sway",
    shapes: ["#e2552b", "#f28c28", "#f5b82e", "#c9352b"].map(maple),
    size: [14, 24],
    dur: [8, 14],
  },
  "fx-rain": {
    kind: "particles",
    count: 55,
    motion: "rain",
    shapes: [drop],
    size: [6, 10],
    dur: [0.7, 1.2],
  },
  "fx-bubbles": {
    kind: "particles",
    count: 18,
    motion: "rise",
    shapes: [bubble],
    size: [12, 30],
    dur: [7, 13],
  },
  "fx-petals": {
    kind: "particles",
    count: 22,
    motion: "sway",
    shapes: ["#ffc6da", "#ffe1ec", "#ffb3cd"].map(petal),
    size: [10, 16],
    dur: [9, 15],
  },
  "fx-dandelion": {
    kind: "particles",
    count: 14,
    motion: "float",
    shapes: [seed],
    size: [14, 22],
    dur: [12, 20],
  },
  "fx-butterflies": {
    kind: "particles",
    count: 8,
    motion: "flutter",
    shapes: ["#f5b82e", "#7ab8ff", "#ff8fb8", "#9be38a"].map(butterfly),
    size: [18, 26],
    dur: [10, 16],
  },
  "fx-stars": {
    kind: "particles",
    count: 6,
    motion: "streak",
    shapes: [star("#fff6c2")],
    size: [10, 16],
    dur: [4, 7],
  },
  "fx-coins": {
    kind: "particles",
    count: 22,
    motion: "fall",
    shapes: [coin],
    size: [14, 22],
    dur: [3.5, 6],
  },
  "fx-bats": {
    kind: "particles",
    count: 18,
    motion: "flutter",
    shapes: [bat],
    size: [24, 44],
    dur: [6, 11],
    overlay: "haunt",
    depth: true,
  },
  "fx-ghosts": {
    kind: "particles",
    count: 11,
    motion: "haunt",
    shapes: [ghost, ghost, ghost, pumpkinFace],
    size: [38, 70],
    dur: [10, 17],
    overlay: "haunt",
    depth: true,
  },
  "fx-snowflakes": {
    kind: "particles",
    count: 60,
    motion: "sway",
    shapes: [flake, flake, snowDot],
    size: [8, 24],
    dur: [8, 14],
    overlay: "snow-ground",
    depth: true,
  },
  "fx-candy": {
    kind: "particles",
    count: 16,
    motion: "fall",
    shapes: ["#e2445c", "#f28c28", "#7a4fd1", "#1fbf68"].map(candy),
    size: [14, 20],
    dur: [5, 8],
  },
  "fx-jr-carnaval": {
    kind: "particles",
    count: 34,
    motion: "sway",
    shapes: [
      ...["#d0112b", "#ffffff", "#12234a", "#f5b82e", "#d0112b", "#1fbf68"].map(
        confettiBit,
      ),
      streamer("#d0112b"),
      streamer("#12234a"),
      streamer("#f5b82e"),
    ],
    size: [10, 22],
    dur: [6, 11],
  },
  "fx-aurora": { kind: "aurora" },
  "fx-fog": { kind: "fog" },
  "fx-lights": { kind: "lights" },
  "fx-fireworks": { kind: "fireworks" },
  "fx-rainbow": { kind: "rainbow" },
};

/** Deterministic scatter so the layer doesn't reshuffle on re-render. A
 *  hash, not a linear step: a linear one moved x, height and delay together
 *  and the particles read as one diagonal line crossing the screen. */
const rnd = (i: number, n: number) => {
  const h = Math.sin(i * 127.1 + n * 311.7) * 43758.5453;
  return h - Math.floor(h);
};

function OverlayLayer({ kind }: { kind: Overlay | undefined }) {
  if (kind === "snow-ground")
    return (
      <div className={styles.fxSnowGround} aria-hidden="true">
        <svg viewBox="0 0 1000 60" preserveAspectRatio="none">
          <path
            d="M0 60 L0 34 C60 22 120 30 180 26 C260 20 300 34 380 30 C460 26 520 16 600 24 C680 32 740 22 820 26 C890 30 950 20 1000 28 L1000 60 Z"
            fill="#ffffff"
          />
          <path
            d="M0 36 C60 24 120 32 180 28 C260 22 300 36 380 32"
            stroke="#dcecff"
            strokeWidth="3"
            fill="none"
          />
        </svg>
      </div>
    );
  if (kind === "haunt")
    return (
      <div
        className={`${styles.fxTint} ${styles.fxTintHaunt}`}
        aria-hidden="true"
      >
        <i />
        <i />
      </div>
    );
  if (kind === "warm")
    return (
      <div
        className={`${styles.fxTint} ${styles.fxTintWarm}`}
        aria-hidden="true"
      />
    );
  if (kind === "royal")
    return (
      <div className={`${styles.fxTint} ${styles.fxRoyal}`} aria-hidden="true">
        <i />
        {Array.from({ length: 9 }, (_, n) => (
          <b
            key={n}
            style={
              {
                "--x": `${5 + rnd(n, 21) * 88}%`,
                "--y": `${8 + rnd(n, 22) * 75}%`,
                "--s": `${30 + rnd(n, 23) * 70}px`,
                "--d": `${4 + rnd(n, 24) * 5}s`,
                "--dx": `${-40 + rnd(n, 25) * 80}px`,
                "--delay": `${-rnd(n, 26) * 6}s`,
              } as CSSProperties
            }
          />
        ))}
      </div>
    );
  return null;
}

export function FxLayer({ id }: { id: string | null }) {
  if (!id) return null;
  const legacy = LEGACY[id];
  if (legacy) {
    return (
      <div className={styles.fx} aria-hidden="true">
        {Array.from({ length: legacy.count }, (_, i) => {
          const style = {
            "--x": `${rnd(i, 1) * 100}%`,
            "--y": `${10 + rnd(i, 2) * 70}%`,
            "--dur": `${6 + rnd(i, 3) * 8}s`,
            "--delay": `${-rnd(i, 4) * 14}s`,
            "--s": `${0.6 + rnd(i, 5) * 0.8}`,
            "--c": COLORS[i % COLORS.length],
          } as CSSProperties;
          return <span key={i} className={legacy.className} style={style} />;
        })}
      </div>
    );
  }
  const fx = FX[id];
  if (!fx) return null;
  if (fx.kind === "particles") {
    return (
      <div className={styles.fx} aria-hidden="true">
        <OverlayLayer kind={fx.overlay} />
        {Array.from({ length: fx.count }, (_, i) => {
          // Depth 0 = far away, 1 = right in front of the camera.
          const d = fx.depth ? rnd(i, 8) : 0.6;
          const near = fx.depth && d > 0.9;
          const k = fx.depth ? (near ? 1.6 : 0.5 + d * 0.7) : 1;
          const size = (fx.size[0] + rnd(i, 5) * (fx.size[1] - fx.size[0])) * k;
          const dur =
            (fx.dur[0] + rnd(i, 3) * (fx.dur[1] - fx.dur[0])) *
            (fx.depth ? 1.45 - d * 0.6 : 1);
          const style = {
            "--x": `${rnd(i, 1) * 100}%`,
            "--y": `${6 + rnd(i, 2) * 72}%`,
            "--dur": `${dur}s`,
            "--delay": `${-rnd(i, 4) * dur}s`,
            "--sway": `${(20 + rnd(i, 6) * 60) * (0.6 + d * 0.6)}px`,
            "--spin": `${rnd(i, 7) > 0.5 ? 1 : -1}`,
            "--wob": `${1.8 + rnd(i, 9) * 2.4}s`,
            "--o": `${fx.depth ? (near ? 0.75 : 0.45 + d * 0.55) : 1}`,
            "--blur": `${fx.depth ? (near ? 2.2 : d < 0.3 ? 1.1 : 0) : 0}px`,
            zIndex: Math.round(d * 10),
            width: size,
            height: size,
          } as CSSProperties;
          return (
            <span
              key={i}
              className={styles.fxP}
              data-motion={fx.motion}
              style={style}
            >
              <svg viewBox="0 0 20 20">{fx.shapes[i % fx.shapes.length]}</svg>
            </span>
          );
        })}
      </div>
    );
  }
  if (fx.kind === "aurora")
    return (
      <div className={`${styles.fx} ${styles.fxAurora}`} aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
    );
  if (fx.kind === "fog")
    return (
      <div className={`${styles.fx} ${styles.fxFog}`} aria-hidden="true">
        {Array.from({ length: 5 }, (_, i) => (
          <i
            key={i}
            style={
              {
                "--y": `${45 + i * 9}%`,
                "--dur": `${26 + i * 7}s`,
                "--delay": `${-i * 6}s`,
              } as CSSProperties
            }
          />
        ))}
      </div>
    );
  if (fx.kind === "lights")
    return (
      <div className={`${styles.fx} ${styles.fxLights}`} aria-hidden="true">
        <svg viewBox="0 0 1000 60" preserveAspectRatio="none">
          <path
            d="M0 8 Q125 48 250 12 Q375 48 500 12 Q625 48 750 12 Q875 48 1000 8"
            stroke="#1b3358"
            strokeWidth="2"
            fill="none"
          />
        </svg>
        {Array.from({ length: 24 }, (_, i) => {
          const t = i / 23;
          const seg = (t * 4) % 1;
          const y = 12 + Math.sin(seg * Math.PI) * 30;
          return (
            <span
              key={i}
              style={
                {
                  left: `${t * 100}%`,
                  top: y,
                  "--c": ["#e2445c", "#f5b82e", "#1fbf68", "#4aa3ff"][i % 4],
                  animationDelay: `${(i % 4) * 0.35}s`,
                } as CSSProperties
              }
            />
          );
        })}
      </div>
    );
  if (fx.kind === "fireworks")
    return (
      <div className={`${styles.fx} ${styles.fxFireworks}`} aria-hidden="true">
        {Array.from({ length: 5 }, (_, i) => (
          <span
            key={i}
            style={
              {
                left: `${12 + rnd(i, 1) * 76}%`,
                top: `${10 + rnd(i, 2) * 35}%`,
                "--c": ["#f5b82e", "#e2445c", "#4aa3ff", "#1fbf68", "#d27aff"][
                  i
                ],
                animationDelay: `${i * 0.9}s`,
              } as CSSProperties
            }
          >
            {Array.from({ length: 12 }, (_, k) => (
              <i key={k} style={{ transform: `rotate(${k * 30}deg)` }} />
            ))}
          </span>
        ))}
      </div>
    );
  // Rainbow: a soft arc and sparkles along it.
  return (
    <div className={`${styles.fx} ${styles.fxRainbow}`} aria-hidden="true">
      <svg viewBox="0 0 1000 400" preserveAspectRatio="xMidYMax slice">
        {["#ff6b6b", "#ffb347", "#ffe066", "#7ddc84", "#6bb8ff", "#b28dff"].map(
          (c, i) => (
            <path
              key={c}
              d={`M${60 + i * 16} 400 A${440 - i * 16} ${360 - i * 16} 0 0 1 ${940 - i * 16} 400`}
              stroke={c}
              strokeWidth="16"
              fill="none"
              opacity="0.5"
            />
          ),
        )}
      </svg>
      {Array.from({ length: 12 }, (_, i) => (
        <span
          key={i}
          style={
            {
              left: `${8 + i * 7.6}%`,
              top: `${14 + Math.abs(5.5 - i) * 6}%`,
              animationDelay: `${i * 0.2}s`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

/** A still thumbnail of an effect for the shop (100x75 box). */
export function fxPreview(id: string): ReactElement | null {
  const fx = FX[id];
  if (!fx) return null;
  if (fx.kind === "particles") {
    return (
      <>
        {fx.motion === "rain" ||
        id === "fx-stars" ||
        id === "fx-sparkles" ||
        id === "fx-bats" ||
        id === "fx-ghosts" ||
        id === "fx-snow" ? (
          <rect
            width="100"
            height="75"
            fill={
              id === "fx-rain"
                ? "#9fb7cc"
                : id === "fx-snow"
                  ? "#7f9fc4"
                  : "#1d1d3f"
            }
          />
        ) : null}
        {Array.from({ length: 7 }, (_, i) => {
          const x = 8 + rnd(i, 1) * 76;
          const y = 6 + rnd(i, 2) * 52;
          const k = 0.7 + rnd(i, 5) * 0.6;
          return (
            <g
              key={i}
              transform={`translate(${x} ${y}) scale(${k}) rotate(${fx.motion === "sway" ? rnd(i, 7) * 90 : 0} 10 10)`}
            >
              {fx.shapes[i % fx.shapes.length]}
            </g>
          );
        })}
      </>
    );
  }
  if (fx.kind === "aurora")
    return (
      <>
        <rect width="100" height="75" fill="#0b1a3a" />
        <path
          d="M-5 30 C20 10 40 40 60 20 C75 8 90 24 105 14 L105 34 C88 44 74 30 60 42 C40 58 20 32 -5 50 Z"
          fill="#3ff2a4"
          opacity="0.55"
        />
        <path
          d="M-5 40 C25 22 45 50 70 30 C85 20 95 30 105 26 L105 40 C90 44 80 38 68 46 C45 62 25 40 -5 56 Z"
          fill="#7a8bff"
          opacity="0.45"
        />
      </>
    );
  if (fx.kind === "fog")
    return (
      <>
        <rect width="100" height="75" fill="#3a2a4e" />
        {[30, 45, 60].map((y, i) => (
          <ellipse
            key={y}
            cx={30 + i * 20}
            cy={y}
            rx="40"
            ry="8"
            fill="#e9e1ff"
            opacity="0.35"
          />
        ))}
      </>
    );
  if (fx.kind === "lights")
    return (
      <>
        <path
          d="M0 10 Q25 34 50 12 Q75 34 100 10"
          stroke="#1b3358"
          strokeWidth="1.5"
          fill="none"
        />
        {Array.from({ length: 9 }, (_, i) => {
          const t = i / 8;
          const y = 10 + Math.sin(((t * 2) % 1) * Math.PI) * 14;
          return (
            <circle
              key={i}
              cx={t * 100}
              cy={y + 3}
              r="4"
              fill={["#e2445c", "#f5b82e", "#1fbf68", "#4aa3ff"][i % 4]}
            />
          );
        })}
      </>
    );
  if (fx.kind === "fireworks")
    return (
      <>
        <rect width="100" height="75" fill="#0f2341" />
        {[
          [28, 28, "#f5b82e"],
          [70, 22, "#e2445c"],
          [52, 50, "#4aa3ff"],
        ].map(([x, y, c], i) => (
          <g key={i} transform={`translate(${x} ${y})`}>
            {Array.from({ length: 10 }, (_, k) => (
              <path
                key={k}
                d="M0 -4 L0 -12"
                stroke={c as string}
                strokeWidth="2"
                strokeLinecap="round"
                transform={`rotate(${k * 36})`}
              />
            ))}
          </g>
        ))}
      </>
    );
  return (
    <>
      {["#ff6b6b", "#ffb347", "#ffe066", "#7ddc84", "#6bb8ff", "#b28dff"].map(
        (c, i) => (
          <path
            key={c}
            d={`M${8 + i * 3} 75 A${42 - i * 3} ${50 - i * 3} 0 0 1 ${92 - i * 3} 75`}
            stroke={c}
            strokeWidth="3.2"
            fill="none"
          />
        ),
      )}
    </>
  );
}
