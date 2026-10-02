// Last mile: a neighborhood street on a sunny afternoon. The RLX van is
// parked with its side door open, a parcel waits on a porch, a car drives by,
// trees sway and the hills fade into the haze behind the rooftops.
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
  LeafyTree,
  Linear,
  NAVY,
  Parcel,
  Ridge,
  rng,
  shade,
  Sky,
  useIds,
  WHITE,
  type SceneProps,
} from "./kit";

const CURB = 300; // near curb: the sidewalk starts here
const FAR_CURB = 252;

/** A two-story house with a lit gable, shaded side, porch and windows. */
function House({ x, w = 150, wall, roof, door = "#7a3b2e", seed, parcel = false }: { x: number; w?: number; wall: string; roof: string; door?: string; seed: number; parcel?: boolean }) {
  const id = useIds();
  const base = FAR_CURB - 14;
  const h = 96;
  const r = useMemo(() => rng(seed), [seed]);
  const lit = useMemo(() => Array.from({ length: 4 }, () => r() < 0.25), [r]);
  return (
    <g>
      <defs>
        <Linear id={id("w")} stops={[[0, shade(wall, 0.12)], [1, shade(wall, -0.12)]]} />
        <Linear id={id("r")} stops={[[0, shade(roof, 0.15)], [1, shade(roof, -0.2)]]} />
      </defs>
      <Contact x={x + w / 2} y={base} rx={w * 0.6} opacity={0.22} />
      {/* Side wall in shade (the sun is to the right, so the left side is darker). */}
      <path d={`M${x} ${base} L${x} ${base - h} L${x - 22} ${base - h + 8} L${x - 22} ${base - 6} Z`} fill={shade(wall, -0.28)} />
      <rect x={x} y={base - h} width={w} height={h} fill={`url(#${id("w")})`} />
      {/* Siding lines. */}
      <g stroke={shade(wall, -0.1)} strokeWidth="1" opacity="0.6">
        {Array.from({ length: 10 }, (_, k) => (
          <line key={k} x1={x} y1={base - h + 8 + k * 9} x2={x + w} y2={base - h + 8 + k * 9} />
        ))}
      </g>
      {/* Roof: a big gable with eaves and a chimney. */}
      <path d={`M${x - 30} ${base - h + 6} L${x + w / 2} ${base - h - 58} L${x + w + 12} ${base - h + 6} Z`} fill={`url(#${id("r")})`} />
      <path d={`M${x - 30} ${base - h + 6} L${x + w / 2} ${base - h - 58} L${x + w / 2} ${base - h - 52} L${x - 22} ${base - h + 6} Z`} fill={shade(roof, -0.3)} />
      <path d={`M${x + w / 2} ${base - h - 58} L${x + w + 12} ${base - h + 6} L${x + w + 4} ${base - h + 6} L${x + w / 2} ${base - h - 50} Z`} fill={shade(roof, 0.3)} />
      <rect x={x + w * 0.72} y={base - h - 50} width="14" height="30" fill={shade(roof, -0.15)} />
      <rect x={x + w * 0.72 - 2} y={base - h - 52} width="18" height="5" fill={shade(roof, -0.3)} />
      {/* Gable window. */}
      <circle cx={x + w / 2} cy={base - h - 16} r="9" fill="#e8f2f8" />
      <circle cx={x + w / 2} cy={base - h - 16} r="9" fill="none" stroke={WHITE} strokeWidth="2.5" />
      {/* Windows with frames, shutters and a reflection. */}
      {[
        [x + 16, base - h + 14],
        [x + w - 46, base - h + 14],
        [x + 16, base - 50],
        [x + w - 46, base - 50],
      ].map(([wx, wy], k) => (
        <g key={k}>
          <rect x={wx! - 6} y={wy} width="5" height="30" fill={shade(door, -0.1)} />
          <rect x={wx! + 31} y={wy} width="5" height="30" fill={shade(door, -0.1)} />
          <rect x={wx} y={wy} width="30" height="30" fill={lit[k] ? "#ffe7a8" : "#a9cbe0"} />
          <path d={`M${wx} ${wy! + 30} L${wx! + 18} ${wy} L${wx! + 26} ${wy} L${wx! + 8} ${wy! + 30} Z`} fill="#ffffff" opacity="0.35" />
          <path d={`M${wx! + 15} ${wy} v30 M${wx} ${wy! + 15} h30`} stroke={WHITE} strokeWidth="2" />
          <rect x={wx! - 2} y={wy! - 2} width="34" height="34" fill="none" stroke={WHITE} strokeWidth="2.5" />
        </g>
      ))}
      {/* Porch: roof, posts, steps, door. */}
      <rect x={x + w / 2 - 34} y={base - 52} width="68" height="6" fill={shade(roof, -0.1)} />
      <rect x={x + w / 2 - 32} y={base - 46} width="4" height="40" fill={WHITE} />
      <rect x={x + w / 2 + 28} y={base - 46} width="4" height="40" fill={WHITE} />
      <rect x={x + w / 2 - 12} y={base - 42} width="24" height="38" fill={door} />
      <circle cx={x + w / 2 + 7} cy={base - 22} r="1.6" fill={GOLD} />
      <rect x={x + w / 2 - 38} y={base - 6} width="76" height="6" fill="#d8d2c6" />
      <rect x={x + w / 2 - 30} y={base} width="60" height="5" fill="#c9c3b8" />
      {parcel && (
        <g>
          <Parcel x={x + w / 2 + 14} y={base - 20} w={20} h={14} tone={1} label={false} />
          <Glow x={x + w / 2 + 24} y={base - 30} rx={22} color="#fff3c4" opacity={0.6} className="rocky-pulse" />
        </g>
      )}
      {/* Bushes along the front. */}
      {[x + 8, x + 26, x + w - 30, x + w - 12].map((bx, k) => (
        <g key={k}>
          <circle cx={bx} cy={base - 6} r="11" fill={shade("#3f9a4a", -0.1)} />
          <circle cx={bx + 3} cy={base - 10} r="7" fill="#6cc155" />
        </g>
      ))}
    </g>
  );
}

