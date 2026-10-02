// Colombia: the coffee farm, a Caribbean colonial street, the Cocora valley
// and Caño Cristales. Built with the same depth kit; each keeps the colors of
// its place (coffee greens, Caribbean walls, wax-palm mist, the five-colored river).
import { useMemo } from "react";
import {
  Birds,
  CloudDrift,
  Contact,
  Depth,
  FogBank,
  Grade,
  GrassTufts,
  ground,
  Haze,
  Linear,
  Motes,
  Ridge,
  ridgePath,
  rng,
  shade,
  Sky,
  useIds,
  type SceneProps,
} from "./kit";

// ---------------------------------------------------------------------------
// Coffee farm
// ---------------------------------------------------------------------------
/** A steep hill planted with coffee rows that follow its contour. */
function CoffeeHill({ seed, y, amp, color, rows, rowColor }: { seed: number; y: number; amp: number; color: string; rows: number; rowColor: string }) {
  const id = useIds();
  const p = useMemo(() => ridgePath(seed, y, amp, { waves: 2 }), [seed, y, amp]);
  const lines = useMemo(() => Array.from({ length: rows }, (_, i) => ridgePath(seed, y + 10 + i * (110 / rows) * (1 + i * 0.08), amp * (1 - i / (rows + 2)), { waves: 2 }).top), [seed, y, amp, rows]);
  return (
    <g>
      <defs>
        <Linear id={id("h")} stops={[[0, shade(color, 0.12)], [1, shade(color, -0.2)]]} />
        <clipPath id={id("c")}>
          <path d={p.fill} />
        </clipPath>
      </defs>
      <path d={p.fill} fill={`url(#${id("h")})`} />
      <g clipPath={`url(#${id("c")})`} fill="none" stroke={rowColor} strokeLinecap="round">
        {lines.map((d, i) => (
          <path key={i} d={d} strokeWidth={2 + i * 0.5} strokeDasharray={`${3 + i} ${2 + i * 0.4}`} />
        ))}
      </g>
      <path d={p.top} fill="none" stroke={shade(color, 0.3)} strokeWidth="2" opacity="0.6" />
    </g>
  );
}

