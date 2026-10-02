// Stadiums: the ballpark at golden hour and the rojiblanco stadium on match
// night (a tribute to Junior). Both pitches are drawn on a real ground plane,
// so their lines run to the horizon; the stands are packed and alive.
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
  ground,
  Haze,
  Linear,
  Motes,
  NAVY,
  rng,
  Sky,
  Starfield,
  useIds,
  WHITE,
  type SceneProps,
} from "./kit";

/**
 * A packed stand. The crowd is an SVG pattern (one tile of seeded fans, cheap
 * to draw however wide the stand is) and the wave is a single band of raised
 * arms sweeping across.
 */
function Crowd({ seed, x0, x1, y0, y1, colors, size, wave = true }: { seed: number; x0: number; x1: number; y0: number; y1: number; colors: string[]; size: number; wave?: boolean }) {
  const id = useIds();
  const tileW = size * 2.1 * 9;
  const tileH = size * 2.2 * 2;
  const fans = useMemo(() => {
    const r = rng(seed);
    const out: { x: number; y: number; c: string }[] = [];
    for (let row = 0; row < 2; row++)
      for (let k = 0; k < 9; k++) out.push({ x: k * size * 2.1 + (row ? size : 0) + (r() - 0.5) * size * 0.3, y: row * size * 2.2 + size * 1.5, c: colors[Math.floor(r() * colors.length)]! });
    return out;
  }, [seed, colors, size]);
  return (
    <g>
      <defs>
        <pattern id={id("p")} width={tileW} height={tileH} patternUnits="userSpaceOnUse" x={x0} y={y0}>
          {fans.map((f, i) => (
            <g key={i}>
              <rect x={f.x - size * 0.62} y={f.y - size * 0.45} width={size * 1.24} height={size * 1.15} rx={size * 0.42} fill={f.c} />
              <circle cx={f.x} cy={f.y - size * 0.85} r={size * 0.42} fill="#e8c1a0" />
            </g>
          ))}
        </pattern>
        <Linear id={id("w")} x2={1} y2={0} stops={[[0, "#ffffff", 0], [0.5, "#ffffff", 0.32], [1, "#ffffff", 0]]} />
      </defs>
      <rect x={x0} y={y0} width={x1 - x0} height={y1 - y0} fill={`url(#${id("p")})`} />
      {/* Depth within the stand: rows further up are a touch hazier. */}
      <rect x={x0} y={y0} width={x1 - x0} height={(y1 - y0) * 0.5} fill="#9fb0c8" opacity="0.12" />
      {wave && (
        <g className="rocky-run" style={{ ["--t" as string]: "9s", ["--from" as string]: "0px", ["--to" as string]: `${x1 - x0 + 160}px`, ["--x" as string]: "-400px" }}>
          <rect x={x0 - 160} y={y0} width="160" height={y1 - y0} fill={`url(#${id("w")})`} />
        </g>
      )}
    </g>
  );
}

/** A stadium floodlight tower with a bank of lamps and its glow. */
export function Floodlight({ x, y, h, s = 1, color = "#fff6dc" }: { x: number; y: number; h: number; s?: number; color?: string }) {
  return (
    <g>
      <path d={`M${x - 4 * s} ${y} L${x - 2 * s} ${y - h} L${x + 2 * s} ${y - h} L${x + 4 * s} ${y} Z`} fill="#3b4a5c" />
      <rect x={x - 22 * s} y={y - h - 26 * s} width={44 * s} height={26 * s} rx={2 * s} fill="#2c3442" />
      {Array.from({ length: 8 }, (_, i) => (
        <circle key={i} cx={x - 15 * s + (i % 4) * 10 * s} cy={y - h - 19 * s + Math.floor(i / 4) * 12 * s} r={3.6 * s} fill={color} />
      ))}
      <Glow x={x} y={y - h - 13 * s} rx={90 * s} ry={70 * s} color={color} opacity={0.55} />
    </g>
  );
}

