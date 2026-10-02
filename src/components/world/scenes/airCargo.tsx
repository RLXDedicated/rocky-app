// Air cargo at blue hour: a freighter at its stand with the nose raised and a
// container rising on the high loader, a tug pulling dollies under the belly,
// runway lights running to the horizon, a plane taking off far away and the
// tower beacon sweeping.
import { useMemo } from "react";
import {
  CloudDrift,
  Contact,
  Depth,
  Glow,
  GOLD,
  Grade,
  GREEN2,
  Haze,
  Linear,
  NAVY,
  Radial,
  rng,
  shade,
  Sky,
  Starfield,
  useIds,
  WHITE,
  type SceneProps,
} from "./kit";

const HORIZON = 244;
const GROUND = 304; // where the plane's wheels touch

/** A ULD (the rounded air-cargo container), at the origin, bottom on y=0. */
function Uld({ s = 1, color = "#c9d2dc" }: { s?: number; color?: string }) {
  return (
    <g transform={`scale(${s})`}>
      <path d="M0 0 L0 -44 L10 -56 L66 -56 L66 0 Z" fill={color} />
      <path d="M0 -44 L10 -56 L66 -56 L66 -52 L12 -52 L3 -41 Z" fill={shade(color, 0.3)} />
      <rect x="62" y="-56" width="4" height="56" fill={shade(color, -0.25)} />
      <g stroke={shade(color, -0.2)} strokeWidth="1.2">
        <line x1="20" y1="-52" x2="20" y2="-2" />
        <line x1="40" y1="-52" x2="40" y2="-2" />
      </g>
      <rect x="22" y="-30" width="16" height="9" fill="#ffffff" />
      <rect x="-2" y="-2" width="70" height="4" fill="#56667a" />
    </g>
  );
}

