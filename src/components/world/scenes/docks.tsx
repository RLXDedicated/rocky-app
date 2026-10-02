// Loading docks at dusk: the distribution center's facade with numbered dock
// doors, two rigs backed in with their lights on, yard lamps coming on, the
// first stars, and a yard tractor moving trailers at the back.
import {
  Beam,
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
  Ridge,
  shade,
  Sky,
  Starfield,
  useIds,
  WHITE,
  type SceneProps,
} from "./kit";

/** World → screen: x across, h up (px at depth 1, camera at h=200), z depth. */
const VX = 500;
const VY = 200;
const px = (x: number, z: number) => VX + x / z;
const py = (h: number, z: number) => VY + (200 - h) / z;
const pt = (x: number, h: number, z: number) => `${px(x, z).toFixed(1)} ${py(h, z).toFixed(1)}`;
const FACADE = 3;

/** A rectangle facing us at depth z. */
const front = (x0: number, x1: number, h0: number, h1: number, z: number) => ({
  x: px(x0, z),
  y: py(h1, z),
  w: (x1 - x0) / z,
  h: (h1 - h0) / z,
});
/** A side face at x, from z0 (back) to z1 (front). */
const side = (x: number, h0: number, h1: number, z0: number, z1: number) =>
  `M${pt(x, h0, z0)} L${pt(x, h1, z0)} L${pt(x, h1, z1)} L${pt(x, h0, z1)} Z`;

/** A rig backed into a dock: the trailer from the door to the cab, the cab facing us with its lights on. */
function Rig({ x, color, label }: { x: number; color: string; label: string }) {
  const id = useIds();
  const w = 140;
  const xa = x - w / 2;
  const xb = x + w / 2;
  const inner = x < 0 ? xb : xa; // the side facing the middle is the one we see
  const zT = 1.95; // front of the trailer
  const zC = 1.68; // front of the cab
  const tf = front(xa, xb, 50, 330, zT);
  const cab = front(xa + 6, xb - 6, 26, 200, zC);
  const hood = front(xa + 10, xb - 10, 26, 120, zC - 0.06);
  return (
    <g>
      <defs>
        <Linear id={id("side")} stops={[[0, shade(color, -0.05)], [1, shade(color, -0.35)]]} />
        <Linear id={id("glass")} stops={[[0, "#7fa6c8"], [1, "#2b3f5e"]]} />
      </defs>
      <Contact x={px(x, zC)} y={py(0, zC) + 2} rx={(w * 0.75) / zC} opacity={0.4} />
      {/* Trailer side running back into the dock, with the brand and marker lights. */}
      <path d={side(inner, 50, 330, FACADE, zT)} fill={`url(#${id("side")})`} />
      <path d={side(inner, 200, 250, FACADE, zT)} fill={NAVY} />
      <path d={side(inner, 196, 200, FACADE, zT)} fill={GREEN2} />
      <path d={side(inner, 50, 60, FACADE, zT)} fill="#1b2433" opacity="0.6" />
      {[2.15, 2.4, 2.7].map((z) => (
        <circle key={z} cx={px(inner, z)} cy={py(318, z)} r={3 / z} fill="#ffb347" />
      ))}
      {/* Trailer front with the RLX band. */}
      <rect x={tf.x} y={tf.y} width={tf.w} height={tf.h} fill={color} />
      <rect x={tf.x} y={tf.y} width={tf.w} height={tf.h * 0.06} fill={shade(color, 0.3)} />
      <rect x={tf.x} y={tf.y + tf.h * 0.1} width={tf.w} height={tf.h * 0.16} fill={NAVY} />
      <text x={tf.x + tf.w / 2} y={tf.y + tf.h * 0.225} textAnchor="middle" fontFamily="Poppins, sans-serif" fontWeight="800" fontSize={(26 / zT).toFixed(1)} fill={WHITE} letterSpacing="1">
        {label}
      </text>
      {/* Cab: sides, windshield, grille, bumper, headlights. */}
      <path d={side(inner === xb ? xb - 6 : xa + 6, 26, 200, zT, zC)} fill={shade(color, -0.3)} />
      <rect x={cab.x} y={cab.y} width={cab.w} height={cab.h} rx={6 / zC} fill={shade(color, -0.08)} />
      <rect x={cab.x + cab.w * 0.08} y={cab.y + cab.h * 0.1} width={cab.w * 0.84} height={cab.h * 0.32} rx={4 / zC} fill={`url(#${id("glass")})`} />
      <path d={`M${cab.x + cab.w * 0.12} ${cab.y + cab.h * 0.14} l${cab.w * 0.25} 0 l${-cab.w * 0.12} ${cab.h * 0.24} l${-cab.w * 0.13} 0 Z`} fill="#ffffff" opacity="0.18" />
      <rect x={hood.x} y={hood.y} width={hood.w} height={hood.h} rx={5 / zC} fill={shade(color, 0.05)} />
      <g fill="#2c3442">
        {Array.from({ length: 6 }, (_, k) => (
          <rect key={k} x={hood.x + hood.w * 0.28} y={hood.y + hood.h * (0.15 + k * 0.1)} width={hood.w * 0.44} height={hood.h * 0.05} />
        ))}
      </g>
      <rect x={hood.x - 4} y={hood.y + hood.h * 0.8} width={hood.w + 8} height={hood.h * 0.16} rx="2" fill="#9aa7b4" />
      {[0.1, 0.9].map((f) => (
        <g key={f}>
          <circle cx={hood.x + hood.w * f} cy={hood.y + hood.h * 0.55} r={9 / zC} fill="#fff6d6" />
          <Glow x={hood.x + hood.w * f} y={hood.y + hood.h * 0.55} rx={46 / zC} color="#fff3cf" opacity={0.7} className="rocky-pulse" />
        </g>
      ))}
      {/* Amber cab-roof markers. */}
      {[0.25, 0.42, 0.58, 0.75].map((f) => (
        <rect key={f} x={cab.x + cab.w * f - 3} y={cab.y + 3} width="6" height="3" rx="1" fill="#ffb347" />
      ))}
      {/* Wheels. */}
      {[xa + 14, xb - 14].map((wx) => (
        <rect key={wx} x={px(wx, zC) - 9} y={py(26, zC)} width="18" height={26 / zC + 2} rx="3" fill="#141a2e" />
      ))}
      {/* Light on the asphalt ahead of the rig. */}
      <Beam x={px(x, zC)} y={py(60, zC)} w0={w / zC} w1={(w * 2.6) / zC} y1={py(0, 1.2)} color="#fff3cf" opacity={0.22} />
    </g>
  );
}

