import type { ReactElement } from "react";
import { EXTRA_FOOD_ART } from "./extraArt";

// Small drawings (viewBox 0 0 40 40) for inventory items and the litter in
// Rocky's world. Kept apart from art.tsx, which holds the big scene pieces.

const NAVY = "#0f2341";
const GREEN = "#009a4e";

export const FOOD_ART: Record<string, ReactElement> = {
  treat: (
    <>
      <path
        d="M20 12c-4-3-12-2-12 7 0 8 6 15 9 15 1.5 0 2-1 3-1s1.5 1 3 1c3 0 9-7 9-15 0-9-8-10-12-7z"
        fill="#e2445c"
      />
      <path
        d="M20 12c0-3 1.5-5 4-6"
        stroke="#6b4423"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
      <path d="M22 8c3-3 7-2 8 0-3 2-6 2-8 0z" fill={GREEN} />
      <ellipse cx="14" cy="18" rx="2.5" ry="4" fill="#fff" opacity="0.35" />
    </>
  ),
  "food-apple": (
    <>
      <path
        d="M20 12c-4-3-12-2-12 7 0 8 6 15 9 15 1.5 0 2-1 3-1s1.5 1 3 1c3 0 9-7 9-15 0-9-8-10-12-7z"
        fill="#e2445c"
      />
      <path
        d="M20 12c0-3 1.5-5 4-6"
        stroke="#6b4423"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
      <path d="M22 8c3-3 7-2 8 0-3 2-6 2-8 0z" fill={GREEN} />
      <ellipse cx="14" cy="18" rx="2.5" ry="4" fill="#fff" opacity="0.35" />
    </>
  ),
  "food-carrot": (
    <>
      <path
        d="M12 12 L30 30 C31 31 30 33 28 32 L10 16 C8 14 10 10 12 12 Z"
        fill="#f28c28"
      />
      <path
        d="M16 18l3-2M20 22l3-2M24 26l2-2"
        stroke="#d06a10"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M11 13 C6 10 5 6 7 4 C9 7 10 9 12 11 M11 13 C8 7 11 4 13 5 C13 8 13 10 12 12"
        fill={GREEN}
        stroke={GREEN}
        strokeWidth="1.5"
      />
    </>
  ),
  "food-hay-cookie": (
    <>
      <circle cx="20" cy="21" r="13" fill="#d9a55b" />
      <circle
        cx="20"
        cy="21"
        r="13"
        fill="none"
        stroke="#b8833c"
        strokeWidth="2"
      />
      <path
        d="M12 18l6 2M22 14l3 5M15 26l5-1M24 24l4 2"
        stroke="#e8c16a"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <circle cx="17" cy="23" r="1.6" fill="#6b4423" />
      <circle cx="25" cy="18" r="1.6" fill="#6b4423" />
    </>
  ),
  "food-wrap": (
    <>
      <path d="M8 26 C8 14 32 10 33 22 C34 30 10 36 8 26 Z" fill="#f3dfb3" />
      <path d="M26 12 C30 10 34 14 33 18 C30 16 27 16 26 12 Z" fill="#5cb85c" />
      <path
        d="M29 14 C32 13 34 16 33 19"
        stroke="#e2445c"
        strokeWidth="2"
        fill="none"
      />
      <path
        d="M12 26 C18 22 24 20 30 20"
        stroke="#e1c78e"
        strokeWidth="1.6"
        fill="none"
      />
    </>
  ),
  "food-smoothie": (
    <>
      <path d="M11 12 L29 12 L26 35 L14 35 Z" fill="#7fd08a" />
      <path d="M11 12 L29 12 L28.4 16 L11.6 16 Z" fill="#b8f0c0" />
      <rect
        x="21"
        y="3"
        width="3"
        height="14"
        rx="1.5"
        fill="#e2445c"
        transform="rotate(12 22 10)"
      />
      <circle cx="16" cy="24" r="1.3" fill="#fff" opacity="0.6" />
      <circle cx="22" cy="28" r="1" fill="#fff" opacity="0.6" />
    </>
  ),
  "food-cake": (
    <>
      <path d="M8 22 L32 22 L32 34 L8 34 Z" fill="#f7c6d9" />
      <path
        d="M8 22 L32 22 L32 26 C28 28 26 24 22 27 C18 24 14 28 8 26 Z"
        fill="#fff"
      />
      <rect x="8" y="30" width="24" height="4" fill="#e89bb8" />
      <rect x="19" y="12" width="2.5" height="10" fill={GREEN} />
      <path
        d="M20.2 6 C22.5 9 22 11 20.2 12 C18.5 11 18 9 20.2 6 Z"
        fill="#f5b82e"
      />
    </>
  ),
  "food-candy-corn": (
    <>
      <path d="M20 5 L32 33 C24 37 16 37 8 33 Z" fill="#fff4dc" />
      <path d="M12.4 23 L27.6 23 L32 33 C24 37 16 37 8 33 Z" fill="#f59a23" />
      <path d="M9.6 30 L30.4 30 L32 33 C24 37 16 37 8 33 Z" fill="#f5c518" />
    </>
  ),
  "food-caramel-apple": (
    <>
      <circle cx="20" cy="25" r="11" fill="#9fd36a" />
      <path
        d="M9 24 C9 16 31 16 31 24 C29 29 27 25 25 30 C23 25 21 30 19 26 C17 30 15 25 13 29 C11 25 10 28 9 24 Z"
        fill="#c07a2c"
      />
      <rect x="18.8" y="3" width="2.4" height="16" rx="1" fill="#e8d2a6" />
    </>
  ),
  "food-pumpkin-pie": (
    <>
      <path d="M5 26 L35 26 L20 8 Z" fill="#e0822c" />
      <path d="M5 26 L35 26 L33 31 L7 31 Z" fill="#d9a55b" />
      <path d="M20 8 L35 26" stroke="#c9913f" strokeWidth="2.5" />
      <ellipse cx="19" cy="17" rx="4" ry="2.5" fill="#fff" />
    </>
  ),
  "food-gingerbread": (
    <>
      <circle cx="20" cy="10" r="6" fill="#b86b32" />
      <path
        d="M12 16 L28 16 L32 22 L27 23 L27 34 L22 34 L20 28 L18 34 L13 34 L13 23 L8 22 Z"
        fill="#b86b32"
      />
      <path d="M13 34 L18 34 M22 34 L27 34" stroke="#fff" strokeWidth="1.4" />
      <circle cx="18" cy="9" r="1" fill="#fff" />
      <circle cx="22" cy="9" r="1" fill="#fff" />
      <circle cx="20" cy="20" r="1.3" fill="#e2445c" />
      <circle cx="20" cy="25" r="1.3" fill={GREEN} />
    </>
  ),
  "food-cocoa": (
    <>
      <path d="M8 14 L28 14 L26 34 L10 34 Z" fill="#c9463d" />
      <path
        d="M28 18 C35 18 35 28 27 28"
        stroke="#c9463d"
        strokeWidth="3"
        fill="none"
      />
      <ellipse cx="18" cy="14" rx="10" ry="3" fill="#6b3b1e" />
      <circle cx="14" cy="12" r="3" fill="#fff" />
      <circle cx="20" cy="11" r="3" fill="#fff" />
      <path
        d="M14 6 C16 4 14 2 16 0 M20 6 C22 4 20 2 22 0"
        stroke="#cfd8e3"
        strokeWidth="1.4"
        fill="none"
      />
      <path
        d="M10 24 L26 24"
        stroke="#fff"
        strokeWidth="2"
        strokeDasharray="3 3"
      />
    </>
  ),
  "food-candy-cane": (
    <>
      <path
        d="M24 36 L24 14 C24 6 12 6 12 14"
        stroke="#fff"
        strokeWidth="6"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M24 36 L24 14 C24 6 12 6 12 14"
        stroke="#e2445c"
        strokeWidth="6"
        fill="none"
        strokeLinecap="round"
        strokeDasharray="3.5 3.5"
      />
    </>
  ),
  ...EXTRA_FOOD_ART,
};

