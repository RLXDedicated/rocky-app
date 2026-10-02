// Nature: the enchanted forest, the mountain valley, the Caribbean beach and
// the starry camp. Each is built from depth layers that fade into their own
// air (blue-green mist, mountain haze, sea spray, night).
import { useMemo } from "react";
import {
  Birds,
  CloudDrift,
  Conifer,
  Contact,
  Depth,
  FogBank,
  Glow,
  GOLD,
  Grade,
  GrassTufts,
  ground,
  Haze,
  Linear,
  Motes,
  Radial,
  Ridge,
  ridgePath,
  rng,
  shade,
  Sky,
  Starfield,
  useIds,
  Water,
  type SceneProps,
} from "./kit";

// ---------------------------------------------------------------------------
// Enchanted forest
// ---------------------------------------------------------------------------
/** A row of trunks at one depth: further rows are thinner, paler and closer together. */
function TrunkRow({ seed, y, h, w, n, color, crown }: { seed: number; y: number; h: number; w: number; n: number; color: string; crown: string }) {
  const trunks = useMemo(() => {
    const r = rng(seed);
    return Array.from({ length: n }, (_, i) => ({ x: -120 + (i + r() * 0.8) * (1240 / n), w: w * (0.7 + r() * 0.6), lean: (r() - 0.5) * 6 }));
  }, [seed, n, w]);
  const ridge = useMemo(() => ridgePath(seed + 5, y - h, 18, { waves: 4 }), [seed, y, h]);
  return (
    <g>
      {/* The canopy mass these trunks hold up. */}
      <path d={`${ridge.top} L1120 -50 L-120 -50 Z`} fill={crown} />
      {trunks.map((t, i) => (
        <g key={i}>
          <path d={`M${t.x - t.w / 2} ${y} L${t.x - t.w * 0.35 + t.lean} ${y - h - 20} L${t.x + t.w * 0.35 + t.lean} ${y - h - 20} L${t.x + t.w / 2} ${y} Z`} fill={color} />
          <path d={`M${t.x + t.w * 0.1} ${y} L${t.x + t.w * 0.1 + t.lean} ${y - h - 20} L${t.x + t.w * 0.35 + t.lean} ${y - h - 20} L${t.x + t.w / 2} ${y} Z`} fill={shade(color, 0.12)} />
          {/* Roots flaring at the base. */}
          <path d={`M${t.x - t.w} ${y} Q${t.x - t.w / 2} ${y - 6} ${t.x - t.w / 3} ${y - 14} L${t.x + t.w / 3} ${y - 14} Q${t.x + t.w / 2} ${y - 6} ${t.x + t.w} ${y} Z`} fill={color} />
        </g>
      ))}
    </g>
  );
}

function Mushroom({ x, y, s = 1, glow }: { x: number; y: number; s?: number; glow: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <Glow x={0} y={-12} rx={26} color={glow} opacity={0.5} className="rocky-pulse" />
      <path d="M-3 0 L-2.5 -12 L2.5 -12 L3 0 Z" fill="#f2ead8" />
      <path d="M-11 -11 Q0 -26 11 -11 Z" fill={glow} />
      <path d="M-11 -11 Q0 -26 11 -11 Q0 -15 -11 -11 Z" fill={shade(glow, -0.25)} />
      <circle cx="-4" cy="-16" r="1.6" fill="#ffffff" opacity="0.9" />
      <circle cx="3" cy="-18" r="1.2" fill="#ffffff" opacity="0.9" />
    </g>
  );
}

