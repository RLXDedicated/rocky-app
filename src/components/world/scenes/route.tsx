// Delivery route (day, sunset, night): a country road built on a real ground
// plane, so it narrows, its dashes shorten and its poles, trees and houses
// shrink with distance. Farm fields stretch to the hills, the RLX van drives
// the road, a map pin bobs over the next stop and Rocky stands in the meadow.
import { useMemo } from "react";
import {
  Birds,
  CloudDrift,
  Contact,
  Depth,
  Glow,
  GOLD,
  Grade,
  GREEN2,
  GrassTufts,
  Haze,
  Linear,
  Motes,
  NAVY,
  Ridge,
  RlxMark,
  rng,
  shade,
  Sky,
  Starfield,
  useIds,
  WHITE,
  type SceneProps,
} from "./kit";

export type TimeOfDay = "day" | "sunset" | "night";

const HZN = 202; // horizon
const CAM = 200; // camera height
const px = (X: number, Z: number) => 500 + X / Z;
const py = (Z: number) => HZN + CAM / Z;
const ZK = 420; // Z in X units, for turning directions along the ground

interface Palette {
  sky: [number, string][];
  sun: { x: number; y: number; r: number; color: string; strength: number };
  disc: string | null;
  hillFar: string;
  hillMid: string;
  rim: string;
  air: string;
  fields: string[];
  grassNear: [string, string];
  road: [string, string];
  line: string;
  shoulder: string;
  tree: [string, string];
  wall: string[];
  roof: string[];
  window: string;
  pole: string;
  light: string;
  vignette: string;
  cloudTint: string;
  cloudLight: string;
}

const PALETTE: Record<TimeOfDay, Palette> = {
  day: {
    sky: [[0, "#5ea8e0"], [0.55, "#a9d6f2"], [0.9, "#e9f6fb"], [1, "#f6fbf4"]],
    sun: { x: 760, y: 64, r: 230, color: "#fff4cf", strength: 0.9 },
    disc: "#fffbe8",
    hillFar: "#a9c9c9",
    hillMid: "#8cc39a",
    rim: "#d9f2df",
    air: "#e6f3f6",
    fields: ["#9fd27a", "#c9dc7a", "#7cbf6a", "#e3d58c", "#8fcf86", "#b6d97c"],
    grassNear: ["#7cc35a", "#4f9a42"],
    road: ["#8c939e", "#5c6370"],
    line: "#ffffff",
    shoulder: "#d9cfb8",
    tree: ["#3f9a4a", "#a6dc7e"],
    wall: ["#fff7ec", "#f2f6fa", "#fdf1e2", "#eef5ea"],
    roof: ["#c9564c", "#3a78c2", "#e08b3a", "#6b4a3a"],
    window: "#a9cbe0",
    pole: "#6b5240",
    light: "#fff2cf",
    vignette: "#0b1428",
    cloudTint: "#cfe2f0",
    cloudLight: "#ffffff",
  },
  sunset: {
    sky: [[0, "#3b4a8c"], [0.38, "#b4669a"], [0.66, "#f08f6f"], [0.88, "#ffc27a"], [1, "#ffe0a8"]],
    sun: { x: 545, y: 186, r: 280, color: "#ffcf86", strength: 1 },
    disc: "#fff0c8",
    hillFar: "#a46a8a",
    hillMid: "#7f5a78",
    rim: "#ffc796",
    air: "#ffc89a",
    fields: ["#c98a5a", "#d9a35e", "#a8744e", "#e0b070", "#b98a5e", "#cf9a62"],
    grassNear: ["#a8925a", "#6f5a3e"],
    road: ["#9c8486", "#5c4a54"],
    line: "#fff1dc",
    shoulder: "#e6c3a0",
    tree: ["#5a5a3e", "#d9a86a"],
    wall: ["#ffe6cf", "#f6dcd0", "#ffeedd", "#f2d8c8"],
    roof: ["#a8443c", "#46507a", "#c46a3a", "#5a3a34"],
    window: "#ffd98a",
    pole: "#4a3434",
    light: "#ffcf86",
    vignette: "#2a0f28",
    cloudTint: "#c46a7a",
    cloudLight: "#ffc89a",
  },
  night: {
    sky: [[0, "#070f26"], [0.5, "#13244a"], [0.85, "#24406b"], [1, "#2f4f7a"]],
    sun: { x: 800, y: 64, r: 160, color: "#cfe0ff", strength: 0.45 },
    disc: null,
    hillFar: "#1c3156",
    hillMid: "#16284a",
    rim: "#4a6a9a",
    air: "#2c4870",
    fields: ["#1f3a5c", "#22405f", "#1b3456", "#264766", "#1d385a", "#213e62"],
    grassNear: ["#24466a", "#142a48"],
    road: ["#3a4a66", "#252f45"],
    line: "#f5b82e",
    shoulder: "#3d5070",
    tree: ["#15304f", "#3c6390"],
    wall: ["#3a5480", "#34507a", "#3d5884", "#36527c"],
    roof: ["#1e2f52", "#1b2a4a", "#22345a", "#1a2846"],
    window: "#ffd98a",
    pole: "#1b2740",
    light: "#9fc0ff",
    vignette: "#02061a",
    cloudTint: "#1e3358",
    cloudLight: "#3e5a88",
  },
};

