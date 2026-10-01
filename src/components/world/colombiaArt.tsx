// "Colombia" — a shop section of Colombian things for Rocky: the ruana and
// the poncho, the sombrero aguadeño and the llanero hat, the Carnaval de
// Barranquilla (Congo headdress, marimonda mask), the carriel and the Wayuu
// mochila, a silleta from the Feria de las Flores, a chiva, a guacamaya,
// tejo, an arepa grill, Valle de Cocora and Caño Cristales, and pandebono,
// obleas and a tinto. Same art boxes as the other waves (hats 100x60 with
// the brim at the bottom; glasses 100x40, lenses at (25,20)/(75,20); neck
// 100x70, knot at the top; body 100x110 collar→hips, shoulders at the top
// corners; back 100x120; scenes 1000x400, floor from about y 290; food 40x40).
import type { ReactElement } from "react";
import type { DecorArt, HatArt } from "./art";

const GOLD = "#f5b82e";
const WHITE = "#ffffff";
const INK = "#1b1b24";
// The flag's colours.
const CO_Y = "#fcd116";
const CO_B = "#003893";
const CO_R = "#ce1126";

const pair = (half: ReactElement) => (
  <>
    {["", "translate(100 0) scale(-1 1)"].map((t) => (
      <g key={t} transform={t || undefined}>
        {half}
      </g>
    ))}
  </>
);
const shadow = (cx: number, cy: number, rx: number) => <ellipse cx={cx} cy={cy} rx={rx} ry="4" fill="#000" opacity="0.08" />;

// ---------------------------------------------------------------------------
// Hats
// ---------------------------------------------------------------------------
export const COLOMBIA_HATS: Record<string, HatArt> = {
  // Antioquia's white straw hat with a black band.
  "hat-aguadeno": {
    width: 1.0,
    sink: 0.32,
    svg: (
      <>
        <ellipse cx="50" cy="51" rx="46" ry="8" fill="#f4ecd8" stroke="#d9cba6" strokeWidth="1.5" />
        <path d="M27 50 C27 20 38 12 50 12 C62 12 73 20 73 50 Z" fill="#f8f2e2" stroke="#d9cba6" strokeWidth="1.5" />
        <path d="M44 13 C46 18 54 18 56 13" stroke="#e2d5b3" strokeWidth="1.5" fill="none" />
        <path d="M27 40 C40 44 60 44 73 40 L73 48 C60 52 40 52 27 48 Z" fill={INK} />
        {[32, 40, 48, 56, 64].map((x) => (
          <path key={x} d={`M${x} 18 L${x - 1} 38`} stroke="#ece2c6" strokeWidth="1.2" />
        ))}
      </>
    ),
  },
  // The Llanos: a wide, flat brim and a low crown.
  "hat-llanero": {
    width: 1.18,
    sink: 0.3,
    svg: (
      <>
        <ellipse cx="50" cy="50" rx="49" ry="7" fill="#3b2a1e" />
        <ellipse cx="50" cy="49" rx="49" ry="5" fill="#4a3526" />
        <path d="M30 49 L32 26 C40 20 60 20 68 26 L70 49 Z" fill="#4a3526" />
        <path d="M32 26 C40 30 60 30 68 26" stroke="#2a1d14" strokeWidth="2" fill="none" />
        <rect x="30" y="41" width="40" height="6" fill="#c9a26a" />
        <circle cx="62" cy="44" r="2.5" fill={GOLD} />
      </>
    ),
  },
  // Carnaval de Barranquilla: the Congo headdress, flowers, mirrors and ribbons.
  "hat-congo": {
    width: 0.86,
    sink: 0.26,
    svg: (
      <>
        <path d="M14 56 C12 24 30 4 50 4 C70 4 88 24 86 56 Z" fill={CO_R} />
        {[0, 1, 2, 3].map((i) => (
          <path key={i} d={`M16 ${50 - i * 11} C36 ${44 - i * 11} 64 ${44 - i * 11} 84 ${50 - i * 11}`} stroke={[CO_Y, "#1fbf68", CO_B, "#f472b6"][i]} strokeWidth="4" fill="none" />
        ))}
        {[
          [30, 22, "#f472b6"],
          [50, 14, CO_Y],
          [70, 22, "#fb923c"],
          [40, 36, WHITE],
          [60, 36, "#a78bfa"],
        ].map(([x, y, c]) => (
          <g key={`${x}-${y}`}>
            {[0, 72, 144, 216, 288].map((a) => (
              <ellipse key={a} cx={x as number} cy={(y as number) - 4} rx="2.6" ry="4" fill={c as string} transform={`rotate(${a} ${x} ${y})`} />
            ))}
            <circle cx={x as number} cy={y as number} r="2" fill={GOLD} />
          </g>
        ))}
        {[22, 50, 78].map((x) => (
          <circle key={x} cx={x} cy="48" r="3" fill="#e5f3ff" stroke="#94a3b8" className="rocky-twinkle" />
        ))}
        {[18, 30, 70, 82].map((x, i) => (
          <path key={x} d={`M${x} 54 l${i < 2 ? -6 : 6} 8`} stroke={[CO_Y, CO_B, CO_R, "#1fbf68"][i]} strokeWidth="3" strokeLinecap="round" />
        ))}
      </>
    ),
  },
};