function Freighter() {
  const id = useIds();
  const fy = 168; // fuselage centerline
  return (
    <g>
      <defs>
        <Linear id={id("body")} stops={[[0, "#ffffff"], [0.45, "#eef2f6"], [0.8, "#c3ccd6"], [1, "#9aa7b4"]]} />
        <Linear id={id("wing")} stops={[[0, "#c9d2dc"], [1, "#8d9aaa"]]} />
        <Linear id={id("eng")} stops={[[0, "#e8edf2"], [0.5, "#b8c3cf"], [1, "#6f7d8c"]]} />
        <Radial id={id("hold")} stops={[[0, "#ffe7b0"], [0.6, "#d49a52"], [1, "#4a3a2a"]]} />
      </defs>
      <Contact x={560} y={GROUND} rx={360} ry={10} opacity={0.32} />
      {/* Far wing, darker, behind the body. */}
      <path d={`M560 ${fy - 10} L660 ${fy - 10} L820 ${fy - 52} L790 ${fy - 52} Z`} fill={shade("#9aa7b4", -0.2)} />
      {/* Tail fin with the brand. */}
      <path d={`M900 ${fy - 26} L1000 ${fy - 128} L1046 ${fy - 128} L1010 ${fy - 26} Z`} fill={NAVY} />
      <path d={`M1000 ${fy - 128} L1046 ${fy - 128} L1043 ${fy - 122} L996 ${fy - 122} Z`} fill={GREEN2} />
      <text x="1000" y={fy - 64} fontFamily="Poppins, sans-serif" fontWeight="800" fontSize="20" fill={WHITE} transform={`rotate(-48 1000 ${fy - 64})`}>
        RLX
      </text>
      {/* Fuselage. */}
      <path d={`M262 ${fy - 36} L960 ${fy - 36} Q1040 ${fy - 34} 1080 ${fy - 20} L1080 ${fy + 6} Q1020 ${fy + 36} 940 ${fy + 36} L262 ${fy + 36} Z`} fill={`url(#${id("body")})`} />
      <rect x="262" y={fy + 8} width="700" height="10" fill={NAVY} />
      <rect x="262" y={fy + 18} width="700" height="3" fill={GREEN2} />
      <text x="420" y={fy - 8} fontFamily="Poppins, sans-serif" fontWeight="800" fontSize="20" fill={NAVY} letterSpacing="3">
        RLX CARGO
      </text>
      {/* Main deck cargo door outline. */}
      <rect x="700" y={fy - 30} width="70" height="38" rx="4" fill="none" stroke="#b5c0cc" strokeWidth="1.5" />
      {/* Open nose: the cross-section of the hold, lit inside, with the nose cone raised. */}
      <ellipse cx="262" cy={fy} rx="14" ry="36" fill="#2c3442" />
      <ellipse cx="264" cy={fy} rx="11" ry="32" fill={`url(#${id("hold")})`} />
      <rect x="252" y={fy + 18} width="20" height="4" fill="#56667a" />
      <g transform={`rotate(-62 262 ${fy - 36})`}>
        <path d={`M262 ${fy - 36} Q196 ${fy - 34} 186 ${fy} Q196 ${fy + 34} 262 ${fy + 36} Z`} fill={`url(#${id("body")})`} />
        <path d={`M224 ${fy - 26} Q206 ${fy - 20} 202 ${fy - 8} L222 ${fy - 8} Z`} fill="#24324a" />
      </g>
      {/* Cockpit windows sit on the upper deck behind the nose. */}
      <path d={`M262 ${fy - 35} Q276 ${fy - 62} 336 ${fy - 62} Q420 ${fy - 62} 500 ${fy - 35} Z`} fill={`url(#${id("body")})`} />
      <path d={`M278 ${fy - 46} Q290 ${fy - 56} 312 ${fy - 56} L314 ${fy - 46} Z`} fill="#24324a" />
      <path d={`M318 ${fy - 56} L340 ${fy - 56} L340 ${fy - 46} L318 ${fy - 46} Z`} fill="#24324a" />
      <rect x="284" y={fy - 54} width="12" height="3" fill="#7fa6c8" opacity="0.7" />
      {/* Near wing sweeping toward us, with two engines. */}
      <path d={`M540 ${fy + 22} L670 ${fy + 22} L930 ${fy + 96} L880 ${fy + 100} Z`} fill={`url(#${id("wing")})`} />
      <path d={`M540 ${fy + 22} L670 ${fy + 22} L676 ${fy + 26} L546 ${fy + 26} Z`} fill="#ffffff" opacity="0.6" />
      {[
        { x: 640, y: fy + 66, s: 1 },
        { x: 790, y: fy + 104, s: 1.12 },
      ].map((e) => (
        <g key={e.x} transform={`translate(${e.x} ${e.y}) scale(${e.s})`}>
          <rect x="6" y="-30" width="10" height="16" fill="#9aa7b4" />
          <path d="M-56 -16 L40 -16 Q56 -10 56 6 Q56 22 40 26 L-56 26 Q-62 6 -56 -16 Z" fill={`url(#${id("eng")})`} />
          <ellipse cx="-56" cy="5" rx="9" ry="21" fill="#2c3442" />
          <ellipse cx="-55" cy="5" rx="5" ry="15" fill="#56667a" />
          <circle cx="-55" cy="5" r="4" fill="#d6dde4" className="rocky-rotor" style={{ ["--t" as string]: "1.6s" }} />
          <rect x="-40" y="-12" width="60" height="4" fill="#ffffff" opacity="0.6" />
        </g>
      ))}
      {/* Landing gear. */}
      {[300, 580, 640].map((x, i) => (
        <g key={x}>
          <rect x={x - 3} y={fy + 34} width="6" height={GROUND - fy - 48} fill="#56667a" />
          {[0, 1].map((k) => (
            <circle key={k} cx={x - 9 + k * 18} cy={GROUND - 9} r={i === 0 ? 8 : 10} fill="#141a2e" />
          ))}
        </g>
      ))}
      {/* Beacon and nav lights. */}
      <circle cx="600" cy={fy - 38} r="3" fill="#ff4d4d" className="rocky-blink" />
      <circle cx="925" cy={fy + 98} r="3" fill={GREEN2} className="rocky-blink" />
    </g>
  );
}