/** The road's center line on the ground (X across, Z depth), near → far. */
const ROAD: [number, number][] = [
  [-1500, 1.45],
  [-700, 1.75],
  [-150, 2.15],
  [260, 2.9],
  [420, 4.3],
  [300, 6.6],
  [440, 10.5],
  [800, 17],
  [1300, 28],
];
const ROAD_W = 300;

/** Samples the road spline (Catmull-Rom in ground space). */
function sampleRoad(n: number): { X: number; Z: number; tx: number; tz: number }[] {
  const out: { X: number; Z: number; tx: number; tz: number }[] = [];
  const P = ROAD;
  for (let k = 0; k <= n; k++) {
    const u = (k / n) * (P.length - 1);
    const i = Math.min(P.length - 2, Math.floor(u));
    const t = u - i;
    const p0 = P[Math.max(0, i - 1)]!;
    const p1 = P[i]!;
    const p2 = P[i + 1]!;
    const p3 = P[Math.min(P.length - 1, i + 2)]!;
    const cr = (a: number, b: number, c: number, d: number) =>
      0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t);
    const crd = (a: number, b: number, c: number, d: number) =>
      0.5 * ((-a + c) + 2 * (2 * a - 5 * b + 4 * c - d) * t + 3 * (-a + 3 * b - 3 * c + d) * t * t);
    out.push({
      X: cr(p0[0], p1[0], p2[0], p3[0]),
      Z: cr(p0[1], p1[1], p2[1], p3[1]),
      tx: crd(p0[0], p1[0], p2[0], p3[0]),
      tz: crd(p0[1], p1[1], p2[1], p3[1]) * ZK,
    });
  }
  return out;
}

/** A point beside the road, `off` across from its center (negative = left). */
function beside(s: { X: number; Z: number; tx: number; tz: number }, off: number): [number, number] {
  const len = Math.hypot(s.tx, s.tz) || 1;
  // Normal on the ground: (tz, -tx) in X units, Z back in Z units.
  return [s.X + (s.tz / len) * off, s.Z + ((-s.tx / len) * off) / ZK];
}

const scr = ([X, Z]: [number, number]) => `${px(X, Z).toFixed(1)} ${py(Z).toFixed(1)}`;