// ---------------------------------------------------------------------------
// Glasses (100x40, lenses at (25,20) and (75,20))
// ---------------------------------------------------------------------------
export const COLOMBIA_GLASSES: Record<string, ReactElement> = {
  "glasses-tricolor": (
    <>
      <defs>
        <linearGradient id="co-lens" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={CO_Y} />
          <stop offset="0.5" stopColor={CO_Y} />
          <stop offset="0.5" stopColor={CO_B} />
          <stop offset="0.75" stopColor={CO_B} />
          <stop offset="0.75" stopColor={CO_R} />
          <stop offset="1" stopColor={CO_R} />
        </linearGradient>
      </defs>
      {pair(<rect x="10" y="8" width="30" height="24" rx="6" fill="url(#co-lens)" stroke={INK} strokeWidth="3" />)}
      <path d="M40 16 C46 12 54 12 60 16" stroke={INK} strokeWidth="3" fill="none" />
      {pair(<path d="M14 12 L24 12" stroke={WHITE} strokeWidth="2" strokeLinecap="round" opacity="0.7" />)}
    </>
  ),
  // The marimonda mask of the Carnaval: big ears, eye rings and a long nose.
  "glasses-marimonda": (
    <>
      {pair(<path d="M8 6 C-4 4 -2 30 8 32 L14 26 Z" fill={CO_Y} stroke={CO_R} strokeWidth="2" />)}
      <path d="M8 4 L92 4 L94 30 C70 36 30 36 6 30 Z" fill={CO_B} />
      {[14, 30, 46, 62, 78].map((x, i) => (
        <rect key={x} x={x} y="4" width="8" height="26" fill={[CO_R, CO_Y, "#1fbf68", CO_Y, CO_R][i]} opacity="0.85" />
      ))}
      {pair(
        <>
          <circle cx="25" cy="18" r="9" fill={WHITE} stroke={INK} strokeWidth="2" />
          <circle cx="25" cy="18" r="4" fill={INK} />
        </>,
      )}
      <path d="M44 26 C44 34 56 34 56 26 L54 40 L46 40 Z" fill={CO_R} stroke={INK} strokeWidth="1.5" />
    </>
  ),
  // Colombian emeralds in gold frames.
  "glasses-esmeralda": (
    <>
      {pair(
        <>
          <polygon points="13,13 18,8 32,8 37,13 37,27 32,32 18,32 13,27" fill="#10b981" stroke={GOLD} strokeWidth="3" />
          <polygon points="18,13 32,13 32,27 18,27" fill="#34d399" opacity="0.6" />
          <path d="M18 12 L24 12" stroke={WHITE} strokeWidth="2" strokeLinecap="round" className="rocky-twinkle" />
        </>,
      )}
      <path d="M37 18 C44 14 56 14 63 18" stroke={GOLD} strokeWidth="3" fill="none" />
    </>
  ),
};