/** A soap bar in its own colour, with a little shine. */
function soapBar(color: string, stripe: string): ReactElement {
  return (
    <>
      <circle
        cx="30"
        cy="9"
        r="4"
        fill="#fff"
        stroke="#bcd9ef"
        strokeWidth="1"
        opacity="0.9"
      />
      <circle
        cx="34"
        cy="16"
        r="2.4"
        fill="#fff"
        stroke="#bcd9ef"
        strokeWidth="1"
        opacity="0.9"
      />
      <rect x="5" y="15" width="28" height="18" rx="7" fill={color} />
      <rect
        x="5"
        y="15"
        width="28"
        height="18"
        rx="7"
        fill="none"
        stroke={stripe}
        strokeWidth="1.5"
      />
      <rect
        x="10"
        y="19"
        width="12"
        height="3"
        rx="1.5"
        fill="#fff"
        opacity="0.6"
      />
    </>
  );
}

export const SOAP_ART: Record<string, ReactElement> = {
  "soap-basic": (
    <>
      {soapBar("#e8f4fb", "#9fc6e8")}
      <text
        x="12"
        y="30"
        fontFamily="Poppins, sans-serif"
        fontWeight="800"
        fontSize="7"
        fill={NAVY}
      >
        RLX
      </text>
    </>
  ),
  "soap-bubble": soapBar("#ffc6e0", "#f08bb5"),
  "soap-lavender": soapBar("#d9c8ff", "#a58be8"),
  "soap-pumpkin": soapBar("#ffc27a", "#e0822c"),
  "soap-cauldron": soapBar("#c9f2a6", "#6fbf3c"),
  "soap-snow": soapBar("#eef7ff", "#9fc6e8"),
  "soap-peppermint": (
    <>
      {soapBar("#ffffff", "#e2445c")}
      <path
        d="M9 31 L15 17 M16 31 L22 17 M23 31 L29 17"
        stroke="#e2445c"
        strokeWidth="2"
        opacity="0.7"
      />
    </>
  ),
};