export function BallparkScene({ live = false }: SceneProps) {
  const id = useIds();
  const g = ground(210, 200);
  const home: [number, number] = [0, 1.32];
  const first: [number, number] = [330, 2.05];
  const second: [number, number] = [0, 3.4];
  const third: [number, number] = [-330, 2.05];
  const grassStripes = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => {
        const z0 = 2.2 + i * 0.6;
        return { d: g.poly([[-6000, z0], [6000, z0], [6000, z0 + 0.3], [-6000, z0 + 0.3]]), i };
      }),
    [g],
  );
  return (
    <>
      <defs>
        <Linear id={id("grass")} stops={[[0, "#4f9a42"], [0.4, "#5fb04c"], [1, "#3f8a38"]]} />
        <Linear id={id("dirt")} stops={[[0, "#c98a5a"], [1, "#b0744a"]]} />
        <Linear id={id("wall")} stops={[[0, "#1f5a3a"], [1, "#16452c"]]} />
        <Linear id={id("stand")} stops={[[0, "#2c3a52"], [1, "#46597a"]]} />
      </defs>
      <Depth d={1}>
        <Sky stops={[[0, "#4a6fb0"], [0.45, "#9f8fc0"], [0.75, "#f2a97a"], [1, "#ffd59a"]]} sun={{ x: 200, y: 170, r: 220, color: "#ffd59a", strength: 0.8 }} />
        <CloudDrift seed={15} n={4} y={[20, 80]} s={[0.6, 1]} speed={160} tint="#d98a8a" light="#ffe2c2" opacity={0.85} />
      </Depth>

      {/* Upper deck, then the lower stands, in a gentle arc behind the outfield. */}
      <Depth d={0.4}>
        <path d="M-120 150 Q500 80 1120 150 L1120 200 L-120 200 Z" fill={`url(#${id("stand")})`} />
        <path d="M-120 150 Q500 80 1120 150" stroke="#5f7896" strokeWidth="4" fill="none" />
        <Crowd seed={3} x0={-110} x1={1110} y0={110} y1={196} colors={["#e14b3b", "#2f6db5", "#ffffff", "#f5b82e", GREEN2, NAVY]} size={3.2} wave={live} />
        {/* Roof canopy over the upper deck, with lights hanging under its edge. */}
        <path d="M-120 -40 L1120 -40 L1120 104 Q500 30 -120 104 Z" fill="#1b2433" opacity="0.92" />
        <path d="M-120 104 Q500 30 1120 104" stroke="#3b4a5c" strokeWidth="3" fill="none" />
        <g stroke="#2c3442" strokeWidth="1.5" opacity="0.8">
          {Array.from({ length: 22 }, (_, i) => {
            const x = -100 + i * 58;
            const t = (x - 500) / 620;
            return <line key={i} x1={x} y1={-40} x2={x} y2={104 - (1 - t * t) * 74} />;
          })}
        </g>
        {[60, 230, 400, 600, 770, 940].map((x) => {
          const t = (x - 500) / 620;
          const y = 104 - (1 - t * t) * 74 + 4;
          return (
            <g key={x}>
              <rect x={x - 16} y={y - 3} width="32" height="7" rx="2" fill="#2c3442" />
              {[0, 1, 2, 3].map((k) => (
                <circle key={k} cx={x - 11 + k * 7.3} cy={y + 0.5} r="2.4" fill="#fff6dc" />
              ))}
              <Glow x={x} y={y + 4} rx={70} ry={30} color="#fff6dc" opacity={0.4} />
            </g>
          );
        })}
        <Haze y0={60} y1={200} color="#f2c7a6" opacity={0.25} />
      </Depth>

      {/* Scoreboard over center field. */}
      <Depth d={0.3}>
        <g transform="translate(400 112)">
          <rect x="44" y="58" width="12" height="40" fill="#2c3442" />
          <rect x="144" y="58" width="12" height="40" fill="#2c3442" />
          <rect x="0" y="0" width="200" height="62" rx="5" fill="#0e1a2c" />
          <rect x="4" y="4" width="192" height="54" rx="3" fill="#13233c" />
          <text x="100" y="26" textAnchor="middle" fontFamily="Poppins, sans-serif" fontWeight="800" fontSize="17" fill={GOLD} letterSpacing="1">
            RLX 7 · QA 3
          </text>
          <text x="100" y="47" textAnchor="middle" fontFamily="Poppins, sans-serif" fontWeight="700" fontSize="11" fill={GREEN2} className="rocky-blink">
            NOTES: PERFECT ★
          </text>
        </g>
      </Depth>

      {/* Outfield wall with ads. */}
      <rect x="-120" y="196" width="1240" height="22" fill={`url(#${id("wall")})`} />
      <rect x="-120" y="196" width="1240" height="3" fill={GOLD} />
      {[
        { x: 60, t: "RLX", c: NAVY },
        { x: 300, t: "GREAT NOTES", c: "#2f6db5" },
        { x: 560, t: "RLX", c: NAVY },
        { x: 760, t: "QA PASS ✓", c: "#1f9d6b" },
      ].map((a) => (
        <g key={a.x}>
          <rect x={a.x} y="200" width="150" height="16" rx="2" fill={a.c} />
          <text x={a.x + 75} y="212" textAnchor="middle" fontFamily="Poppins, sans-serif" fontWeight="800" fontSize="10" fill={WHITE} letterSpacing="1">
            {a.t}
          </text>
        </g>
      ))}

      {/* The field on the ground plane. */}
      <rect x="-120" y="218" width="1240" height="200" fill={`url(#${id("grass")})`} />
      {grassStripes.map((s) => (
        <path key={s.i} d={s.d} fill="#ffffff" opacity="0.05" />
      ))}
      <Haze y0={210} y1={250} color="#ffd59a" opacity={0.25} reverse />
      {/* Infield dirt, grass diamond, base paths, mound, plate. */}
      <path d={g.ring(0, 2.25, 560, 1.22, 64)} fill={`url(#${id("dirt")})`} />
      <path d={g.poly([[0, 1.5], [270, 2.08], [0, 3.05], [-270, 2.08]])} fill="#5fb04c" />
      <path d={g.ring(0, 2.12, 60, 0.08, 32)} fill="#c98a5a" />
      <path d={g.ring(0, 2.12, 24, 0.03, 24)} fill="#e3b088" />
      <g stroke="#ffffff" strokeWidth="2.5" fill="none" opacity="0.9">
        <path d={`M${g.gp(...home)} L${g.gp(4000, 10)}`} />
        <path d={`M${g.gp(...home)} L${g.gp(-4000, 10)}`} />
      </g>
      {[first, second, third].map((b, i) => (
        <path key={i} d={g.poly([[b[0] - 18, b[1] - 0.03], [b[0] + 18, b[1] - 0.03], [b[0] + 18, b[1] + 0.03], [b[0] - 18, b[1] + 0.03]])} fill={WHITE} />
      ))}
      <path d={g.poly([[-26, 1.3], [26, 1.3], [26, 1.36], [0, 1.4], [-26, 1.36]])} fill={WHITE} />
      <path d={g.ring(0, 1.36, 140, 0.12, 40)} fill="none" stroke="#ffffff" strokeWidth="1.5" opacity="0.4" />
      {/* Floodlight wash on the field. */}
      <Glow x={500} y={290} rx={420} ry={60} color="#fff6dc" opacity={0.18} />

      <Birds y={60} speed={46} n={3} color="#5a4a6a" />
      {live && <Motes seed={5} n={14} x={[100, 900]} y={[120, 260]} r={[0.8, 1.4]} color="#fff3cf" drift={[20, -16]} dur={[8, 14]} />}
      <Contact x={500} y={402} rx={460} ry={12} opacity={0.12} />
      <Grade light="#ffd59a" lightX={0.2} strength={0.24} lightStrength={0.18} />
    </>
  );
}