/** The RLX delivery van (side view, facing left), side door open, with a hand truck of parcels by the curb. */
function Van() {
  const id = useIds();
  return (
    <g>
      <defs>
        <Linear id={id("body")} stops={[[0, "#ffffff"], [0.6, "#eef2f6"], [1, "#b9c4cf"]]} />
      </defs>
      <Contact x={110} y={0} rx={130} opacity={0.35} />
      <path d="M0 -14 L0 -60 Q0 -72 10 -76 L40 -100 Q46 -104 56 -104 L230 -104 Q240 -104 240 -94 L240 -14 Z" fill={`url(#${id("body")})`} />
      <path d="M12 -70 L42 -94 L70 -94 L70 -66 L12 -66 Z" fill="#5f84a8" />
      <path d="M18 -70 L36 -86 L44 -86 L26 -70 Z" fill="#ffffff" opacity="0.4" />
      {/* Open sliding door: the dark cargo space with shelves of parcels. */}
      <rect x="92" y="-94" width="70" height="78" fill="#2c3442" />
      <rect x="96" y="-60" width="62" height="4" fill="#56667a" />
      <Parcel x={98} y={-86} w={22} h={22} tone={0} label={false} />
      <Parcel x={124} y={-80} w={26} h={16} tone={2} label={false} />
      <Parcel x={100} y={-50} w={30} h={30} tone={3} label={false} />
      <rect x="162" y="-96" width="66" height="82" fill={shade("#eef2f6", -0.08)} />
      <rect x="0" y="-38" width="240" height="14" fill={NAVY} />
      <rect x="0" y="-26" width="240" height="3" fill={GREEN2} />
      <text x="190" y="-56" textAnchor="middle" fontFamily="Poppins, sans-serif" fontWeight="800" fontSize="18" fill={NAVY}>
        RLX
      </text>
      <rect x="0" y="-22" width="14" height="8" rx="2" fill="#ffd98a" />
      <rect x="236" y="-40" width="6" height="12" fill="#ff5a4f" />
      {[46, 196].map((x) => (
        <g key={x}>
          <circle cx={x} cy="-12" r="16" fill="#141a2e" />
          <circle cx={x} cy="-12" r="7" fill="#9aa7b4" />
        </g>
      ))}
      {/* Hand truck with a stack at the curb. */}
      <g transform="translate(-46 30)">
        <Contact x={12} y={0} rx={22} opacity={0.3} />
        <rect x="-2" y="-62" width="4" height="62" fill="#3b4a5c" />
        <rect x="-2" y="-4" width="28" height="4" fill="#3b4a5c" />
        <circle cx="4" cy="-2" r="5" fill="#141a2e" />
        <Parcel x={2} y={-26} w={24} h={22} tone={1} label={false} />
        <Parcel x={4} y={-46} w={20} h={18} tone={0} label={false} />
      </g>
    </g>
  );
}