// ---------------------------------------------------------------------------
// Neck (100x70, knot at the top centre)
// ---------------------------------------------------------------------------
export const COLOMBIA_NECK: Record<string, ReactElement> = {
  // Antioquia's leather carriel, worn across the body.
  "neck-carriel": (
    <>
      <path d="M14 0 L80 52" stroke="#6b4423" strokeWidth="5" />
      <path d="M14 0 L80 52" stroke="#8b5a2b" strokeWidth="2" strokeDasharray="3 3" />
      <rect x="66" y="44" width="30" height="24" rx="5" fill="#7a4a24" />
      <path d="M66 50 C66 42 96 42 96 50 L96 56 L66 56 Z" fill="#5c3518" />
      <path d="M70 60 L92 60" stroke="#c9a26a" strokeWidth="1.2" strokeDasharray="2 2" />
      <circle cx="81" cy="56" r="2.6" fill={GOLD} />
      <path d="M69 44 L71 40 M93 44 L91 40" stroke="#3b2412" strokeWidth="2" />
    </>
  ),
  // A Wayuu mochila (La Guajira), bright woven patterns and tassels.
  "neck-wayuu": (
    <>
      <path d="M12 0 L78 50" stroke="#e2445c" strokeWidth="4" />
      <path d="M12 0 L78 50" stroke={CO_Y} strokeWidth="1.6" strokeDasharray="4 4" />
      <path d="M64 46 L96 46 L94 66 C88 70 72 70 66 66 Z" fill="#f97316" />
      <path d="M64 46 L96 46 L96 51 L64 51 Z" fill="#7c3aed" />
      {[0, 1, 2, 3].map((i) => (
        <path key={i} d={`M${67 + i * 7} 56 l3.5 -4 l3.5 4 l-3.5 4 Z`} fill={i % 2 ? "#1fbf68" : CO_Y} />
      ))}
      <path d="M64 62 L96 62" stroke="#0ea5e9" strokeWidth="2.5" />
      {[66, 94].map((x) => (
        <path key={x} d={`M${x} 48 l${x < 80 ? -4 : 4} 16`} stroke="#e2445c" strokeWidth="2.5" strokeLinecap="round" />
      ))}
    </>
  ),
  // The tricolour scarf of the Selección.
  "neck-tricolor": (
    <>
      <path d="M8 6 C20 26 80 26 92 6 L92 18 C80 38 20 38 8 18 Z" fill={CO_Y} />
      <path d="M10 14 C22 32 78 32 90 14 L91 18 C80 36 20 36 9 18 Z" fill={CO_B} />
      <path d="M58 26 L70 26 L74 62 L60 62 Z" fill={CO_Y} />
      <path d="M59 40 L72 40 L73 50 L60 50 Z" fill={CO_B} />
      <path d="M60 50 L73 50 L74 62 L60 62 Z" fill={CO_R} />
      {[61, 65, 69, 73].map((x) => (
        <path key={x} d={`M${x} 62 L${x} 69`} stroke={CO_R} strokeWidth="2" strokeLinecap="round" />
      ))}
    </>
  ),
};

