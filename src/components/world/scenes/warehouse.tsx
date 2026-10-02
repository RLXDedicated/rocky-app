// Warehouse: a one-point-perspective aisle between pallet racks, a dock door
// open to daylight at the far end, high-bay lamps, dust in the light and a
// forklift working at the back.
import { useMemo } from "react";
import {
  Beam,
  Contact,
  Depth,
  Glow,
  GOLD,
  Grade,
  Haze,
  Linear,
  Motes,
  NAVY,
  NAVY2,
  Radial,
  RlxMark,
  rng,
  shade,
  useIds,
  WHITE,
  type SceneProps,
} from "./kit";

/** World → screen for this room: x across, h up (0 floor … 1 ceiling), z depth (1 near … 5 back wall). */
const VX = 500;
const VY = 205;
const px = (x: number, z: number) => VX + x / z;
const py = (h: number, z: number) => VY + (195 - h * 455) / z;
const pt = (x: number, h: number, z: number) => `${px(x, z).toFixed(1)} ${py(h, z).toFixed(1)}`;
const quad = (x0: number, h0: number, z0: number, x1: number, h1: number, z1: number) =>
  // A rectangle on a side wall (x fixed): from (h0..h1) high, (z0..z1) deep.
  `M${pt(x0, h0, z0)} L${pt(x0, h1, z0)} L${pt(x1, h1, z1)} L${pt(x1, h0, z1)} Z`;

const BACK = 5;
const RACK_X = 430;
const UPRIGHTS = [1.05, 1.35, 1.75, 2.3, 3.0, 3.9, BACK];
const LEVELS = [0.02, 0.3, 0.58, 0.84];
const BOX = ["#c99a63", "#d6a86f", "#b88650", "#e0b67c", "#cfa06a"];