/** The scissor-lift loader at the nose, raising a container into the hold. */
function Loader() {
  return (
    <g>
      <Contact x={190} y={GROUND} rx={90} opacity={0.35} />
      <rect x="110" y={GROUND - 30} width="170" height="22" rx="4" fill={GOLD} />
      <rect x="110" y={GROUND - 30} width="170" height="5" fill={shade(GOLD, 0.3)} />
      <rect x="114" y={GROUND - 58} width="34" height="30" rx="3" fill={shade(GOLD, -0.1)} />
      <rect x="118" y={GROUND - 54} width="26" height="14" fill="#7fa6c8" />
      {[130, 250].map((x) => (
        <circle key={x} cx={x} cy={GROUND - 6} r="9" fill="#141a2e" />
      ))}
      <g className="rocky-lift" style={{ ["--t" as string]: "5s", ["--from" as string]: "0px", ["--to" as string]: "-64px" }}>
        {/* Scissor arms stretch with the deck (drawn as a fan that reads at any height). */}
        <g stroke="#3b4a5c" strokeWidth="4">
          <line x1="160" y1={GROUND - 30} x2="250" y2={GROUND - 82} />
          <line x1="250" y1={GROUND - 30} x2="160" y2={GROUND - 82} />
        </g>
        <rect x="150" y={GROUND - 88} width="110" height="8" fill="#3b4a5c" />
        <rect x="150" y={GROUND - 88} width="110" height="2" fill="#7f8ea0" />
        <g transform={`translate(172 ${GROUND - 88})`}>
          <Uld s={1} color="#d6dde4" />
        </g>
      </g>
      <rect x="152" y={GROUND - 40} width="106" height="12" fill="#3b4a5c" />
    </g>
  );
}

/** Tug pulling two dollies with containers. */
function TugTrain() {
  return (
    <g>
      <Contact x={120} y={0} rx={150} opacity={0.32} />
      <path d="M0 -6 L0 -30 Q0 -36 6 -36 L34 -36 L40 -22 L44 -6 Z" fill={GOLD} />
      <rect x="6" y="-48" width="22" height="14" fill="none" stroke="#2c3442" strokeWidth="3" />
      <circle cx="18" cy="-52" r="3" fill="#ffb347" className="rocky-blink" />
      {[10, 34].map((x) => (
        <circle key={x} cx={x} cy="-4" r="6" fill="#141a2e" />
      ))}
      {[60, 150].map((dx, i) => (
        <g key={dx}>
          <line x1={dx - 16} y1="-8" x2={dx} y2="-8" stroke="#2c3442" strokeWidth="2" />
          <rect x={dx} y="-12" width="76" height="6" fill="#56667a" />
          <g transform={`translate(${dx + 5} -12)`}>
            <Uld s={0.95} color={i === 0 ? "#c9d2dc" : "#b8c3cf"} />
          </g>
          {[dx + 10, dx + 66].map((x) => (
            <circle key={x} cx={x} cy="-3" r="4" fill="#141a2e" />
          ))}
        </g>
      ))}
    </g>
  );
}

