// Scene kit: the shared drawing tools behind every background.
//
// Every scene is a 1000x400 SVG (Rocky's floor sits at y≈340) cropped with
// "slice": on a desktop the visible part is roughly x 170–830, on a phone only
// x 370–630, so the important things live in the middle and the sides are a
// bonus. Depth comes from four tools used in every scene:
//
// - Layers: `<Depth d>` shifts far layers a little in the direction Rocky
//   walks (the camera follows him; the floor stays put, so placed items don't
//   slide). d=1 is the sky, 0 is the floor.
// - Aerial perspective: far things are paler and bluer (`Haze`), near things
//   are richer and darker.
// - Light: one light source per scene, rim light along the tops of shapes
//   (`Ridge`), soft contact shadows on the floor, a gentle vignette (`Grade`).
// - Edges: never black outlines; an edge is the fill darkened (`shade`).
//
// Random detail (grass, windows, stars, boxes) is seeded, so a scene always
// draws the same way.
import { createContext, useContext, useId, useMemo, type ComponentProps, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * Particles (snow, fireflies, dust, confetti) move over the whole frame; drawn
 * inside the scene they would make the browser repaint the entire scene every
 * frame. In a live world SceneArt gives them their own SVG layer on top, which
 * the browser composites separately; elsewhere they draw in place.
 */
export const ParticleLayer = createContext<SVGGElement | null>(null);

export function Particles({ children }: { children: ReactNode }) {
  const el = useContext(ParticleLayer);
  return el ? createPortal(children, el) : <>{children}</>;
}

export const W = 1000;
export const H = 400;
/** Wide enough for the far layers to move with the camera without showing an edge. */
export const X0 = -120;
export const X1 = 1120;

export const NAVY = "#0f2341";
export const NAVY2 = "#1b3358";
export const GREEN = "#008c45";
export const GREEN2 = "#1fbf68";
export const GOLD = "#f5b82e";
export const WHITE = "#ffffff";

export interface SceneProps {
  live?: boolean;
}

/** Unique ids per drawing, so two copies of a scene (shop + world) never share a gradient. */
export function useIds(): (k: string) => string {
  const base = useId().replace(/[^a-zA-Z0-9]/g, "");
  return (k: string) => `s${base}${k}`;
}

/** Deterministic random numbers (mulberry32). */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Same random numbers across renders. */
export function useRng<T>(seed: number, build: (r: () => number) => T): T {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => build(rng(seed)), [seed]);
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.replace(/./g, "$&$&") : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex([r, g, b]: [number, number, number]): string {
  const c = (v: number) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** Blend two colors (t=0 → a, t=1 → b). */
export function mix(a: string, b: string, t: number): string {
  const x = hexToRgb(a);
  const y = hexToRgb(b);
  return rgbToHex([x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t]);
}

/** Darken (amt < 0, toward a deep blue-black, never pure black) or lighten (amt > 0, toward white). */
export function shade(hex: string, amt: number): string {
  return amt < 0 ? mix(hex, "#141a2e", -amt) : mix(hex, "#ffffff", amt);
}

// ---------------------------------------------------------------------------
// Gradients
// ---------------------------------------------------------------------------
type Stop = [offset: number, color: string, opacity?: number];

export function Linear({ id, stops, x2 = 0, y2 = 1, x1 = 0, y1 = 0 }: { id: string; stops: Stop[]; x1?: number; y1?: number; x2?: number; y2?: number }) {
  return (
    <linearGradient id={id} x1={x1} y1={y1} x2={x2} y2={y2}>
      {stops.map(([o, c, a], i) => (
        <stop key={i} offset={o} stopColor={c} stopOpacity={a ?? 1} />
      ))}
    </linearGradient>
  );
}

export function Radial({ id, stops, cx = 0.5, cy = 0.5, r = 0.5, fx, fy }: { id: string; stops: Stop[]; cx?: number; cy?: number; r?: number; fx?: number; fy?: number }) {
  return (
    <radialGradient id={id} cx={cx} cy={cy} r={r} fx={fx} fy={fy}>
      {stops.map(([o, c, a], i) => (
        <stop key={i} offset={o} stopColor={c} stopOpacity={a ?? 1} />
      ))}
    </radialGradient>
  );
}

// ---------------------------------------------------------------------------
// Layers and atmosphere
// ---------------------------------------------------------------------------
/**
 * A depth layer. In a live scene it moves with the camera: `d` is how far it is
 * (1 = the sky, 0.6 = far hills, 0.3 = mid buildings, 0 = the floor).
 */
export function Depth({ d, children }: { d: number; children: ReactNode }) {
  return (
    <g className="rocky-depth" style={{ ["--d" as string]: d }}>
      {children}
    </g>
  );
}

/** The sky: a multi-stop vertical gradient over the whole canvas, plus an optional glow around the sun or moon. */
export function Sky({ stops, sun }: { stops: Stop[]; sun?: { x: number; y: number; r: number; color: string; strength?: number } }) {
  const id = useIds();
  return (
    <>
      <defs>
        <Linear id={id("sky")} stops={stops} />
        {sun && (
          <Radial
            id={id("glow")}
            stops={[
              [0, sun.color, sun.strength ?? 0.85],
              [0.35, sun.color, (sun.strength ?? 0.85) * 0.35],
              [1, sun.color, 0],
            ]}
          />
        )}
      </defs>
      <rect x={X0} y={-40} width={X1 - X0} height={H + 80} fill={`url(#${id("sky")})`} />
      {sun && <circle cx={sun.x} cy={sun.y} r={sun.r} fill={`url(#${id("glow")})`} />}
    </>
  );
}

/** Aerial perspective: a band that fades from clear (top) into the air color (bottom), laid between layers. */
export function Haze({ y0, y1, color, opacity = 0.6, reverse = false, peak }: { y0: number; y1: number; color: string; opacity?: number; reverse?: boolean; /** 0–1: densest at this point of the band, clear at both ends. */ peak?: number }) {
  const id = useIds();
  const stops: Stop[] =
    peak !== undefined
      ? [[0, color, 0], [peak, color, opacity], [1, color, 0]]
      : reverse
        ? [[0, color, opacity], [1, color, 0]]
        : [[0, color, 0], [1, color, opacity]];
  return (
    <>
      <defs>
        <Linear id={id("h")} stops={stops} />
      </defs>
      <rect x={X0} y={y0} width={X1 - X0} height={y1 - y0} fill={`url(#${id("h")})`} pointerEvents="none" />
    </>
  );
}

/** The final grade over a scene: a soft vignette and a touch of light from one side. */
export function Grade({ light = "#fff6dc", lightX = 0.75, vignette = "#0b1428", strength = 0.22, lightStrength = 0.18 }: { light?: string; lightX?: number; vignette?: string; strength?: number; lightStrength?: number }) {
  const id = useIds();
  return (
    <g pointerEvents="none">
      <defs>
        <Radial id={id("v")} cx={0.5} cy={0.62} r={0.75} stops={[[0.55, vignette, 0], [1, vignette, strength]]} />
        <Radial id={id("l")} cx={lightX} cy={0.05} r={0.7} stops={[[0, light, lightStrength], [1, light, 0]]} />
      </defs>
      <rect x={X0} y={0} width={X1 - X0} height={H} fill={`url(#${id("l")})`} />
      <rect x={X0} y={0} width={X1 - X0} height={H} fill={`url(#${id("v")})`} />
    </g>
  );
}

/** A smooth silhouette (hills, dunes, tree lines) from seeded waves. */
export function ridgePath(seed: number, y: number, amp: number, opts: { waves?: number; x0?: number; x1?: number; bottom?: number; step?: number } = {}): { fill: string; top: string } {
  const { waves = 3, x0 = X0, x1 = X1, bottom = H + 10, step = 20 } = opts;
  const r = rng(seed);
  const parts = Array.from({ length: waves }, (_, i) => ({
    f: (0.6 + r() * 1.4) * (i + 1) * 0.0035,
    p: r() * Math.PI * 2,
    a: amp / (i + 1.2),
  }));
  const pts: [number, number][] = [];
  for (let x = x0; x <= x1; x += step) {
    let v = 0;
    for (const w of parts) v += Math.sin(x * w.f + w.p) * w.a;
    pts.push([x, y - v]);
  }
  // Catmull-Rom → cubic Bézier for a smooth line.
  let top = `M${pts[0]![0]} ${pts[0]![1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)]!;
    const p1 = pts[i]!;
    const p2 = pts[i + 1]!;
    const p3 = pts[Math.min(pts.length - 1, i + 2)]!;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    top += ` C${c1[0]!.toFixed(1)} ${c1[1]!.toFixed(1)} ${c2[0]!.toFixed(1)} ${c2[1]!.toFixed(1)} ${p2[0]} ${p2[1].toFixed(1)}`;
  }
  return { top, fill: `${top} L${x1} ${bottom} L${x0} ${bottom} Z` };
}

/** Rolling hills with a gradient body and a lit rim along the top. */
export function Ridge({ seed, y, amp, color, rim, waves, depthShade = 0.18, rimWidth = 3 }: { seed: number; y: number; amp: number; color: string; rim?: string; waves?: number; depthShade?: number; rimWidth?: number }) {
  const id = useIds();
  const p = useMemo(() => ridgePath(seed, y, amp, { waves }), [seed, y, amp, waves]);
  return (
    <g>
      <defs>
        <Linear id={id("r")} stops={[[0, shade(color, 0.04)], [0.5, color], [1, shade(color, -depthShade)]]} />
      </defs>
      <path d={p.fill} fill={`url(#${id("r")})`} />
      {rim && <path d={p.top} fill="none" stroke={rim} strokeWidth={rimWidth} strokeLinecap="round" opacity={0.7} />}
    </g>
  );
}

/** A soft shadow where something touches the floor. */
export function Contact({ x, y, rx, ry = rx * 0.14, color = "#0b1428", opacity = 0.22 }: { x: number; y: number; rx: number; ry?: number; color?: string; opacity?: number }) {
  const id = useIds();
  return (
    <>
      <defs>
        <Radial id={id("c")} stops={[[0, color, opacity], [0.6, color, opacity * 0.5], [1, color, 0]]} />
      </defs>
      <ellipse cx={x} cy={y} rx={rx} ry={ry} fill={`url(#${id("c")})`} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Sky things
// ---------------------------------------------------------------------------
/** A fluffy cloud lit from above: bright tops, a tinted belly. */
export function Cloud({ x, y, s = 1, tint = "#d8e4f0", light = "#ffffff", opacity = 1 }: { x: number; y: number; s?: number; tint?: string; light?: string; opacity?: number }) {
  const id = useIds();
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} opacity={opacity}>
      <defs>
        <Linear id={id("c")} stops={[[0, light], [0.55, light], [1, tint]]} />
      </defs>
      <g fill={`url(#${id("c")})`}>
        <ellipse cx="0" cy="8" rx="70" ry="18" />
        <circle cx="-34" cy="-2" r="24" />
        <circle cx="-6" cy="-16" r="30" />
        <circle cx="26" cy="-8" r="26" />
        <circle cx="50" cy="2" r="18" />
      </g>
      <ellipse cx="-4" cy="-28" rx="18" ry="7" fill={light} opacity="0.7" />
    </g>
  );
}

/**
 * Clouds drifting across the sky. Each depth drifts at its own speed (far is
 * slower), so the sky has layers too.
 */
export function CloudDrift({ seed, n, y: [ya, yb], s: [sa, sb], speed, tint, light, opacity = 1 }: { seed: number; n: number; y: [number, number]; s: [number, number]; speed: number; tint?: string; light?: string; opacity?: number }) {
  const clouds = useRng(seed, (r) =>
    Array.from({ length: n }, (_, i) => ({
      y: ya + r() * (yb - ya),
      s: sa + r() * (sb - sa),
      start: (i + r() * 0.6) / n,
    })),
  );
  return (
    <>
      {clouds.map((c, i) => (
        <g
          key={i}
          className="rocky-drift"
          style={{ ["--t" as string]: `${speed}s`, ["--dl" as string]: `${-c.start * speed}s`, ["--x" as string]: `${(c.start * 1440).toFixed(0)}px` }}
        >
          <Cloud x={-160} y={c.y} s={c.s} tint={tint} light={light} opacity={opacity} />
        </g>
      ))}
    </>
  );
}

/** Stars with a few twinkling. */
export function Starfield({ seed, n, y1 = 220, color = "#ffffff" }: { seed: number; n: number; y1?: number; color?: string }) {
  const stars = useRng(seed, (r) =>
    Array.from({ length: n }, () => ({ x: X0 + r() * (X1 - X0), y: r() * y1 * (0.4 + r() * 0.6), r: r() < 0.12 ? 1.9 : 0.6 + r() * 0.9, tw: r() < 0.25, dl: r() * 4 })),
  );
  return (
    <g fill={color}>
      {stars.map((s, i) => (
        <circle
          key={i}
          cx={s.x.toFixed(1)}
          cy={s.y.toFixed(1)}
          r={s.r.toFixed(2)}
          opacity={s.r > 1.5 ? 1 : 0.75}
          className={s.tw ? "rocky-twinkle" : undefined}
          style={s.tw ? { ["--dl" as string]: `${-s.dl}s` } : undefined}
        />
      ))}
    </g>
  );
}

/** Floating particles: dust in a light beam, pollen, fireflies, snow, embers. */
function MotesInner({ seed, n, x: [xa, xb], y: [ya, yb], r: [ra, rb] = [1, 2.2], color, glow = false, drift = [-20, -40], dur = [7, 13] }: { seed: number; n: number; x: [number, number]; y: [number, number]; r?: [number, number]; color: string; glow?: boolean; drift?: [number, number]; dur?: [number, number] }) {
  const id = useIds();
  const ms = useRng(seed, (rn) =>
    Array.from({ length: n }, () => ({
      x: xa + rn() * (xb - xa),
      y: ya + rn() * (yb - ya),
      r: ra + rn() * (rb - ra),
      t: dur[0] + rn() * (dur[1] - dur[0]),
      dl: rn(),
      mx: (rn() - 0.5) * 2 * drift[0],
      my: drift[1] * (0.5 + rn()),
    })),
  );
  return (
    <g>
      {glow && (
        <defs>
          <Radial id={id("g")} stops={[[0, color, 1], [0.3, color, 0.6], [1, color, 0]]} />
        </defs>
      )}
      {ms.map((m, i) => (
        <circle
          key={i}
          cx={m.x.toFixed(1)}
          cy={m.y.toFixed(1)}
          r={(glow ? m.r * 3 : m.r).toFixed(2)}
          fill={glow ? `url(#${id("g")})` : color}
          className="rocky-mote"
          style={{ ["--t" as string]: `${m.t.toFixed(1)}s`, ["--dl" as string]: `${(-m.dl * m.t).toFixed(1)}s`, ["--mx" as string]: `${m.mx.toFixed(0)}px`, ["--my" as string]: `${m.my.toFixed(0)}px` }}
        />
      ))}
    </g>
  );
}

/** A small flock of birds gliding across. */
export function Birds({ y, speed = 40, n = 3, color = "#3b4a5c", delay = 0 }: { y: number; speed?: number; n?: number; color?: string; delay?: number }) {
  return (
    <g className="rocky-drift" style={{ ["--t" as string]: `${speed}s`, ["--dl" as string]: `${-delay}s`, ["--x" as string]: "300px" }}>
      {Array.from({ length: n }, (_, i) => (
        <g key={i} transform={`translate(${-160 + i * 22 - (i % 2) * 8} ${y + (i % 2) * 9 - i * 2})`}>
          <path d="M-7 0 Q-3.5 -4 0 0 Q3.5 -4 7 0" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" className="rocky-flap" />
        </g>
      ))}
    </g>
  );
}

// ---------------------------------------------------------------------------
// Ground things
// ---------------------------------------------------------------------------
/**
 * A floor that recedes: a gradient plane from the horizon to the bottom, with
 * optional perspective lines running to a vanishing point.
 */
export function Floor({ y, top, bottom, lines, vx = 500, lineColor, lineOpacity = 0.25, rows, rowColor }: { y: number; top: string; bottom: string; lines?: number; vx?: number; lineColor?: string; lineOpacity?: number; rows?: number; rowColor?: string }) {
  const id = useIds();
  const vy = y - 260;
  return (
    <g>
      <defs>
        <Linear id={id("f")} stops={[[0, top], [1, bottom]]} />
      </defs>
      <rect x={X0} y={y} width={X1 - X0} height={H - y + 10} fill={`url(#${id("f")})`} />
      {lines && lineColor && (
        <g stroke={lineColor} strokeWidth="1.5" opacity={lineOpacity}>
          {Array.from({ length: lines + 1 }, (_, i) => {
            const bx = X0 - 400 + ((X1 - X0 + 800) * i) / lines;
            // From the horizon (on the line toward the vanishing point) to past the bottom.
            const t = (y - vy) / (H + 10 - vy);
            const hx = vx + (bx - vx) * t;
            return <line key={i} x1={hx.toFixed(1)} y1={y} x2={bx.toFixed(1)} y2={H + 10} />;
          })}
        </g>
      )}
      {rows && rowColor && (
        <g stroke={rowColor} strokeWidth="1.5" opacity={lineOpacity}>
          {Array.from({ length: rows }, (_, i) => {
            // Rows get further apart toward the viewer.
            const t = (i + 1) / (rows + 1);
            const ry = y + (H - y) * t * t * 1.05;
            return <line key={i} x1={X0} y1={ry.toFixed(1)} x2={X1} y2={ry.toFixed(1)} />;
          })}
        </g>
      )}
    </g>
  );
}

/** Tufts of grass along a band, darker and bigger toward the viewer. */
export function GrassTufts({ seed, n, y: [ya, yb], color, x: [xa, xb] = [X0, X1], sway = true }: { seed: number; n: number; y: [number, number]; color: string; x?: [number, number]; sway?: boolean }) {
  const tufts = useRng(seed, (r) =>
    Array.from({ length: n }, () => {
      const t = r();
      return { x: xa + r() * (xb - xa), y: ya + t * (yb - ya), s: 0.5 + t * 0.9, c: shade(color, -0.05 - t * 0.2 + r() * 0.08), dl: r() * 4 };
    }).sort((a, b) => a.y - b.y),
  );
  return (
    <g>
      {tufts.map((g, i) => (
        <g key={i} transform={`translate(${g.x.toFixed(1)} ${g.y.toFixed(1)}) scale(${g.s.toFixed(2)})`}>
          <path
            d="M-6 0 Q-7 -8 -10 -13 Q-4 -8 -2 0 Q-1 -11 1 -17 Q2 -9 2 0 Q4 -9 9 -12 Q5 -6 6 0 Z"
            fill={g.c}
            // Only every third tuft sways: plenty of life, a third of the repaint.
            className={sway && i % 3 === 0 ? "rocky-sway" : undefined}
            style={sway && i % 3 === 0 ? { ["--dl" as string]: `${-g.dl}s` } : undefined}
          />
        </g>
      ))}
    </g>
  );
}

/** A leafy tree with light from the upper right: lit crown, shaded underside, trunk, contact shadow. */
export function LeafyTree({ x, y, s = 1, hue = "#3f9a4a", light = "#9fe07a", trunk = "#6b4a32", seed = 1, sway = false }: { x: number; y: number; s?: number; hue?: string; light?: string; trunk?: string; seed?: number; sway?: boolean }) {
  const id = useIds();
  const blobs = useRng(seed, (r) =>
    Array.from({ length: 7 }, (_, i) => ({ x: (i - 3) * 13 + (r() - 0.5) * 10, y: -64 - Math.abs(i - 3) * -6 - r() * 22, r: 20 + r() * 12 })),
  );
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <defs>
        <Radial id={id("t")} cx={0.62} cy={0.3} r={0.75} stops={[[0, light], [0.45, hue], [1, shade(hue, -0.35)]]} />
      </defs>
      <ellipse cx="6" cy="0" rx="44" ry="7" fill="#0b1428" opacity="0.14" />
      <path d="M-5 0 L-3 -46 Q0 -56 3 -46 L6 0 Z" fill={trunk} />
      <path d="M1 0 L3 -46 Q4 -52 3 -46 L6 0 Z" fill={shade(trunk, -0.25)} />
      <g className={sway ? "rocky-sway" : undefined} fill={`url(#${id("t")})`}>
        {blobs.map((b, i) => (
          <circle key={i} cx={b.x.toFixed(1)} cy={b.y.toFixed(1)} r={b.r.toFixed(1)} />
        ))}
        <ellipse cx="0" cy="-62" rx="44" ry="26" />
      </g>
    </g>
  );
}

/** A conifer: stacked tiers lit on the right. */
export function Conifer({ x, y, s = 1, hue = "#2f6b4a", light = "#5aa070", snow = false }: { x: number; y: number; s?: number; hue?: string; light?: string; snow?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx="4" cy="0" rx="24" ry="4" fill="#0b1428" opacity="0.15" />
      <rect x="-3" y="-14" width="6" height="14" fill="#5a3f2b" />
      {[0, 1, 2].map((k) => {
        const ty = -12 - k * 20;
        const w = 24 - k * 6;
        return (
          <g key={k}>
            <path d={`M${-w} ${ty} L0 ${ty - 34} L${w} ${ty} Z`} fill={hue} />
            <path d={`M0 ${ty - 34} L${w} ${ty} L${w * 0.25} ${ty} Z`} fill={light} opacity="0.55" />
            {snow && <path d={`M${-w * 0.45} ${ty - 19} L0 ${ty - 34} L${w * 0.45} ${ty - 19} Q0 ${ty - 14} ${-w * 0.45} ${ty - 19} Z`} fill="#ffffff" />}
          </g>
        );
      })}
    </g>
  );
}

/** A parcel with tape, label and a lit top face (seen slightly from above). */
export function Parcel({ x, y, w, h, tone = 0, label = true }: { x: number; y: number; w: number; h: number; tone?: number; label?: boolean }) {
  const c = ["#c99a63", "#d6a86f", "#b88650", "#e0b67c"][tone % 4]!;
  const top = Math.min(10, h * 0.25);
  return (
    <g>
      <path d={`M${x} ${y} L${x + 6} ${y - top} L${x + w + 6} ${y - top} L${x + w} ${y} Z`} fill={shade(c, 0.25)} />
      <path d={`M${x + w} ${y} L${x + w + 6} ${y - top} L${x + w + 6} ${y + h - top} L${x + w} ${y + h} Z`} fill={shade(c, -0.22)} />
      <rect x={x} y={y} width={w} height={h} fill={c} />
      <rect x={x + w / 2 - 3} y={y} width="6" height={h} fill="#f3dcb2" opacity="0.75" />
      <path d={`M${x + w / 2 - 3} ${y} L${x + w / 2 + 3} ${y - top} L${x + w / 2 + 9} ${y - top} L${x + w / 2 + 3} ${y} Z`} fill="#f7e6c6" opacity="0.8" />
      {label && tone % 2 === 0 && (
        <g>
          <rect x={x + 4} y={y + h - 13} width={Math.max(10, w * 0.36)} height="9" rx="1" fill="#ffffff" />
          <path d={`M${x + 6} ${y + h - 11} v5 M${x + 8} ${y + h - 11} v5 M${x + 11} ${y + h - 11} v5 M${x + 13} ${y + h - 11} v5`} stroke="#3b4a5c" strokeWidth="1" />
        </g>
      )}
      <rect x={x} y={y + h - 2} width={w} height="2" fill={shade(c, -0.3)} opacity="0.5" />
    </g>
  );
}

/** A shipping container, side view, with corrugation and a lit top edge. */
export function Container({ x, y, w = 120, h = 52, color, label }: { x: number; y: number; w?: number; h?: number; color: string; label?: string }) {
  const ribs = Math.floor(w / 7);
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill={color} />
      <g stroke={shade(color, -0.22)} strokeWidth="2">
        {Array.from({ length: ribs }, (_, i) => (
          <line key={i} x1={x + 5 + i * 7} y1={y + 4} x2={x + 5 + i * 7} y2={y + h - 4} />
        ))}
      </g>
      <rect x={x} y={y} width={w} height="3" fill={shade(color, 0.35)} />
      <rect x={x} y={y + h - 4} width={w} height="4" fill={shade(color, -0.35)} />
      <rect x={x} y={y} width="4" height={h} fill={shade(color, -0.3)} />
      <rect x={x + w - 4} y={y} width="4" height={h} fill={shade(color, -0.3)} />
      {label && <RlxMark x={x + w / 2 - 15 * (h / 52)} y={y + h / 2 - 6 * (h / 52)} s={h / 52} color="#ffffff" />}
    </g>
  );
}