/** One side of the aisle: uprights, orange beams, pallets of parcels and the odd wrapped pallet. */
function Rack({ side, seed }: { side: -1 | 1; seed: number }) {
  const x = side * RACK_X;
  const xBack = side * (RACK_X + 120); // the back of a bay (deeper into the rack)
  const bays = useMemo(() => {
    const r = rng(seed);
    const out: { d: string; fill: string; top?: string; wrap?: boolean }[] = [];
    for (let i = 0; i < UPRIGHTS.length - 1; i++) {
      for (let l = 0; l < LEVELS.length - 1; l++) {
        const z0 = UPRIGHTS[i]! + 0.03;
        const z1 = UPRIGHTS[i + 1]! - 0.03;
        const h0 = LEVELS[l]! + 0.035;
        const room = LEVELS[l + 1]! - h0 - 0.03;
        if (r() < 0.12) continue; // an empty bay now and then
        // Two or three loads per bay, each a box face toward the aisle.
        const n = 2 + (r() < 0.5 ? 1 : 0);
        for (let k = 0; k < n; k++) {
          const a = z0 + ((z1 - z0) * k) / n + 0.02;
          const b = z0 + ((z1 - z0) * (k + 1)) / n - 0.02;
          const hh = room * (0.62 + r() * 0.36);
          const wrap = r() < 0.18;
          const c = wrap ? "#b9cbd8" : BOX[Math.floor(r() * BOX.length)]!;
          out.push({ d: quad(x, h0 - 0.03, a, x, h0, b), fill: "#9c7046" });
          out.push({ d: quad(x, h0, a, x, h0 + hh, b), fill: c, wrap });
          if (!wrap) {
            const m = (a + b) / 2;
            out.push({ d: quad(x, h0, m - 0.012 * m, x, h0 + hh, m + 0.012 * m), fill: "#f3dcb2" });
            if (r() < 0.6) out.push({ d: quad(x, h0 + hh * 0.12, a + (b - a) * 0.12, x, h0 + hh * 0.3, a + (b - a) * 0.38), fill: "#ffffff" });
          } else {
            out.push({ d: quad(x, h0 + hh * 0.55, a, x, h0 + hh * 0.62, b), fill: "#ffffff" });
          }
          // The lit top of the load.
          out.push({ d: `M${pt(x, h0 + hh, a)} L${pt(xBack, h0 + hh, a)} L${pt(xBack, h0 + hh, b)} L${pt(x, h0 + hh, b)} Z`, fill: shade(c, side < 0 ? 0.18 : 0.1) });
        }
      }
    }
    return out;
  }, [seed, x, xBack]);
  const id = useIds();
  const beam = "#e8762c";
  return (
    <g>
      <defs>
        <Linear id={id("bay")} stops={[[0, "#55606e"], [1, "#2c3442"]]} />
      </defs>
      {/* The dark depth of the rack behind the loads. */}
      <path d={`M${pt(x, 0, UPRIGHTS[0]!)} L${pt(x, 0.86, UPRIGHTS[0]!)} L${pt(x, 0.86, BACK)} L${pt(x, 0, BACK)} Z`} fill={`url(#${id("bay")})`} />
      {bays.map((b, i) => (
        <g key={i}>
          <path d={b.d} fill={b.fill} />
          {b.wrap && <path d={b.d} fill="#e6f0f6" opacity="0.45" />}
        </g>
      ))}
      {/* Beams (orange) and their lit top edges. */}
      {LEVELS.slice(1).map((h, l) => (
        <g key={l}>
          <path d={quad(x, h - 0.03, UPRIGHTS[0]!, x, h, BACK)} fill={beam} />
          <path d={`M${pt(x, h, UPRIGHTS[0]!)} L${pt(x, h, BACK)}`} stroke={shade(beam, 0.35)} strokeWidth="1.5" />
          <path d={`M${pt(x, h - 0.03, UPRIGHTS[0]!)} L${pt(x, h - 0.03, BACK)}`} stroke={shade(beam, -0.35)} strokeWidth="1.5" />
        </g>
      ))}
      {/* Uprights (navy) with a lit face and bolt holes. */}
      {UPRIGHTS.map((z, i) => {
        const w = 26 / z;
        const xa = px(x, z);
        const top = py(0.88, z);
        const bot = py(0, z);
        return (
          <g key={i}>
            <rect x={(xa - w / 2).toFixed(1)} y={top.toFixed(1)} width={w.toFixed(1)} height={(bot - top).toFixed(1)} fill={NAVY2} />
            <rect x={(side < 0 ? xa : xa - w / 2).toFixed(1)} y={top.toFixed(1)} width={(w / 2).toFixed(1)} height={(bot - top).toFixed(1)} fill={shade(NAVY2, side < 0 ? 0.18 : -0.25)} />
            {z < 2.5 &&
              Array.from({ length: 14 }, (_, k) => (
                <rect key={k} x={(xa - 1.5 / z).toFixed(1)} y={(top + ((bot - top) * (k + 0.5)) / 14).toFixed(1)} width={(3 / z).toFixed(1)} height={(5 / z).toFixed(1)} fill="#0b1428" opacity="0.45" />
              ))}
            {/* Yellow column guard at the foot. */}
            <rect x={(xa - w * 0.7).toFixed(1)} y={(bot - 40 / z).toFixed(1)} width={(w * 1.4).toFixed(1)} height={(40 / z).toFixed(1)} fill={GOLD} />
            <path d={`M${(xa - w * 0.7).toFixed(1)} ${(bot - 26 / z).toFixed(1)} h${(w * 1.4).toFixed(1)}`} stroke={NAVY} strokeWidth={(5 / z).toFixed(1)} />
          </g>
        );
      })}
    </g>
  );
}

/** A forklift, side view, about 120 high at z=1 (drawn at the origin, wheels on y=0). */
export function Forklift({ load = true }: { load?: boolean }) {
  return (
    <g>
      <rect x="-6" y="-150" width="7" height="150" fill="#3b4a5c" />
      <rect x="2" y="-150" width="5" height="150" fill="#56667a" />
      {load && (
        <g>
          <rect x="-86" y="-74" width="78" height="8" fill="#a77a4a" />
          <rect x="-82" y="-128" width="70" height="54" fill="#d6a86f" />
          <rect x="-82" y="-128" width="70" height="54" fill="#ffffff" opacity="0.28" />
          <rect x="-50" y="-128" width="6" height="54" fill="#f3dcb2" />
        </g>
      )}
      <rect x="-88" y="-66" width="82" height="6" fill="#3b4a5c" />
      <path d="M4 -10 L4 -70 Q4 -78 12 -78 L70 -78 Q80 -78 84 -66 L96 -24 L96 -10 Z" fill={GOLD} />
      <path d="M4 -70 L4 -10 L20 -10 L20 -70 Z" fill={shade(GOLD, -0.15)} />
      <path d="M14 -78 L22 -132 L74 -132 L80 -78" stroke="#2c3442" strokeWidth="6" fill="none" strokeLinejoin="round" />
      <rect x="18" y="-136" width="62" height="6" rx="2" fill="#2c3442" />
      <circle cx="62" cy="-140" r="5" fill="#ff8a1f" className="rocky-blink" />
      <rect x="66" y="-60" width="34" height="40" rx="4" fill={shade(GOLD, -0.28)} />
      <RlxMark x={28} y={-50} s={1.1} />
      <circle cx="24" cy="-8" r="14" fill="#1b2433" />
      <circle cx="24" cy="-8" r="6" fill="#56667a" />
      <circle cx="82" cy="-8" r="14" fill="#1b2433" />
      <circle cx="82" cy="-8" r="6" fill="#56667a" />
    </g>
  );
}

