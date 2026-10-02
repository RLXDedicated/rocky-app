// RLX office: an open-plan floor in one-point perspective. Desks with glowing
// monitors run back to a glass wall over the city, pendant lamps hang in a
// row, the "great notes" board hangs on the side wall and steam curls from
// the coffee machine.
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
  NAVY2,
  rng,
  shade,
  Sky,
  useIds,
  WHITE,
  Windows,
  type SceneProps,
} from "./kit";

const VX = 500;
const VY = 196;
const px = (x: number, z: number) => VX + x / z;
const py = (h: number, z: number) => VY + (200 - h) / z; // h in px at z=1, camera at h=200
const pt = (x: number, h: number, z: number) => `${px(x, z).toFixed(1)} ${py(h, z).toFixed(1)}`;
const BACK = 4.2;

/**
 * An affine stand-in for drawing flat things (signs, text) on a side wall:
 * local x 0..len runs along the wall from depth z0 to z1 at height h (local y
 * goes down the wall), scaled for the middle depth.
 */
function onWall(x: number, h: number, z0: number, z1: number, len: number): string {
  const a = [px(x, z0), py(h, z0)];
  const b = [px(x, z1), py(h, z1)];
  const sy = 2 / (z0 + z1);
  return `matrix(${((b[0]! - a[0]!) / len).toFixed(4)} ${((b[1]! - a[1]!) / len).toFixed(4)} 0 ${sy.toFixed(4)} ${a[0]!.toFixed(1)} ${a[1]!.toFixed(1)})`;
}
const CEIL = 520;
const SIDE = 430;

/** A desk block (two facing desks with monitors) at x, from z0 to z1. */
function Desk({ x, z0, z1, seed }: { x: number; z0: number; z1: number; seed: number }) {
  const top = 150; // desk height
  const w = 180;
  const xa = x - w / 2;
  const xb = x + w / 2;
  const r = useMemo(() => rng(seed), [seed]);
  const screens = useMemo(() => [r(), r(), r(), r()], [r]);
  const face = x < 0 ? xb : xa; // the side we see
  return (
    <g>
      <Contact x={px(x, (z0 + z1) / 2)} y={py(0, (z0 + z1) / 2)} rx={w / ((z0 + z1) / 2) * 0.7} opacity={0.18} />
      {/* Desk side panel and top. */}
      <path d={`M${pt(face, 0, z1)} L${pt(face, top, z1)} L${pt(face, top, z0)} L${pt(face, 0, z0)} Z`} fill="#c9b79e" />
      <path d={`M${pt(xa, top, z1)} L${pt(xb, top, z1)} L${pt(xb, top, z0)} L${pt(xa, top, z0)} Z`} fill="#f2ece2" />
      <path d={`M${pt(xa, top, z0)} L${pt(xb, top, z0)} L${pt(xb, top - 10, z0)} L${pt(xa, top - 10, z0)} Z`} fill="#d9cdb9" />
      <path d={`M${pt(xa, top - 10, z0)} L${pt(xb, top - 10, z0)} L${pt(xb, 0, z0)} L${pt(xa, 0, z0)} Z`} fill="#e3d8c6" />
      {/* Privacy divider down the middle. */}
      <path d={`M${pt(x, top, z1)} L${pt(x, top + 60, z1)} L${pt(x, top + 60, z0)} L${pt(x, top, z0)} Z`} fill={GREEN2} opacity="0.55" />
      {/* Monitors facing us on this side of the divider, glowing. */}
      {[0, 1].map((k) => {
        const zm = z0 + (z1 - z0) * (0.3 + k * 0.42);
        const mx = x < 0 ? x + 40 : x - 40;
        const cx = px(mx, zm);
        const cy = py(top + 60, zm);
        const mw = 80 / zm;
        const mh = 50 / zm;
        const s = screens[k]!;
        return (
          <g key={k}>
            <rect x={cx - 2 / zm} y={cy + mh / 2} width={4 / zm} height={20 / zm} fill="#2c3442" />
            <rect x={cx - mw / 2} y={cy - mh / 2} width={mw} height={mh} rx={3 / zm} fill="#1b2433" />
            <rect x={cx - mw / 2 + 3 / zm} y={cy - mh / 2 + 3 / zm} width={mw - 6 / zm} height={mh - 6 / zm} fill={s < 0.5 ? "#2f6db5" : "#1f9d6b"} opacity="0.9" />
            {/* A little chart/text on screen. */}
            <path d={`M${cx - mw / 3} ${cy + mh / 5} l${mw / 6} ${-mh / 4} l${mw / 6} ${mh / 8} l${mw / 4} ${-mh / 3}`} stroke="#ffffff" strokeWidth={1.4 / zm} fill="none" opacity="0.85" />
            <rect x={cx - mw / 3} y={cy - mh / 3} width={mw / 3} height={2 / zm} fill="#ffffff" opacity="0.7" className="rocky-blink" />
            <Glow x={cx} y={cy} rx={mw * 0.9} ry={mh} color="#9fd2ff" opacity={0.25} />
          </g>
        );
      })}
      {/* Chair. */}
      {(() => {
        const zc = z0 - 0.12;
        const cx = px(x < 0 ? x + 40 : x - 40, zc);
        const s = 1 / zc;
        return (
          <g transform={`translate(${cx.toFixed(1)} ${py(0, zc).toFixed(1)}) scale(${s.toFixed(3)})`}>
            <ellipse cx="0" cy="0" rx="34" ry="5" fill="#0b1428" opacity="0.2" />
            <rect x="-3" y="-48" width="6" height="40" fill="#2c3442" />
            <path d="M-26 -4 L26 -4 M0 -8 L0 0" stroke="#2c3442" strokeWidth="4" />
            <rect x="-30" y="-64" width="60" height="16" rx="6" fill={NAVY2} />
            <rect x="-26" y="-128" width="52" height="64" rx="12" fill={NAVY} />
            <rect x="-20" y="-122" width="18" height="52" rx="8" fill="#ffffff" opacity="0.12" />
          </g>
        );
      })()}
    </g>
  );
}