// ---------------------------------------------------------------------------
// Body (100x110, collar at the top, shoulders at the top corners)
// ---------------------------------------------------------------------------
export const COLOMBIA_BODY: Record<string, ReactElement> = {
  // The ruana of Boyacá: a wool square with a slit for the head, draped over the shoulders.
  "body-ruana": (
    <>
      <path d="M30 2 C40 -1 60 -1 70 2 C84 8 96 22 100 40 L100 94 C86 100 68 99 55 94 L52 26 L48 26 L45 94 C32 99 14 100 0 94 L0 40 C4 22 16 8 30 2 Z" fill="#8a6a4a" />
      <path d="M30 2 C40 -1 60 -1 70 2 C66 8 58 12 50 12 C42 12 34 8 30 2 Z" fill="#6f5238" />
      <path d="M20 30 C18 50 20 72 16 96 M34 22 C32 50 34 74 32 97 M80 30 C82 50 80 72 84 96 M66 22 C68 50 66 74 68 97" stroke="#76583b" strokeWidth="2.2" fill="none" opacity="0.7" />
      {[76, 82, 88].map((y, i) => (
        <g key={y} stroke={["#f4ecd8", "#3b2a1e", "#f4ecd8"][i]} strokeWidth="2.6">
          <path d={`M0 ${y} L45 ${y + 1}`} />
          <path d={`M55 ${y + 1} L100 ${y}`} />
        </g>
      ))}
      {Array.from({ length: 14 }, (_, i) => {
        const x = i < 7 ? 2 + i * 6.4 : 57 + (i - 7) * 6.4;
        const y = i < 7 ? 95 + Math.min(i, 6 - i) * 0.8 : 95 + Math.min(i - 7, 13 - i) * 0.8;
        return <path key={i} d={`M${x} ${y} l0 7`} stroke="#6b4f35" strokeWidth="2" strokeLinecap="round" />;
      })}
    </>
  ),
  // The poncho antioqueño: a white cloth with fine black stripes, thrown over one shoulder.
  "body-poncho": (
    <>
      <path d="M0 2 L13 2 L15 52 C10 55 4 55 0 52 Z" fill="#ece7db" stroke="#d6d0c2" strokeWidth="1.2" />
      {[1, 4, 7, 10, 13].map((x) => (
        <path key={x} d={`M${x} 53 l0 6`} stroke="#d6d0c2" strokeWidth="1.6" strokeLinecap="round" />
      ))}
      <path d="M0 0 C20 2 34 14 50 36 C64 56 80 72 100 80 L94 100 C74 94 58 80 42 60 C28 42 16 30 0 26 Z" fill="#f8f5ee" stroke="#d6d0c2" strokeWidth="1.2" />
      <path d="M0 5 C19 7 32 18 47 39 C61 59 78 75 99 84" stroke={INK} strokeWidth="1.1" fill="none" opacity="0.65" />
      <path d="M0 21 C16 25 27 37 40 55 C55 75 72 89 95 96" stroke={INK} strokeWidth="1.1" fill="none" opacity="0.65" />
      <path d="M2 13 C20 16 31 28 44 47 C58 67 75 82 97 90" stroke="#ddd6c6" strokeWidth="2" fill="none" />
      {Array.from({ length: 6 }, (_, i) => (
        <path key={i} d={`M${94.5 + i * 1.1} ${99 - i * 3.6} l4 4`} stroke="#d6d0c2" strokeWidth="1.6" strokeLinecap="round" />
      ))}
    </>
  ),
};

// ---------------------------------------------------------------------------
// Back (100x120, behind Rocky)
// ---------------------------------------------------------------------------
export const COLOMBIA_BACK: Record<string, ReactElement> = {
  // A silleta from Medellín's Feria de las Flores, flowers rising over the shoulders.
  "back-silleta": (
    <>
      <rect x="8" y="30" width="84" height="80" rx="4" fill="#a8763e" />
      {[42, 62, 82].map((y) => (
        <rect key={y} x="8" y={y} width="84" height="4" fill="#8a5a2b" />
      ))}
      <path d="M2 40 C10 -6 90 -6 98 40 Z" fill="#3f9a6a" />
      {Array.from({ length: 22 }, (_, i) => {
        const x = 10 + ((i * 37) % 80);
        const y = 6 + ((i * 23) % 32);
        const c = ["#f472b6", CO_Y, "#fb923c", WHITE, "#e2445c", "#a78bfa"][i % 6]!;
        return (
          <g key={i}>
            {[0, 90, 180, 270].map((a) => (
              <ellipse key={a} cx={x} cy={y - 3} rx="2.6" ry="3.6" fill={c} transform={`rotate(${a} ${x} ${y})`} />
            ))}
            <circle cx={x} cy={y} r="1.6" fill={GOLD} />
          </g>
        );
      })}
    </>
  ),
};

export const COLOMBIA_BACK_WIDTH: Record<string, number> = { "back-silleta": 1.7 };

