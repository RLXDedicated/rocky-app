// Seasonal scenes (opened by QA for Spooky and Holiday seasons): the haunted
// hill, the pumpkin patch, the moonlit graveyard, the winter village and the
// North Pole under the aurora.
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
  rng,
  shade,
  Sky,
  Snowfall,
  Starfield,
  useIds,
  type SceneProps,
} from "./kit";

/** Bats flapping across the moon. */
function Bats({ y, speed = 30, n = 4, delay = 0 }: { y: number; speed?: number; n?: number; delay?: number }) {
  return (
    <g className="rocky-drift" style={{ ["--t" as string]: `${speed}s`, ["--dl" as string]: `${-delay}s`, ["--x" as string]: "420px" }}>
      {Array.from({ length: n }, (_, i) => (
        <g key={i} transform={`translate(${-160 + i * 26} ${y + (i % 2) * 12 - i * 3})`}>
          <path d="M0 0 Q-6 -8 -14 -4 Q-10 -2 -8 2 Q-4 -1 0 2 Q4 -1 8 2 Q10 -2 14 -4 Q6 -8 0 0 Z" fill="#1a1028" className="rocky-flap" />
        </g>
      ))}
    </g>
  );
}

/** A jack-o'-lantern glowing from inside (at the origin, bottom on y=0). */
function JackO({ s = 1, lit = true }: { s?: number; lit?: boolean }) {
  const id = useIds();
  return (
    <g transform={`scale(${s})`}>
      <defs>
        <Radial id={id("p")} cx={0.4} cy={0.35} stops={[[0, "#ffb347"], [0.6, "#f07a1a"], [1, "#a8460a"]]} />
      </defs>
      {lit && <Glow x={0} y={-14} rx={50} ry={30} color="#ffb347" opacity={0.45} className="rocky-pulse" />}
      <ellipse cx="0" cy="0" rx="22" ry="4" fill="#0b0814" opacity="0.4" />
      <ellipse cx="-9" cy="-14" rx="12" ry="14" fill={`url(#${id("p")})`} />
      <ellipse cx="9" cy="-14" rx="12" ry="14" fill={`url(#${id("p")})`} />
      <ellipse cx="0" cy="-15" rx="12" ry="15" fill={`url(#${id("p")})`} />
      <path d="M-1 -29 Q0 -36 5 -38" stroke="#4a6a2a" strokeWidth="3" fill="none" strokeLinecap="round" />
      {lit && (
        <g fill="#fff1a8">
          <path d="M-10 -20 L-5 -14 L-14 -14 Z" />
          <path d="M10 -20 L14 -14 L5 -14 Z" />
          <path d="M-12 -8 L-6 -4 L-2 -8 L2 -4 L6 -8 L12 -6 L6 -1 L-6 -1 Z" />
        </g>
      )}
    </g>
  );
}