export function OfficeScene({ live = false }: SceneProps) {
  const id = useIds();
  const wallL = -SIDE;
  const wallR = SIDE;
  return (
    <>
      <defs>
        <Linear id={id("ceil")} stops={[[0, "#e8ecef"], [1, "#cfd6dd"]]} />
        <Linear id={id("wallL")} x2={1} y2={0} stops={[[0, "#e9e3d8"], [1, "#d6cfc2"]]} />
        <Linear id={id("wallR")} x2={1} y2={0} stops={[[0, "#d2cbbd"], [1, "#ece6db"]]} />
        <Linear id={id("floor")} stops={[[0, "#d9b98f"], [0.4, "#c9a479"], [1, "#a8825a"]]} />
      </defs>

      {/* The city beyond the glass wall at the back. */}
      <Depth d={0.45}>
        <Sky stops={[[0, "#7fb8e6"], [0.6, "#cfe8f6"], [1, "#f4f8f2"]]} sun={{ x: 640, y: 80, r: 160, color: "#fff4cf", strength: 0.8 }} />
        <CloudDrift seed={8} n={3} y={[100, 140]} s={[0.35, 0.55]} speed={120} />
        {/* Far towers in the haze, then nearer towers with windows. */}
        <g fill="#b6cadb">
          {Array.from({ length: 14 }, (_, i) => (
            <rect key={i} x={300 + i * 30} y={150 - ((i * 23) % 40)} width="24" height="120" />
          ))}
        </g>
        <Haze y0={100} y1={230} color="#eef5f8" opacity={0.55} />
        {[
          { x: 330, w: 46, h: 110, c: "#5f7f9e" },
          { x: 384, w: 36, h: 80, c: "#6f8fae" },
          { x: 430, w: 52, h: 130, c: NAVY2 },
          { x: 492, w: 40, h: 96, c: "#5a7a9a" },
          { x: 540, w: 58, h: 120, c: "#4f6f90" },
          { x: 606, w: 44, h: 88, c: "#6f8fae" },
        ].map((b, i) => (
          <g key={i}>
            <rect x={b.x} y={235 - b.h} width={b.w} height={b.h} fill={b.c} />
            <rect x={b.x} y={235 - b.h} width={b.w * 0.3} height={b.h} fill="#ffffff" opacity="0.12" />
            <Windows seed={i + 70} x={b.x + 4} y={240 - b.h} cols={Math.floor(b.w / 9)} rows={Math.floor(b.h / 12)} w={5} h={6} gx={4} gy={6} on="#e8f2fa" off={shade(b.c, -0.15)} share={0.45} />
          </g>
        ))}
      </Depth>

      {/* Ceiling and walls. */}
      <path d={`M${pt(wallL, CEIL, 0.6)} L${pt(wallR, CEIL, 0.6)} L${pt(wallR, CEIL, BACK)} L${pt(wallL, CEIL, BACK)} Z`} fill={`url(#${id("ceil")})`} />
      <g stroke="#c2c9d0" strokeWidth="1.2">
        {[1, 1.4, 1.9, 2.6, 3.4].map((z) => (
          <line key={z} x1={px(wallL, z)} y1={py(CEIL, z)} x2={px(wallR, z)} y2={py(CEIL, z)} />
        ))}
        {[-400, -200, 0, 200, 400].map((x) => (
          <line key={x} x1={px(x, 0.6)} y1={py(CEIL, 0.6)} x2={px(x, BACK)} y2={py(CEIL, BACK)} />
        ))}
      </g>
      <path d={`M${pt(wallL, 0, 0.6)} L${pt(wallL, CEIL, 0.6)} L${pt(wallL, CEIL, BACK)} L${pt(wallL, 0, BACK)} Z`} fill={`url(#${id("wallL")})`} />
      <path d={`M${pt(wallR, 0, 0.6)} L${pt(wallR, CEIL, 0.6)} L${pt(wallR, CEIL, BACK)} L${pt(wallR, 0, BACK)} Z`} fill={`url(#${id("wallR")})`} />
      {/* Window frame over the back wall: mullions. */}
      <g fill="#3b4a5c">
        <rect x={px(wallL, BACK)} y={py(CEIL, BACK)} width={(2 * SIDE) / BACK} height="6" />
        <rect x={px(wallL, BACK)} y={py(0, BACK) - 18} width={(2 * SIDE) / BACK} height="18" />
        {Array.from({ length: 7 }, (_, i) => (
          <rect key={i} x={px(wallL + (i * 2 * SIDE) / 6, BACK) - 2} y={py(CEIL, BACK)} width="4" height={CEIL / BACK} />
        ))}
      </g>
      {/* Accent stripe and the RLX wall logo on the right wall. */}
      {[wallL, wallR].map((w) => (
        <path key={w} d={`M${pt(w, 150, 0.6)} L${pt(w, 162, 0.6)} L${pt(w, 162, BACK)} L${pt(w, 150, BACK)} Z`} fill={GREEN2} opacity="0.8" />
      ))}
      <g transform={onWall(wallR, 400, 2.5, 1.65, 160)}>
        <rect x="0" y="0" width="160" height="100" fill={NAVY} />
        <rect x="0" y="94" width="160" height="6" fill={GREEN2} />
        <text x="80" y="68" textAnchor="middle" fontFamily="Poppins, sans-serif" fontWeight="800" fontSize="56" fill={WHITE} letterSpacing="2">
          RLX
        </text>
      </g>

      {/* The great-notes board on the left wall. */}
      <g transform={onWall(wallL, 420, 1.55, 2.55, 260)}>
        <rect x="0" y="0" width="260" height="200" rx="6" fill={NAVY} />
        <rect x="0" y="0" width="260" height="200" rx="6" fill="none" stroke="#2c3e5e" strokeWidth="4" />
        <text x="22" y="40" fontFamily="Poppins, sans-serif" fontWeight="800" fontSize="24" fill={WHITE} letterSpacing="1">
          GREAT NOTES
        </text>
        <rect x="22" y="52" width="80" height="4" fill={GOLD} />
        {["Who & how", "What happened", "Next step"].map((t, i) => (
          <g key={t} transform={`translate(22 ${88 + i * 38})`}>
            <circle cx="10" cy="-6" r="11" fill={GREEN2} />
            <path d="M5 -6 l4 4 l7 -9" stroke={WHITE} strokeWidth="3" fill="none" />
            <text x="30" y="2" fontFamily="Poppins, sans-serif" fontWeight="700" fontSize="20" fill={WHITE}>
              {t}
            </text>
          </g>
        ))}
      </g>

      {/* Floor: wood planks running back to the windows, with light pooling from the glass. */}
      <path d={`M${pt(wallL, 0, 0.6)} L${pt(wallR, 0, 0.6)} L${pt(wallR, 0, BACK)} L${pt(wallL, 0, BACK)} Z`} fill={`url(#${id("floor")})`} />
      <g stroke="#a8825a" strokeWidth="1" opacity="0.45">
        {Array.from({ length: 25 }, (_, i) => {
          const x = wallL + (i * 2 * SIDE) / 24;
          return <line key={i} x1={px(x, 0.6)} y1={py(0, 0.6)} x2={px(x, BACK)} y2={py(0, BACK)} />;
        })}
      </g>
      <path d={`M${pt(-300, 0, BACK)} L${pt(300, 0, BACK)} L${pt(500, 0, 1.4)} L${pt(-500, 0, 1.4)} Z`} fill="#fff6dc" opacity="0.22" />
      <Glow x={VX} y={py(0, 1.8)} rx={260} ry={34} color="#fff6dc" opacity={0.45} />
      {/* A rug in RLX colors in the middle of the floor. */}
      <path d={`M${pt(-170, 0, 1.25)} L${pt(170, 0, 1.25)} L${pt(170, 0, 1.95)} L${pt(-170, 0, 1.95)} Z`} fill={NAVY} opacity="0.9" />
      <path d={`M${pt(-150, 0, 1.3)} L${pt(150, 0, 1.3)} L${pt(150, 0, 1.88)} L${pt(-150, 0, 1.88)} Z`} fill="none" stroke={GREEN2} strokeWidth="2.5" />
      <path d={`M${pt(-130, 0, 1.36)} L${pt(130, 0, 1.36)} L${pt(130, 0, 1.82)} L${pt(-130, 0, 1.82)} Z`} fill="none" stroke={GOLD} strokeWidth="1.2" opacity="0.8" />

      {/* Desks back to front (far ones first). */}
      <Desk x={-235} z0={3.1} z1={3.9} seed={1} />
      <Desk x={235} z0={3.1} z1={3.9} seed={2} />
      <Desk x={-235} z0={2.05} z1={2.8} seed={3} />
      <Desk x={235} z0={2.05} z1={2.8} seed={4} />

      {/* Pendant lamps down the middle. */}
      {[1.5, 2.3, 3.3].map((z) => {
        const cx = px(0, z);
        const y0 = py(CEIL, z);
        const y1 = py(CEIL - 120, z);
        const w = 70 / z;
        return (
          <g key={z}>
            <line x1={cx} y1={y0} x2={cx} y2={y1} stroke="#2c3442" strokeWidth="1.2" />
            <path d={`M${cx - w / 2} ${y1 + 22 / z} Q${cx} ${y1 - 8 / z} ${cx + w / 2} ${y1 + 22 / z} Z`} fill={NAVY} />
            <ellipse cx={cx} cy={y1 + 22 / z} rx={w / 2} ry={4 / z} fill="#fff4cf" />
            <Glow x={cx} y={y1 + 30 / z} rx={w * 1.4} ry={w * 0.8} color="#fff4cf" opacity={0.45} />
          </g>
        );
      })}

      {/* Coffee corner on the right: machine with steam, a plant. */}
      <g transform={`translate(${px(330, 1.45).toFixed(1)} ${py(0, 1.45).toFixed(1)}) scale(${(0.8 / 1.45).toFixed(3)})`}>
        <Contact x={0} y={0} rx={90} opacity={0.25} />
        <rect x="-80" y="-150" width="160" height="150" fill="#e3d8c6" />
        <rect x="-80" y="-150" width="160" height="8" fill="#f2ece2" />
        <rect x="-50" y="-250" width="70" height="100" rx="8" fill="#2c3442" />
        <rect x="-40" y="-236" width="50" height="24" rx="4" fill="#56667a" />
        <circle cx="-15" cy="-196" r="6" fill={GREEN2} className="rocky-blink" />
        <rect x="-26" y="-170" width="22" height="20" rx="3" fill="#ffffff" />
        {live && (
          <g fill="#ffffff" opacity="0.5">
            {[0, 1, 2].map((k) => (
              <circle key={k} cx={-15 + k * 4} cy="-176" r="5" className="rocky-smoke" style={{ animationDelay: `${-k * 1.3}s` }} />
            ))}
          </g>
        )}
        <rect x="34" y="-190" width="30" height="40" rx="4" fill="#b5523e" />
        <path d="M40 -190 C30 -240 60 -250 50 -280 C70 -250 80 -230 60 -190 Z" fill="#3f9a4a" />
        <path d="M50 -190 C70 -230 96 -230 100 -250 C100 -220 90 -200 66 -190 Z" fill="#56bd66" />
      </g>
      {/* A tall plant on the left in front. */}
      <g transform={`translate(${px(-350, 1.4).toFixed(1)} ${py(0, 1.4).toFixed(1)}) scale(${(0.85 / 1.4).toFixed(3)})`}>
        <Contact x={0} y={0} rx={50} opacity={0.25} />
        <path d="M-34 0 L-40 -70 L40 -70 L34 0 Z" fill="#f2ece2" />
        <path d="M-40 -70 L40 -70 L40 -60 L-40 -60 Z" fill="#d9cdb9" />
        <g className={live ? "rocky-sway" : undefined}>
          {[-40, -20, 0, 20, 40].map((a, k) => (
            <path key={k} d={`M0 -70 C${a} -140 ${a * 1.6} -190 ${a * 1.2} -${230 + k * 10} C${a * 0.6} -170 ${a * 0.4} -120 0 -70 Z`} fill={k % 2 ? "#3f9a4a" : "#56bd66"} />
          ))}
        </g>
      </g>

      <Haze y0={py(CEIL, BACK)} y1={py(0, 2)} color="#fff6e8" opacity={0.15} peak={0.6} />
      <Grade light="#fff4cf" lightX={0.6} strength={0.2} lightStrength={0.16} />
    </>
  );
}