// ---------------------------------------------------------------------------
// Home items
// ---------------------------------------------------------------------------
export const COLOMBIA_DECOR: Record<string, DecorArt> = {
  // A chiva: the painted country bus, luggage on the roof.
  "decor-chiva": {
    play: "vroom",
    viewBox: "0 0 240 130",
    left: 70,
    width: 24,
    svg: (
      <>
        {shadow(120, 124, 110)}
        <rect x="40" y="6" width="150" height="10" rx="2" fill="#6b4a2f" />
        {[48, 80, 112, 146].map((x, i) => (
          <rect key={x} x={x} y="-6" width={26} height="12" rx="3" fill={["#e2445c", CO_Y, "#3b82f6", "#1fbf68"][i]} />
        ))}
        <path d="M20 22 L200 22 L214 30 L222 70 L222 100 L16 100 L16 30 Z" fill={CO_Y} />
        <rect x="16" y="22" width="190" height="10" fill={CO_R} />
        {[28, 62, 96, 130, 164].map((x) => (
          <g key={x}>
            <rect x={x} y="38" width="26" height="26" rx="3" fill="#bfe3ff" />
            <path d={`M${x + 4} 44 L${x + 10} 40`} stroke={WHITE} strokeWidth="2" opacity="0.8" />
          </g>
        ))}
        <path d="M200 34 L218 44 L218 66 L200 66 Z" fill="#bfe3ff" />
        <rect x="16" y="70" width="206" height="10" fill={CO_B} />
        <rect x="16" y="80" width="206" height="8" fill={CO_R} />
        {[30, 60, 90, 120, 150, 180].map((x, i) => (
          <path key={x} d={`M${x} 92 l6 -6 l6 6 l-6 6 Z`} fill={["#1fbf68", WHITE, "#f472b6"][i % 3]} />
        ))}
        <rect x="208" y="84" width="16" height="8" rx="2" fill="#e5e7eb" />
        {[50, 186].map((x) => (
          <g key={x}>
            <circle cx={x} cy="104" r="15" fill={INK} />
            <circle cx={x} cy="104" r="6" fill="#d1d5db" />
          </g>
        ))}
      </>
    ),
  },
  // A guacamaya (macaw) on its perch — Colombia has more bird species than anywhere.
  "decor-guacamaya": {
    play: "peek",
    viewBox: "0 0 100 150",
    left: 92,
    width: 8,
    svg: (
      <>
        {shadow(50, 146, 30)}
        <rect x="47" y="60" width="6" height="84" fill="#8a5a3a" />
        <rect x="24" y="140" width="52" height="6" rx="3" fill="#6b4a2f" />
        <rect x="22" y="58" width="56" height="5" rx="2.5" fill="#6b4a2f" />
        <g className="rocky-bob">
          <path d="M56 58 C66 80 66 110 60 132 L54 132 C56 110 54 82 48 60 Z" fill="#2563eb" />
          <path d="M58 70 C68 90 70 116 66 140 L62 140 C64 116 62 92 54 72 Z" fill={CO_Y} />
          <ellipse cx="50" cy="40" rx="15" ry="22" fill="#e11d48" />
          <path d="M38 44 C30 52 32 64 44 66 L50 52 Z" fill="#2563eb" />
          <path d="M40 48 C34 54 36 60 44 62" stroke={CO_Y} strokeWidth="4" fill="none" />
          <circle cx="50" cy="18" r="11" fill="#e11d48" />
          <path d="M58 16 C70 16 70 30 60 30 C62 24 60 20 56 20 Z" fill="#e5e7eb" stroke="#475569" strokeWidth="1.2" />
          <circle cx="50" cy="16" r="5" fill={WHITE} />
          <circle cx="51" cy="16" r="2.2" fill={INK} />
        </g>
      </>
    ),
  },
  // Tejo: a clay board with mechas (gunpowder targets) around the bocín.
  "decor-tejo": {
    play: "cheer",
    viewBox: "0 0 140 90",
    left: 34,
    width: 13,
    svg: (
      <>
        {shadow(70, 86, 62)}
        <path d="M8 40 L132 40 L124 82 L16 82 Z" fill="#8a5a3a" />
        <path d="M14 30 L126 30 L132 40 L8 40 Z" fill="#a8763e" />
        <ellipse cx="70" cy="35" rx="40" ry="5" fill="#9ca3af" />
        <ellipse cx="70" cy="35" rx="34" ry="3.5" fill="#6b7280" />
        <ellipse cx="70" cy="35" rx="12" ry="2" fill="#1f2937" />
        {[[44, 32], [96, 32], [58, 37], [84, 37]].map(([x, y]) => (
          <path key={`${x}`} d={`M${x} ${y} l5 -8 l5 8 Z`} fill={WHITE} stroke="#e2445c" strokeWidth="1.2" />
        ))}
        <g className="rocky-bob">
          <path d="M108 14 C114 10 122 12 122 18 C122 24 114 26 108 22 Z" fill="#4b5563" />
        </g>
        <text x="70" y="66" textAnchor="middle" fontFamily="Poppins, sans-serif" fontWeight="900" fontSize="14" fill={CO_Y}>
          TEJO
        </text>
      </>
    ),
  },
  // An arepa grill, with arepas toasting and a little smoke.
  "decor-asador": {
    play: "eat",
    viewBox: "0 0 120 110",
    left: 22,
    width: 11,
    svg: (
      <>
        {shadow(60, 106, 48)}
        <path d="M22 104 L32 60 M98 104 L88 60 M60 104 L60 62" stroke="#374151" strokeWidth="4" />
        <path d="M14 52 L106 52 L98 70 L22 70 Z" fill="#1f2937" />
        <rect x="14" y="46" width="92" height="7" rx="2" fill="#4b5563" />
        {[26, 40, 54, 68, 82, 96].map((x) => (
          <path key={x} d={`M${x} 46 L${x} 53`} stroke="#9ca3af" strokeWidth="1.5" />
        ))}
        {[34, 60, 86].map((x) => (
          <g key={x}>
            <ellipse cx={x} cy="44" rx="11" ry="5" fill="#f2d27c" />
            <ellipse cx={x} cy="43" rx="8" ry="3" fill="#e9b949" />
            <path d={`M${x - 4} 43 l2 -1 M${x + 2} 44 l2 -1`} stroke="#b07a1e" strokeWidth="1.2" />
          </g>
        ))}
        <path d="M40 34 C36 28 44 24 40 16 M62 32 C58 26 66 22 62 14 M84 34 C80 28 88 24 84 16" stroke="#cbd5e1" strokeWidth="2" fill="none" className="rocky-smoke" />
      </>
    ),
  },
};

