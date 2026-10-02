// Container port at golden hour: a ship at the berth, a gantry crane whose
// trolley runs the boom lifting a box, container stacks at two depths, the
// sea glittering and a terminal tractor crossing the quay.
import { useMemo } from "react";
import {
  Birds,
  CloudDrift,
  Contact,
  Container,
  Depth,
  Glow,
  GOLD,
  Grade,
  Haze,
  Linear,
  NAVY,
  rng,
  Ridge,
  RlxMark,
  shade,
  Sky,
  useIds,
  Water,
  WHITE,
  type SceneProps,
} from "./kit";

const BOXES = ["#c8432f", "#2f6db5", "#1f9d6b", "#e2a33a", "#7a4fb0", "#d9662b", "#3d8fa8", "#9aa7b4"];
const SEA = 214;
const QUAY = 254;

function Stacks({ seed, base, s, x0, x1, cols }: { seed: number; base: number; s: number; x0: number; x1: number; cols: number }) {
  const boxes = useMemo(() => {
    const r = rng(seed);
    const out: { x: number; y: number; c: string; label?: string }[] = [];
    const w = 120 * s;
    const h = 52 * s;
    const step = (x1 - x0) / cols;
    for (let c = 0; c < cols; c++) {
      const tall = 1 + Math.floor(r() * 4);
      for (let k = 0; k < tall; k++) {
        const col = BOXES[Math.floor(r() * BOXES.length)]!;
        out.push({ x: x0 + c * step + (step - w) / 2, y: base - h * (k + 1), c: col, label: s > 0.7 && r() < 0.35 ? "RLX" : undefined });
      }
    }
    return out;
  }, [seed, base, s, x0, x1, cols]);
  return (
    <g>
      <Contact x={(x0 + x1) / 2} y={base} rx={(x1 - x0) / 2} ry={6 * s} opacity={0.3} />
      {boxes.map((b, i) => (
        <Container key={i} x={b.x} y={b.y} w={120 * s} h={52 * s} color={b.c} label={b.label} />
      ))}
    </g>
  );
}

/** The ship at the berth: navy hull, white bridge, a deck full of containers. */
function Ship() {
  const id = useIds();
  const deck = useMemo(() => {
    const r = rng(77);
    const out: { x: number; y: number; c: string }[] = [];
    for (let c = 0; c < 22; c++) {
      const tall = 2 + Math.floor(r() * 3);
      for (let k = 0; k < tall; k++) out.push({ x: 180 + c * 30, y: 176 - k * 13, c: BOXES[Math.floor(r() * BOXES.length)]! });
    }
    return out;
  }, []);
  return (
    <g>
      <defs>
        <Linear id={id("hull")} stops={[[0, "#24406b"], [1, NAVY]]} />
      </defs>
      {deck.map((b, i) => (
        <g key={i}>
          <rect x={b.x} y={b.y} width="29" height="12.5" fill={b.c} />
          <rect x={b.x} y={b.y} width="29" height="2" fill={shade(b.c, 0.3)} />
          <rect x={b.x + 27} y={b.y} width="2" height="12.5" fill={shade(b.c, -0.3)} />
        </g>
      ))}
      {/* Bridge at the stern. */}
      <rect x="860" y="128" width="54" height="62" fill="#f1f4f7" />
      <rect x="860" y="128" width="54" height="5" fill="#ffffff" />
      <rect x="852" y="120" width="70" height="10" fill="#dfe6ec" />
      {[0, 1, 2].map((k) => (
        <rect key={k} x="866" y={138 + k * 15} width="42" height="6" fill="#30486c" />
      ))}
      <rect x="896" y="98" width="10" height="24" fill={NAVY} />
      <rect x="896" y="98" width="10" height="5" fill={GOLD} />
      {/* Hull with a red waterline. */}
      <path d="M150 188 L940 188 L924 222 L170 222 Z" fill={`url(#${id("hull")})`} />
      <path d="M150 188 L940 188 L939 191 L151 191 Z" fill="#3c5b8a" />
      <path d="M166 214 L928 214 L924 222 L170 222 Z" fill="#a8322a" />
      <RlxMark x={230} y={196} s={0.9} color={WHITE} w={2.4} />
    </g>
  );
}