/** A lamp's pool of light (additive-looking glow) on the floor or in the air. */
export function Glow({ x, y, rx, ry = rx, color, opacity = 0.6, className }: { x: number; y: number; rx: number; ry?: number; color: string; opacity?: number; className?: string }) {
  const id = useIds();
  return (
    <>
      <defs>
        <Radial id={id("g")} stops={[[0, color, opacity], [0.4, color, opacity * 0.4], [1, color, 0]]} />
      </defs>
      <ellipse cx={x} cy={y} rx={rx} ry={ry} fill={`url(#${id("g")})`} className={className} />
    </>
  );
}

/** A cone of light from a lamp down to the floor. */
export function Beam({ x, y, w0, w1, y1, color, opacity = 0.35, className }: { x: number; y: number; w0: number; w1: number; y1: number; color: string; opacity?: number; className?: string }) {
  const id = useIds();
  return (
    <>
      <defs>
        <Linear id={id("b")} stops={[[0, color, opacity], [1, color, 0]]} />
      </defs>
      <path d={`M${x - w0 / 2} ${y} L${x + w0 / 2} ${y} L${x + w1 / 2} ${y1} L${x - w1 / 2} ${y1} Z`} fill={`url(#${id("b")})`} className={className} />
    </>
  );
}

/** Lit windows on a facade: a grid where a seeded share is on. */
export function Windows({ seed, x, y, cols, rows, w, h, gx, gy, on, off, share = 0.55, flicker = false }: { seed: number; x: number; y: number; cols: number; rows: number; w: number; h: number; gx: number; gy: number; on: string; off: string; share?: number; flicker?: boolean }) {
  const cells = useRng(seed, (r) => Array.from({ length: cols * rows }, () => ({ lit: r() < share, f: r() < 0.08, dl: r() * 6 })));
  return (
    <g>
      {cells.map((c, i) => (
        <rect
          key={i}
          x={x + (i % cols) * (w + gx)}
          y={y + Math.floor(i / cols) * (h + gy)}
          width={w}
          height={h}
          fill={c.lit ? on : off}
          className={flicker && c.f ? "rocky-flicker" : undefined}
          style={flicker && c.f ? { ["--dl" as string]: `${-c.dl}s` } : undefined}
        />
      ))}
    </g>
  );
}