export function DocksScene(_: SceneProps) {
  const id = useIds();
  const docks = [-600, -300, 0, 300, 600];
  const top = 470;
  return (
    <>
      <defs>
        <Linear id={id("wall")} stops={[[0, "#3a4a68"], [1, "#56688a"]]} />
        <Linear id={id("asphalt")} stops={[[0, "#3f4553"], [0.5, "#4c5262"], [1, "#2d323d"]]} />
        <Linear id={id("door")} stops={[[0, "#c9d2dc"], [1, "#8d9aaa"]]} />
        <Linear id={id("open")} stops={[[0, "#ffe7b0"], [1, "#ffb766"]]} />
      </defs>
      <Depth d={1}>
        <Sky stops={[[0, "#1b2450"], [0.35, "#4a3a7a"], [0.62, "#c46a7a"], [0.82, "#f59a6a"], [1, "#ffc785"]]} sun={{ x: 820, y: 250, r: 260, color: "#ffb36b", strength: 0.75 }} />
        <Starfield seed={31} n={60} y1={120} />
        <circle cx="640" cy="52" r="15" fill="#fff1d0" />
        <circle cx="646" cy="48" r="14" fill="#2a2a5e" />
        <Glow x={640} y={52} rx={50} color="#fff1d0" opacity={0.25} />
        <CloudDrift seed={9} n={3} y={[70, 110]} s={[0.7, 1.1]} speed={160} tint="#7a4f86" light="#f0a3a0" opacity={0.75} />
      </Depth>
      <Depth d={0.7}>
        <Ridge seed={19} y={240} amp={18} color="#4b3f6e" waves={3} />
        <g fill="#3d355f">
          {Array.from({ length: 16 }, (_, i) => (
            <rect key={i} x={-110 + i * 80} y={226 - ((i * 29) % 26)} width={50 + ((i * 17) % 20)} height={40} />
          ))}
        </g>
        <Haze y0={180} y1={270} color="#f59a6a" opacity={0.4} />
      </Depth>

      {/* The facade: tall wall, roof edge with lights, the RLX sign. */}
      <Depth d={0.15}>
        <rect x={px(-1500, FACADE)} y={py(top, FACADE)} width={3000 / FACADE} height={top / FACADE} fill={`url(#${id("wall")})`} />
        <rect x={px(-1500, FACADE)} y={py(top, FACADE)} width={3000 / FACADE} height="6" fill="#2a3550" />
        <g stroke="#4a5b7c" strokeWidth="1" opacity="0.6">
          {Array.from({ length: 50 }, (_, i) => (
            <line key={i} x1={px(-1500 + i * 60, FACADE)} y1={py(top, FACADE)} x2={px(-1500 + i * 60, FACADE)} y2={py(60, FACADE)} />
          ))}
        </g>
        <g transform={`translate(${VX - 60} ${py(top, FACADE) + 10})`}>
          <rect width="120" height="28" rx="4" fill={NAVY} />
          <rect y="24" width="120" height="4" fill={GREEN2} />
          <text x="60" y="19" textAnchor="middle" fontFamily="Poppins, sans-serif" fontWeight="800" fontSize="13" fill={WHITE} letterSpacing="1">
            RLX DC
          </text>
        </g>
        {/* Dock doors, numbered, with a wall pack lamp over each. */}
        {docks.map((x, i) => {
          const d = front(x - 75, x + 75, 60, 260, FACADE);
          const open = i === 2;
          return (
            <g key={x}>
              <rect x={d.x - 4} y={d.y - 4} width={d.w + 8} height={d.h + 4} fill="#1f2a40" />
              <rect x={d.x} y={d.y} width={d.w} height={d.h} fill={open ? `url(#${id("open")})` : `url(#${id("door")})`} />
              {!open &&
                Array.from({ length: 10 }, (_, k) => (
                  <rect key={k} x={d.x} y={d.y + (d.h * k) / 10} width={d.w} height="1.5" fill="#6f7d8c" />
                ))}
              {open && (
                <g>
                  {/* Inside: racks and parcels in warm light. */}
                  <rect x={d.x + 4} y={d.y + d.h * 0.3} width={d.w * 0.3} height={d.h * 0.7} fill="#b88650" opacity="0.7" />
                  <rect x={d.x + d.w * 0.62} y={d.y + d.h * 0.45} width={d.w * 0.32} height={d.h * 0.55} fill="#c99a63" opacity="0.7" />
                  <rect x={d.x} y={d.y} width={d.w} height={d.h * 0.14} fill="#9aa8b6" />
                </g>
              )}
              {/* Dock seal and bumpers. */}
              <rect x={d.x - 6} y={d.y - 6} width="5" height={d.h + 6} fill="#141a2e" />
              <rect x={d.x + d.w + 1} y={d.y - 6} width="5" height={d.h + 6} fill="#141a2e" />
              <rect x={d.x + 4} y={py(60, FACADE) - 2} width="6" height="8" fill="#141a2e" />
              <rect x={d.x + d.w - 10} y={py(60, FACADE) - 2} width="6" height="8" fill="#141a2e" />
              <rect x={d.x} y={d.y - 22} width="20" height="13" rx="2" fill="#141a2e" />
              <text x={d.x + 10} y={d.y - 12} textAnchor="middle" fontFamily="Poppins, sans-serif" fontWeight="800" fontSize="9" fill="#ffd98a">
                {String(i + 1).padStart(2, "0")}
              </text>
              <rect x={d.x + d.w / 2 - 5} y={d.y - 14} width="10" height="5" fill="#141a2e" />
              <Beam x={d.x + d.w / 2} y={d.y - 9} w0={8} w1={d.w * 1.4} y1={py(0, FACADE) + 6} color="#ffe7b0" opacity={0.3} />
              <Glow x={d.x + d.w / 2} y={d.y - 10} rx={16} color="#fff3cf" opacity={0.9} />
              {/* Dock light (red/green). */}
              <circle cx={d.x + d.w + 12} cy={d.y + 14} r="3" fill={i >= 1 && i <= 3 ? GREEN2 : "#ff5a4f"} />
            </g>
          );
        })}
        {/* Dock apron (the raised platform line). */}
        <rect x={px(-1500, FACADE)} y={py(60, FACADE)} width={3000 / FACADE} height={60 / FACADE} fill="#2a3044" />
        <rect x={px(-1500, FACADE)} y={py(60, FACADE)} width={3000 / FACADE} height="2" fill={GOLD} opacity="0.8" />
      </Depth>

      {/* The yard: asphalt, parking lines toward the docks, the yard tractor at the back. */}
      <rect x="-120" y={py(0, FACADE)} width="1240" height={410 - py(0, FACADE)} fill={`url(#${id("asphalt")})`} />
      <g stroke="#e9edf2" strokeWidth="2.5" opacity="0.55">
        {docks.concat([-900, 900]).map((x) => (
          <line key={x} x1={px(x + 150, FACADE)} y1={py(0, FACADE)} x2={px(x + 150, 0.85)} y2={py(0, 0.85)} />
        ))}
      </g>
      <g stroke={GOLD} strokeWidth="3" opacity="0.7">
        <line x1="-120" y1={py(0, 1.3)} x2="1120" y2={py(0, 1.3)} strokeDasharray="30 18" />
      </g>
      {/* Puddles reflecting the sky. */}
      <ellipse cx="420" cy="352" rx="80" ry="8" fill="#c46a7a" opacity="0.3" />
      <ellipse cx="430" cy="350" rx="40" ry="3" fill="#ffc785" opacity="0.4" />

      <g transform={`translate(0 ${py(0, 2.5).toFixed(1)}) scale(${(1 / 2.5).toFixed(2)})`}>
        <g className="rocky-shuttle" style={{ ["--t" as string]: "14s", ["--from" as string]: "300px", ["--to" as string]: "1700px" }}>
          <Contact x={60} y={0} rx={70} opacity={0.35} />
          <path d="M0 -20 L0 -110 Q0 -120 10 -120 L90 -120 Q104 -120 108 -106 L118 -40 L118 -20 Z" fill={GOLD} />
          <rect x="14" y="-108" width="70" height="40" rx="4" fill="#5f7896" />
          <rect x="-90" y="-46" width="90" height="12" fill="#2c3442" />
          <circle cx="20" cy="-16" r="16" fill="#141a2e" />
          <circle cx="94" cy="-16" r="16" fill="#141a2e" />
          <circle cx="50" cy="-126" r="7" fill="#ffb347" className="rocky-blink" />
        </g>
      </g>

      <Rig x={-300} color="#e9eef3" label="RLX" />
      <Rig x={300} color="#e9eef3" label="RLX" />

      {/* Yard light poles. */}
      {[-140, 1140].map((x) => (
        <g key={x}>
          <rect x={x - 3} y="40" width="6" height="320" fill="#1b2433" />
          <rect x={x - (x < 500 ? 0 : 40)} y="38" width="40" height="5" fill="#1b2433" />
          <Glow x={x + (x < 500 ? 40 : -40)} y={44} rx={30} color="#fff3cf" opacity={0.9} />
        </g>
      ))}

      {/* Wheel chocks and a cone in the near corners. */}
      <g>
        <Contact x={110} y={392} rx={28} opacity={0.35} />
        <path d="M96 392 L110 352 L124 392 Z" fill="#ff7a2f" />
        <rect x="100" y="368" width="20" height="6" fill="#ffffff" />
        <rect x="90" y="390" width="40" height="4" fill="#1b2433" />
      </g>
      <g>
        <Contact x={890} y={388} rx={26} opacity={0.35} />
        <path d="M870 388 L878 370 L904 370 L912 388 Z" fill={GOLD} />
        <path d="M878 370 L904 370 L900 376 L882 376 Z" fill={shade(GOLD, 0.3)} />
      </g>

      <Grade light="#ffb36b" lightX={0.8} vignette="#0b1028" strength={0.36} lightStrength={0.14} />
    </>
  );
}