/** The gantry crane: legs on the quay, a boom over the ship, a trolley that runs and a box that lifts. */
function Crane() {
  const c = "#e8762c";
  const dark = shade(c, -0.3);
  return (
    <g>
      <Contact x={720} y={312} rx={130} opacity={0.3} />
      {/* Back legs (further away, darker) then front legs. */}
      <g fill={dark}>
        <path d="M660 300 L668 300 L700 120 L692 120 Z" />
        <path d="M790 300 L798 300 L770 120 L762 120 Z" />
      </g>
      <g fill={c}>
        <path d="M640 312 L654 312 L690 112 L676 112 Z" />
        <path d="M800 312 L814 312 L778 112 L764 112 Z" />
        <rect x="652" y="226" width="150" height="10" />
        <rect x="672" y="160" width="110" height="8" />
      </g>
      <path d="M654 312 L690 112 L684 112 L648 312 Z" fill={shade(c, 0.25)} />
      <g stroke={dark} strokeWidth="3">
        <line x1="660" y1="232" x2="780" y2="164" />
        <line x1="796" y1="232" x2="676" y2="164" />
      </g>
      {/* Machinery house and the long boom reaching over the water. */}
      <rect x="664" y="88" width="132" height="26" fill="#f1f4f7" />
      <rect x="664" y="88" width="132" height="4" fill="#ffffff" />
      <text x="730" y="107" textAnchor="middle" fontFamily="Poppins, sans-serif" fontWeight="800" fontSize="12" fill={NAVY} letterSpacing="1">
        RLX
      </text>
      <path d="M330 72 L880 72 L880 84 L330 84 Z" fill={c} />
      <path d="M330 72 L880 72 L880 75 L330 75 Z" fill={shade(c, 0.3)} />
      <g stroke={c} strokeWidth="2.5">
        {Array.from({ length: 18 }, (_, i) => (
          <line key={i} x1={340 + i * 30} y1="84" x2={355 + i * 30} y2="72" />
        ))}
      </g>
      {/* Stays from the A-frame down the boom. */}
      <path d="M730 30 L736 30 L736 88 L730 88 Z" fill={c} />
      <g stroke={dark} strokeWidth="2">
        <line x1="733" y1="30" x2="340" y2="72" />
        <line x1="733" y1="30" x2="540" y2="72" />
        <line x1="733" y1="30" x2="876" y2="72" />
      </g>
      <circle cx="733" cy="28" r="4" fill="#ff4d4d" className="rocky-blink" />
      {/* Trolley running along the boom with the box hanging under it. */}
      <g className="rocky-shuttle" style={{ ["--t" as string]: "9s", ["--from" as string]: "0px", ["--to" as string]: "260px" }}>
        <rect x="402" y="84" width="40" height="12" fill="#3b4a5c" />
        <rect x="402" y="84" width="40" height="3" fill="#56667a" />
        <g className="rocky-lift" style={{ ["--t" as string]: "4.5s", ["--from" as string]: "0px", ["--to" as string]: "-46px" }}>
          <line x1="410" y1="96" x2="410" y2="150" stroke="#2c3442" strokeWidth="1.5" />
          <line x1="434" y1="96" x2="434" y2="150" stroke="#2c3442" strokeWidth="1.5" />
          <rect x="390" y="150" width="64" height="6" fill={GOLD} />
          <Container x={392} y={156} w={60} h={26} color="#2f6db5" />
        </g>
      </g>
    </g>
  );
}

/** A terminal tractor pulling a chassis with a container across the quay. */
function Tractor() {
  return (
    <g>
      <Contact x={70} y={0} rx={86} opacity={0.32} />
      <Container x={0} y={-50} w={110} h={40} color="#1f9d6b" />
      <rect x="-4" y="-12" width="118" height="5" fill="#2c3442" />
      <path d="M116 -8 L116 -40 Q116 -46 122 -46 L144 -46 Q152 -46 154 -38 L160 -18 L160 -8 Z" fill={GOLD} />
      <rect x="124" y="-42" width="20" height="14" rx="2" fill="#bfe3f6" />
      <rect x="124" y="-42" width="20" height="3" fill="#ffffff" opacity="0.7" />
      <circle cx="152" cy="-50" r="3" fill="#ff8a1f" className="rocky-blink" />
      {[14, 38, 96, 140].map((x) => (
        <g key={x}>
          <circle cx={x} cy="-4" r="8" fill="#1b2433" />
          <circle cx={x} cy="-4" r="3" fill="#56667a" />
        </g>
      ))}
    </g>
  );
}