/** Water that shimmers: a gradient body with moving highlight streaks. */
export function Water({ y, y1 = H + 10, top, bottom, streak = "#ffffff", seed = 3, n = 26 }: { y: number; y1?: number; top: string; bottom: string; streak?: string; seed?: number; n?: number }) {
  const id = useIds();
  const lines = useRng(seed, (r) =>
    Array.from({ length: n }, () => {
      const t = r();
      return { x: X0 + r() * (X1 - X0), y: y + 4 + t * t * (y1 - y - 8), w: 10 + t * 50, o: 0.25 + r() * 0.45, dl: r() * 5 };
    }),
  );
  return (
    <g>
      <defs>
        <Linear id={id("w")} stops={[[0, top], [1, bottom]]} />
      </defs>
      <rect x={X0} y={y} width={X1 - X0} height={y1 - y} fill={`url(#${id("w")})`} />
      {lines.map((l, i) => (
        <rect
          key={i}
          x={l.x.toFixed(1)}
          y={l.y.toFixed(1)}
          width={l.w.toFixed(1)}
          height="1.6"
          rx="0.8"
          fill={streak}
          opacity={l.o.toFixed(2)}
          className="rocky-shimmer"
          style={{ ["--dl" as string]: `${-l.dl}s` }}
        />
      ))}
    </g>
  );
}