export function AirCargoScene(_: SceneProps) {
  const id = useIds();
  const lights = useMemo(() => {
    const r = rng(9);
    // Rows of runway/taxiway lights receding to the horizon.
    const out: { x: number; y: number; r: number; c: string }[] = [];
    for (let row = 0; row < 3; row++) {
      for (let i = 0; i < 40; i++) {
        const t = i / 40;
        const y = HORIZON + 2 + row * 5 + t * t * 4;
        out.push({ x: -120 + i * 32 + row * 11 + r() * 4, y, r: 1.1 + row * 0.3, c: row === 1 ? "#7fd3ff" : row === 0 ? "#ffe08a" : GREEN2 });
      }
    }
    return out;
  }, []);
  return (
    <>
      <defs>
        <Linear id={id("apron")} stops={[[0, "#5b6a7e"], [0.3, "#7d8a9a"], [1, "#4c5767"]]} />
      </defs>
      <Depth d={1}>
        <Sky stops={[[0, "#0f1d44"], [0.45, "#23407a"], [0.78, "#4f86b8"], [0.95, "#9ccbe0"], [1, "#d6ecf0"]]} sun={{ x: 820, y: 260, r: 260, color: "#bfe6f2", strength: 0.6 }} />
        <Starfield seed={44} n={70} y1={130} />
        <CloudDrift seed={6} n={3} y={[60, 120]} s={[0.8, 1.3]} speed={180} tint="#3a5a90" light="#8fb0d6" opacity={0.3} />
      </Depth>
      <Depth d={0.75}>
        {/* Distant hills and the terminal. */}
        <path d={`M-120 ${HORIZON} L-120 ${HORIZON - 16} Q140 ${HORIZON - 34} 380 ${HORIZON - 18} T880 ${HORIZON - 22} T1120 ${HORIZON - 14} L1120 ${HORIZON} Z`} fill="#33507e" />
        <rect x="80" y={HORIZON - 30} width="260" height="30" fill="#2c4470" />
        <rect x="80" y={HORIZON - 30} width="260" height="3" fill="#4f6fa0" />
        {Array.from({ length: 24 }, (_, i) => (
          <rect key={i} x={86 + i * 10.5} y={HORIZON - 22} width="7" height="5" fill={i % 3 ? "#ffd98a" : "#3a5584"} />
        ))}
        {/* Control tower with its beacon. */}
        <g transform={`translate(860 ${HORIZON})`}>
          <path d="M-8 0 L-6 -90 L6 -90 L8 0 Z" fill="#2c4470" />
          <path d="M-22 -90 L22 -90 L16 -110 L-16 -110 Z" fill="#7fb6d6" />
          <rect x="-24" y="-92" width="48" height="4" fill="#2c4470" />
          <rect x="-18" y="-116" width="36" height="6" fill="#2c4470" />
          <circle cx="0" cy="-122" r="3" fill="#ffffff" />
          <Glow x={0} y={-122} rx={30} color="#bfe6ff" opacity={0.9} className="rocky-blink" />
        </g>
        <Haze y0={HORIZON - 60} y1={HORIZON + 4} color="#9ccbe0" opacity={0.45} />
      </Depth>
      {/* A plane taking off far away. */}
      <Depth d={0.6}>
        <g transform={`translate(-60 ${HORIZON - 6})`}>
          <g className="rocky-takeoff" style={{ ["--t" as string]: "28s", ["--dl" as string]: "-6s" }}>
            <path d="M0 0 L40 0 Q48 0 50 -3 L44 -5 L8 -5 L2 -12 L-2 -12 L0 -5 Z" fill="#dfe8f0" />
            <path d="M18 -3 L30 6 L34 6 L28 -3 Z" fill="#b8c6d4" />
            <circle cx="50" cy="-2" r="1.5" fill="#ffffff" />
            <Glow x={50} y={-2} rx={8} color="#ffffff" opacity={0.8} />
          </g>
        </g>
      </Depth>

      {/* Apron: concrete with the stand's taxi line and lights at the far edge. */}
      <rect x="-120" y={HORIZON} width="1240" height={410 - HORIZON} fill={`url(#${id("apron")})`} />
      {lights.map((l, i) => (
        <circle key={i} cx={l.x.toFixed(1)} cy={l.y.toFixed(1)} r={l.r} fill={l.c} opacity="0.9" />
      ))}
      <g fill="none" stroke={GOLD} strokeWidth="4" opacity="0.85">
        <path d={`M-120 ${GROUND + 34} C200 ${GROUND + 34} 380 ${GROUND + 20} 520 ${GROUND + 8} S900 ${HORIZON + 22} 1120 ${HORIZON + 18}`} />
      </g>
      <g stroke="#ffffff" strokeWidth="2" opacity="0.35">
        {Array.from({ length: 12 }, (_, i) => {
          const bx = -700 + i * 220;
          return <line key={i} x1={500 + (bx - 500) * 0.2} y1={HORIZON + 14} x2={bx} y2="410" />;
        })}
      </g>
      {/* Wet-look reflections under the lights. */}
      <ellipse cx="500" cy={GROUND + 60} rx="300" ry="20" fill="#9ccbe0" opacity="0.12" />

      <g transform={`translate(190 ${(GROUND - GROUND * 0.62).toFixed(1)}) scale(0.62)`}>
        <Freighter />
        <Loader />
      </g>
      <g transform={`translate(0 ${GROUND - 2})`}>
        <g className="rocky-run" style={{ ["--t" as string]: "22s", ["--from" as string]: "1250px", ["--to" as string]: "-420px", ["--x" as string]: "820px", ["--dl" as string]: "-8s" }}>
          <g transform="translate(-140 0) scale(-0.66 0.66) translate(-260 0)">
            <TugTrain />
          </g>
        </g>
      </g>

      {/* Apron floodlight glow from the right and a chock + cone near us. */}
      <Glow x={1000} y={120} rx={260} ry={200} color="#d6ecf0" opacity={0.18} />
      <g>
        <Contact x={860} y={386} rx={24} opacity={0.35} />
        <path d="M846 386 L858 352 L870 386 Z" fill="#ff7a2f" />
        <rect x="851" y="366" width="14" height="5" fill="#ffffff" />
        <rect x="838" y="384" width="40" height="4" fill="#1b2433" />
      </g>

      <Grade light="#bfe6f2" lightX={0.85} vignette="#060c22" strength={0.32} lightStrength={0.12} />
    </>
  );
}