export function PortScene(_: SceneProps) {
  const id = useIds();
  return (
    <>
      <defs>
        <Linear id={id("quay")} stops={[[0, "#c9c3b8"], [0.35, "#d8d2c6"], [1, "#a9a49b"]]} />
      </defs>
      <Depth d={1}>
        <Sky stops={[[0, "#7fb3dc"], [0.45, "#f5c79a"], [0.75, "#ffd8a8"], [1, "#ffe9c8"]]} sun={{ x: 300, y: 150, r: 190, color: "#fff1c6", strength: 0.95 }} />
        <circle cx="300" cy="150" r="26" fill="#fff6dc" />
        <CloudDrift seed={4} n={4} y={[30, 90]} s={[0.6, 1]} speed={140} tint="#f2c7a6" light="#fff8ee" opacity={0.9} />
      </Depth>
      <Depth d={0.75}>
        {/* Far headland and city across the bay. */}
        <Ridge seed={8} y={196} amp={14} color="#a8b6c8" waves={3} />
        <g fill="#9aaabd">
          {Array.from({ length: 22 }, (_, i) => (
            <rect key={i} x={-100 + i * 56} y={186 - ((i * 37) % 30)} width={30 + ((i * 13) % 18)} height={40} />
          ))}
        </g>
        {/* Distant cranes. */}
        {[880, 960, 1040].map((x) => (
          <g key={x} stroke="#8d9db1" strokeWidth="2.5" fill="none">
            <path d={`M${x} 200 L${x + 6} 150 L${x + 26} 150 L${x + 32} 200`} />
            <path d={`M${x - 30} 146 L${x + 50} 146`} />
          </g>
        ))}
        <Haze y0={150} y1={SEA} color="#ffe2c2" opacity={0.6} />
      </Depth>
      {/* The sea, glittering under the low sun. */}
      <Water y={SEA} y1={QUAY + 4} top="#8fb3c8" bottom="#3f6f8f" streak="#fff1c6" seed={12} n={40} />
      <Glow x={300} y={SEA + 8} rx={160} ry={10} color="#fff1c6" opacity={0.7} />

      <Depth d={0.35}>
        <g className="rocky-bob">
          <Ship />
        </g>
        <Birds y={110} speed={46} n={3} color="#5a6576" />
        <Birds y={70} speed={60} n={2} color="#5a6576" delay={20} />
      </Depth>

      {/* The quay: concrete apron with painted lanes. */}
      <rect x="-120" y={QUAY - 6} width="1240" height="10" fill="#8b8579" />
      <rect x="-120" y={QUAY - 6} width="1240" height="3" fill="#e9e3d6" />
      <path d={`M-120 ${QUAY + 4} L1120 ${QUAY + 4} L1120 410 L-120 410 Z`} fill={`url(#${id("quay")})`} />
      <g stroke="#ffffff" strokeWidth="3" opacity="0.7">
        <line x1="-120" y1="284" x2="1120" y2="284" strokeDasharray="34 22" />
      </g>
      <g stroke={GOLD} strokeWidth="4" opacity="0.85">
        <line x1="-120" y1="320" x2="1120" y2="320" />
      </g>
      {/* Slab joints running back to the water, an oil stain and a puddle catching the sky. */}
      <g stroke="#9c968b" strokeWidth="1.3" opacity="0.55">
        {Array.from({ length: 13 }, (_, i) => {
          const bx = -700 + i * 200;
          return <line key={i} x1={500 + (bx - 500) * 0.3} y1={QUAY + 4} x2={bx} y2="410" />;
        })}
        <line x1="-120" y1="352" x2="1120" y2="352" />
        <line x1="-120" y1="390" x2="1120" y2="390" />
      </g>
      <ellipse cx="640" cy="372" rx="70" ry="9" fill="#9bb8cc" opacity="0.45" />
      <ellipse cx="652" cy="370" rx="34" ry="3" fill="#ffe9c8" opacity="0.6" />
      <ellipse cx="300" cy="356" rx="40" ry="6" fill="#6b655c" opacity="0.18" />
      {/* Crane rails. */}
      <g stroke="#6f6a61" strokeWidth="3">
        <line x1="-120" y1="300" x2="1120" y2="300" />
        <line x1="-120" y1="313" x2="1120" y2="313" />
      </g>

      {/* Back row of stacks, the crane, then the front row. */}
      <Stacks seed={3} base={QUAY + 6} s={0.55} x0={-110} x1={300} cols={6} />
      <Crane />
      <g transform="translate(0 286)">
        <g className="rocky-run" style={{ ["--t" as string]: "24s", ["--from" as string]: "1300px", ["--to" as string]: "-300px", ["--x" as string]: "560px", ["--dl" as string]: "-9s" }}>
          <g transform="translate(-160 0)">
            <Tractor />
          </g>
        </g>
      </g>
      <Stacks seed={5} base={318} s={0.82} x0={-130} x1={330} cols={4} />

      <Haze y0={QUAY} y1={300} color="#ffe2c2" opacity={0.18} reverse />

      {/* Bollard with a mooring line in the near right. */}
      <g>
        <Contact x={930} y={384} rx={34} opacity={0.35} />
        <path d="M930 382 C900 360 860 300 830 256" stroke="#c9a46a" strokeWidth="4" fill="none" />
        <rect x="910" y="350" width="40" height="34" rx="6" fill="#3b4a5c" />
        <ellipse cx="930" cy="350" rx="26" ry="9" fill="#56667a" />
        <ellipse cx="930" cy="349" rx="20" ry="6" fill="#6f7d8c" />
        <rect x="914" y="356" width="6" height="26" fill="#ffffff" opacity="0.15" />
      </g>

      <Grade light="#ffe6bf" lightX={0.2} strength={0.24} lightStrength={0.22} />
    </>
  );
}