/**
 * A conveyor belt from x0 to x1 at height y (top of the belt), drawn at a
 * depth scale `s`, with parcels riding it at a constant speed.
 */
export function Belt({ x0, x1, y, s = 1, floor, frame = "#3b4a5c", speed = 14, n = 5, seed = 1, legs = true, reverse = false }: { x0: number; x1: number; y: number; s?: number; floor?: number; frame?: string; speed?: number; n?: number; seed?: number; legs?: boolean; reverse?: boolean }) {
  const id = useIds();
  const len = x1 - x0;
  const parcels = useRng(seed, (r) =>
    Array.from({ length: n }, (_, i) => ({ w: (26 + r() * 22) * s, h: (16 + r() * 18) * s, tone: Math.floor(r() * 4), at: (i + r() * 0.5) / n })),
  );
  const rail = 9 * s;
  return (
    <g>
      <defs>
        <clipPath id={id("clip")}>
          <rect x={x0} y={y - 80 * s} width={len} height={80 * s + 2} />
        </clipPath>
        <Linear id={id("rail")} stops={[[0, shade(frame, 0.25)], [0.4, frame], [1, shade(frame, -0.3)]]} />
      </defs>
      {legs && floor !== undefined &&
        Array.from({ length: Math.max(2, Math.round(len / (140 * s))) }, (_, i) => {
          const count = Math.max(2, Math.round(len / (140 * s)));
          const lx = x0 + 10 * s + ((len - 20 * s) * i) / (count - 1);
          return (
            <g key={i}>
              <rect x={lx - 3 * s} y={y + rail} width={6 * s} height={floor - y - rail} fill={shade(frame, -0.15)} />
              <rect x={lx - 8 * s} y={floor - 3 * s} width={16 * s} height={3 * s} fill={shade(frame, -0.3)} />
            </g>
          );
        })}
      <g clipPath={`url(#${id("clip")})`}>
        {parcels.map((p, i) => (
          <g
            key={i}
            className="rocky-run"
            style={{
              ["--t" as string]: `${speed}s`,
              ["--dl" as string]: `${(-p.at * speed).toFixed(2)}s`,
              ["--from" as string]: reverse ? `${len + 60 * s}px` : "0px",
              ["--to" as string]: reverse ? "0px" : `${len + 60 * s}px`,
              ["--x" as string]: `${((reverse ? 1 - p.at : p.at) * (len + 60 * s)).toFixed(0)}px`,
            }}
          >
            <Parcel x={x0 - 60 * s} y={y - p.h} w={p.w} h={p.h} tone={p.tone} label={s > 0.6} />
          </g>
        ))}
      </g>
      <rect x={x0} y={y} width={len} height={rail} fill={`url(#${id("rail")})`} />
      <line x1={x0} y1={y + 1.5 * s} x2={x1} y2={y + 1.5 * s} stroke="#1b2433" strokeWidth={2.4 * s} strokeDasharray={`${4 * s} ${4 * s}`} className="rocky-belt" />
      <rect x={x0} y={y + rail - 2 * s} width={len} height={2 * s} fill={GOLD} opacity="0.9" />
    </g>
  );
}