export const LITTER_ART: Record<string, ReactElement> = {
  can: (
    <>
      <ellipse cx="20" cy="34" rx="12" ry="2.5" fill="#000" opacity="0.12" />
      <g transform="rotate(-70 20 26)">
        <rect x="13" y="14" width="14" height="22" rx="3" fill="#c9463d" />
        <rect x="13" y="20" width="14" height="6" fill="#fff" />
        <ellipse cx="20" cy="14" rx="7" ry="2" fill="#cfd8e3" />
      </g>
    </>
  ),
  paper: (
    <>
      <ellipse cx="20" cy="34" rx="11" ry="2.5" fill="#000" opacity="0.12" />
      <path
        d="M10 30 L12 18 L18 14 L26 17 L30 24 L27 32 L17 34 Z"
        fill="#f4f4f0"
        stroke="#cfd2cc"
        strokeWidth="1.2"
      />
      <path
        d="M14 22 L22 26 M18 17 L20 30 M25 20 L16 30"
        stroke="#d6d9d2"
        strokeWidth="1.2"
      />
    </>
  ),
  banana: (
    <>
      <ellipse cx="20" cy="34" rx="12" ry="2.5" fill="#000" opacity="0.12" />
      <path
        d="M8 30 C14 34 26 34 32 26 C28 28 24 29 20 28 C15 27 11 25 8 30 Z"
        fill="#f5d547"
      />
      <path
        d="M20 28 C18 22 14 20 12 22 M20 28 C24 22 28 22 30 24"
        stroke="#e0b52b"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M31 25 L34 23"
        stroke="#6b4423"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </>
  ),
  bottle: (
    <>
      <ellipse cx="20" cy="34" rx="13" ry="2.5" fill="#000" opacity="0.12" />
      <g transform="rotate(80 20 26)">
        <path d="M15 14 L25 14 L25 36 L15 36 Z" fill="#8fd3f4" opacity="0.85" />
        <rect x="17" y="8" width="6" height="6" fill="#8fd3f4" opacity="0.85" />
        <rect x="16.5" y="5" width="7" height="3.5" rx="1" fill="#1f6fb2" />
        <rect x="15" y="20" width="10" height="6" fill="#fff" opacity="0.8" />
      </g>
    </>
  ),
  box: (
    <>
      <ellipse cx="20" cy="35" rx="13" ry="2.5" fill="#000" opacity="0.12" />
      <path d="M8 20 L20 16 L32 20 L32 33 L20 36 L8 33 Z" fill="#c99a63" />
      <path
        d="M20 16 L20 36 M8 20 L20 24 L32 20"
        stroke="#a7784a"
        strokeWidth="1.3"
        fill="none"
      />
      <path d="M8 20 L3 15 L15 12 L20 16 Z" fill="#d6a86f" />
    </>
  ),
  wrapper: (
    <>
      <ellipse cx="20" cy="33" rx="11" ry="2.5" fill="#000" opacity="0.12" />
      <path d="M12 24 L28 24 L28 31 L12 31 Z" fill="#7a4fd1" />
      <path
        d="M12 24 L6 21 L7 27 L6 33 L12 31 Z M28 24 L34 21 L33 27 L34 33 L28 31 Z"
        fill="#a58be8"
      />
      <path d="M15 27 L25 27" stroke="#f5b82e" strokeWidth="2" />
    </>
  ),
};

/** The recycling bin litter goes into (viewBox 0 0 60 80). */
export function BinArt({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 60 80" aria-hidden="true">
      <ellipse cx="30" cy="77" rx="24" ry="3" fill="#000" opacity="0.12" />
      <path d="M8 24 L52 24 L47 76 L13 76 Z" fill={GREEN} />
      <path
        d="M16 32 L18 70 M30 32 L30 70 M44 32 L42 70"
        stroke="#00783c"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M25 46 l5 -8 l5 8 M33 38 l-3 1 M23 50 l-4 7 h9 M41 50 l4 7 h-9"
        stroke="#fff"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        opacity="0.9"
      />
      <g
        style={{
          transformOrigin: "8px 24px",
          transform: open ? "rotate(-28deg)" : "none",
          transition: "transform 0.2s ease",
        }}
      >
        <rect x="4" y="17" width="52" height="8" rx="3" fill={NAVY} />
        <rect x="23" y="12" width="14" height="6" rx="3" fill={NAVY} />
      </g>
    </svg>
  );
}
