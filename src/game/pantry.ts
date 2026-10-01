// Rocky's pantry and play rules: the things that live in the agent's
// inventory (foods and soaps), the litter that builds up in his world, and
// what the mini-games pay.
//
// Foods are consumables: bought (or gifted) by the unit and eaten by
// dragging them onto Rocky. Soaps are tools: bought once, used for every
// bath. The basic treat is still earned by real work (check-ins and clean
// audits) — see treatsAvailable in pet.ts.
//
// The mini-games (keeping the ball in the air, picking up litter) pay a few
// coins and a little XP, capped per day so they stay a fun extra and never
// replace the documentation work that drives Rocky's growth.
//
// Pure module: shared by the frontend and the backend.

import type { CatalogOverrides, Collection } from "./closet";

export type Season = Collection;

export interface FoodItem {
  id: string;
  name: string;
  /** Coins per unit. */
  price: number;
  health: number;
  happiness: number;
  season?: Season;
  /** Emoji fallback used in compact lists (the world draws its own art). */
  emoji: string;
}

export interface SoapItem {
  id: string;
  name: string;
  price: number;
  /** Extra happiness on top of the bath's own. */
  happiness: number;
  /** Foam tint. */
  foam: string;
  season?: Season;
}

export const FOODS: FoodItem[] = [
  {
    id: "food-apple",
    name: "Crunchy apple",
    price: 6,
    health: 10,
    happiness: 4,
    emoji: "🍎",
  },
  {
    id: "food-carrot",
    name: "Carrot",
    price: 6,
    health: 12,
    happiness: 3,
    emoji: "🥕",
  },
  {
    id: "food-hay-cookie",
    name: "Hay cookie",
    price: 9,
    health: 8,
    happiness: 9,
    emoji: "🍪",
  },
  {
    id: "food-wrap",
    name: "Veggie wrap",
    price: 12,
    health: 18,
    happiness: 6,
    emoji: "🌯",
  },
  {
    id: "food-smoothie",
    name: "Green smoothie",
    price: 14,
    health: 20,
    happiness: 8,
    emoji: "🥤",
  },
  {
    id: "food-cake",
    name: "Party cake",
    price: 24,
    health: 6,
    happiness: 22,
    emoji: "🍰",
  },
  {
    id: "food-candy-corn",
    name: "Candy corn",
    price: 8,
    health: 3,
    happiness: 14,
    season: "spooky",
    emoji: "🍬",
  },
  {
    id: "food-caramel-apple",
    name: "Caramel apple",
    price: 12,
    health: 8,
    happiness: 14,
    season: "spooky",
    emoji: "🍏",
  },
  {
    id: "food-pumpkin-pie",
    name: "Pumpkin pie",
    price: 16,
    health: 12,
    happiness: 16,
    season: "spooky",
    emoji: "🥧",
  },
  {
    id: "food-gingerbread",
    name: "Gingerbread Rocky",
    price: 12,
    health: 6,
    happiness: 16,
    season: "holiday",
    emoji: "🍪",
  },
  {
    id: "food-cocoa",
    name: "Hot cocoa",
    price: 12,
    health: 10,
    happiness: 14,
    season: "holiday",
    emoji: "☕",
  },
  {
    id: "food-candy-cane",
    name: "Candy cane",
    price: 8,
    health: 3,
    happiness: 14,
    season: "holiday",
    emoji: "🍭",
  },
  {
    id: "food-ghost-cookie",
    name: "Ghost cookie",
    price: 8,
    health: 4,
    happiness: 12,
    season: "spooky",
    emoji: "👻",
  },
  {
    id: "food-witch-brew",
    name: "Witch's brew",
    price: 12,
    health: 8,
    happiness: 14,
    season: "spooky",
    emoji: "🧪",
  },
  {
    id: "food-bunuelos",
    name: "Buñuelos",
    price: 10,
    health: 10,
    happiness: 14,
    season: "holiday",
    emoji: "🟤",
  },
  {
    id: "food-natilla",
    name: "Natilla",
    price: 10,
    health: 8,
    happiness: 14,
    season: "holiday",
    emoji: "🍮",
  },
  {
    id: "food-tamal",
    name: "Tamal",
    price: 14,
    health: 16,
    happiness: 12,
    season: "holiday",
    emoji: "🫔",
  },
  {
    id: "food-panettone",
    name: "Panettone",
    price: 14,
    health: 10,
    happiness: 16,
    season: "holiday",
    emoji: "🍞",
  },
  {
    id: "food-arepa-huevo",
    name: "Arepa de huevo",
    price: 10,
    health: 14,
    happiness: 12,
    emoji: "🫓",
  },
  { id: "food-empanada", name: "Empanada", price: 8, health: 12, happiness: 10, emoji: "🥟" },
  { id: "food-mango", name: "Sweet mango", price: 7, health: 12, happiness: 8, emoji: "🥭" },
  { id: "food-lulo-juice", name: "Lulo juice", price: 9, health: 10, happiness: 12, emoji: "🧃" },
  { id: "food-pandebono", name: "Pandebono", price: 8, health: 10, happiness: 12, emoji: "🥯" },
  { id: "food-oblea", name: "Oblea con arequipe", price: 9, health: 8, happiness: 15, emoji: "🧇" },
  { id: "food-tinto", name: "Tinto", price: 6, health: 6, happiness: 12, emoji: "☕" },
];

