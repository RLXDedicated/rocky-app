// Rail yard on a misty morning: a long RLX freight train rolls through with
// its containers, a second track and intermodal cranes fade into the mist,
// signals blink, and a platform in front is Rocky's floor.
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
  GREEN2,
  Haze,
  Linear,
  NAVY,
  Ridge,
  RlxMark,
  rng,
  shade,
  Sky,
  useIds,
  WHITE,
  type SceneProps,
} from "./kit";

const BOXES = ["#c8432f", "#2f6db5", "#1f9d6b", "#e2a33a", "#7a4fb0", "#d9662b", "#3d8fa8"];
const TRACK = 290; // the near track (train wheels)
const FAR_TRACK = 246;

/** Rails and sleepers along y, at a depth scale s. */
function Track({ y, s }: { y: number; s: number }) {
  return (
    <g>
      <rect x="-120" y={y - 2 * s} width="1240" height={14 * s} fill="#8a8274" />
      <g fill="#6b5240">
        {Array.from({ length: Math.ceil(1240 / (22 * s)) }, (_, i) => (
          <path key={i} d={`M${-120 + i * 22 * s} ${y + 10 * s} l${10 * s} 0 l${-4 * s} ${-12 * s} l${-10 * s} 0 Z`} />
        ))}
      </g>
      <rect x="-120" y={y - 4 * s} width="1240" height={3 * s} fill="#c9ced6" />
      <rect x="-120" y={y + 3 * s} width="1240" height={3 * s} fill="#9aa3ae" />
    </g>
  );
}

/** A long freight train: a locomotive and flatcars with containers, facing left. */
function Train({ seed }: { seed: number }) {
  const cars = useMemo(() => {
    const r = rng(seed);
    return Array.from({ length: 8 }, () => ({
      a: BOXES[Math.floor(r() * BOXES.length)]!,
      b: r() < 0.7 ? BOXES[Math.floor(r() * BOXES.length)]! : null,
      rlx: r() < 0.3,
    }));
  }, [seed]);
  const id = useIds();
  return (
    <g>
      <defs>
        <Linear id={id("loco")} stops={[[0, "#24406b"], [1, NAVY]]} />
      </defs>
      {/* Locomotive. */}
      <Contact x={110} y={0} rx={120} opacity={0.3} />
      <path d="M0 -16 L0 -78 Q0 -92 14 -96 L46 -104 L210 -104 L210 -16 Z" fill={`url(#${id("loco")})`} />
      <path d="M0 -60 L210 -60 L210 -52 L0 -52 Z" fill={GOLD} />
      <path d="M8 -86 L40 -96 L64 -96 L64 -72 L8 -72 Z" fill="#7fa6c8" />
      <path d="M14 -80 L34 -88 L40 -88 L20 -80 Z" fill="#ffffff" opacity="0.4" />
      <RlxMark x={118} y={-90} s={1.5} color={WHITE} w={2.4} />
      <rect x="80" y="-112" width="110" height="8" fill="#16223a" />
      <rect x="0" y="-36" width="8" height="10" fill="#fff6d6" />
      <Glow x={-10} y={-31} rx={40} ry={16} color="#fff6d6" opacity={0.6} />
      {[30, 62, 150, 182].map((x) => (
        <circle key={x} cx={x} cy="-10" r="11" fill="#141a2e" />
      ))}
      {/* Flatcars with one or two containers each. */}
      {cars.map((c, i) => {
        const x = 220 + i * 250;
        return (
          <g key={i}>
            <rect x={x} y="-24" width="244" height="10" fill="#3b4a5c" />
            <rect x={x - 6} y="-20" width="8" height="4" fill="#2c3442" />
            {c.b ? (
              <>
                <Container x={x + 4} y={-80} w={116} h={56} color={c.a} />
                <Container x={x + 124} y={-80} w={116} h={56} color={c.b} label={c.rlx ? "RLX" : undefined} />
              </>
            ) : (
              <Container x={x + 4} y={-80} w={236} h={56} color={c.a} label={c.rlx ? "RLX" : undefined} />
            )}
            {[x + 24, x + 52, x + 192, x + 220].map((wx) => (
              <circle key={wx} cx={wx} cy="-8" r="8" fill="#141a2e" />
            ))}
          </g>
        );
      })}
    </g>
  );
}

/** Rail signal with two lamps. */
function Signal({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <Contact x={0} y={0} rx={16} opacity={0.3} />
      <rect x="-3" y="-120" width="6" height="120" fill="#2c3442" />
      <rect x="-12" y="-150" width="24" height="44" rx="6" fill="#1b2433" />
      <circle cx="0" cy="-138" r="6" fill="#ff5a4f" className="rocky-blink" />
      <circle cx="0" cy="-118" r="6" fill={GREEN2} opacity="0.35" />
      <Glow x={0} y={-138} rx={22} color="#ff5a4f" opacity={0.5} className="rocky-blink" />
    </g>
  );
}