export function WarehouseScene({ live = false }: SceneProps) {
  const id = useIds();
  const zLamp = [1.5, 2.25, 3.4];
  const doorL = -150;
  const doorR = 150;
  return (
    <>
      <defs>
        <Linear id={id("wall")} stops={[[0, "#b9c5d1"], [1, "#d9e1e8"]]} />
        <Linear id={id("ceil")} stops={[[0, "#5b6878"], [1, "#9aa8b6"]]} />
        <Linear id={id("floor")} stops={[[0, "#e9e4d8"], [0.25, "#cdd5dc"], [1, "#9eabb8"]]} />
        <Linear id={id("day")} stops={[[0, "#bfe3f6"], [0.6, "#f3fbf6"], [1, "#fff4d6"]]} />
        <Linear id={id("lamp")} stops={[[0, "#3b4a5c"], [1, "#1b2433"]]} />
        <Radial id={id("sheen")} cx={0.5} cy={0.2} r={0.6} stops={[[0, "#fff6dc", 0.75], [1, "#fff6dc", 0]]} />
      </defs>

      {/* Ceiling (a dark wedge above the racks) with trusses converging to the back. */}
      <Depth d={0.25}>
        <rect x="-120" y="-40" width="1240" height="300" fill={`url(#${id("ceil")})`} />
        {[-600, -300, 0, 300, 600].map((x) => (
          <path key={x} d={`M${pt(x, 1, 0.8)} L${pt(x * 0.6, 1, BACK)}`} stroke="#465364" strokeWidth="3" />
        ))}
        {[1.1, 1.5, 2.1, 2.9, 3.9].map((z) => (
          <g key={z}>
            <path d={`M${pt(-700, 1, z)} L${pt(700, 1, z)}`} stroke="#3b4757" strokeWidth={(14 / z).toFixed(1)} />
            <path d={`M${pt(-700, 1, z)} L${pt(-350, 1.06, z)} L${pt(0, 1, z)} L${pt(350, 1.06, z)} L${pt(700, 1, z)}`} stroke="#4b596b" strokeWidth={(4 / z).toFixed(1)} fill="none" />
          </g>
        ))}
        {/* Skylight strip down the middle. */}
        <path d={`M${pt(-60, 1, 0.9)} L${pt(60, 1, 0.9)} L${pt(60, 1, BACK)} L${pt(-60, 1, BACK)} Z`} fill="#dff1fb" opacity="0.85" />
        {[1.1, 1.5, 2.1, 2.9, 3.9].map((z) => (
          <path key={z} d={`M${pt(-60, 1, z)} L${pt(60, 1, z)}`} stroke="#8fa3b5" strokeWidth={(5 / z).toFixed(1)} />
        ))}
      </Depth>

      {/* Back wall with the dock door open to a sunny yard and a trailer backed in. */}
      <Depth d={0.18}>
        <path d={`M${pt(-RACK_X - 140, 0, BACK)} L${pt(-RACK_X - 140, 1, BACK)} L${pt(RACK_X + 140, 1, BACK)} L${pt(RACK_X + 140, 0, BACK)} Z`} fill={`url(#${id("wall")})`} />
        <path d={`M${pt(doorL, 0, BACK)} L${pt(doorL, 0.6, BACK)} L${pt(doorR, 0.6, BACK)} L${pt(doorR, 0, BACK)} Z`} fill={`url(#${id("day")})`} />
        {/* The trailer sitting in the doorway. */}
        <rect x={px(-120, BACK)} y={py(0.52, BACK)} width={240 / BACK} height={(0.5 * 455) / BACK} fill="#f4f7fa" />
        <rect x={px(-120, BACK)} y={py(0.52, BACK)} width={240 / BACK} height="4" fill={GREEN_LINE} />
        <text x={VX} y={py(0.3, BACK)} textAnchor="middle" fontFamily="Poppins, sans-serif" fontWeight="800" fontSize="11" fill={NAVY}>
          RLX
        </text>
        {/* Rolled-up door slats at the top and the frame. */}
        <rect x={px(doorL, BACK)} y={py(0.6, BACK)} width={300 / BACK} height="9" fill="#9aa8b6" />
        <rect x={px(doorL, BACK) - 4} y={py(0.6, BACK)} width="4" height={(0.6 * 455) / BACK} fill={GOLD} />
        <rect x={px(doorR, BACK)} y={py(0.6, BACK)} width="4" height={(0.6 * 455) / BACK} fill={GOLD} />
        <rect x={px(-70, BACK)} y={py(0.74, BACK)} width={140 / BACK} height="12" rx="2" fill={NAVY} />
        <text x={VX} y={py(0.74, BACK) + 9} textAnchor="middle" fontFamily="Poppins, sans-serif" fontWeight="800" fontSize="8" fill={WHITE} letterSpacing="0.5">
          DOCK 3
        </text>
        {/* Stacked pallets by the door. */}
        {[-1, 1].map((s) => (
          <g key={s}>
            <rect x={px(s * 260, BACK) - (s < 0 ? 0 : 20)} y={py(0.16, BACK)} width="20" height={(0.16 * 455) / BACK} fill="#b88650" />
            <rect x={px(s * 260, BACK) - (s < 0 ? 0 : 20)} y={py(0.16, BACK)} width="20" height="3" fill="#e0b67c" />
          </g>
        ))}
      </Depth>

      {/* Daylight pouring through the door onto the floor. */}
      <path
        d={`M${pt(doorL, 0.6, BACK)} L${pt(doorR, 0.6, BACK)} L${pt(doorR * 1.6, 0, 1.6)} L${pt(doorL * 1.6, 0, 1.6)} Z`}
        fill="#fff3cf"
        opacity="0.16"
        className="rocky-pulse"
      />

      {/* Floor: polished concrete, warm near the door, cooler toward us. */}
      <path d={`M-120 ${py(0, BACK).toFixed(1)} L1120 ${py(0, BACK).toFixed(1)} L1120 410 L-120 410 Z`} fill={`url(#${id("floor")})`} />
      <ellipse cx={VX} cy={py(0, 2.2)} rx="260" ry="46" fill={`url(#${id("sheen")})`} />
      {/* Expansion joints converging on the door. */}
      <g stroke="#8795a4" strokeWidth="1.2" opacity="0.5">
        {[-900, -600, -300, 300, 600, 900].map((x) => (
          <line key={x} x1={px(x, 0.6)} y1={py(0, 0.6)} x2={px(x, BACK)} y2={py(0, BACK)} />
        ))}
        {[1.25, 1.7, 2.4, 3.4].map((z) => (
          <line key={z} x1={px(-RACK_X, z)} y1={py(0, z)} x2={px(RACK_X, z)} y2={py(0, z)} />
        ))}
      </g>
      {/* Yellow aisle lines and the walkway hatch. */}
      {[-1, 1].map((s) => (
        <path key={s} d={`M${pt(s * 330, 0, 0.7)} L${pt(s * 345, 0, 0.7)} L${pt(s * 345, 0, BACK)} L${pt(s * 330, 0, BACK)} Z`} fill={GOLD} opacity="0.9" />
      ))}

      {/* Racks on both sides. */}
      <Rack side={-1} seed={11} />
      <Rack side={1} seed={23} />

      {/* Hanging aisle signs. */}
      {[
        { x: -RACK_X + 30, z: 1.9, t: "A-12" },
        { x: RACK_X - 30, z: 1.9, t: "B-12" },
      ].map((s) => {
        const w = 120 / s.z;
        const h = 44 / s.z;
        const cx = px(s.x, s.z);
        const top = py(0.96, s.z);
        return (
          <g key={s.t}>
            <line x1={cx - w / 3} y1={py(1, s.z)} x2={cx - w / 3} y2={top} stroke="#3b4757" strokeWidth="1.2" />
            <line x1={cx + w / 3} y1={py(1, s.z)} x2={cx + w / 3} y2={top} stroke="#3b4757" strokeWidth="1.2" />
            <rect x={cx - w / 2} y={top} width={w} height={h} rx="3" fill={NAVY} />
            <rect x={cx - w / 2} y={top + h - 4} width={w} height="4" fill={GOLD} />
            <text x={cx} y={top + h * 0.62} textAnchor="middle" fontFamily="Poppins, sans-serif" fontWeight="800" fontSize={(26 / s.z).toFixed(1)} fill={WHITE}>
              {s.t}
            </text>
          </g>
        );
      })}

      {/* High-bay lamps with their cones of light and pools on the floor. */}
      {zLamp.map((z, i) => {
        const cx = px(0, z);
        const y0 = py(0.9, z);
        const w = 70 / z;
        return (
          <g key={z}>
            <line x1={cx} y1={py(1, z)} x2={cx} y2={y0} stroke="#2c3442" strokeWidth="1.5" />
            <Beam x={cx} y={y0 + 8 / z} w0={w * 0.9} w1={w * 6} y1={py(0, z)} color="#fff3cf" opacity={0.28} className={i === 1 ? "rocky-pulse" : undefined} />
            <path d={`M${cx - w / 2} ${y0 + 10 / z} L${cx - w / 4} ${y0} L${cx + w / 4} ${y0} L${cx + w / 2} ${y0 + 10 / z} Z`} fill={`url(#${id("lamp")})`} />
            <ellipse cx={cx} cy={y0 + 10 / z} rx={w / 2} ry={3 / z} fill="#fff8e1" />
            <Glow x={cx} y={py(0, z)} rx={w * 3.2} ry={w * 0.5} color="#fff3cf" opacity={0.55} />
          </g>
        );
      })}

      {/* A forklift working at the back of the aisle. */}
      <g transform={`translate(${VX} ${py(0, 3.2).toFixed(1)}) scale(${(1 / 3.2).toFixed(3)})`}>
        <g className="rocky-shuttle" style={{ ["--t" as string]: "11s", ["--from" as string]: "-260px", ["--to" as string]: "200px" }}>
          <Contact x={30} y={0} rx={80} opacity={0.3} />
          <Forklift />
        </g>
      </g>

      <Haze y0={80} y1={py(0, 2)} color="#eef2f5" opacity={0.18} peak={0.75} />
      {/* Tire marks on the concrete. */}
      <g fill="none" stroke="#6f7c8a" strokeLinecap="round" opacity="0.13">
        <path d="M300 400 C360 340 430 300 470 262" strokeWidth="7" />
        <path d="M330 400 C390 344 452 304 488 262" strokeWidth="7" />
        <path d="M720 400 C650 350 600 300 560 268" strokeWidth="5" />
      </g>

      {/* Dust in the light. */}
      {live && <Motes seed={7} n={34} x={[330, 670]} y={[120, 330]} r={[0.8, 1.8]} color="#fff6d6" drift={[18, -26]} dur={[9, 16]} />}

      {/* Near props framing the floor (outside the middle so Rocky has room). */}
      <g>
        <Contact x={95} y={392} rx={70} opacity={0.3} />
        <rect x="40" y="318" width="112" height="12" fill="#a77a4a" />
        <rect x="46" y="250" width="100" height="68" fill="#e3ebf1" />
        <rect x="46" y="250" width="100" height="68" fill="#ffffff" opacity="0.4" />
        <path d="M46 262 L146 286 M46 290 L146 302 M46 276 L146 270" stroke="#ffffff" strokeWidth="2" opacity="0.7" />
        <rect x="40" y="330" width="112" height="6" fill="#8a6239" />
        <rect x="74" y="232" width="44" height="18" fill="#d6a86f" />
      </g>
      {[880, 930].map((x) => (
        <g key={x}>
          <Contact x={x + 9} y={378} rx={16} opacity={0.3} />
          <rect x={x} y={318} width="18" height="60" rx="5" fill={GOLD} />
          <rect x={x} y={334} width="18" height="9" fill={NAVY} />
          <rect x={x} y={354} width="18" height="9" fill={NAVY} />
          <rect x={x + 2} y={318} width="5" height="60" fill="#ffffff" opacity="0.35" />
        </g>
      ))}

      <Grade light="#fff3cf" lightX={0.5} strength={0.28} lightStrength={0.12} />
    </>
  );
}

const GREEN_LINE = "#1fbf68";