// ---------------------------------------------------------------------------
// Backgrounds
// ---------------------------------------------------------------------------
type SceneProps = { live: boolean };

/** Valle de Cocora: wax palms (the national tree) over green, misty hills. */
function CocoraScene({ live }: SceneProps) {
  const palms: [number, number, number][] = [
    [90, 70, 1],
    [210, 40, 0.8],
    [340, 90, 1.1],
    [520, 60, 0.9],
    [660, 30, 1],
    [800, 80, 1.2],
    [930, 50, 0.85],
  ];
  return (
    <>
      <defs>
        <linearGradient id="cocora-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#bfdbfe" />
          <stop offset="1" stopColor="#ecfeff" />
        </linearGradient>
      </defs>
      <rect width="1000" height="400" fill="url(#cocora-sky)" />
      <path d="M0 200 C120 90 260 80 380 170 C470 90 600 70 720 160 C820 100 920 110 1000 150 L1000 300 L0 300 Z" fill="#7aa874" />
      <g className={live ? "rocky-drift" : undefined} fill={WHITE} opacity="0.7">
        <ellipse cx="300" cy="170" rx="180" ry="18" />
        <ellipse cx="760" cy="150" rx="160" ry="16" />
      </g>
      <path d="M0 240 C160 190 320 210 480 236 C640 200 820 210 1000 230 L1000 300 L0 300 Z" fill="#4d8a3f" />
      {palms.map(([x, top, k]) => (
        <g key={x} transform={`translate(${x} 0)`}>
          <g className={live ? "rocky-sway" : undefined}>
          <rect x={-2.5 * k} y={top} width={5 * k} height={290 - top} fill="#d6d3c4" />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <path key={i} d={`M0 ${top} C${(i - 2.5) * 10 * k} ${top - 18 * k} ${(i - 2.5) * 22 * k} ${top - 8 * k} ${(i - 2.5) * 28 * k} ${top + 10 * k}`} stroke="#2f6b3a" strokeWidth={4 * k} fill="none" strokeLinecap="round" />
          ))}
          </g>
        </g>
      ))}
      <path d="M0 292 C220 284 440 300 660 290 C820 284 920 294 1000 290 L1000 400 L0 400 Z" fill="#5f9a4a" />
      <path d="M0 330 C260 320 520 342 780 328 C880 324 950 330 1000 328 L1000 400 L0 400 Z" fill="#4a8139" />
      {[150, 450, 760].map((x) => (
        <path key={x} d={`M${x} 300 l14 -24 l14 24 Z`} fill="#6b4a2f" opacity="0.6" />
      ))}
    </>
  );
}