export function JrStadiumScene({ live = false }: SceneProps) {
  const id = useIds();
  const g = ground(196, 200);
  const line = (a: [number, number], b: [number, number]) => `M${g.gp(...a)} L${g.gp(...b)}`;
  const stripes = useMemo(
    () => Array.from({ length: 16 }, (_, i) => ({ d: g.poly([[-8000, 1 + i * 0.55], [8000, 1 + i * 0.55], [8000, 1.275 + i * 0.55], [-8000, 1.275 + i * 0.55]]), i })),
    [g],
  );
  return (
    <>
      <defs>
        <Linear id={id("pitch")} stops={[[0, "#2f8a3e"], [0.5, "#3ea04a"], [1, "#2a7a36"]]} />
        <Linear id={id("stand")} stops={[[0, "#3a1820"], [1, "#5a2430"]]} />
      </defs>
      <Depth d={1}>
        <Sky stops={[[0, "#0a1230"], [0.6, "#1b2a5a"], [1, "#3a3f78"]]} />
        <Starfield seed={13} n={50} y1={70} />
      </Depth>

      {/* The stands: red and white, packed, with a wave and flags. */}
      <Depth d={0.35}>
        <rect x="-120" y="40" width="1240" height="140" fill={`url(#${id("stand")})`} />
        {/* Stripes of the terraces. */}
        {Array.from({ length: 26 }, (_, i) => (
          <rect key={i} x={-120 + i * 48} y="40" width="24" height="140" fill="#c8102e" opacity="0.35" />
        ))}
        <Crowd seed={11} x0={-110} x1={1110} y0={48} y1={176} colors={["#c8102e", "#ffffff", "#c8102e", "#ffffff", "#1b2a5a"]} size={3.6} wave={live} />
        {/* Walkways splitting the tiers. */}
        <rect x="-120" y="92" width="1240" height="5" fill="#2a1016" />
        <rect x="-120" y="134" width="1240" height="5" fill="#2a1016" />
        {[180, 500, 820].map((x) => (
          <path key={x} d={`M${x - 8} 44 L${x + 8} 44 L${x + 12} 180 L${x - 12} 180 Z`} fill="#2a1016" opacity="0.85" />
        ))}
        {/* Banners hanging over the rail. */}
        <g>
          <rect x="250" y="146" width="230" height="26" fill="#ffffff" />
          <rect x="250" y="146" width="230" height="4" fill="#c8102e" />
          <text x="365" y="166" textAnchor="middle" fontFamily="Poppins, sans-serif" fontWeight="800" fontSize="15" fill="#c8102e" letterSpacing="1">
            ¡VAMOS TIBURÓN! 🦈
          </text>
          <rect x="520" y="146" width="230" height="26" fill="#c8102e" />
          <rect x="520" y="146" width="230" height="4" fill="#ffffff" />
          <text x="635" y="166" textAnchor="middle" fontFamily="Poppins, sans-serif" fontWeight="800" fontSize="15" fill="#ffffff" letterSpacing="1">
            ROJIBLANCO · RLX
          </text>
        </g>
        {/* Roof and floodlights. */}
        <path d="M-120 44 L1120 44 L1120 26 L-120 26 Z" fill="#141a2e" />
        {[60, 300, 700, 940].map((x) => (
          <g key={x}>
            <rect x={x - 26} y="16" width="52" height="12" rx="2" fill="#2c3442" />
            {Array.from({ length: 6 }, (_, i) => (
              <circle key={i} cx={x - 20 + i * 8} cy="22" r="3" fill="#fff6dc" />
            ))}
            <Glow x={x} y={22} rx={110} ry={46} color="#fff6dc" opacity={0.55} />
          </g>
        ))}
        <Haze y0={30} y1={190} color="#ffe9e9" opacity={0.12} />
      </Depth>

      {/* Advertising boards. */}
      <rect x="-120" y="180" width="1240" height="18" fill="#141a2e" />
      {Array.from({ length: 9 }, (_, i) => (
        <g key={i}>
          <rect x={-110 + i * 140} y="182" width="132" height="14" fill={i % 2 ? "#c8102e" : "#ffffff"} />
          <text x={-44 + i * 140} y="193" textAnchor="middle" fontFamily="Poppins, sans-serif" fontWeight="800" fontSize="9" fill={i % 2 ? "#ffffff" : "#c8102e"} letterSpacing="1">
            {i % 3 === 1 ? "JUNIOR" : "RLX"}
          </text>
        </g>
      ))}

      {/* The pitch, mowed in stripes, lines on the ground plane. */}
      <rect x="-120" y="198" width="1240" height="220" fill={`url(#${id("pitch")})`} />
      {stripes.map((s) => (s.i % 2 ? <path key={s.i} d={s.d} fill="#ffffff" opacity="0.06" /> : null))}
      <g stroke="#ffffff" strokeWidth="2.4" fill="none" opacity="0.9">
        {/* Sidelines, halfway line and center circle in the distance, the near box in front. */}
        <path d={line([-1700, 1.2], [-1700, 14])} />
        <path d={line([1700, 1.2], [1700, 14])} />
        <path d={line([-1700, 14], [1700, 14])} />
        <path d={line([-1700, 6.4], [1700, 6.4])} />
        <path d={g.ring(0, 6.4, 420, 0.95, 64)} />
        <path d={line([-760, 1.2], [-760, 2.55])} />
        <path d={line([760, 1.2], [760, 2.55])} />
        <path d={line([-760, 2.55], [760, 2.55])} />
        <path d={line([-340, 1.2], [-340, 1.65])} />
        <path d={line([340, 1.2], [340, 1.65])} />
        <path d={line([-340, 1.65], [340, 1.65])} />
        {/* The arc at the top of the box. */}
        <path d={`M${g.gp(-300, 2.55)} Q${g.gp(0, 3.1)} ${g.gp(300, 2.55)}`} />
        {/* Far box. */}
        <path d={line([-760, 14], [-760, 11.2])} />
        <path d={line([760, 14], [760, 11.2])} />
        <path d={line([-760, 11.2], [760, 11.2])} />
      </g>
      <path d={g.ring(0, 6.4, 24, 0.05, 16)} fill="#ffffff" />
      <path d={g.ring(0, 2.1, 14, 0.02, 12)} fill="#ffffff" />
      {/* The far goal. */}
      <g transform={`translate(${g.gx(0, 14).toFixed(1)} ${g.gy(14).toFixed(1)})`}>
        <rect x="-26" y="-10" width="52" height="10" fill="none" stroke="#ffffff" strokeWidth="1.6" />
        <path d="M-26 -10 L-21 -13 L21 -13 L26 -10" fill="none" stroke="#ffffff" strokeWidth="1" opacity="0.7" />
      </g>
      <Glow x={500} y={260} rx={460} ry={70} color="#fff6dc" opacity={0.2} />

      {/* Papelitos: red and white confetti drifting down from the stands. */}
      {live && (
        <>
          <Motes seed={21} n={26} x={[0, 1000]} y={[30, 220]} r={[1.4, 2.4]} color="#ffffff" drift={[30, 60]} dur={[6, 11]} />
          <Motes seed={22} n={26} x={[0, 1000]} y={[30, 220]} r={[1.4, 2.4]} color="#e8213f" drift={[30, 60]} dur={[6, 11]} />
        </>
      )}
      <Contact x={500} y={402} rx={460} ry={12} opacity={0.14} />
      <Grade light="#fff6dc" lightX={0.5} vignette="#05081a" strength={0.34} lightStrength={0.1} />
    </>
  );
}

