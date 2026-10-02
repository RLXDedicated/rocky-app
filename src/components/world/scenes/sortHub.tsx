// Sorting hub: a tall hall at dusk with conveyors at three depths, a scanner
// arch reading parcels, chutes to the delivery zones and a big blurred belt
// passing right in front of the camera.
import {
  Belt,
  Contact,
  Depth,
  Glow,
  GOLD,
  Grade,
  GREEN2,
  Haze,
  Linear,
  Motes,
  NAVY,
  NAVY2,
  Parcel,
  useIds,
  WHITE,
  Windows,
  type SceneProps,
} from "./kit";

const FLOOR = 292;

function Chute({ x, label, color }: { x: number; label: string; color: string }) {
  return (
    <g transform={`translate(${x} 0)`}>
      {/* The slide from the sorter down into a cage. */}
      <path d="M0 220 L40 220 L58 256 L18 256 Z" fill="#9fb0c0" />
      <path d="M0 220 L40 220 L42 225 L2 225 Z" fill="#c9d4de" />
      <path d="M40 220 L58 256 L54 256 L37 223 Z" fill="#7e8fa1" />
      {/* Roll cage with parcels. */}
      <Contact x={40} y={FLOOR} rx={34} opacity={0.3} />
      <rect x="12" y="250" width="56" height="40" fill="#2c3442" opacity="0.12" />
      <Parcel x={18} y={268} w={22} h={20} tone={1} label={false} />
      <Parcel x={42} y={272} w={20} h={16} tone={2} label={false} />
      <Parcel x={26} y={256} w={20} h={13} tone={3} label={false} />
      <g stroke="#56667a" strokeWidth="2" fill="none">
        <rect x="12" y="250" width="56" height="40" />
        {[22, 32, 42, 52, 62].map((gx) => (
          <line key={gx} x1={gx} y1="250" x2={gx} y2="290" />
        ))}
        <line x1="12" y1="270" x2="68" y2="270" />
      </g>
      <circle cx="18" cy="292" r="3" fill="#1b2433" />
      <circle cx="62" cy="292" r="3" fill="#1b2433" />
      {/* Zone sign. */}
      <rect x="8" y="232" width="44" height="16" rx="3" fill={color} />
      <text x="30" y="244" textAnchor="middle" fontFamily="Poppins, sans-serif" fontWeight="800" fontSize="10" fill={WHITE}>
        {label}
      </text>
    </g>
  );
}