/** Caño Cristales, "the river of five colours". */
function CanoCristalesScene({ live }: SceneProps) {
  return (
    <>
      <rect width="1000" height="400" fill="#bae6fd" />
      <path d="M0 140 C160 100 300 120 460 110 C640 96 820 120 1000 104 L1000 260 L0 260 Z" fill="#2f7d3a" />
      {Array.from({ length: 18 }, (_, i) => (
        <circle key={i} cx={i * 60 + 20} cy={130 + (i % 3) * 10} r={34 + (i % 4) * 8} fill={i % 2 ? "#3a8f45" : "#2a6e33"} />
      ))}
      <path d="M0 250 L1000 250 L1000 400 L0 400 Z" fill="#c9a87a" />
      <path d="M0 270 C200 250 400 290 600 270 C760 256 900 280 1000 270 L1000 380 C820 372 640 396 460 380 C300 368 140 392 0 380 Z" fill="#4fb3d9" />
      {Array.from({ length: 26 }, (_, i) => {
        const x = (i * 41) % 1000;
        const y = 282 + ((i * 29) % 80);
        const c = ["#e11d48", "#f43f5e", CO_Y, "#22c55e", "#1d4ed8", "#111827"][i % 6]!;
        return <ellipse key={i} cx={x} cy={y} rx={30 + (i % 3) * 12} ry="6" fill={c} opacity="0.85" />;
      })}
      <g className={live ? "rocky-waves" : undefined}>
        <path d="M0 300 C120 292 240 308 360 300 S600 292 720 300 S960 308 1000 300" stroke={WHITE} strokeWidth="3" fill="none" opacity="0.6" />
        <path d="M0 340 C140 332 280 348 420 340 S700 332 840 340 S1000 346 1000 346" stroke={WHITE} strokeWidth="2" fill="none" opacity="0.5" />
      </g>
      {[100, 520, 880].map((x) => (
        <ellipse key={x} cx={x} cy="388" rx="60" ry="14" fill="#a8896a" />
      ))}
    </>
  );
}

export const COLOMBIA_SCENES: Record<string, (p: SceneProps) => ReactElement> = {
  "scene-cocora": CocoraScene,
  "scene-cano-cristales": CanoCristalesScene,
};

// ---------------------------------------------------------------------------
// Food (40x40)
// ---------------------------------------------------------------------------
export const COLOMBIA_FOOD_ART: Record<string, ReactElement> = {
  "food-pandebono": (
    <>
      <circle cx="20" cy="22" r="13" fill="#f2c46d" />
      <circle cx="20" cy="22" r="13" fill="none" stroke="#c9902f" strokeWidth="1.5" />
      <ellipse cx="15" cy="16" rx="4" ry="2.4" fill="#fff6d8" opacity="0.7" />
      {[
        [24, 18],
        [14, 26],
        [26, 28],
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="1.6" fill="#d9a441" />
      ))}
    </>
  ),
  "food-oblea": (
    <>
      <circle cx="20" cy="22" r="15" fill="#f8ecd0" stroke="#d9c7a0" strokeWidth="1.5" />
      <circle cx="20" cy="22" r="11" fill="#b5651d" opacity="0.85" />
      {[0, 60, 120].map((a) => (
        <path key={a} d="M9 22 L31 22" stroke="#d9c7a0" strokeWidth="1" transform={`rotate(${a} 20 22)`} />
      ))}
      <circle cx="20" cy="22" r="3" fill="#e2445c" />
    </>
  ),
  "food-tinto": (
    <>
      <path d="M9 16 L29 16 L27 32 C26 35 12 35 11 32 Z" fill={WHITE} stroke="#cbd5e1" strokeWidth="1.5" />
      <ellipse cx="19" cy="17" rx="10" ry="2.5" fill="#3b2412" />
      <path d="M29 20 C35 20 35 28 28 28" stroke="#cbd5e1" strokeWidth="2" fill="none" />
      <ellipse cx="19" cy="35" rx="13" ry="2.5" fill="#e5e7eb" />
      <path d="M15 12 C13 9 17 7 15 4 M22 12 C20 9 24 7 22 4" stroke="#cbd5e1" strokeWidth="1.4" fill="none" className="rocky-smoke" />
    </>
  ),
};