/** Colombian foods (also listed in the shop's 🇨🇴 Colombia section). */
export const COLOMBIA_FOODS: readonly string[] = [
  "food-arepa-huevo",
  "food-empanada",
  "food-mango",
  "food-lulo-juice",
  "food-pandebono",
  "food-oblea",
  "food-tinto",
];

/** The treat earned by check-ins and clean audits (not bought here). */
export const BASIC_TREAT = {
  id: "treat",
  name: "Rocky treat",
  emoji: "🍎",
} as const;

export const SOAPS: SoapItem[] = [
  {
    id: "soap-basic",
    name: "RLX soap bar",
    price: 0,
    happiness: 0,
    foam: "#ffffff",
  },
  {
    id: "soap-bubble",
    name: "Bubble-gum soap",
    price: 40,
    happiness: 4,
    foam: "#ffc6e0",
  },
  {
    id: "soap-lavender",
    name: "Lavender soap",
    price: 60,
    happiness: 6,
    foam: "#d9c8ff",
  },
  {
    id: "soap-pumpkin",
    name: "Pumpkin spice soap",
    price: 50,
    happiness: 6,
    foam: "#ffd29a",
    season: "spooky",
  },
  {
    id: "soap-peppermint",
    name: "Peppermint soap",
    price: 50,
    happiness: 6,
    foam: "#d5fbe6",
    season: "holiday",
  },
  {
    id: "soap-cauldron",
    name: "Cauldron slime soap",
    price: 50,
    happiness: 6,
    foam: "#c9f2a6",
    season: "spooky",
  },
  {
    id: "soap-snow",
    name: "Fresh snow soap",
    price: 50,
    happiness: 6,
    foam: "#eef7ff",
    season: "holiday",
  },
  { id: "soap-midnight", name: "Midnight berry soap", price: 50, happiness: 6, foam: "#c4b5fd", season: "spooky" },
  { id: "soap-coconut", name: "Coconut soap", price: 45, happiness: 5, foam: "#fbf6ec" },
  { id: "soap-ocean", name: "Ocean breeze soap", price: 55, happiness: 6, foam: "#cdeefd" },
  { id: "soap-honey", name: "Honey oat soap", price: 55, happiness: 6, foam: "#fde9a8" },
];

export const STARTER_SOAP = "soap-basic";

export function findFood(id: string | null | undefined): FoodItem | undefined {
  return id ? FOODS.find((f) => f.id === id) : undefined;
}

export function findSoap(id: string | null | undefined): SoapItem | undefined {
  return id ? SOAPS.find((s) => s.id === id) : undefined;
}

// ---------------------------------------------------------------------------
// Litter: a piece shows up every few hours (up to a handful); the agent
// drags it to the bin for a small, random reward.
// ---------------------------------------------------------------------------
export const LITTER = {
  everyHours: 3,
  max: 4,
  kinds: ["can", "paper", "banana", "bottle", "box", "wrapper"] as const,
} as const;

export type LitterKind = (typeof LITTER.kinds)[number];

export interface LitterPiece {
  id: string;
  kind: LitterKind;
  /** Horizontal position, % of the stage width. */
  x: number;
}

/** A small deterministic hash so browser and server agree on every roll. */
export function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function litterPiece(serial: number, seed: string): LitterPiece {
  const h = hash(`${seed}:${serial}`);
  return {
    id: `l${serial}`,
    kind: LITTER.kinds[h % LITTER.kinds.length]!,
    x: 8 + (Math.floor(h / 7) % 84),
  };
}

/** What picking up one piece pays: always a few coins, sometimes a little XP. */
export function litterReward(
  pieceId: string,
  seed: string,
): { coins: number; xp: number } {
  const h = hash(`reward:${seed}:${pieceId}`);
  const coins = 1 + (h % 5);
  const xp = (h >>> 8) % 100 < 35 ? 1 + ((h >>> 16) % 3) : 0;
  return { coins, xp };
}

// ---------------------------------------------------------------------------
// Keep-it-up: consecutive taps without the ball touching the ground.
// ---------------------------------------------------------------------------
/** Longest streak we believe from a client (anything above is clamped). */
export const KEEPY_MAX_STREAK = 80;