export function RailYardScene(_: SceneProps) {
  const id = useIds();
  return (
    <>
      <defs>
        <Linear id={id("ballast")} stops={[[0, "#a39c8e"], [1, "#8c8576"]]} />
        <Linear id={id("platform")} stops={[[0, "#d8d2c6"], [1, "#bdb6a8"]]} />
      </defs>
      <Depth d={1}>
        <Sky stops={[[0, "#9cc4e4"], [0.5, "#dfe9ee"], [0.8, "#f8e3c8"], [1, "#fbe9d4"]]} sun={{ x: 220, y: 150, r: 220, color: "#ffe6bf", strength: 0.85 }} />
        <circle cx="220" cy="150" r="24" fill="#fff4dc" />
        <CloudDrift seed={12} n={4} y={[40, 110]} s={[0.7, 1.2]} speed={170} tint="#e8d6c6" light="#ffffff" opacity={0.85} />
      </Depth>
      <Depth d={0.75}>
        <Ridge seed={33} y={196} amp={26} color="#b7c6cf" waves={3} />
        <Ridge seed={41} y={214} amp={14} color="#a5b6b2" waves={2} />
        {/* Intermodal cranes and sheds far off in the mist. */}
        {[80, 260, 760].map((x) => (
          <g key={x} fill="none" stroke="#8fa0ad" strokeWidth="4">
            <path d={`M${x} 226 L${x} 150 L${x + 90} 150 L${x + 90} 226`} />
            <path d={`M${x - 20} 150 L${x + 110} 150`} strokeWidth="6" />
          </g>
        ))}
        <g fill="#a3b2bd">
          <rect x="420" y="190" width="200" height="36" />
          <path d="M410 190 L520 172 L630 190 Z" />
          <rect x="880" y="198" width="160" height="28" />
        </g>
        <Haze y0={120} y1={230} color="#f2ece4" opacity={0.75} />
      </Depth>

      {/* The yard bed: ballast between and around the tracks. */}
      <rect x="-120" y={FAR_TRACK - 16} width="1240" height={410 - FAR_TRACK + 16} fill={`url(#${id("ballast")})`} />
      <Depth d={0.25}>
        <Track y={FAR_TRACK} s={0.6} />
        {/* Parked wagons on the far track. */}
        <g transform={`translate(-60 ${FAR_TRACK - 2}) scale(0.6)`}>
          {Array.from({ length: 5 }, (_, i) => (
            <Container key={i} x={i * 250} y={-70} w={240} h={56} color={BOXES[(i * 3) % BOXES.length]!} />
          ))}
          <rect x="0" y="-16" width="1240" height="10" fill="#3b4a5c" />
        </g>
      </Depth>
      <Haze y0={FAR_TRACK - 60} y1={FAR_TRACK + 14} color="#f2ece4" opacity={0.45} />

      <Track y={TRACK} s={1} />
      {/* The train rolling through. */}
      <g transform={`translate(0 ${TRACK - 4}) scale(0.82)`}>
        <g className="rocky-run" style={{ ["--t" as string]: "30s", ["--from" as string]: "1200px", ["--to" as string]: "-2300px", ["--x" as string]: "120px", ["--dl" as string]: "-11s" }}>
          <Train seed={4} />
        </g>
      </g>
      <Signal x={300} y={TRACK + 6} s={0.9} />
      <Signal x={880} y={FAR_TRACK + 2} s={0.6} />

      {/* Platform in front: concrete with the yellow safety edge. */}
      <rect x="-120" y="314" width="1240" height="96" fill={`url(#${id("platform")})`} />
      <rect x="-120" y="314" width="1240" height="10" fill={GOLD} />
      <g fill={NAVY} opacity="0.75">
        {Array.from({ length: 30 }, (_, i) => (
          <circle key={i} cx={-110 + i * 44} cy="319" r="1.8" />
        ))}
      </g>
      <rect x="-120" y="324" width="1240" height="4" fill="#8f887a" />
      <g stroke="#a9a294" strokeWidth="1.4" opacity="0.8">
        {Array.from({ length: 14 }, (_, i) => {
          const bx = -700 + i * 180;
          return <line key={i} x1={500 + (bx - 500) * 0.6} y1="328" x2={bx} y2="410" />;
        })}
      </g>
      {/* A stack of new sleepers at the right edge. */}
      <g>
        <Contact x={920} y={384} rx={70} opacity={0.3} />
        {[0, 1, 2].map((k) => (
          <g key={k}>
            <rect x={866 - k * 4} y={370 - k * 12} width="110" height="12" fill={shade("#6b5240", k * 0.08)} />
            <rect x={866 - k * 4} y={370 - k * 12} width="110" height="2" fill={shade("#6b5240", 0.3)} />
          </g>
        ))}
      </g>
      <Haze y0={250} y1={330} color="#ffffff" opacity={0.18} peak={0.4} />
      <Birds y={90} speed={52} n={4} color="#6f7d8c" />

      <Grade light="#ffe6bf" lightX={0.2} strength={0.22} lightStrength={0.2} />
    </>
  );
}