/** A dead, twisted tree silhouette. */
function DeadTree({ x, y, s = 1, color = "#1a1028", flip = false }: { x: number; y: number; s?: number; color?: string; flip?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`} fill="none" stroke={color} strokeLinecap="round">
      <path d="M0 0 C4 -40 -8 -80 6 -120 C14 -140 10 -160 24 -176" strokeWidth="12" />
      <path d="M2 -70 C-20 -84 -40 -80 -60 -100 M-36 -84 C-44 -100 -40 -114 -52 -124" strokeWidth="6" />
      <path d="M6 -118 C30 -126 50 -120 70 -140 M48 -124 C58 -136 56 -148 66 -160" strokeWidth="5" />
      <path d="M16 -160 C4 -170 -6 -168 -14 -182" strokeWidth="4" />
    </g>
  );
}

export function HauntedScene({ live = false }: SceneProps) {
  const id = useIds();
  return (
    <>
      <defs>
        <Linear id={id("hill")} stops={[[0, "#3a2a58"], [1, "#1f1636"]]} />
      </defs>
      <Depth d={1}>
        <Sky stops={[[0, "#120a26"], [0.5, "#2c1a4e"], [0.85, "#5a3a7a"], [1, "#7a4a7a"]]} sun={{ x: 720, y: 110, r: 240, color: "#e8d8ff", strength: 0.5 }} />
        <Starfield seed={66} n={90} y1={180} />
        <circle cx="720" cy="110" r="58" fill="#f4ecd0" />
        <circle cx="704" cy="96" r="10" fill="#e2d6b4" opacity="0.7" />
        <circle cx="738" cy="124" r="14" fill="#e2d6b4" opacity="0.6" />
        <CloudDrift seed={67} n={3} y={[80, 140]} s={[0.8, 1.2]} speed={120} tint="#3a2a58" light="#7a6a9a" opacity={0.65} />
      </Depth>
      <Depth d={0.75}>
        <Ridge seed={5} y={240} amp={30} color="#2a1c46" rim="#6a5a9a" waves={3} rimWidth={1.5} />
        <Haze y0={190} y1={250} color="#5a3a7a" opacity={0.5} />
      </Depth>
      {/* The haunted house up on the hill. */}
      <Depth d={0.5}>
        <path d="M200 250 Q400 150 600 160 Q760 166 900 250 Z" fill={`url(#${id("hill")})`} />
        <g transform="translate(440 162)">
          <rect x="-50" y="-70" width="100" height="70" fill="#241838" />
          <path d="M-62 -68 L0 -120 L62 -68 Z" fill="#1a1028" />
          <rect x="30" y="-128" width="22" height="70" fill="#241838" />
          <path d="M26 -126 L41 -150 L56 -126 Z" fill="#1a1028" />
          {[[-38, -56], [16, -56], [-38, -30], [36, -100]].map(([x, y], i) => (
            <rect key={i} x={x} y={y} width="14" height="16" fill="#ffcf5a" className={live && i % 2 ? "rocky-flicker" : undefined} style={{ ["--dl" as string]: `${-i * 2}s` }} />
          ))}
          <path d="M-8 0 L-8 -24 Q0 -32 8 -24 L8 0 Z" fill="#0e0818" />
          <Glow x={0} y={-50} rx={120} ry={60} color="#ffcf5a" opacity={0.18} />
          {/* A crooked fence down the hill. */}
          <g stroke="#1a1028" strokeWidth="3">
            {Array.from({ length: 9 }, (_, i) => (
              <line key={i} x1={-150 + i * 14} y1={30 + i * 3} x2={-148 + i * 14 + (i % 3) - 1} y2={14 + i * 3} />
            ))}
          </g>
        </g>
        <FogBank seed={9} n={6} y={[200, 240]} color="#b8a8d8" opacity={0.5} speed={180} />
      </Depth>
      <Bats y={100} speed={26} n={5} />
      <Bats y={60} speed={34} n={3} delay={14} />
      {/* The near slope and a path of jack-o'-lanterns. */}
      <path d="M-120 270 Q300 250 520 268 T1120 262 L1120 410 L-120 410 Z" fill="#1f1636" />
      <path d="M-120 270 Q300 250 520 268 T1120 262" stroke="#4a3a6a" strokeWidth="2" fill="none" />
      <DeadTree x={110} y={330} s={1.1} />
      <DeadTree x={900} y={320} s={0.95} flip />
      {[[300, 300, 0.7], [380, 320, 0.85], [640, 316, 0.8], [720, 296, 0.65]].map(([x, y, s], i) => (
        <g key={i} transform={`translate(${x} ${y})`}>
          <JackO s={s} />
        </g>
      ))}
      {/* A friendly ghost drifting by. */}
      <g transform="translate(600 210)">
        <g className="rocky-bob" opacity="0.85">
          <path d="M-16 20 L-16 -8 Q-16 -26 0 -26 Q16 -26 16 -8 L16 20 L10 14 L4 20 L-2 14 L-8 20 Z" fill="#f2eeff" />
          <circle cx="-5" cy="-10" r="2.4" fill="#2a1c46" />
          <circle cx="6" cy="-10" r="2.4" fill="#2a1c46" />
          <ellipse cx="0" cy="-2" rx="3" ry="4" fill="#2a1c46" />
          <Glow x={0} y={0} rx={36} color="#e8e0ff" opacity={0.3} />
        </g>
      </g>
      <FogBank seed={12} n={6} y={[300, 390]} color="#8a7ab0" opacity={0.35} speed={150} />
      {live && <Motes seed={4} n={16} x={[60, 940]} y={[260, 380]} r={[0.8, 1.4]} color="#b9ff9a" glow drift={[20, -16]} dur={[6, 11]} />}
      <Grade light="#e8d8ff" lightX={0.72} vignette="#05020e" strength={0.45} lightStrength={0.1} />
    </>
  );
}

export function PumpkinPatchScene({ live = false }: SceneProps) {
  const id = useIds();
  const g = ground(232, 180);
  const pumpkins = useMemo(() => {
    const r = rng(19);
    const out: { X: number; Z: number; s: number }[] = [];
    for (let row = 0; row < 9; row++) {
      const Z = 1.25 + row * row * 0.12 + row * 0.35;
      for (let k = 0; k < 14; k++) if (r() < 0.55) out.push({ X: -2200 + k * 340 + (r() - 0.5) * 120, Z, s: 0.8 + r() * 0.5 });
    }
    return out.sort((a, b) => b.Z - a.Z);
  }, []);
  return (
    <>
      <defs>
        <Linear id={id("field")} stops={[[0, "#b8864a"], [1, "#7a5430"]]} />
      </defs>
      <Depth d={1}>
        <Sky stops={[[0, "#5a6aa8"], [0.45, "#e8906a"], [0.8, "#ffc27a"], [1, "#ffe0a8"]]} sun={{ x: 300, y: 210, r: 260, color: "#ffcf86", strength: 1 }} />
        <circle cx="300" cy="210" r="30" fill="#fff0c8" />
        <CloudDrift seed={23} n={4} y={[40, 110]} s={[0.6, 1]} speed={160} tint="#c46a6a" light="#ffd2a8" opacity={0.85} />
      </Depth>
      <Depth d={0.7}>
        <Ridge seed={3} y={226} amp={16} color="#a8607a" rim="#ffc796" waves={3} />
        {/* Autumn tree line. */}
        {Array.from({ length: 24 }, (_, i) => (
          <circle key={i} cx={-110 + i * 54} cy={224 - ((i * 7) % 10)} r={16 + ((i * 11) % 8)} fill={["#c8562a", "#e2873a", "#a8442a", "#d9a03a"][i % 4]} />
        ))}
        <Haze y0={190} y1={236} color="#ffc89a" opacity={0.5} />
      </Depth>
      {/* The red barn. */}
      <Depth d={0.4}>
        <g transform="translate(740 236)">
          <Contact x={0} y={0} rx={90} opacity={0.25} />
          <rect x="-60" y="-70" width="120" height="70" fill="#b5332a" />
          <path d="M-70 -66 L-40 -104 L40 -104 L70 -66 Z" fill="#7a2a24" />
          <path d="M-70 -66 L-40 -104 L40 -104 L70 -66" stroke="#f2e2c6" strokeWidth="3" fill="none" />
          <rect x="-24" y="-46" width="48" height="46" fill="#7a2a24" />
          <path d="M-24 -46 L24 0 M24 -46 L-24 0" stroke="#f2e2c6" strokeWidth="3" />
          <rect x="-24" y="-46" width="48" height="46" fill="none" stroke="#f2e2c6" strokeWidth="3" />
          <rect x="-10" y="-90" width="20" height="16" fill="#ffd98a" />
        </g>
      </Depth>
      {/* The field in rows, with pumpkins on the vines. */}
      <rect x="-120" y="232" width="1240" height="180" fill={`url(#${id("field")})`} />
      <g stroke="#6b4a2a" strokeWidth="1.5" opacity="0.5">
        {[1.3, 1.8, 2.5, 3.4, 4.6, 6.4, 9].map((Z) => (
          <path key={Z} d={`M${g.gp(-6000, Z)} L${g.gp(6000, Z)}`} />
        ))}
      </g>
      {pumpkins.map((p, i) => (
        <g key={i} transform={`translate(${g.gx(p.X, p.Z).toFixed(1)} ${g.gy(p.Z).toFixed(1)})`}>
          <path d={`M${-30 / p.Z} 0 q${10 / p.Z} ${-8 / p.Z} ${20 / p.Z} 0 q${10 / p.Z} ${-6 / p.Z} ${20 / p.Z} 0`} stroke="#4a6a2a" strokeWidth={2 / p.Z} fill="none" />
          <JackO s={(p.s * 1.4) / p.Z} lit={false} />
        </g>
      ))}
      {/* Scarecrow and hay bales. */}
      <g transform="translate(250 300)">
        <rect x="-2" y="-90" width="4" height="90" fill="#6b4a2a" />
        <rect x="-36" y="-70" width="72" height="4" fill="#6b4a2a" />
        <path d="M-16 -70 L16 -70 L12 -30 L-12 -30 Z" fill="#3f6fb0" />
        <path d="M-36 -68 L-16 -70 L-16 -60 Z M36 -68 L16 -70 L16 -60 Z" fill="#d9a03a" />
        <circle cx="0" cy="-80" r="10" fill="#e8c88a" />
        <path d="M-16 -86 L16 -86 L10 -96 L-10 -96 Z" fill="#6b4a2a" />
        <path d="M-20 -86 L20 -86" stroke="#6b4a2a" strokeWidth="3" />
      </g>
      {[[120, 340], [860, 330]].map(([x, y], i) => (
        <g key={i} transform={`translate(${x} ${y})`}>
          <Contact x={0} y={0} rx={50} opacity={0.3} />
          <rect x="-44" y="-36" width="88" height="36" rx="5" fill="#e2b85a" />
          <g stroke="#c8963a" strokeWidth="1.5">
            {[-30, -16, 0, 16, 30].map((xx) => (
              <line key={xx} x1={xx} y1="-34" x2={xx} y2="-2" />
            ))}
          </g>
          <rect x="-44" y="-36" width="88" height="6" fill="#f2d08a" />
        </g>
      ))}
      <Birds y={120} speed={44} n={3} color="#2a1a1a" />
      {live && <Motes seed={6} n={20} x={[0, 1000]} y={[60, 300]} r={[1.6, 2.6]} color="#e2873a" drift={[40, 60]} dur={[7, 12]} />}
      <Grade light="#ffcf86" lightX={0.3} vignette="#2a0f10" strength={0.3} lightStrength={0.22} />
    </>
  );
}

export function GraveyardScene({ live = false }: SceneProps) {
  const id = useIds();
  const g = ground(236, 170);
  const stones = useMemo(() => {
    const r = rng(29);
    return Array.from({ length: 18 }, () => ({ X: (r() - 0.5) * 2600, Z: 1.4 + r() * 5, k: Math.floor(r() * 3), tilt: (r() - 0.5) * 10 }))
      .filter((s) => Math.abs(s.X / s.Z) > 90)
      .sort((a, b) => b.Z - a.Z);
  }, []);
  return (
    <>
      <defs>
        <Linear id={id("grass")} stops={[[0, "#2a3a4a"], [1, "#16202c"]]} />
        <Linear id={id("stone")} stops={[[0, "#9aa4b4"], [1, "#5a6474"]]} />
      </defs>
      <Depth d={1}>
        <Sky stops={[[0, "#0a1024"], [0.6, "#1c2a4a"], [1, "#3a4a6a"]]} sun={{ x: 280, y: 90, r: 220, color: "#dfe8ff", strength: 0.55 }} />
        <Starfield seed={88} n={80} y1={180} />
        <circle cx="280" cy="90" r="46" fill="#eef2ff" />
        <circle cx="266" cy="80" r="8" fill="#cfd6ea" opacity="0.7" />
      </Depth>
      <Depth d={0.7}>
        <Ridge seed={41} y={232} amp={20} color="#1a2438" waves={3} />
        {Array.from({ length: 20 }, (_, i) => (
          <Conifer key={i} x={-100 + i * 64 + ((i * 23) % 30)} y={234} s={0.5} hue="#121a2c" light="#1f2a40" />
        ))}
        <FogBank seed={4} n={6} y={[214, 240]} color="#9aaacb" opacity={0.5} speed={200} />
      </Depth>
      {/* Iron fence across the back. */}
      <g stroke="#0e1424" strokeWidth="2.5">
        <line x1="-120" y1="230" x2="1120" y2="230" />
        <line x1="-120" y1="250" x2="1120" y2="250" />
        {Array.from({ length: 70 }, (_, i) => (
          <line key={i} x1={-118 + i * 18} y1="222" x2={-118 + i * 18} y2="256" />
        ))}
      </g>
      <rect x="-120" y="252" width="1240" height="160" fill={`url(#${id("grass")})`} />
      {/* Headstones on the ground plane (none in the middle, where Rocky walks). */}
      {stones.map((s, i) => {
        const x = g.gx(s.X, s.Z);
        const y = g.gy(s.Z);
        const k = 1.5 / s.Z;
        return (
          <g key={i} transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${k.toFixed(3)}) rotate(${s.tilt.toFixed(1)})`}>
            <ellipse cx="6" cy="0" rx="34" ry="6" fill="#05080f" opacity="0.4" />
            {s.k === 0 && <path d="M-20 0 L-20 -50 Q0 -72 20 -50 L20 0 Z" fill={`url(#${id("stone")})`} />}
            {s.k === 1 && <path d="M-6 0 L-6 -40 L-22 -40 L-22 -52 L-6 -52 L-6 -70 L6 -70 L6 -52 L22 -52 L22 -40 L6 -40 L6 0 Z" fill={`url(#${id("stone")})`} />}
            {s.k === 2 && <rect x="-24" y="-40" width="48" height="40" rx="4" fill={`url(#${id("stone")})`} />}
            {s.k !== 1 && <text x="0" y="-22" textAnchor="middle" fontFamily="Poppins, sans-serif" fontWeight="800" fontSize="10" fill="#3a4454">RIP</text>}
            <path d="M-20 0 L-20 -6 L20 -6 L20 0 Z" fill="#3a5a3a" opacity="0.6" />
          </g>
        );
      })}
      <DeadTree x={140} y={330} s={1.15} color="#0b1020" />
      {/* A lantern with a warm glow. */}
      <g transform="translate(820 330)">
        <Glow x={0} y={-40} rx={90} ry={60} color="#ffcf5a" opacity={0.4} className="rocky-pulse" />
        <rect x="-2" y="-40" width="4" height="40" fill="#1a1a24" />
        <rect x="-10" y="-62" width="20" height="24" fill="#1a1a24" />
        <rect x="-7" y="-58" width="14" height="17" fill="#ffd98a" />
        <path d="M-12 -62 L0 -72 L12 -62 Z" fill="#1a1a24" />
      </g>
      <Bats y={70} speed={30} n={4} />
      <FogBank seed={6} n={7} y={[290, 390]} color="#8a9abb" opacity={0.38} speed={140} />
      {live && <Motes seed={13} n={18} x={[60, 940]} y={[260, 380]} r={[0.8, 1.4]} color="#b9ff9a" glow drift={[20, -16]} dur={[6, 11]} />}
      <GrassTufts seed={3} n={30} y={[300, 405]} color="#1f2c3a" sway={live} />
      <Grade light="#dfe8ff" lightX={0.28} vignette="#02040a" strength={0.45} lightStrength={0.12} />
    </>
  );
}

/** A snowy cottage with lit windows and a smoking chimney. */
function SnowCottage({ x, y, s = 1, wall, roof, live }: { x: number; y: number; s?: number; wall: string; roof: string; live: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <Contact x={0} y={0} rx={70} opacity={0.2} />
      <rect x="-50" y="-56" width="100" height="56" fill={wall} />
      <rect x="-50" y="-56" width="22" height="56" fill={shade(wall, -0.18)} />
      <rect x="20" y="-104" width="14" height="30" fill="#6b4a3a" />
      <path d="M-62 -54 L0 -100 L62 -54 Z" fill={roof} />
      <path d="M-66 -52 Q-30 -60 0 -104 Q30 -60 66 -52 Q60 -46 0 -92 Q-60 -46 -66 -52 Z" fill="#ffffff" />
      <rect x="-36" y="-40" width="18" height="18" fill="#ffd98a" />
      <rect x="18" y="-40" width="18" height="18" fill="#ffd98a" />
      <path d="M-27 -40 v18 M-36 -31 h18 M27 -40 v18 M18 -31 h18" stroke={shade(wall, -0.3)} strokeWidth="2" />
      <rect x="-9" y="-30" width="18" height="30" fill="#7a3a2a" />
      <Glow x={0} y={-30} rx={70} ry={30} color="#ffd98a" opacity={0.3} />
      <path d="M-50 0 Q0 -8 50 0 Z" fill="#ffffff" />
      {live &&
        [0, 1, 2].map((k) => (
          <circle key={k} cx={27 + k * 2} cy={-108} r="6" fill="#ffffff" opacity="0.5" className="rocky-smoke" style={{ animationDelay: `${-k * 1.3}s` }} />
        ))}
    </g>
  );
}

export function WinterScene({ live = false }: SceneProps) {
  const id = useIds();
  return (
    <>
      <defs>
        <Linear id={id("snow")} stops={[[0, "#eef4fb"], [0.5, "#dfe9f5"], [1, "#c9d8ea"]]} />
        <Linear id={id("ice")} stops={[[0, "#bcd8ee"], [1, "#8fb8dc"]]} />
      </defs>
      <Depth d={1}>
        <Sky stops={[[0, "#2a3f78"], [0.5, "#6a7ab8"], [0.85, "#e8b8c8"], [1, "#f6d8d0"]]} sun={{ x: 640, y: 230, r: 260, color: "#ffd8c8", strength: 0.7 }} />
        <Starfield seed={5} n={40} y1={80} />
      </Depth>
      <Depth d={0.75}>
        <Ridge seed={6} y={210} amp={40} color="#b8c8e2" rim="#ffffff" waves={3} />
        <Haze y0={150} y1={226} color="#e8d8e8" opacity={0.5} />
      </Depth>
      <Depth d={0.5}>
        <Ridge seed={8} y={236} amp={18} color="#dfe8f4" rim="#ffffff" waves={2} />
        {Array.from({ length: 22 }, (_, i) => (
          <Conifer key={i} x={-100 + i * 58 + ((i * 31) % 26)} y={238 - ((i * 7) % 10)} s={0.55 + ((i * 3) % 4) * 0.06} hue="#2f5a5a" light="#5a8a8a" snow />
        ))}
      </Depth>
      {/* The village. */}
      <Depth d={0.3}>
        <SnowCottage x={200} y={262} s={0.8} wall="#e8a86a" roof="#8a3b3b" live={live} />
        <SnowCottage x={380} y={252} s={0.6} wall="#9ac0e0" roof="#3d5a80" live={live} />
        <SnowCottage x={640} y={256} s={0.7} wall="#f2d08a" roof="#6b4a3a" live={live} />
        <SnowCottage x={840} y={264} s={0.85} wall="#c8a2d8" roof="#5a3a6a" live={live} />
        {/* String lights between the houses. */}
        <path d="M240 214 Q310 240 380 222 Q510 250 640 218 Q740 246 840 210" stroke="#3b2a1a" strokeWidth="1" fill="none" />
        {Array.from({ length: 22 }, (_, i) => {
          const t = i / 21;
          const x = 240 + t * 600;
          const y = 214 + Math.sin(t * Math.PI * 3) * 14 + 10;
          return <circle key={i} cx={x} cy={y} r="2.6" fill={["#ff5a4f", GOLD, "#5fd38a", "#5ab0ff"][i % 4]} className={live && i % 3 === 0 ? "rocky-blink" : undefined} />;
        })}
      </Depth>
      {/* Snowy ground with a frozen pond. */}
      <path d="M-120 272 Q300 262 520 270 T1120 266 L1120 410 L-120 410 Z" fill={`url(#${id("snow")})`} />
      <ellipse cx="520" cy="300" rx="190" ry="20" fill={`url(#${id("ice")})`} />
      <path d="M380 296 l60 -4 M520 306 l80 -6 M600 294 l40 2" stroke="#ffffff" strokeWidth="1.5" opacity="0.8" className="rocky-shimmer" />
      <Conifer x={80} y={360} s={1.6} hue="#2a5050" light="#4a7a7a" snow />
      <Conifer x={930} y={350} s={1.4} hue="#2a5050" light="#4a7a7a" snow />
      {/* A snowman. */}
      <g transform="translate(250 340)">
        <Contact x={0} y={0} rx={30} opacity={0.2} />
        <circle cx="0" cy="-18" r="20" fill="#ffffff" />
        <circle cx="0" cy="-48" r="14" fill="#ffffff" />
        <circle cx="0" cy="-70" r="10" fill="#ffffff" />
        <path d="M0 -70 L12 -67 L0 -66 Z" fill="#ff8a3a" />
        <rect x="-12" y="-60" width="24" height="5" fill="#c8102e" />
        <rect x="-8" y="-90" width="16" height="12" fill="#1b2433" />
        <rect x="-12" y="-80" width="24" height="3" fill="#1b2433" />
      </g>
      {live && <Snowfall seed={7} n={36} />}
      <Grade light="#ffd8c8" lightX={0.64} vignette="#141a3a" strength={0.28} lightStrength={0.16} />
    </>
  );
}

export function NorthPoleScene({ live = false }: SceneProps) {
  const id = useIds();
  return (
    <>
      <defs>
        <Linear id={id("aur1")} stops={[[0, "#5affc8", 0], [0.4, "#5affc8", 0.55], [1, "#5affc8", 0]]} />
        <Linear id={id("aur2")} stops={[[0, "#b88aff", 0], [0.5, "#b88aff", 0.45], [1, "#b88aff", 0]]} />
        <Linear id={id("snow")} stops={[[0, "#e8f0fb"], [1, "#c2d4ea"]]} />
      </defs>
      <Depth d={1}>
        <Sky stops={[[0, "#040a1e"], [0.6, "#0c1a3a"], [1, "#1c3a5a"]]} />
        <Starfield seed={9} n={150} y1={220} />
        {/* Aurora curtains, drifting and breathing. */}
        <g>
          <g className="rocky-pulse">
            <path d="M-120 120 C100 40 300 160 520 80 C720 10 900 120 1120 60 L1120 160 C900 220 720 110 520 180 C300 260 100 140 -120 220 Z" fill={`url(#${id("aur1")})`} />
          </g>
          <g className="rocky-shuttle" style={{ ["--t" as string]: "18s", ["--from" as string]: "-40px", ["--to" as string]: "40px" }}>
            <path d="M-120 70 C140 20 340 110 560 40 C760 -20 940 70 1120 20 L1120 100 C940 150 760 60 560 130 C340 200 140 90 -120 150 Z" fill={`url(#${id("aur2")})`} />
          </g>
        </g>
      </Depth>
      <Depth d={0.7}>
        <Ridge seed={2} y={236} amp={30} color="#b8cce6" rim="#ffffff" waves={3} />
        <Haze y0={190} y1={246} color="#5affc8" opacity={0.12} />
      </Depth>
      <Depth d={0.45}>
        {Array.from({ length: 18 }, (_, i) => (
          <Conifer key={i} x={-100 + i * 72 + ((i * 29) % 30)} y={250} s={0.6 + ((i * 5) % 4) * 0.06} hue="#1f4a4a" light="#3a6a6a" snow />
        ))}
      </Depth>
      <path d="M-120 262 Q300 254 520 262 T1120 258 L1120 410 L-120 410 Z" fill={`url(#${id("snow")})`} />
      {/* Santa's workshop. */}
      <g transform="translate(700 286)">
        <Contact x={0} y={0} rx={120} opacity={0.25} />
        <rect x="-90" y="-80" width="180" height="80" fill="#c8302a" />
        <rect x="-90" y="-80" width="40" height="80" fill="#a8241e" />
        <path d="M-104 -78 L0 -140 L104 -78 Z" fill="#2f5a3a" />
        <path d="M-110 -74 Q-50 -90 0 -144 Q50 -90 110 -74 Q100 -66 0 -128 Q-100 -66 -110 -74 Z" fill="#ffffff" />
        {[-60, -20, 30, 64].map((x) => (
          <rect key={x} x={x - 10} y="-60" width="22" height="22" fill="#ffd98a" />
        ))}
        <rect x="-14" y="-40" width="28" height="40" fill="#5a2a1a" />
        <rect x="-78" y="-122" width="156" height="18" rx="3" fill="#ffffff" />
        <text x="0" y="-109" textAnchor="middle" fontFamily="Poppins, sans-serif" fontWeight="800" fontSize="11" fill="#c8302a" letterSpacing="1">
          RLX × NORTH POLE
        </text>
        <Glow x={0} y={-40} rx={160} ry={50} color="#ffd98a" opacity={0.3} />
        {Array.from({ length: 16 }, (_, i) => (
          <circle key={i} cx={-100 + i * 13.3} cy={-76 + Math.sin(i) * 2} r="2.6" fill={["#ff5a4f", GOLD, "#5fd38a", "#5ab0ff"][i % 4]} className={live && i % 2 ? "rocky-blink" : undefined} />
        ))}
      </g>
      {/* The North Pole marker. */}
      <g transform="translate(260 340)">
        <Contact x={0} y={0} rx={26} opacity={0.25} />
        <rect x="-6" y="-150" width="12" height="150" fill="#ffffff" />
        {Array.from({ length: 8 }, (_, i) => (
          <path key={i} d={`M-6 ${-150 + i * 20} L6 ${-158 + i * 20} L6 ${-146 + i * 20} L-6 ${-138 + i * 20} Z`} fill="#c8302a" />
        ))}
        <circle cx="0" cy="-156" r="10" fill={GOLD} />
        <Glow x={0} y={-156} rx={30} color="#ffe28a" opacity={0.6} className="rocky-pulse" />
      </g>
      <Conifer x={70} y={370} s={1.6} hue="#1f4a4a" light="#3a6a6a" snow />
      <Conifer x={940} y={366} s={1.5} hue="#1f4a4a" light="#3a6a6a" snow />
      {live && <Snowfall seed={3} n={30} />}
      <Grade light="#5affc8" lightX={0.5} vignette="#020616" strength={0.38} lightStrength={0.08} />
    </>
  );
}