function Cottage({ X, Z, wall, roof, window, night, seed }: { X: number; Z: number; wall: string; roof: string; window: string; night: boolean; seed: number }) {
  const s = 1 / Z;
  const x = px(X, Z);
  const y = py(Z);
  const lit = rng(seed)() < (night ? 0.85 : 0.2);
  return (
    <g transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${(s * 2.2).toFixed(3)})`}>
      <ellipse cx="4" cy="0" rx="70" ry="8" fill="#0b1428" opacity="0.14" />
      <path d="M-50 0 L-50 -52 L-62 -48 L-62 -4 Z" fill={shade(wall, -0.3)} />
      <rect x="-50" y="-52" width="100" height="52" fill={wall} />
      <path d="M-66 -48 L0 -96 L64 -48 Z" fill={roof} />
      <path d="M0 -96 L64 -48 L56 -48 L0 -88 Z" fill={shade(roof, 0.25)} />
      <path d="M-66 -48 L0 -96 L0 -90 L-58 -48 Z" fill={shade(roof, -0.25)} />
      <rect x="-34" y="-38" width="20" height="18" fill={lit ? "#ffd98a" : window} />
      <rect x="14" y="-38" width="20" height="18" fill={lit ? "#ffd98a" : window} />
      <rect x="-8" y="-30" width="16" height="30" fill={shade(roof, -0.1)} />
      {night && lit && <Glow x={0} y={-30} rx={70} ry={40} color="#ffd98a" opacity={0.35} />}
    </g>
  );
}

function RoadTree({ X, Z, c, seed, sway }: { X: number; Z: number; c: [string, string]; seed: number; sway: boolean }) {
  const id = useIds();
  const s = (1 / Z) * 1.9;
  const r = rng(seed);
  const blobs = Array.from({ length: 6 }, (_, i) => ({ x: (i - 2.5) * 14 + (r() - 0.5) * 10, y: -70 - r() * 30, r: 20 + r() * 12 }));
  return (
    <g transform={`translate(${px(X, Z).toFixed(1)} ${py(Z).toFixed(1)}) scale(${s.toFixed(3)})`}>
      <defs>
        <radialGradient id={id("t")} cx="0.65" cy="0.3" r="0.8">
          <stop offset="0" stopColor={c[1]} />
          <stop offset="0.5" stopColor={c[0]} />
          <stop offset="1" stopColor={shade(c[0], -0.4)} />
        </radialGradient>
      </defs>
      <ellipse cx="10" cy="0" rx="46" ry="7" fill="#0b1428" opacity="0.16" />
      <path d="M-6 0 L-3 -54 L4 -54 L7 0 Z" fill="#5a3f2b" />
      <g className={sway ? "rocky-sway" : undefined} style={{ ["--dl" as string]: `${-r() * 4}s` }} fill={`url(#${id("t")})`}>
        {blobs.map((b, i) => (
          <circle key={i} cx={b.x.toFixed(1)} cy={b.y.toFixed(1)} r={b.r.toFixed(1)} />
        ))}
        <ellipse cx="0" cy="-74" rx="46" ry="30" />
      </g>
    </g>
  );
}

/** The RLX van, side view facing right, wheels on y=0. */
function Van({ night }: { night: boolean }) {
  return (
    <g>
      <ellipse cx="74" cy="2" rx="80" ry="7" fill="#0b1428" opacity="0.22" />
      <rect x="0" y="-70" width="112" height="58" rx="6" fill={WHITE} />
      <rect x="0" y="-70" width="112" height="6" rx="3" fill="#ffffff" />
      <rect x="0" y="-34" width="112" height="9" fill={NAVY} />
      <rect x="0" y="-25" width="112" height="3" fill={GREEN2} />
      <RlxMark x={20} y={-60} s={1.3} />
      <path d="M112 -52 L136 -52 L154 -30 L154 -12 L112 -12 Z" fill={NAVY} />
      <path d="M118 -47 L134 -47 L146 -31 L118 -31 Z" fill="#9fc6e8" />
      <circle cx="34" cy="-10" r="12" fill="#141a2e" />
      <circle cx="34" cy="-10" r="5" fill="#9aa7b4" />
      <circle cx="128" cy="-10" r="12" fill="#141a2e" />
      <circle cx="128" cy="-10" r="5" fill="#9aa7b4" />
      <rect x="150" y="-26" width="6" height="6" fill="#fff6d6" />
      {night && <path d="M156 -24 L300 -50 L300 6 Z" fill="#fff6d6" opacity="0.22" />}
    </g>
  );
}