/** A smooth curve through points (Catmull-Rom as cubic Béziers). `close` adds no Z; join paths yourself. */
export function smoothPath(pts: [number, number][], move = true): string {
  if (pts.length < 2) return "";
  let d = move ? `M${pts[0]![0].toFixed(1)} ${pts[0]![1].toFixed(1)}` : `L${pts[0]![0].toFixed(1)} ${pts[0]![1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)]!;
    const p1 = pts[i]!;
    const p2 = pts[i + 1]!;
    const p3 = pts[Math.min(pts.length - 1, i + 2)]!;
    d += ` C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)} ${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)} ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)} ${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}

/** A path of varying width along a center line (roads, rivers, trails): [x, y, width] points, near to far. */
export function ribbon(center: [number, number, number][]): { body: string; mid: string } {
  const left: [number, number][] = [];
  const right: [number, number][] = [];
  for (let i = 0; i < center.length; i++) {
    const [x, y, w] = center[i]!;
    const a = center[Math.max(0, i - 1)]!;
    const b = center[Math.min(center.length - 1, i + 1)]!;
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    // Mostly horizontal width (a flat road seen from above-ish), a little along the normal.
    const nx = (-dy / len) * 0.35;
    const ny = (dx / len) * 0.35;
    left.push([x - w / 2 + nx * w * 0, y - (ny * w) / 2]);
    right.push([x + w / 2, y + (ny * w) / 2]);
  }
  const body = `${smoothPath(left)} ${smoothPath(right.slice().reverse(), false)} Z`;
  return { body, mid: smoothPath(center.map(([x, y]) => [x, y])) };
}