/** Plantain leaves (the big ones that shade the coffee). */
function Plantain({ x, y, s = 1, flip = false, sway }: { x: number; y: number; s?: number; flip?: boolean; sway: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`}>
      <path d="M-4 0 L-2 -110 L4 -110 L6 0 Z" fill="#7a9a4a" />
      <g className={sway ? "rocky-sway" : undefined}>
        {[
          "M0 -108 C-40 -150 -110 -150 -140 -110 C-100 -120 -50 -112 0 -100 Z",
          "M0 -110 C30 -170 90 -190 120 -170 C80 -160 40 -136 2 -100 Z",
          "M0 -108 C-10 -170 -40 -210 -70 -220 C-50 -180 -30 -140 -2 -100 Z",
          "M0 -104 C50 -120 110 -100 140 -70 C100 -90 50 -96 2 -96 Z",
        ].map((d, i) => (
          <g key={i}>
            <path d={d} fill={i % 2 ? "#4f9a3a" : "#6cb84a"} />
            <path d={d} fill="none" stroke="#3f7a2e" strokeWidth="1.2" opacity="0.6" />
          </g>
        ))}
      </g>
    </g>
  );
}

/** The Willys jeep loaded with coffee sacks (side view, facing right). */
function Willys() {
  return (
    <g>
      <Contact x={60} y={0} rx={70} opacity={0.3} />
      {/* Sacks piled high. */}
      {[[8, -62], [30, -64], [52, -62], [18, -80], [42, -82], [30, -98]].map(([x, y], i) => (
        <g key={i}>
          <rect x={x} y={y} width="26" height="20" rx="6" fill={i % 2 ? "#d9c08a" : "#c9ae78"} />
          <path d={`M${x! + 7} ${y! + 10} h12 M${x! + 9} ${y! + 13} h8`} stroke="#6b4a2a" strokeWidth="1.4" />
        </g>
      ))}
      <path d="M0 -12 L0 -42 L80 -42 L84 -30 L108 -30 L118 -20 L118 -12 Z" fill="#2f7a4a" />
      <path d="M84 -30 L88 -56 L92 -56 L90 -30 Z" fill="#2c3442" />
      <rect x="86" y="-58" width="26" height="4" fill="#2c3442" />
      <rect x="104" y="-26" width="12" height="6" fill="#d6dde4" />
      <circle cx="116" cy="-22" r="3" fill="#fff6d6" />
      {[24, 96].map((x) => (
        <g key={x}>
          <circle cx={x} cy="-8" r="11" fill="#1b2433" />
          <circle cx={x} cy="-8" r="4" fill="#9aa7b4" />
        </g>
      ))}
    </g>
  );
}

export function CoffeeFarmScene({ live = false }: SceneProps) {
  const id = useIds();
  const cherries = useMemo(() => {
    const r = rng(9);
    return Array.from({ length: 70 }, () => ({ x: -100 + r() * 1200, y: 312 + r() * 50 }));
  }, []);
  return (
    <>
      <defs>
        <Linear id={id("terrace")} stops={[[0, "#b88a5a"], [1, "#94683e"]]} />
      </defs>
      <Depth d={1}>
        <Sky stops={[[0, "#6fb2e6"], [0.6, "#bfe3f6"], [1, "#f2f7ea"]]} sun={{ x: 220, y: 60, r: 220, color: "#fff4cf", strength: 0.9 }} />
        <CloudDrift seed={61} n={4} y={[30, 90]} s={[0.6, 1]} speed={160} />
      </Depth>
      <Depth d={0.8}>
        <Ridge seed={2} y={150} amp={40} color="#8fb0b8" rim="#c9dfe4" waves={3} />
        <Haze y0={80} y1={180} color="#e6f2f2" opacity={0.65} />
      </Depth>
      {/* Morning mist resting in the valley. */}
      <Depth d={0.7}>
        <FogBank seed={63} n={7} y={[160, 190]} opacity={0.8} speed={260} />
      </Depth>
      <Depth d={0.55}>
        <CoffeeHill seed={5} y={190} amp={48} color="#5f9a4a" rows={7} rowColor="#3f7a32" />
        {/* The finca on the hill: white walls, a red roof, a colorful balcony. */}
        <g transform="translate(610 176) scale(0.8)">
          <Contact x={40} y={8} rx={70} opacity={0.2} />
          <rect x="-10" y="-46" width="100" height="54" fill="#f6f1e6" />
          <rect x="-10" y="-46" width="100" height="4" fill="#ffffff" />
          <path d="M-22 -44 L40 -80 L102 -44 Z" fill="#b5523e" />
          <path d="M40 -80 L102 -44 L94 -44 L40 -74 Z" fill="#d06a52" />
          <rect x="-10" y="-22" width="100" height="5" fill="#2f6db5" />
          {[0, 1, 2, 3, 4, 5, 6].map((k) => (
            <rect key={k} x={-6 + k * 14} y="-30" width="3" height="10" fill="#e14b3b" />
          ))}
          <rect x="6" y="-40" width="14" height="14" fill="#2f7a4a" />
          <rect x="60" y="-40" width="14" height="14" fill="#2f7a4a" />
          <rect x="32" y="-14" width="14" height="22" fill="#e2a33a" />
          <circle cx="-14" cy="-6" r="10" fill="#e14bb0" />
          <circle cx="96" cy="-4" r="9" fill="#e14bb0" />
        </g>
        <Haze y0={150} y1={240} color="#e6f2ee" opacity={0.3} />
      </Depth>
      <Depth d={0.3}>
        <CoffeeHill seed={9} y={236} amp={30} color="#4f8a3e" rows={6} rowColor="#2f6a2a" />
      </Depth>
      {/* Dirt road along the terrace with the jeep. */}
      <path d="M-120 282 Q300 270 520 280 T1120 274 L1120 300 Q600 304 -120 306 Z" fill="#a8855a" />
      <g transform="translate(0 292)">
        <g className="rocky-run" style={{ ["--t" as string]: "26s", ["--from" as string]: "-200px", ["--to" as string]: "1250px", ["--x" as string]: "300px", ["--dl" as string]: "-9s" }}>
          <g transform="scale(0.8)">
            <Willys />
          </g>
        </g>
      </g>
      {/* A row of coffee bushes between the road and the terrace, then the open terrace where Rocky stands. */}
      <rect x="-120" y="300" width="1240" height="110" fill={`url(#${id("terrace")})`} />
      <g>
        {Array.from({ length: 18 }, (_, i) => {
          const x = -100 + i * 70;
          return (
            <g key={i}>
              <ellipse cx={x} cy="308" rx="30" ry="15" fill="#3f7a32" />
              <ellipse cx={x + 6} cy="302" rx="21" ry="9" fill="#56a046" />
            </g>
          );
        })}
        {cherries.map((c, i) => (
          <circle key={i} cx={c.x.toFixed(1)} cy={(300 + (c.y - 312) * 0.25).toFixed(1)} r="2.2" fill={i % 5 ? "#c8102e" : "#f5b82e"} />
        ))}
      </g>
      <rect x="-120" y="318" width="1240" height="6" fill="#8a5f36" opacity="0.5" />
      <GrassTufts seed={7} n={22} y={[330, 405]} color="#6b8a3a" sway={live} />
      <Plantain x={70} y={410} s={1.1} sway={live} />
      <Plantain x={940} y={410} s={1.2} flip sway={live} />
      <Birds y={100} speed={50} n={3} color="#4a5a3a" />
      <Grade light="#fff4cf" lightX={0.22} strength={0.22} lightStrength={0.18} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Caribbean colonial street
// ---------------------------------------------------------------------------
const WALLS = ["#f5b82e", "#e8762c", "#2f9bd6", "#e14b7a", "#5fbf8a", "#f2e2b6", "#a65bd6"];

export function CaribbeanScene({ live = false }: SceneProps) {
  const id = useIds();
  const g = ground(214, 170);
  const houses = useMemo(() => {
    const r = rng(14);
    // Facades along each side, receding: each spans [z0, z1] at x = ±W.
    const out: { side: -1 | 1; z0: number; z1: number; c: string; h: number; balcony: boolean; flowers: boolean }[] = [];
    for (const side of [-1, 1] as const) {
      let z = 0.5;
      while (z < 9) {
        const len = 0.5 + r() * 0.6 + z * 0.12;
        out.push({ side, z0: z, z1: z + len, c: WALLS[Math.floor(r() * WALLS.length)]!, h: 260 + r() * 80, balcony: r() < 0.8, flowers: r() < 0.6 });
        z += len;
      }
    }
    return out.sort((a, b) => b.z0 - a.z0);
  }, []);
  const W = 230;
  const P = (X: number, Z: number, h = 0) => [g.gx(X, Z), g.gy(Z, h)] as const;
  const quad = (X: number, za: number, zb: number, h0: number, h1: number) => {
    const a = P(X, za, h0), b = P(X, za, h1), c = P(X, zb, h1), d = P(X, zb, h0);
    return `M${a[0].toFixed(1)} ${a[1].toFixed(1)} L${b[0].toFixed(1)} ${b[1].toFixed(1)} L${c[0].toFixed(1)} ${c[1].toFixed(1)} L${d[0].toFixed(1)} ${d[1].toFixed(1)} Z`;
  };
  return (
    <>
      <defs>
        <Linear id={id("street")} stops={[[0, "#c9b08a"], [1, "#a88a62"]]} />
      </defs>
      <Depth d={1}>
        <Sky stops={[[0, "#3f8fd6"], [0.6, "#9fd2f2"], [1, "#fde9c8"]]} sun={{ x: 520, y: 150, r: 220, color: "#ffe6b0", strength: 0.9 }} />
        <CloudDrift seed={71} n={3} y={[30, 80]} s={[0.6, 1]} speed={160} />
      </Depth>
      {/* The clock tower closing the street, and a glimpse of sea. */}
      <Depth d={0.4}>
        <rect x="-120" y="196" width="1240" height="18" fill="#3fa0c8" />
        <g transform={`translate(500 ${g.gy(11).toFixed(1)}) scale(${(1.6 / 11 * 4).toFixed(3)})`}>
          <rect x="-22" y="-120" width="44" height="120" fill="#f2e2b6" />
          <rect x="-22" y="-120" width="10" height="120" fill={shade("#f2e2b6", -0.15)} />
          <path d="M-28 -120 L0 -150 L28 -120 Z" fill="#c9564c" />
          <rect x="-26" y="-124" width="52" height="6" fill="#e3cf9c" />
          <circle cx="0" cy="-96" r="12" fill="#ffffff" />
          <circle cx="0" cy="-96" r="12" fill="none" stroke="#3b2a1a" strokeWidth="2" />
          <path d="M0 -96 L0 -104 M0 -96 L6 -94" stroke="#3b2a1a" strokeWidth="2" />
          <path d="M-12 0 L-12 -40 Q0 -54 12 -40 L12 0 Z" fill="#6b4a3a" />
        </g>
      </Depth>
      {/* Sidewalks out to the edges, then the cobbled street, worn smooth in the middle. */}
      <rect x="-120" y="212" width="1240" height="200" fill="#d9c49a" />
      <path d={g.poly([[-W, 0.45], [W, 0.45], [W, 40], [-W, 40]])} fill={`url(#${id("street")})`} />
      <g stroke="#9c8058" strokeWidth="1" opacity="0.5">
        {Array.from({ length: 30 }, (_, i) => {
          const z = 1 + i * i * 0.012 + i * 0.06;
          return <path key={i} d={`M${g.gp(-W, z * 0.9)} L${g.gp(W, z * 0.9)}`} />;
        })}
        {[-160, -80, 0, 80, 160].map((x) => (
          <path key={x} d={`M${g.gp(x, 0.45)} L${g.gp(x, 40)}`} />
        ))}
      </g>
      <path d={g.poly([[-60, 0.45], [60, 0.45], [60, 40], [-60, 40]])} fill="#e3cf9c" opacity="0.25" />
      {/* Houses down both sides. */}
      {houses.map((h, i) => {
        const X = h.side * W;
        const wall = h.c;
        const dark = shade(wall, -0.12 - (h.side > 0 ? 0.12 : 0)); // the right side is in shade
        return (
          <g key={i}>
            <path d={quad(X, h.z0, h.z1, 0, h.h)} fill={dark} />
            <path d={quad(X, h.z0, h.z1, h.h - 16, h.h)} fill={shade(wall, 0.18)} />
            <path d={quad(X, h.z0, h.z1, h.h, h.h + 10)} fill="#c9564c" />
            <path d={quad(X, h.z0, h.z1, 0, 18)} fill={shade(wall, -0.3)} />
            {/* Doors and windows (two per facade). */}
            {[0.25, 0.68].map((f) => {
              const za = h.z0 + (h.z1 - h.z0) * f;
              const zb = za + (h.z1 - h.z0) * 0.16;
              return (
                <g key={f}>
                  <path d={quad(X, za, zb, 18, 120)} fill={f < 0.5 ? "#6b4a3a" : "#3a6b5a"} />
                  <path d={quad(X, za, zb, 160, 230)} fill="#2c3442" opacity="0.75" />
                  {h.balcony && <path d={quad(X - h.side * 18, za - 0.04, zb + 0.04, 150, 160)} fill="#6b4a3a" />}
                  {h.balcony && <path d={quad(X - h.side * 18, za - 0.04, zb + 0.04, 160, 190)} fill="#6b4a3a" opacity="0.35" />}
                </g>
              );
            })}
            {/* Bougainvillea spilling over the top. */}
            {h.flowers && <path d={quad(X - h.side * 4, h.z0 + 0.05, h.z0 + (h.z1 - h.z0) * 0.35, h.h - 70, h.h + 4)} fill="#e14bb0" opacity="0.75" />}
          </g>
        );
      })}
      {/* Lanterns on brackets down the street. */}
      {[1.6, 2.4, 3.6, 5.4].map((z, i) => {
        const side = i % 2 ? 1 : -1;
        const [x, y] = P(side * (W - 30), z, 250);
        const s = 1 / z;
        return (
          <g key={z}>
            <line x1={g.gx(side * W, z)} y1={y - 10 * s} x2={x} y2={y - 10 * s} stroke="#2c3442" strokeWidth={4 * s} />
            <rect x={x - 8 * s} y={y - 6 * s} width={16 * s} height={24 * s} fill="#2c3442" />
            <rect x={x - 6 * s} y={y - 3 * s} width={12 * s} height={17 * s} fill="#ffe2a0" />
          </g>
        );
      })}
      {/* Afternoon light down the street, long shadow on the right. */}
      <path d={g.poly([[-W, 0.45], [0, 0.45], [-60, 12], [-W, 12]])} fill="#fff1c6" opacity="0.18" />
      <Haze y0={150} y1={g.gy(5)} color="#fde9c8" opacity={0.3} peak={0.8} />
      {live && <Motes seed={4} n={10} x={[300, 700]} y={[150, 330]} r={[1.5, 2.6]} color="#e14bb0" drift={[30, 40]} dur={[7, 12]} />}
      <Contact x={500} y={404} rx={300} ry={8} opacity={0.12} />
      <Grade light="#ffe6b0" lightX={0.5} strength={0.22} lightStrength={0.2} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Valle de Cocora
// ---------------------------------------------------------------------------
/** A wax palm: very tall, thin, a small crown — at a depth scale. */
function WaxPalm({ x, y, h, s = 1, sway }: { x: number; y: number; h: number; s?: number; sway: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d={`M-3 0 Q-1 ${-h / 2} -1.5 ${-h} L1.5 ${-h} Q2 ${-h / 2} 3 0 Z`} fill="#c9c3b0" />
      <path d={`M0.5 0 Q1 ${-h / 2} 0 ${-h} L1.5 ${-h} Q2 ${-h / 2} 3 0 Z`} fill="#9e9884" />
      <g transform={`translate(0 ${-h})`}>
        <g className={sway ? "rocky-sway" : undefined}>
        {[-150, -120, -60, -30, 10, 40, 160].map((a, i) => {
          const rad = (a * Math.PI) / 180;
          const len = 30 + (i % 3) * 6;
          const ex = Math.cos(rad) * len;
          const ey = Math.sin(rad) * len * 0.8 + 10;
          return <path key={i} d={`M0 0 Q${ex * 0.5} ${ey * 0.3 - 12} ${ex} ${ey}`} stroke={i % 2 ? "#3f7a4a" : "#5a9a5a"} strokeWidth="4" fill="none" strokeLinecap="round" />;
        })}
        </g>
      </g>
    </g>
  );
}

export function CocoraScene({ live = false }: SceneProps) {
  const id = useIds();
  return (
    <>
      <defs>
        <Linear id={id("meadow")} stops={[[0, "#7fbf5a"], [1, "#4f8a3a"]]} />
      </defs>
      <Depth d={1}>
        <Sky stops={[[0, "#9cc8e0"], [0.6, "#d8eaf0"], [1, "#f0f4ee"]]} sun={{ x: 700, y: 70, r: 220, color: "#ffffff", strength: 0.7 }} />
        <CloudDrift seed={81} n={4} y={[30, 90]} s={[0.7, 1.1]} speed={170} />
      </Depth>
      <Depth d={0.85}>
        <Ridge seed={3} y={150} amp={50} color="#9ab8a8" waves={3} />
        <Haze y0={60} y1={170} color="#eef4f0" opacity={0.7} />
      </Depth>
      <Depth d={0.7}>
        <Ridge seed={7} y={186} amp={40} color="#7fa88a" rim="#c9e2cc" waves={3} />
        {Array.from({ length: 22 }, (_, i) => (
          <WaxPalm key={i} x={-110 + i * 58 + ((i * 29) % 30)} y={186 - ((i * 11) % 20)} h={70} s={0.5} sway={false} />
        ))}
        <Haze y0={90} y1={200} color="#eef4f0" opacity={0.55} />
      </Depth>
      {/* Fog rolling through the valley between the hills. */}
      <Depth d={0.6}>
        <FogBank seed={83} n={8} y={[170, 205]} opacity={0.85} speed={240} />
      </Depth>
      <Depth d={0.45}>
        <Ridge seed={11} y={226} amp={34} color="#5f9a5a" rim="#a6d48a" waves={2} />
        {Array.from({ length: 12 }, (_, i) => (
          <WaxPalm key={i} x={-90 + i * 104 + ((i * 41) % 40)} y={228 - ((i * 13) % 16)} h={150} s={0.75} sway={live} />
        ))}
        <Haze y0={120} y1={240} color="#eef4f0" opacity={0.3} />
      </Depth>
      {/* Near meadow, a river and a little wooden bridge. */}
      <path d="M-120 252 Q300 244 520 252 T1120 248 L1120 410 L-120 410 Z" fill={`url(#${id("meadow")})`} />
      {/* The stream comes down from the hills and bends away to the right, behind Rocky's meadow. */}
      <path d="M560 252 C548 268 572 278 600 284 C680 300 820 296 1120 300 L1120 316 C820 314 660 318 590 300 C548 290 536 270 540 252 Z" fill="#6fa8c8" />
      <path d="M560 262 c10 4 20 4 30 0 M680 300 c20 4 46 4 66 0 M880 306 c20 3 46 3 66 0" stroke="#ffffff" strokeWidth="1.6" fill="none" opacity="0.6" className="rocky-shimmer" />
      <g transform="translate(760 0)">
        <path d="M-60 304 Q0 290 60 304 L60 309 Q0 295 -60 309 Z" fill="#8a6239" />
        {[-52, -26, 0, 26, 52].map((x) => (
          <line key={x} x1={x} y1={305 - Math.cos((x / 60) * (Math.PI / 2)) * 12} x2={x} y2={294 - Math.cos((x / 60) * (Math.PI / 2)) * 12} stroke="#6b4a2a" strokeWidth="2" />
        ))}
        <path d="M-60 294 Q0 280 60 294" stroke="#6b4a2a" strokeWidth="2" fill="none" />
      </g>
      <WaxPalm x={130} y={360} h={300} s={1} sway={live} />
      <WaxPalm x={860} y={350} h={280} s={0.95} sway={live} />
      <GrassTufts seed={5} n={60} y={[256, 405]} color="#5a9a42" sway={live} />
      <Birds y={110} speed={60} n={3} color="#4a5a4a" />
      <Grade light="#ffffff" lightX={0.7} strength={0.2} lightStrength={0.14} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Caño Cristales
// ---------------------------------------------------------------------------
export function CanoCristalesScene({ live = false }: SceneProps) {
  const id = useIds();
  const g = ground(214, 180);
  // The river: wide and shallow near us, winding narrower into the jungle.
  const center = (Z: number) => Math.sin(Z * 0.9) * 120;
  const half = (Z: number) => Math.max(50, 330 - (Z - 1) * 34);
  const river = useMemo(() => {
    const L: [number, number][] = [];
    const R: [number, number][] = [];
    for (let i = 0; i <= 40; i++) {
      const Z = 1.75 + i * 0.25;
      L.push([center(Z) - half(Z), Z]);
      R.push([center(Z) + half(Z), Z]);
    }
    return g.poly([...L, ...R.reverse()]);
  }, [g]);
  // Macarenia streaks on the riverbed, long in the direction of the flow.
  const plants = useMemo(() => {
    const r = rng(33);
    return Array.from({ length: 260 }, () => {
      const Z = 1.8 + r() * r() * 8;
      const X = center(Z) + (r() - 0.5) * 1.8 * half(Z);
      const k = r();
      const c = k < 0.66 ? ["#ff1f3d", "#ff3d5e", "#e0102e", "#ff2a6a"][Math.floor(r() * 4)]! : k < 0.82 ? "#ffd23a" : k < 0.94 ? "#2fbf5a" : "#1b1a22";
      return { X, Z, c, w: 5 + r() * 12, l: (0.05 + r() * 0.1) * Math.pow(Z, 0.3) };
    }).sort((a, b) => b.Z - a.Z);
  }, []);
  return (
    <>
      <defs>
        <Linear id={id("rock")} stops={[[0, "#b9a07a"], [1, "#8a7254"]]} />
        <Linear id={id("water")} stops={[[0, "#7fc8e0"], [1, "#2f8ab8"]]} />
      </defs>
      <Depth d={1}>
        <Sky stops={[[0, "#3f9ee0"], [0.6, "#a4dcf5"], [1, "#eaf7f0"]]} sun={{ x: 820, y: 60, r: 220, color: "#fff6d6", strength: 0.9 }} />
        <CloudDrift seed={91} n={4} y={[30, 90]} s={[0.6, 1]} speed={160} />
      </Depth>
      {/* The tepui plateau and the jungle beyond. */}
      <Depth d={0.75}>
        <path d="M-120 196 L80 196 L120 150 L380 146 L420 196 L620 196 L660 160 L900 156 L940 196 L1120 196 L1120 220 L-120 220 Z" fill="#8a9a8a" />
        <path d="M120 150 L380 146 L384 152 L124 156 Z M660 160 L900 156 L904 162 L664 166 Z" fill="#a8b8a8" />
        <Haze y0={120} y1={210} color="#e6f2ec" opacity={0.55} />
      </Depth>
      <Depth d={0.5}>
        <Ridge seed={21} y={214} amp={12} color="#2f7a3a" rim="#6cb85a" waves={4} />
        {Array.from({ length: 40 }, (_, i) => (
          <circle key={i} cx={-110 + i * 31} cy={206 - ((i * 7) % 12)} r={14 + ((i * 13) % 8)} fill={i % 2 ? "#3f8a42" : "#2f7a3a"} />
        ))}
      </Depth>
      {/* Rock slabs (Rocky's floor) and the five-colored river. */}
      <rect x="-120" y="214" width="1240" height="200" fill={`url(#${id("rock")})`} />
      <g stroke="#7a6248" strokeWidth="1.5" opacity="0.5" fill="none">
        {Array.from({ length: 16 }, (_, i) => (
          <path key={i} d={`M${g.gp(-2400 + i * 300, 1)} L${g.gp(-2400 + i * 300 + 120, 6)}`} />
        ))}
      </g>
      {/* Riverbed plants first, then clear shallow water over them. */}
      <path d={river} fill="#c9a87a" />
      {plants.map((p, i) => (
        <path key={i} d={g.ring(p.X, p.Z, p.w, p.l * p.Z, 14)} fill={p.c} opacity="0.95" />
      ))}
      <path d={river} fill={`url(#${id("water")})`} opacity="0.22" />
      <g stroke="#ffffff" strokeWidth="1.6" fill="none" opacity="0.7" strokeLinecap="round">
        {plants.slice(0, 40).map((p, i) => (
          <path key={i} d={`M${g.gp(p.X - 30, p.Z)} L${g.gp(p.X + 10, p.Z + 0.06 * p.Z)}`} className="rocky-shimmer" style={{ ["--dl" as string]: `${-(i % 5)}s` }} />
        ))}
      </g>
      {live && <Motes seed={5} n={26} x={[260, 760]} y={[230, 400]} r={[0.8, 1.6]} color="#ffffff" drift={[30, 6]} dur={[3, 6]} />}
      {/* The lip of the rock shelf Rocky stands on, with the river starting just behind it. */}
      <path d={g.poly([[-3000, 1.7], [3000, 1.7], [3000, 1.76], [-3000, 1.76]])} fill="#7a6248" opacity="0.55" />
      <path d={g.poly([[-3000, 1.64], [3000, 1.64], [3000, 1.7], [-3000, 1.7]])} fill="#d9c09a" opacity="0.5" />
      {/* A small cascade over a ledge in the middle distance. */}
      <g transform={`translate(${g.gx(center(4.2), 4.2).toFixed(1)} ${g.gy(4.2).toFixed(1)})`}>
        <rect x="-60" y="-4" width="120" height="10" fill="#6b5a44" />
        <rect x="-56" y="-2" width="112" height="14" fill="#dff4fa" opacity="0.8" />
        <g className="rocky-shimmer" fill="#ffffff">
          {[-40, -16, 8, 32].map((x) => (
            <rect key={x} x={x} y="0" width="3" height="12" opacity="0.8" />
          ))}
        </g>
        <ellipse cx="0" cy="14" rx="70" ry="5" fill="#ffffff" opacity="0.5" />
      </g>
      {/* Black boulders on the banks. */}
      {[[-640, 1.4], [600, 1.5], [-380, 3.2], [420, 3.6], [-260, 5.4]].map(([X, Z], i) => {
        const x = g.gx(X!, Z!);
        const y = g.gy(Z!);
        const s = 1 / Z!;
        return (
          <g key={i}>
            <ellipse cx={x} cy={y} rx={70 * s} ry={10 * s} fill="#0b1428" opacity="0.2" />
            <path d={`M${x - 60 * s} ${y} Q${x - 50 * s} ${y - 50 * s} ${x} ${y - 56 * s} Q${x + 56 * s} ${y - 50 * s} ${x + 64 * s} ${y} Z`} fill="#2c2a2e" />
            <path d={`M${x - 10 * s} ${y - 54 * s} Q${x + 40 * s} ${y - 48 * s} ${x + 52 * s} ${y - 16 * s}`} stroke="#5a5660" strokeWidth={6 * s} fill="none" opacity="0.6" />
          </g>
        );
      })}
      <Birds y={100} speed={50} n={2} color="#3a4a3a" />
      <Grade light="#fff6d6" lightX={0.82} strength={0.22} lightStrength={0.18} />
    </>
  );
}