export function ForestScene({ live = false }: SceneProps) {
  const id = useIds();
  const g = ground(250, 160);
  return (
    <>
      <defs>
        <Linear id={id("floor")} stops={[[0, "#3d6b4a"], [0.5, "#2f5a3c"], [1, "#22442d"]]} />
        <Linear id={id("ray")} stops={[[0, "#fff6c8", 0.5], [1, "#fff6c8", 0]]} />
        <Radial id={id("clear")} cy={0.4} stops={[[0, "#d8f2c0", 0.55], [1, "#d8f2c0", 0]]} />
      </defs>
      <Depth d={1}>
        <Sky stops={[[0, "#bfe3d0"], [0.6, "#e6f4dc"], [1, "#f6f9e8"]]} sun={{ x: 560, y: 60, r: 260, color: "#fffbe0", strength: 0.9 }} />
      </Depth>
      {/* Five rows of trees, each further one paler and bluer in the mist. */}
      <Depth d={0.75}>
        <TrunkRow seed={1} y={262} h={150} w={10} n={26} color="#9fc2b0" crown="#b5d6c0" />
        <Haze y0={60} y1={262} color="#e2f2e4" opacity={0.55} />
      </Depth>
      <Depth d={0.55}>
        <TrunkRow seed={2} y={270} h={170} w={16} n={18} color="#7aa892" crown="#8fbea0" />
        <Haze y0={60} y1={270} color="#d8ecd8" opacity={0.45} />
      </Depth>
      <Depth d={0.35}>
        <TrunkRow seed={3} y={282} h={200} w={24} n={12} color="#557f68" crown="#5f9472" />
        <Haze y0={60} y1={282} color="#cfe6cf" opacity={0.3} />
      </Depth>
      {/* God rays through the canopy. */}
      <g className="rocky-pulse">
        {[380, 470, 560, 640].map((x, i) => (
          <path key={x} d={`M${x} -20 L${x + 24 + i * 4} -20 L${x + 150 + i * 10} 320 L${x + 70 + i * 6} 320 Z`} fill={`url(#${id("ray")})`} opacity={0.55 - i * 0.08} />
        ))}
      </g>
      {/* The forest floor with a mossy path into the woods. */}
      <rect x="-120" y="262" width="1240" height="160" fill={`url(#${id("floor")})`} />
      <path d={`M${g.gp(-260, 1.2)} C${g.gp(-200, 2)} ${g.gp(160, 2.6)} ${g.gp(40, 4)} L${g.gp(90, 6)} L${g.gp(130, 6)} L${g.gp(130, 4)} C${g.gp(360, 2.6)} ${g.gp(200, 2)} ${g.gp(300, 1.2)} Z`} fill="#8a7a58" opacity="0.55" />
      <ellipse cx="500" cy="300" rx="320" ry="60" fill={`url(#${id("clear")})`} />
      <Depth d={0.15}>
        <TrunkRow seed={4} y={300} h={300} w={46} n={5} color="#3b5a46" crown="#3f7a4e" />
      </Depth>
      {/* Near trunks framing the edges, darkest. */}
      {[60, 940].map((x, i) => (
        <g key={x}>
          <path d={`M${x - 46} 410 L${x - 30} -40 L${x + 30} -40 L${x + 46} 410 Z`} fill="#24382c" />
          <path d={`M${x + (i ? -30 : 4)} 410 L${x + (i ? -22 : 10)} -40 L${x + (i ? -8 : 30)} -40 L${x + (i ? -6 : 46)} 410 Z`} fill="#33503d" />
          <path d={`M${x - 34} 220 Q${x - 60} 180 ${x - 80} 190 Q${x - 60} 196 ${x - 36} 232 Z`} fill="#3f7a4e" />
        </g>
      ))}
      {/* Ferns and glowing mushrooms on the floor. */}
      {[[150, 330], [250, 372], [770, 344], [860, 380]].map(([x, y], i) => (
        <g key={i} transform={`translate(${x} ${y})`}>
          <g className={live ? "rocky-sway" : undefined}>
            {[-50, -25, 0, 25, 50].map((a, k) => (
              <path key={k} d={`M0 0 Q${a * 0.5} -30 ${a} -${40 - Math.abs(a) * 0.2} Q${a * 0.4} -24 0 0 Z`} fill={k % 2 ? "#4f9a5a" : "#6cb86a"} />
            ))}
          </g>
        </g>
      ))}
      <Mushroom x={210} y={344} s={1.2} glow="#ff7ab0" />
      <Mushroom x={232} y={350} s={0.8} glow="#ff7ab0" />
      <Mushroom x={790} y={360} s={1.1} glow="#7ad7ff" />
      <Mushroom x={812} y={366} s={0.75} glow="#b98aff" />
      <GrassTufts seed={6} n={50} y={[300, 405]} color="#4f8a52" sway={live} />
      {live && <Motes seed={9} n={30} x={[80, 920]} y={[140, 360]} r={[0.8, 1.6]} color="#f6ffb0" glow drift={[24, -26]} dur={[7, 13]} />}
      <Grade light="#fffbe0" lightX={0.55} vignette="#0b1a12" strength={0.38} lightStrength={0.16} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Mountain valley
// ---------------------------------------------------------------------------
/** A mountain range with snow caps and a sunlit side. */
function Range({ seed, y, amp, color, snow, light, n = 5 }: { seed: number; y: number; amp: number; color: string; snow: boolean; light: string; n?: number }) {
  const peaks = useMemo(() => {
    const r = rng(seed);
    return Array.from({ length: n }, (_, i) => ({ x: -120 + (i + 0.2 + r() * 0.6) * (1240 / n), h: amp * (0.6 + r() * 0.5), w: (1240 / n) * (0.7 + r() * 0.5) }));
  }, [seed, n, amp]);
  return (
    <g>
      {peaks.map((p, i) => {
        const top = y - p.h;
        const lw = p.w * 0.55;
        const rw = p.w * 0.6;
        const capL = p.x - lw * 0.28;
        const capR = p.x + rw * 0.26;
        const capY = top + p.h * 0.26;
        return (
          <g key={i}>
            <path d={`M${p.x - lw} ${y + 20} L${p.x} ${top} L${p.x + rw} ${y + 20} Z`} fill={color} />
            {/* Sunlit face (light from the right). */}
            <path d={`M${p.x} ${top} L${p.x + rw} ${y + 20} L${p.x + rw * 0.2} ${y + 20} L${p.x + rw * 0.12} ${top + p.h * 0.5} Z`} fill={light} opacity="0.45" />
            {/* Ridgelines. */}
            <path d={`M${p.x} ${top} L${p.x - lw * 0.2} ${top + p.h * 0.45} L${p.x - lw * 0.05} ${top + p.h * 0.7}`} stroke={shade(color, -0.2)} strokeWidth="2" fill="none" opacity="0.6" />
            {snow && (
              <g>
                <path d={`M${p.x} ${top} L${capR} ${capY} L${p.x + rw * 0.12} ${capY - 6} L${p.x + rw * 0.02} ${capY + 6} L${p.x - lw * 0.1} ${capY - 4} L${capL} ${capY} Z`} fill="#f4f8fb" />
                <path d={`M${p.x} ${top} L${capL} ${capY} L${p.x - lw * 0.1} ${capY - 4} L${p.x - lw * 0.02} ${capY - 10} Z`} fill="#c9d8e6" />
              </g>
            )}
          </g>
        );
      })}
    </g>
  );
}

export function MountainsScene({ live = false }: SceneProps) {
  const id = useIds();
  const flowers = useMemo(() => {
    const r = rng(12);
    return Array.from({ length: 30 }, () => ({ x: -100 + r() * 1200, y: 300 + r() * 100, c: ["#ffffff", "#ffd84a", "#b9a2ff", "#ff8fa8"][Math.floor(r() * 4)]! }));
  }, []);
  return (
    <>
      <defs>
        <Linear id={id("meadow")} stops={[[0, "#8fcf6a"], [0.5, "#6fb453"], [1, "#4f9a42"]]} />
      </defs>
      <Depth d={1}>
        <Sky stops={[[0, "#4f97d6"], [0.5, "#9fd0f0"], [1, "#e4f3fb"]]} sun={{ x: 820, y: 60, r: 220, color: "#fff6d6", strength: 0.85 }} />
        <circle cx="820" cy="60" r="24" fill="#fffbe8" />
        <CloudDrift seed={31} n={4} y={[20, 80]} s={[0.6, 1]} speed={170} />
      </Depth>
      <Depth d={0.85}>
        <Range seed={4} y={176} amp={130} color="#9fb6d0" snow light="#e8f2fb" n={6} />
        <Haze y0={60} y1={200} color="#dcecf8" opacity={0.6} />
      </Depth>
      {/* A cloud bank resting between the ranges. */}
      <Depth d={0.7}>
        <FogBank seed={8} n={7} y={[150, 180]} color="#f4f8fb" opacity={0.85} speed={220} />
      </Depth>
      <Depth d={0.6}>
        <Range seed={9} y={206} amp={110} color="#6f8faa" snow light="#cfe2f2" n={5} />
        <Haze y0={120} y1={226} color="#d2e6f2" opacity={0.45} />
      </Depth>
      <Depth d={0.4}>
        <Ridge seed={13} y={232} amp={24} color="#4f8a5a" rim="#9fd08a" waves={3} />
        {Array.from({ length: 30 }, (_, i) => i).map((i) => {
          const x = -110 + i * 42 + ((i * 17) % 20);
          const y = 236 + ((i * 13) % 14);
          return <Conifer key={i} x={x} y={y} s={0.45 + ((i * 7) % 5) * 0.04} hue="#2f6b4a" light="#5aa070" />;
        })}
        <Haze y0={190} y1={250} color="#d2e6f2" opacity={0.25} />
      </Depth>
      {/* The lake mirroring the sky and mountains. */}
      <Water y={246} y1={286} top="#9fc8e6" bottom="#5f97c2" streak="#ffffff" seed={4} n={30} />
      <g opacity="0.35" transform="translate(0 492) scale(1 -1)">
        <Range seed={9} y={206} amp={110} color="#6f8faa" snow={false} light="#cfe2f2" n={5} />
      </g>
      <rect x="-120" y="246" width="1240" height="40" fill="#7fb2d8" opacity="0.4" />
      {/* Shore and meadow. */}
      <path d="M-120 286 Q200 278 500 284 T1120 280 L1120 410 L-120 410 Z" fill={`url(#${id("meadow")})`} />
      <path d="M-120 286 Q200 278 500 284 T1120 280" stroke="#c9b98a" strokeWidth="4" fill="none" />
      {[[80, 330, 1.1], [180, 316, 0.8], [880, 324, 1.2], [960, 340, 1.4]].map(([x, y, s], i) => (
        <Conifer key={i} x={x!} y={y!} s={s!} hue="#2a5f40" light="#4f9a5a" />
      ))}
      {/* A wooden dock out onto the lake. */}
      <g>
        <path d="M640 292 L700 250 L716 250 L670 292 Z" fill="#9c7046" />
        <path d="M640 292 L670 292 L670 298 L640 298 Z" fill="#7a5434" />
        {[[650, 292], [664, 280], [690, 262], [704, 254]].map(([x, y], i) => (
          <rect key={i} x={x} y={y} width="3" height={14 - i * 2} fill="#5a3f2b" />
        ))}
      </g>
      <GrassTufts seed={3} n={60} y={[292, 405]} color="#5aa548" sway={live} />
      {flowers.map((f, i) => (
        <circle key={i} cx={f.x.toFixed(1)} cy={f.y.toFixed(1)} r="3" fill={f.c} />
      ))}
      <Birds y={110} speed={56} n={2} color="#4a5a6e" />
      <Grade light="#fff6d6" lightX={0.8} strength={0.2} lightStrength={0.18} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Caribbean beach
// ---------------------------------------------------------------------------
function Palm({ x, y, s = 1, lean = 1, sway }: { x: number; y: number; s?: number; lean?: number; sway: boolean }) {
  const id = useIds();
  return (
    <g transform={`translate(${x} ${y}) scale(${s * lean} ${s})`}>
      <defs>
        <Linear id={id("trunk")} x2={1} y2={0} stops={[[0, "#8a6a48"], [0.5, "#b08a5e"], [1, "#7a5a3a"]]} />
      </defs>
      <ellipse cx="40" cy="0" rx="60" ry="8" fill="#0b1428" opacity="0.14" />
      <path d="M-8 0 C0 -80 20 -150 54 -214 L64 -210 C34 -150 14 -80 8 0 Z" fill={`url(#${id("trunk")})`} />
      {Array.from({ length: 12 }, (_, i) => {
        const t = i / 12;
        const yy = -t * 200;
        const xx = t * t * 54 + 1;
        return <path key={i} d={`M${xx - 8 + t * 2} ${yy} q8 -6 16 0`} stroke="#6b4a32" strokeWidth="1.5" fill="none" opacity="0.6" />;
      })}
      <g transform="translate(58 -212)">
       <g className={sway ? "rocky-sway" : undefined}>
        {[
          "M0 0 C-40 -30 -90 -20 -120 20 C-80 -6 -40 -6 0 6 Z",
          "M0 0 C-30 -50 -70 -70 -100 -60 C-60 -50 -30 -30 2 4 Z",
          "M0 0 C20 -50 60 -70 100 -60 C60 -50 30 -30 -2 4 Z",
          "M0 0 C40 -30 90 -20 124 24 C80 -4 40 -6 0 6 Z",
          "M0 0 C10 20 20 60 6 100 C0 60 -6 30 -4 4 Z",
          "M0 0 C-20 20 -50 50 -60 90 C-40 50 -20 30 -2 2 Z",
        ].map((d, i) => (
          <path key={i} d={d} fill={i % 2 ? "#3f9a4a" : "#56bd66"} />
        ))}
        <circle cx="-4" cy="6" r="6" fill="#7a5a3a" />
        <circle cx="6" cy="8" r="6" fill="#6b4a32" />
       </g>
      </g>
    </g>
  );
}

export function BeachScene({ live = false }: SceneProps) {
  const id = useIds();
  const SEA = 212;
  const SHORE = 286;
  return (
    <>
      <defs>
        <Linear id={id("sand")} stops={[[0, "#f6dfae"], [0.5, "#efd29a"], [1, "#e2bd7e"]]} />
        <Linear id={id("wet")} stops={[[0, "#d9b98a"], [1, "#efd29a"]]} />
        <Linear id={id("shallow")} stops={[[0, "#36b9c8"], [1, "#7fe0d6"]]} />
      </defs>
      <Depth d={1}>
        <Sky stops={[[0, "#3f9ee0"], [0.6, "#a4dcf5"], [1, "#e9f8fb"]]} sun={{ x: 760, y: 70, r: 240, color: "#fff4cf", strength: 0.95 }} />
        <circle cx="760" cy="70" r="28" fill="#fffbe8" />
        <CloudDrift seed={41} n={5} y={[30, 120]} s={[0.6, 1.1]} speed={150} />
      </Depth>
      <Depth d={0.7}>
        {/* Island on the horizon. */}
        <path d={`M240 ${SEA} Q300 ${SEA - 34} 360 ${SEA - 20} Q400 ${SEA - 30} 450 ${SEA} Z`} fill="#4f9a6a" />
        <Haze y0={SEA - 40} y1={SEA + 2} color="#d8f2f6" opacity={0.7} />
      </Depth>
      {/* The sea: deep blue at the horizon to turquoise in the shallows. */}
      <Water y={SEA} y1={SHORE - 30} top="#2f7fbf" bottom="#29b0c6" streak="#ffffff" seed={6} n={44} />
      <rect x="-120" y={SHORE - 34} width="1240" height="34" fill={`url(#${id("shallow")})`} />
      <Glow x={760} y={SEA + 14} rx={180} ry={12} color="#fffbe8" opacity={0.7} />
      {/* A sailboat crossing the horizon. */}
      <Depth d={0.5}>
        <g transform={`translate(0 ${SEA + 6})`}>
          <g className="rocky-run" style={{ ["--t" as string]: "70s", ["--from" as string]: "-100px", ["--to" as string]: "1250px", ["--x" as string]: "620px", ["--dl" as string]: "-30s" }}>
            <g className="rocky-bob">
              <path d="M-16 0 L16 0 L12 6 L-12 6 Z" fill="#ffffff" />
              <path d="M0 -2 L0 -34 L18 -4 Z" fill="#ffffff" />
              <path d="M-2 -4 L-2 -28 L-14 -4 Z" fill={GOLD} />
              <rect x="-0.5" y="-34" width="1" height="34" fill="#3b4a5c" />
            </g>
          </g>
        </g>
      </Depth>
      {/* Wet sand and the surf rolling in. */}
      <path d={`M-120 ${SHORE - 4} Q250 ${SHORE - 12} 500 ${SHORE - 4} T1120 ${SHORE - 6} L1120 ${SHORE + 26} L-120 ${SHORE + 26} Z`} fill={`url(#${id("wet")})`} />
      <path d={`M-120 ${SHORE + 18} Q300 ${SHORE + 10} 520 ${SHORE + 20} T1120 ${SHORE + 14} L1120 410 L-120 410 Z`} fill={`url(#${id("sand")})`} />
      {[0, 1, 2].map((k) => (
        <g key={k} className="rocky-surf" style={{ ["--t" as string]: "6s", ["--dl" as string]: `${-k * 2}s`, transformOrigin: "500px 0px" }}>
          <path d={`M-120 ${SHORE - 10 + k * 3} Q150 ${SHORE - 18 + k * 3} 420 ${SHORE - 8 + k * 3} T1120 ${SHORE - 12 + k * 3}`} stroke="#ffffff" strokeWidth={3 - k * 0.6} fill="none" strokeLinecap="round" opacity="0.9" />
        </g>
      ))}
      {/* Sand texture: ripples, shells, starfish. */}
      <g stroke="#d9b07a" strokeWidth="1.4" fill="none" opacity="0.5">
        {[330, 356, 384].map((y, i) => (
          <path key={y} d={`M${-100 + i * 60} ${y} q60 -6 120 0 t120 0 M${520 + i * 40} ${y + 6} q50 -5 100 0 t100 0`} />
        ))}
      </g>
      <path d="M260 352 l4 -10 l4 10 l10 2 l-8 6 l2 10 l-8 -5 l-8 5 l2 -10 l-8 -6 Z" fill="#ff8a6a" />
      <path d="M700 372 q8 -12 16 0 q-8 4 -16 0 Z" fill="#fff0e6" />
      <path d="M722 376 q6 -9 12 0 q-6 3 -12 0 Z" fill="#ffd6c8" />
      {/* Palms framing the beach. */}
      <Palm x={215} y={372} s={0.95} sway={live} />
      <Palm x={800} y={360} s={0.85} lean={-1} sway={live} />
      <Contact x={500} y={402} rx={420} ry={10} opacity={0.08} />
      <Birds y={90} speed={44} n={3} color="#56677a" />
      <Grade light="#fff4cf" lightX={0.76} strength={0.18} lightStrength={0.2} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Starry camp
// ---------------------------------------------------------------------------
export function StarCampScene({ live = false }: SceneProps) {
  const id = useIds();
  return (
    <>
      <defs>
        <Linear id={id("ground")} stops={[[0, "#1b2f3a"], [1, "#0f1d26"]]} />
        <Radial id={id("milky")} stops={[[0, "#c9b8ff", 0.45], [0.5, "#7a8fd6", 0.18], [1, "#3a4a8a", 0]]} />
        <filter id={id("soft")} x="-20%" y="-60%" width="140%" height="220%">
          <feGaussianBlur stdDeviation="10" />
        </filter>
        <Radial id={id("tent")} cy={0.7} stops={[[0, "#ffe2a0"], [0.6, "#f5a94a"], [1, "#b8682a"]]} />
      </defs>
      <Depth d={1}>
        <Sky stops={[[0, "#050a1c"], [0.55, "#111c40"], [0.85, "#24305a"], [1, "#3a3a62"]]} />
        {/* The Milky Way: a soft diagonal band dense with stars. */}
        <g transform="rotate(-18 500 120)" filter={`url(#${id("soft")})`}>
          <ellipse cx="500" cy="120" rx="620" ry="56" fill={`url(#${id("milky")})`} />
          <ellipse cx="460" cy="116" rx="340" ry="20" fill="#e8dcff" opacity="0.14" />
          <ellipse cx="560" cy="126" rx="160" ry="8" fill="#1a1838" opacity="0.45" />
        </g>
        <Starfield seed={77} n={220} y1={230} />
        <g transform="rotate(-18 500 120)">
          <Starfield seed={78} n={160} y1={60} />
        </g>
        <g transform="translate(820 40)">
          <g className="rocky-shoot" style={{ ["--t" as string]: "13s", ["--dl" as string]: "-4s" }}>
            <path d="M0 0 L60 -26" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" opacity="0.9" />
            <circle cx="0" cy="0" r="2.4" fill="#ffffff" />
          </g>
        </g>
      </Depth>
      <Depth d={0.7}>
        <Ridge seed={50} y={226} amp={40} color="#16243e" rim="#3c5288" waves={3} rimWidth={1.5} />
        <Haze y0={180} y1={240} color="#2a3a6a" opacity={0.4} />
      </Depth>
      <Depth d={0.45}>
        <Ridge seed={51} y={250} amp={22} color="#101c30" waves={2} />
        {Array.from({ length: 26 }, (_, i) => (
          <Conifer key={i} x={-110 + i * 48 + ((i * 19) % 24)} y={252 + ((i * 7) % 10)} s={0.55 + ((i * 3) % 5) * 0.06} hue="#0c1726" light="#1c2c48" />
        ))}
      </Depth>
      {/* The lake holding the stars. */}
      <rect x="-120" y="262" width="1240" height="34" fill="#16244a" />
      <g transform="translate(0 524) scale(1 -1)" opacity="0.4">
        <Starfield seed={77} n={60} y1={262} />
      </g>
      <Water y={262} y1={296} top="#1a2a52" bottom="#13203e" streak="#9fb4ff" seed={8} n={20} />
      {/* Ground. */}
      <path d="M-120 296 Q300 288 520 296 T1120 292 L1120 410 L-120 410 Z" fill={`url(#${id("ground")})`} />
      {/* The tent, glowing from the lantern inside. */}
      <g transform="translate(330 334) scale(0.9)">
        <Glow x={0} y={-20} rx={140} ry={60} color="#ffcf7a" opacity={0.35} />
        <path d="M-80 0 L0 -96 L80 0 Z" fill={`url(#${id("tent")})`} />
        <path d="M0 -96 L80 0 L60 0 L0 -86 Z" fill="#b8682a" opacity="0.5" />
        <path d="M-18 0 L0 -60 L18 0 Z" fill="#5a2e10" />
        <path d="M0 -60 L-26 0 L-18 0 Z" fill="#ffd98a" opacity="0.8" />
        <line x1="0" y1="-96" x2="0" y2="-108" stroke="#3b2a1a" strokeWidth="2" />
        <path d="M-80 0 L-110 6 M80 0 L110 6" stroke="#8a7a68" strokeWidth="1" />
      </g>
      {/* Campfire with flames, sparks and smoke. */}
      <g transform="translate(620 352)">
        <Glow x={0} y={-12} rx={180} ry={70} color="#ff9a3a" opacity={0.45} className="rocky-pulse" />
        <ellipse cx="0" cy="4" rx="34" ry="8" fill="#2a1a10" />
        {[-24, -8, 8, 24].map((x) => (
          <ellipse key={x} cx={x} cy="4" rx="9" ry="5" fill="#5a5a62" />
        ))}
        <path d="M-26 0 L26 -10 M-26 -10 L26 0" stroke="#5a3a22" strokeWidth="7" strokeLinecap="round" />
        <g className={live ? "rocky-flame" : undefined}>
          <path d="M-18 -4 C-22 -24 -6 -30 -8 -48 C4 -34 20 -30 16 -4 Z" fill="#ff7a2f" />
          <path d="M-10 -4 C-12 -18 0 -24 -2 -36 C8 -24 14 -18 10 -4 Z" fill="#ffc94a" />
          <path d="M-4 -4 C-5 -12 2 -16 1 -24 C6 -16 8 -12 4 -4 Z" fill="#fff4c8" />
        </g>
        {live && <Motes seed={3} n={12} x={[-14, 14]} y={[-40, -20]} r={[0.8, 1.4]} color="#ffb347" drift={[16, -70]} dur={[2.4, 4]} />}
        {live &&
          [0, 1, 2].map((k) => (
            <circle key={k} cx={k * 3} cy={-56} r="7" fill="#8a8aa0" opacity="0.25" className="rocky-smoke" style={{ animationDelay: `${-k * 1.3}s` }} />
          ))}
        {/* Logs to sit on. */}
        <rect x="-110" y="2" width="56" height="14" rx="7" fill="#5a3a22" />
        <circle cx="-54" cy="9" r="7" fill="#c9a07a" />
      </g>
      <GrassTufts seed={8} n={40} y={[300, 405]} color="#1f3a3a" sway={live} />
      {live && <Motes seed={12} n={22} x={[60, 940]} y={[250, 380]} r={[0.8, 1.5]} color="#e8ff9a" glow drift={[24, -20]} dur={[6, 11]} />}
      <Grade light="#ffb36b" lightX={0.62} vignette="#02040e" strength={0.42} lightStrength={0.08} />
    </>
  );
}