/**
 * A ground plane seen by a camera at `cam` height with the horizon at `hzn`:
 * X across (0 = middle), Z depth (1 = the bottom edge of the frame at cam=200).
 */
export function ground(hzn: number, cam = 200) {
  const gx = (X: number, Z: number) => 500 + X / Z;
  const gy = (Z: number, h = 0) => hzn + (cam - h) / Z;
  const gp = (X: number, Z: number, h = 0) => `${gx(X, Z).toFixed(1)} ${gy(Z, h).toFixed(1)}`;
  /** A polygon on the ground from [X, Z] corners. */
  const poly = (pts: [number, number][]) => `M${pts.map(([X, Z]) => gp(X, Z)).join(" L")} Z`;
  /** An ellipse-ish ring on the ground (center X,Z, radii in X units), as a polygon. */
  const ring = (X: number, Z: number, rx: number, rz: number, n = 48) =>
    poly(Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2;
      return [X + Math.cos(a) * rx, Z + (Math.sin(a) * rz) / 1] as [number, number];
    }));
  return { gx, gy, gp, poly, ring };
}

/** Long, soft banks of fog drifting slowly through a valley (not puffy clouds). */
export function FogBank({ seed, n, y: [ya, yb], color = "#ffffff", opacity = 0.7, speed = 200 }: { seed: number; n: number; y: [number, number]; color?: string; opacity?: number; speed?: number }) {
  const id = useIds();
  const banks = useRng(seed, (r) =>
    Array.from({ length: n }, (_, i) => ({ y: ya + r() * (yb - ya), rx: 180 + r() * 220, ry: 10 + r() * 14, at: (i + r() * 0.5) / n })),
  );
  return (
    <g>
      <defs>
        <Radial id={id("f")} stops={[[0, color, opacity], [0.55, color, opacity * 0.55], [1, color, 0]]} />
      </defs>
      {banks.map((b, i) => (
        <g key={i} className="rocky-drift" style={{ ["--t" as string]: `${speed}s`, ["--dl" as string]: `${(-b.at * speed).toFixed(1)}s`, ["--x" as string]: `${(b.at * 1440).toFixed(0)}px` }}>
          <ellipse cx={-200} cy={b.y.toFixed(1)} rx={b.rx.toFixed(1)} ry={b.ry.toFixed(1)} fill={`url(#${id("f")})`} />
        </g>
      ))}
    </g>
  );
}