export function keepyReward(streak: number): { coins: number; xp: number } {
  const s = Math.max(0, Math.min(KEEPY_MAX_STREAK, Math.floor(streak)));
  if (s < 3) return { coins: 0, xp: 0 };
  return {
    coins: Math.floor(s / 3) + (s >= 10 ? 3 : 0) + (s >= 20 ? 5 : 0),
    xp: s >= 5 ? 1 + Math.floor(s / 10) : 0,
  };
}

/** Daily caps across all mini-games (keep-it-up + litter). */
export const GAME_CAPS = { coins: 60, xp: 12 } as const;

// ---------------------------------------------------------------------------
// Arcade: quick mini-games that pay coins only (no XP), with their own daily
// cap. The browser reports the score; the server clamps it and pays.
// ---------------------------------------------------------------------------
export type ArcadeGame =
  | "catch"
  | "typo"
  | "memory"
  | "run"
  | "whack"
  | "bubbles"
  | "simon"
  | "stack"
  | "sort"
  | "slide"
  | "hoop"
  | "crush";
export const ARCADE_GAMES: readonly ArcadeGame[] = [
  "catch",
  "typo",
  "memory",
  "run",
  "whack",
  "bubbles",
  "simon",
  "stack",
  "sort",
  "slide",
  "hoop",
  "crush",
];

/** Highest score each game can reach in one round (anything above is clamped). */
export const ARCADE_MAX_SCORE: Record<ArcadeGame, number> = {
  catch: 80,
  typo: 24,
  memory: 3,
  run: 60,
  whack: 60,
  bubbles: 80,
  simon: 20,
  stack: 40,
  sort: 60,
  slide: 3,
  hoop: 40,
  crush: 200,
};
export const ARCADE_CAP = { coins: 50 } as const;

/** Coins for one round — 10 max, whatever the game. */
export function arcadeReward(game: ArcadeGame, score: number): number {
  const s = Math.max(0, Math.min(ARCADE_MAX_SCORE[game], Math.floor(score)));
  switch (game) {
    case "catch":
    case "run":
    case "whack":
    case "sort":
      return Math.min(10, Math.floor(s / 3));
    case "typo":
    case "simon":
      return Math.min(10, s);
    case "bubbles":
      return Math.min(10, Math.floor(s / 4));
    case "crush":
      return Math.min(10, Math.floor(s / 15));
    case "stack":
    case "hoop":
      return Math.min(10, Math.floor(s / 2));
    case "memory":
    case "slide":
      return [0, 4, 7, 10][s] ?? 0;
  }
}

// ---------------------------------------------------------------------------
// Which games are switched on. Admins toggle each one (Admin → Minijuegos);
// the switch lives in the catalogue overrides as "game:<id>".
// ---------------------------------------------------------------------------
export type MiniGame = ArcadeGame | "notes";

export const MINI_GAMES: { id: MiniGame; name: string; kind: string; defaultOn: boolean }[] = [
  { id: "catch", name: "Treat Catch", kind: "Reflejos", defaultOn: true },
  { id: "run", name: "Rocky Run", kind: "Saltar obstáculos", defaultOn: true },
  { id: "whack", name: "Mud Splat", kind: "Reflejos", defaultOn: true },
  { id: "bubbles", name: "Bubble Pop", kind: "Reflejos", defaultOn: true },
  { id: "stack", name: "Box Stack", kind: "Precisión", defaultOn: true },
  { id: "simon", name: "Rocky Says", kind: "Memoria", defaultOn: true },
  { id: "memory", name: "Memory Match", kind: "Memoria", defaultOn: true },
  { id: "sort", name: "Package Sort", kind: "Clasificar rápido", defaultOn: true },
  { id: "slide", name: "Slide Puzzle", kind: "Puzzle", defaultOn: true },
  { id: "hoop", name: "Hoop Shot", kind: "Timing", defaultOn: true },
  { id: "crush", name: "Rocky Crush", kind: "Combinar 3 (tipo Candy Crush)", defaultOn: true },
  // Spelling and the notes quiz felt like homework to the testers: off by default.
  { id: "typo", name: "Typo Hunt", kind: "Ortografía", defaultOn: false },
  { id: "notes", name: "Note Check (quiz diario)", kind: "Quiz de notas", defaultOn: true },
];

export const gameKey = (id: MiniGame) => `game:${id}`;

export function gameEnabled(overrides: CatalogOverrides | undefined, id: MiniGame): boolean {
  const o = overrides?.[gameKey(id)];
  if (o && typeof o.enabled === "boolean") return o.enabled;
  return MINI_GAMES.find((g) => g.id === id)?.defaultOn ?? false;
}