export function SortHubScene({ live = false }: SceneProps) {
  const id = useIds();
  return (
    <>
      <defs>
        <Linear id={id("wall")} stops={[[0, "#2b3954"], [0.5, "#465a78"], [1, "#6e7f98"]]} />
        <Linear id={id("dusk")} stops={[[0, "#2b3a7a"], [0.45, "#8a5fa8"], [0.8, "#f08f6f"], [1, "#ffc98a"]]} />
        <Linear id={id("floor")} stops={[[0, "#9aa3ab"], [0.3, "#c2c4c4"], [1, "#8a8f98"]]} />
      </defs>

      {/* Back wall with tall windows onto a dusk sky. */}
      <Depth d={0.35}>
        <rect x="-120" y="-40" width="1240" height="340" fill={`url(#${id("wall")})`} />
        {Array.from({ length: 9 }, (_, i) => {
          const x = -80 + i * 140;
          return (
            <g key={i}>
              <rect x={x} y="22" width="96" height="104" fill={`url(#${id("dusk")})`} />
              {/* The city beyond the glass. */}
              <path d={`M${x} 112 l12 -10 l10 6 l14 -14 l16 10 l12 -6 l14 8 l18 -4 v24 h-96 Z`} fill="#2a2850" opacity="0.75" />
              <Windows seed={i + 40} x={x + 4} y={110} cols={9} rows={2} w={6} h={4} gx={4} gy={4} on="#ffd98a" off="#4a3f6a" share={0.4} />
              <g stroke="#1b2740" strokeWidth="3">
                <line x1={x + 48} y1="22" x2={x + 48} y2="126" />
                <line x1={x} y1="74" x2={x + 96} y2="74" />
              </g>
              <rect x={x - 3} y="19" width="102" height="110" fill="none" stroke="#16223a" strokeWidth="5" />
            </g>
          );
        })}
        {/* Mezzanine along the back wall: a deck on columns with its own belt and a railing. */}
        {Array.from({ length: 10 }, (_, i) => (
          <rect key={i} x={-110 + i * 135} y="160" width="7" height={FLOOR - 160} fill="#2c3a52" />
        ))}
        <Belt x0={-120} x1={1120} y={150} s={0.5} speed={30} n={16} seed={5} legs={false} frame="#56667a" />
        <rect x="-120" y="156" width="1240" height="8" fill="#2c3a52" />
        <rect x="-120" y="162" width="1240" height="3" fill={GOLD} opacity="0.7" />
        <g stroke="#7f93ad" strokeWidth="1.5" opacity="0.8">
          <line x1="-120" y1="132" x2="1120" y2="132" />
          {Array.from({ length: 42 }, (_, i) => (
            <line key={i} x1={-120 + i * 30} y1="132" x2={-120 + i * 30} y2="156" />
          ))}
        </g>
      </Depth>

      {/* Big wall banner. */}
      <Depth d={0.3}>
        <g transform="translate(440 -4)">
          <rect width="120" height="34" rx="4" fill={NAVY} />
          <rect y="30" width="120" height="4" fill={GREEN2} />
          <text x="60" y="23" textAnchor="middle" fontFamily="Poppins, sans-serif" fontWeight="800" fontSize="16" fill={WHITE} letterSpacing="1">
            RLX HUB
          </text>
        </g>
      </Depth>

      <Haze y0={120} y1={FLOOR} color="#d8b89a" opacity={0.28} />

      {/* Floor: epoxy with painted lanes running back into the hall. */}
      <rect x="-120" y={FLOOR - 4} width="1240" height={410 - FLOOR} fill={`url(#${id("floor")})`} />
      <g stroke="#56667a" strokeWidth="1.2" opacity="0.35">
        {Array.from({ length: 15 }, (_, i) => {
          const bx = -700 + i * 170;
          return <line key={i} x1={500 + (bx - 500) * 0.28} y1={FLOOR} x2={bx} y2="410" />;
        })}
      </g>
      <rect x="-120" y={FLOOR - 4} width="1240" height="4" fill="#5d6b7b" />
      <rect x="-120" y={FLOOR + 2} width="1240" height="14" fill="#ffe2b8" opacity="0.18" />
      <path d={`M-120 ${FLOOR + 30} L1120 ${FLOOR + 30}`} stroke={GOLD} strokeWidth="4" opacity="0.8" />
      <path d="M-120 392 L1120 392" stroke={GOLD} strokeWidth="6" opacity="0.8" />
      <g fill={GOLD} opacity="0.75">
        {Array.from({ length: 16 }, (_, i) => (
          <path key={i} d={`M${-100 + i * 80} 392 l26 0 l-14 10 l-26 0 Z`} fill={NAVY} />
        ))}
      </g>

      {/* Sorter: chutes into roll cages, one per zone. */}
      <Chute x={-60} label="ZONE A" color="#e8762c" />
      <Chute x={60} label="ZONE B" color={GREEN2} />
      <Chute x={180} label="ZONE C" color="#3b82c4" />
      <Chute x={760} label="ZONE D" color="#a65bd6" />
      <Chute x={880} label="ZONE E" color="#e8762c" />
      <Chute x={1000} label="ZONE F" color={GREEN2} />

      {/* The main sorter belt across the hall. */}
      <Belt x0={-120} x1={1120} y={212} s={0.8} floor={FLOOR} speed={16} n={10} seed={9} />

      {/* Scanner arch over the belt with its laser line. */}
      <g transform="translate(440 0)">
        <Contact x={60} y={FLOOR} rx={80} opacity={0.3} />
        <rect x="0" y="120" width="14" height={FLOOR - 120} fill={NAVY2} />
        <rect x="106" y="120" width="14" height={FLOOR - 120} fill={NAVY2} />
        <rect x="4" y="120" width="4" height={FLOOR - 120} fill="#ffffff" opacity="0.18" />
        <rect x="-8" y="108" width="136" height="26" rx="4" fill={NAVY} />
        <rect x="-8" y="130" width="136" height="4" fill={GOLD} />
        <text x="60" y="126" textAnchor="middle" fontFamily="Poppins, sans-serif" fontWeight="800" fontSize="11" fill={WHITE} letterSpacing="1">
          SCAN
        </text>
        <circle cx="114" cy="121" r="4" fill={GREEN2} className="rocky-blink" />
        <path d="M14 140 L60 176 L106 140" fill="none" stroke="#ff4d4d" strokeWidth="1.5" opacity="0.8" className="rocky-blink" />
        <Glow x={60} y={180} rx={60} ry={14} color="#ff6b6b" opacity={0.35} className="rocky-pulse" />
        {/* Status screen on the leg. */}
        <rect x="-36" y="210" width="34" height="26" rx="3" fill="#0e1a2c" />
        <rect x="-32" y="214" width="26" height="3" fill={GREEN2} />
        <rect x="-32" y="220" width="18" height="3" fill="#5f7896" />
        <rect x="-32" y="226" width="22" height="3" fill="#5f7896" />
      </g>

      {/* Hanging lamps. */}
      {[210, 790].map((x) => (
        <g key={x}>
          <line x1={x} y1="-10" x2={x} y2="96" stroke="#16223a" strokeWidth="2" />
          <path d={`M${x - 26} 108 L${x - 12} 96 L${x + 12} 96 L${x + 26} 108 Z`} fill="#1b2433" />
          <ellipse cx={x} cy="108" rx="26" ry="3" fill="#fff8e1" />
          <path d={`M${x - 24} 110 L${x + 24} 110 L${x + 120} ${FLOOR} L${x - 120} ${FLOOR} Z`} fill="#fff3cf" opacity="0.16" />
          <Glow x={x} y={FLOOR + 14} rx={150} ry={20} color="#fff3cf" opacity={0.5} />
        </g>
      ))}

      {live && <Motes seed={21} n={26} x={[260, 740]} y={[110, 280]} r={[0.7, 1.6]} color="#fff3cf" drift={[16, -22]} dur={[9, 15]} />}

      {/* A big belt passing right in front of the camera, out of focus. */}
      {/* Darkened rather than blurred: a blur over moving parcels would be re-filtered every frame. */}
      <g>
        <Belt x0={-120} x1={1120} y={30} s={1.7} speed={12} n={5} seed={3} legs={false} reverse frame="#2c3442" />
        <rect x="-120" y="46" width="1240" height="10" fill="#1b2433" />
      </g>
      <rect x="-120" y="-40" width="1240" height="102" fill="#0e1424" opacity="0.5" />
      <rect x="-120" y="-40" width="1240" height="40" fill="#1b2433" />

      <Grade light="#ffd9a8" lightX={0.5} strength={0.3} lightStrength={0.2} />
    </>
  );
}