/**
 * Snow falling in three depths (far: small and slow, near: big and fast).
 * Each layer is a tile 420 tall drawn twice, so the fall loops seamlessly.
 */
function SnowfallInner({ seed, n = 40, color = "#ffffff" }: { seed: number; n?: number; color?: string }) {
  const layers = useRng(seed, (r) =>
    [
      { s: 1.1, t: 16, o: 0.6 },
      { s: 1.9, t: 11, o: 0.8 },
      { s: 3, t: 7, o: 0.95 },
    ].map((l) => ({ ...l, flakes: Array.from({ length: n }, () => ({ x: X0 + r() * (X1 - X0), y: r() * 420, r: l.s * (0.7 + r() * 0.6) })) })),
  );
  return (
    <g>
      {layers.map((l, i) => (
        <g key={i} className="rocky-snowfall" style={{ animationDuration: `${l.t}s` }} opacity={l.o}>
          {[0, 420].map((dy) =>
            l.flakes.map((f, k) => <circle key={`${dy}-${k}`} cx={f.x.toFixed(1)} cy={(f.y + dy - 420).toFixed(1)} r={f.r.toFixed(2)} fill={color} />),
          )}
        </g>
      ))}
    </g>
  );
}

/** Floating particles (see MotesInner), drawn on the particle layer. */
export function Motes(props: ComponentProps<typeof MotesInner>) {
  return (
    <Particles>
      <MotesInner {...props} />
    </Particles>
  );
}

/** Falling snow (see SnowfallInner), drawn on the particle layer. */
export function Snowfall(props: ComponentProps<typeof SnowfallInner>) {
  return (
    <Particles>
      <SnowfallInner {...props} />
    </Particles>
  );
}

/**
 * "RLX" drawn as strokes (30 x 12 at s=1, origin top-left). Moving things use
 * this instead of <text>: SVG text inside an animated transform is laid out
 * again on every frame.
 */
export function RlxMark({ x = 0, y = 0, s = 1, color = NAVY, w = 2.6 }: { x?: number; y?: number; s?: number; color?: string; w?: number }) {
  return (
    <path
      transform={`translate(${x} ${y}) scale(${s})`}
      d="M1 12 V1 H6 Q10 1 10 4 Q10 7 6 7 H1 M5.5 7 L10 12 M14 1 V11 H20 M23 1 L30 12 M30 1 L23 12"
      fill="none"
      stroke={color}
      strokeWidth={w}
      strokeLinecap="square"
      strokeLinejoin="miter"
    />
  );
}