/** A car driving by (side view, facing right). */
function Car({ color }: { color: string }) {
  return (
    <g>
      <Contact x={70} y={0} rx={80} opacity={0.32} />
      <path d="M0 -12 L0 -30 Q2 -38 14 -40 L36 -42 L56 -60 Q60 -62 70 -62 L104 -62 Q112 -62 118 -54 L130 -42 Q146 -40 148 -32 L148 -12 Z" fill={color} />
      <path d="M60 -56 L72 -56 L72 -42 L48 -42 Z M78 -56 L104 -56 Q108 -56 112 -50 L118 -42 L78 -42 Z" fill="#a9cbe0" />
      <path d="M2 -30 L146 -30" stroke={shade(color, 0.3)} strokeWidth="2" />
      <rect x="140" y="-34" width="8" height="5" fill="#ffd98a" />
      {[30, 118].map((x) => (
        <g key={x}>
          <circle cx={x} cy="-10" r="12" fill="#141a2e" />
          <circle cx={x} cy="-10" r="5" fill="#9aa7b4" className="rocky-rotor" style={{ ["--t" as string]: "0.6s" }} />
        </g>
      ))}
    </g>
  );
}

export function LastMileScene({ live = false }: SceneProps) {
  const id = useIds();
  return (
    <>
      <defs>
        <Linear id={id("road")} stops={[[0, "#5a6170"], [1, "#454b58"]]} />
        <Linear id={id("walk")} stops={[[0, "#e6e1d6"], [1, "#cfc8ba"]]} />
        <Linear id={id("lawn")} stops={[[0, "#7cc35a"], [1, "#5aa548"]]} />
      </defs>
      <Depth d={1}>
        <Sky stops={[[0, "#6fb2e6"], [0.55, "#bfe3f6"], [1, "#fff2d8"]]} sun={{ x: 860, y: 60, r: 220, color: "#fff4cf", strength: 0.9 }} />
        <circle cx="860" cy="60" r="26" fill="#fffbe8" />
        <CloudDrift seed={2} n={5} y={[30, 110]} s={[0.6, 1.1]} speed={150} tint="#cfe2f0" />
      </Depth>
      <Depth d={0.7}>
        <Ridge seed={14} y={190} amp={22} color="#a6c9b6" rim="#d8eee0" waves={3} />
        {/* Tiny far houses on the hill. */}
        <g>
          {Array.from({ length: 16 }, (_, i) => {
            const x = -100 + i * 78 + ((i * 31) % 20);
            const y = 176 + ((i * 17) % 14);
            const c = ["#e9dcc8", "#d9e4ec", "#f0d6c8"][i % 3]!;
            return (
              <g key={i}>
                <rect x={x} y={y} width="16" height="10" fill={c} />
                <path d={`M${x - 2} ${y} L${x + 8} ${y - 7} L${x + 18} ${y} Z`} fill="#b07a64" />
              </g>
            );
          })}
        </g>
        <Haze y0={140} y1={210} color="#e8f2f6" opacity={0.6} />
      </Depth>
      <Depth d={0.45}>
        <Ridge seed={22} y={212} amp={12} color="#7fb46c" rim="#b9e09a" waves={2} />
        {Array.from({ length: 9 }, (_, i) => (
          <LeafyTree key={i} x={-80 + i * 140 + ((i * 41) % 40)} y={214} s={0.42} hue="#4f9a52" light="#a6dc7e" seed={i + 3} />
        ))}
        <Haze y0={170} y1={225} color="#eef6f0" opacity={0.35} />
      </Depth>

      {/* Front lawns behind the far curb. */}
      <rect x="-120" y={FAR_CURB - 30} width="1240" height="34" fill={`url(#${id("lawn")})`} />
      <House x={-60} wall="#f2e6cf" roof="#b5523e" seed={1} />
      <House x={170} w={160} wall="#dfe9f1" roof="#3d5a80" seed={2} door="#2f6db5" parcel />
      <House x={420} w={150} wall="#f6dcc6" roof="#6b4a3a" seed={3} door={GREEN2} />
      <House x={660} w={160} wall="#e6efe0" roof="#8a3b3b" seed={4} parcel />
      <House x={900} wall="#efe3f2" roof="#4b4f63" seed={5} />
      <LeafyTree x={140} y={FAR_CURB - 6} s={0.95} seed={8} sway={live} />
      <LeafyTree x={630} y={FAR_CURB - 6} s={1.05} seed={9} hue="#3d8f45" sway={live} />
      {/* Mailboxes at the far curb. */}
      {[250, 740].map((x) => (
        <g key={x}>
          <rect x={x} y={FAR_CURB - 30} width="3" height="28" fill="#5a3f2b" />
          <rect x={x - 8} y={FAR_CURB - 40} width="20" height="12" rx="5" fill={NAVY} />
          <rect x={x + 10} y={FAR_CURB - 46} width="2" height="10" fill="#e14b3b" />
        </g>
      ))}
      {/* Far curb and sidewalk. */}
      <rect x="-120" y={FAR_CURB - 2} width="1240" height="7" fill="#d8d2c6" />
      <rect x="-120" y={FAR_CURB + 5} width="1240" height="3" fill="#a9a398" />

      {/* The street. */}
      <rect x="-120" y={FAR_CURB + 8} width="1240" height={CURB - FAR_CURB - 8} fill={`url(#${id("road")})`} />
      <line x1="-120" y1={(FAR_CURB + CURB) / 2 + 3} x2="1120" y2={(FAR_CURB + CURB) / 2 + 3} stroke={GOLD} strokeWidth="3" strokeDasharray="36 22" />
      <g transform={`translate(0 ${FAR_CURB + 26})`}>
        <g className="rocky-run" style={{ ["--t" as string]: "11s", ["--from" as string]: "-320px", ["--to" as string]: "1300px", ["--x" as string]: "-400px", ["--dl" as string]: "-2s" }}>
          <g transform="scale(0.8)">
            <Car color="#e14b3b" />
          </g>
        </g>
      </g>
      <g transform={`translate(580 ${CURB - 4})`}>
        <Van />
      </g>

      {/* Near curb, a strip of grass and the sidewalk where Rocky stands. */}
      <rect x="-120" y={CURB} width="1240" height="8" fill="#d8d2c6" />
      <rect x="-120" y={CURB + 8} width="1240" height="4" fill="#a9a398" />
      <rect x="-120" y={CURB + 12} width="1240" height="18" fill="#6cb84f" />
      <GrassTufts seed={4} n={60} y={[CURB + 14, CURB + 30]} color="#5aa548" />
      <rect x="-120" y={CURB + 30} width="1240" height={410 - CURB - 30} fill={`url(#${id("walk")})`} />
      <g stroke="#b8b1a3" strokeWidth="1.5" opacity="0.8">
        {Array.from({ length: 14 }, (_, i) => {
          const bx = -700 + i * 180;
          return <line key={i} x1={500 + (bx - 500) * 0.55} y1={CURB + 30} x2={bx} y2="410" />;
        })}
        <line x1="-120" y1="372" x2="1120" y2="372" />
      </g>
      {/* Hydrant near the right edge. */}
      <g transform="translate(900 386)">
        <Contact x={0} y={0} rx={20} opacity={0.3} />
        <rect x="-9" y="-34" width="18" height="34" rx="3" fill="#e14b3b" />
        <rect x="-14" y="-24" width="28" height="7" rx="3" fill="#c23b2c" />
        <path d="M-9 -34 Q0 -46 9 -34 Z" fill="#c23b2c" />
        <rect x="-6" y="-34" width="4" height="34" fill="#ffffff" opacity="0.25" />
      </g>
      <Birds y={80} speed={50} n={3} color="#56677a" />

      <Grade light="#fff2cf" lightX={0.85} strength={0.2} lightStrength={0.2} />
    </>
  );
}