export function RouteScene({ time = "day", live = false }: SceneProps & { time?: TimeOfDay }) {
  const c = PALETTE[time];
  const night = time === "night";
  const id = useIds();
  const pts = useMemo(() => sampleRoad(160), []);

  const road = useMemo(() => {
    const L = pts.map((s) => beside(s, -ROAD_W / 2));
    const R = pts.map((s) => beside(s, ROAD_W / 2));
    const body = `M${L.map(scr).join(" L")} L${R.slice().reverse().map(scr).join(" L")} Z`;
    const SL = pts.map((s) => beside(s, -ROAD_W / 2 - 40));
    const SR = pts.map((s) => beside(s, ROAD_W / 2 + 40));
    const shoulder = `M${SL.map(scr).join(" L")} L${SR.slice().reverse().map(scr).join(" L")} Z`;
    // Center dashes: every other stretch of the line, as thin quads that foreshorten.
    const dashes: string[] = [];
    for (let k = 0; k < pts.length - 2; k += 4) {
      const a = pts[k]!;
      const b = pts[k + 2]!;
      const q = [beside(a, -5), beside(b, -5), beside(b, 5), beside(a, 5)];
      dashes.push(`M${q.map(scr).join(" L")} Z`);
    }
    return { body, shoulder, dashes };
  }, [pts]);

  // Farm fields on the ground plane: they narrow and pack together with distance.
  const fields = useMemo(() => {
    const r = rng(17);
    const out: { d: string; fill: string; rows: string | null }[] = [];
    const zs = [5, 6.5, 8.5, 11, 14.5, 19, 26, 36, 60];
    for (let j = 0; j < zs.length - 1; j++) {
      let X = -9000;
      while (X < 9000) {
        const w = 700 + r() * 1500;
        const z0 = zs[j]!;
        const z1 = zs[j + 1]!;
        const corners: [number, number][] = [[X, z0], [X + w, z0], [X + w, z1], [X, z1]];
        const fill = c.fields[Math.floor(r() * c.fields.length)]!;
        // Crop rows run toward the horizon on some fields.
        let rows: string | null = null;
        if (r() < 0.55 && z0 < 20) {
          const n = 5;
          rows = Array.from({ length: n }, (_, k) => {
            const xx = X + (w * (k + 0.5)) / n;
            return `M${scr([xx, z0])} L${scr([xx, z1])}`;
          }).join(" ");
        }
        out.push({ d: `M${corners.map(scr).join(" L")} Z`, fill, rows });
        X += w;
      }
    }
    return out;
  }, [c.fields]);

  // Poles along the right side of the road, with sagging wires.
  const poles = useMemo(() => {
    const idx = [30, 46, 64, 84, 106, 130];
    return idx.map((k) => {
      const s = pts[k]!;
      const [X, Z] = beside(s, ROAD_W / 2 + 120);
      return { x: px(X, Z), y: py(Z), h: 360 / Z, w: 7 / Z, Z };
    });
  }, [pts]);

  // Trees and cottages placed in the world beside the road.
  const trees = useMemo(() => {
    const r = rng(5);
    const out: { X: number; Z: number; seed: number }[] = [];
    for (let k = 10; k < 150; k += 7) {
      const s = pts[k]!;
      const side = r() < 0.5 ? -1 : 1;
      const [X, Z] = beside(s, side * (ROAD_W / 2 + 220 + r() * 900));
      out.push({ X, Z, seed: k });
    }
    // Only from the middle distance back (nearer ones would cover the stage), plus two framing trees at the edges.
    const kept = out.filter((t) => t.Z >= 3.4 && Math.abs(t.X / t.Z) < 900);
    kept.push({ X: -900, Z: 3.4, seed: 91 }, { X: 820, Z: 2.05, seed: 92 });
    return kept.sort((a, b) => b.Z - a.Z);
  }, [pts]);
  const cottages: { X: number; Z: number }[] = [
    { X: -1400, Z: 5.2 },
    { X: 1500, Z: 7.5 },
    { X: -300, Z: 12 },
    { X: 2400, Z: 16 },
  ];

  // The van's trip: keyframes along the road, growing smaller as it drives away.
  const vanName = id("van");
  const vanAnim = useMemo(() => {
    const name = vanName;
    const steps = 14;
    const frames = Array.from({ length: steps + 1 }, (_, i) => {
      const k = Math.min(pts.length - 1, Math.round(10 + (i / steps) * 120));
      const [X, Z] = beside(pts[k]!, 70);
      const sc = (1 / Z) * 0.9;
      return `${((i / steps) * 92).toFixed(1)}% { transform: translate(${px(X, Z).toFixed(1)}px, ${py(Z).toFixed(1)}px) scale(${sc.toFixed(3)}); opacity: ${i === steps ? 0 : 1}; }`;
    });
    frames.push(`100% { transform: translate(${px(...beside(pts[130]!, 70)).toFixed(1)}px, ${py(beside(pts[130]!, 70)[1]).toFixed(1)}px) scale(0.01); opacity: 0; }`);
    const [sX, sZ] = beside(pts[40]!, 70);
    return { name, css: `@keyframes ${name} { ${frames.join(" ")} }`, still: `translate(${px(sX, sZ).toFixed(1)} ${py(sZ).toFixed(1)}) scale(${((1 / sZ) * 0.9).toFixed(3)})` };
  }, [vanName, pts]);

  const flowers = useMemo(() => {
    const r = rng(4);
    return Array.from({ length: 34 }, () => ({ x: -100 + r() * 1200, y: py(1.8) + r() * (400 - py(1.8)), c: ["#ffffff", "#ffd84a", "#ff8fa8", "#b9a2ff"][Math.floor(r() * 4)]! }));
  }, []);

  const pin = (() => {
    const [X, Z] = [1500, 7.5];
    return { x: px(X, Z), y: py(Z) - 120 / Z };
  })();

  return (
    <>
      <defs>
        <Linear id={id("road")} stops={[[0, c.road[0]], [1, c.road[1]]]} />
        <Linear id={id("near")} stops={[[0, c.grassNear[0]], [1, c.grassNear[1]]]} />
        <Linear id={id("plain")} stops={[[0, shade(c.fields[0]!, 0.15)], [1, c.fields[2]!]]} />
      </defs>
      {live && <style>{vanAnim.css}</style>}

      <Depth d={1}>
        <Sky stops={c.sky} sun={c.sun} />
        {c.disc && <circle cx={c.sun.x} cy={c.sun.y} r={time === "sunset" ? 34 : 26} fill={c.disc} />}
        {night && (
          <>
            <Starfield seed={7} n={120} y1={190} />
            <circle cx="800" cy="64" r="22" fill="#f7e9b8" />
            <circle cx="811" cy="57" r="20" fill="#0d1a38" />
          </>
        )}
        <CloudDrift seed={time === "sunset" ? 5 : 3} n={night ? 3 : 5} y={[26, 120]} s={[0.6, 1.15]} speed={150} tint={c.cloudTint} light={c.cloudLight} opacity={night ? 0.5 : 0.95} />
      </Depth>
      <Depth d={0.7}>
        <Ridge seed={21} y={HZN - 14} amp={26} color={c.hillFar} rim={c.rim} waves={3} rimWidth={2} />
        <Haze y0={HZN - 70} y1={HZN + 4} color={c.air} opacity={night ? 0.35 : 0.7} />
      </Depth>
      <Depth d={0.5}>
        <Ridge seed={9} y={HZN} amp={14} color={c.hillMid} rim={c.rim} waves={2} rimWidth={2} />
        <Haze y0={HZN - 30} y1={HZN + 8} color={c.air} opacity={night ? 0.25 : 0.45} />
      </Depth>

      {/* The ground plane: fields far off, a meadow near. */}
      <rect x="-120" y={HZN} width="1240" height={410 - HZN} fill={`url(#${id("plain")})`} />
      {fields.map((f, i) => (
        <g key={i}>
          <path d={f.d} fill={f.fill} />
          {f.rows && <path d={f.rows} stroke={shade(f.fill, -0.18)} strokeWidth="1" fill="none" opacity="0.7" />}
        </g>
      ))}
      <Haze y0={HZN} y1={HZN + 40} color={c.air} opacity={night ? 0.3 : 0.55} reverse />
      {/* The meadow fades in nearer the camera. */}
      <path d={`M-120 ${py(4.4).toFixed(1)} L1120 ${py(4.4).toFixed(1)} L1120 410 L-120 410 Z`} fill={`url(#${id("near")})`} opacity="0.92" />

      {/* Cottages and far trees. */}
      {cottages.map((h, i) => (
        <Cottage key={i} X={h.X} Z={h.Z} wall={c.wall[i % c.wall.length]!} roof={c.roof[i % c.roof.length]!} window={c.window} night={night} seed={i + 3} />
      ))}

      {/* The road: shoulder, asphalt, edge lines, center dashes. */}
      <path d={road.shoulder} fill={c.shoulder} />
      <path d={road.body} fill={`url(#${id("road")})`} />
      {road.dashes.map((d, i) => (
        <path key={i} d={d} fill={c.line} opacity={night ? 0.85 : 0.95} />
      ))}

      {/* The van on its route. */}
      <g transform={live ? undefined : vanAnim.still} style={live ? { animation: `${vanAnim.name} 26s linear infinite` } : undefined}>
        <g transform="translate(-78 0)">
          <Van night={night} />
        </g>
      </g>

      {trees.map((t) => (
        <RoadTree key={t.seed} X={t.X} Z={t.Z} c={c.tree} seed={t.seed} sway={live && t.Z < 3} />
      ))}

      {/* Telephone poles and wires. */}
      <g>
        {poles.slice(0, -1).map((p, i) => {
          const q = poles[i + 1]!;
          return (
            <path
              key={i}
              d={`M${p.x} ${p.y - p.h + 4 / p.Z} Q${(p.x + q.x) / 2} ${(p.y - p.h + q.y - q.h) / 2 + 18 / p.Z} ${q.x} ${q.y - q.h + 4 / q.Z}`}
              stroke={night ? "#0e1a30" : "#3b3328"}
              strokeWidth="1"
              fill="none"
              opacity="0.7"
            />
          );
        })}
        {poles.map((p, i) => (
          <g key={i}>
            <rect x={p.x - p.w / 2} y={p.y - p.h} width={p.w} height={p.h} fill={c.pole} />
            <rect x={p.x - p.w * 3} y={p.y - p.h + 4 / p.Z} width={p.w * 6} height={p.w * 0.8} fill={c.pole} />
            {night && (
              <>
                <circle cx={p.x - p.w * 2.6} cy={p.y - p.h + 8 / p.Z} r={Math.max(1.2, 5 / p.Z)} fill="#fff1c6" />
                <Glow x={p.x - p.w * 2.6} y={p.y} rx={160 / p.Z} ry={40 / p.Z} color="#ffd98a" opacity={0.45} />
                <Glow x={p.x - p.w * 2.6} y={p.y - p.h + 8 / p.Z} rx={40 / p.Z} color="#ffd98a" opacity={0.7} />
              </>
            )}
          </g>
        ))}
      </g>

      {/* Next stop: a map pin over a cottage. */}
      <g transform={`translate(${pin.x.toFixed(1)} ${pin.y.toFixed(1)})`}>
        <g className="rocky-bob">
          <Glow x={0} y={0} rx={26} color={GREEN2} opacity={0.35} />
          <path d="M0 22 C-14 4 -14 -2 -14 -6 A14 14 0 1 1 14 -6 C14 -2 14 4 0 22 Z" fill={WHITE} />
          <circle cx="0" cy="-6" r="7" fill={GREEN2} />
        </g>
      </g>

      {!night && <Birds y={time === "sunset" ? 130 : 86} speed={48} n={3} color={time === "sunset" ? "#5a3a54" : "#56677a"} />}

      {/* Meadow tufts and flowers along Rocky's floor. */}
      <GrassTufts seed={11} n={70} y={[py(1.9), 405]} color={c.grassNear[0]} sway={live} />
      {!night && (
        <g>
          {flowers.map((f, i) => (
            <g key={i}>
              <circle cx={f.x.toFixed(1)} cy={f.y.toFixed(1)} r="3.2" fill={time === "sunset" ? shade(f.c, -0.15) : f.c} />
              <circle cx={f.x.toFixed(1)} cy={f.y.toFixed(1)} r="1.2" fill={GOLD} />
            </g>
          ))}
        </g>
      )}
      {night && live && <Motes seed={8} n={22} x={[60, 940]} y={[250, 380]} r={[0.8, 1.5]} color="#e8ff9a" glow drift={[24, -20]} dur={[6, 11]} />}
      {time !== "night" && live && <Motes seed={3} n={14} x={[80, 920]} y={[200, 360]} r={[0.6, 1.2]} color="#ffffff" drift={[30, -18]} dur={[9, 15]} />}

      <Contact x={500} y={402} rx={420} ry={10} opacity={0.12} />
      <Grade light={c.light} lightX={c.sun.x / 1000} vignette={c.vignette} strength={night ? 0.4 : 0.22} lightStrength={night ? 0.08 : 0.2} />
    </>
  );
}
