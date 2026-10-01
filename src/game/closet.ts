// Rocky's shop catalogue: cosmetic items for his look and his world. Each
// item is first unlocked by REAL documentation progress (level, streaks,
// badges) and then bought with Coins, which are also earned only by real
// work (see economy.ts). Nothing here grants or spends XP, Energy or
// Streak, so dressing Rocky up is a reward for the habit, never a shortcut
// around it.
//
// Pure module: shared by the frontend and the backend (which is the source
// of truth in remote mode). No storage, no browser APIs.
import type { EvolutionStage } from "../types/domain";

export type ItemSlot =
  | "hat"
  | "glasses"
  | "neck"
  | "back"
  | "body"
  | "aura"
  | "bubble"
  | "scene"
  | "decor"
  | "fx";

/**
 * Limited collections (seasonal specials and themed packs). They are
 * exclusive: closed by default, and an admin opens each one (optionally
 * for a date window). Items bought while open stay the agent's for good.
 */
export type Collection = "spooky" | "holiday";

export const COLLECTIONS: {
  id: Collection;
  name: string;
  emoji: string;
  blurb: string;
}[] = [
  {
    id: "spooky",
    name: "Spooky season",
    emoji: "🎃",
    blurb: "Halloween looks, backgrounds, items, effects and treats.",
  },
  {
    id: "holiday",
    name: "Holidays",
    emoji: "🎄",
    blurb: "Christmas and year-end looks, backgrounds, items and effects.",
  },
];

/** The override key holding a collection's open/closed state. */
export const collectionKey = (c: Collection) => `collection:${c}`;

export interface ProgressFacts {
  level: number;
  stage: EvolutionStage;
  bestStreak: number;
  checkIns: number;
  qaPasses: number;
  badgeIds: string[];
}

export interface ClosetItem {
  id: string;
  slot: ItemSlot;
  name: string;
  /** Plain-language unlock rule shown on locked items. */
  requirement: string;
  isUnlocked: (p: ProgressFacts) => boolean;
  /** Coins to buy it once unlocked; 0 = free starter item. */
  price: number;
  /** False when an admin has taken the item out of the shop (owned copies still work). */
  enabled?: boolean;
  /** Limited collection this item belongs to (see COLLECTIONS): buyable only while an admin has it open. */
  season?: Collection;
  /** Rocky admins only: never sold; the server grants it to admins and strips it from everyone else. */
  staff?: true;
  /** Never sold: only an admin can gift it (e.g. the testers' wings); hidden from everyone who doesn't hold it. */
  gift?: true;
}

/** Admin edits to the shop, per item id (see backend /api/admin/catalog). */
export type CatalogOverrides = Record<string, CatalogOverride>;

export interface CatalogOverride {
  price?: number;
  enabled?: boolean;
  /** Collections only: open from / until these days (YYYY-MM-DD, inclusive). */
  from?: string;
  until?: string;
}

/** Whether a limited collection is open on `now` (admin switched it on, and today is inside its window). */
export function collectionOpen(
  overrides: CatalogOverrides | undefined,
  c: Collection,
  now: Date = new Date(),
): boolean {
  const o = overrides?.[collectionKey(c)];
  if (!o?.enabled) return false;
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  if (o.from && today < o.from) return false;
  if (o.until && today > o.until) return false;
  return true;
}

const STAGE_RANK: Record<EvolutionStage, number> = {
  Baby: 0,
  Young: 1,
  Advanced: 2,
  Elite: 3,
};
const always = () => true;

type UnlockRule = "level" | "checkIns" | "qa" | "streak" | "badges";
/** The plain-language requirement and its check, for the compact item lists. */
function unlockRule(rule: UnlockRule, n: number): Pick<ClosetItem, "requirement" | "isUnlocked"> {
  switch (rule) {
    case "level":
      return { requirement: `Reach level ${n}`, isUnlocked: (p) => p.level >= n };
    case "checkIns":
      return { requirement: n === 1 ? "Log your first check-in" : `Log ${n} check-ins`, isUnlocked: (p) => p.checkIns >= n };
    case "qa":
      return { requirement: n === 1 ? "Pass your first QA audit" : `Pass ${n} QA audits`, isUnlocked: (p) => p.qaPasses >= n };
    case "streak":
      return { requirement: `Hit a ${n}-day streak`, isUnlocked: (p) => p.bestStreak >= n };
    case "badges":
      return { requirement: n === 1 ? "Collect any badge" : `Collect ${n} badges`, isUnlocked: (p) => p.badgeIds.length >= n };
  }
}

export const CLOSET: ClosetItem[] = [
  // Hats — sit on Rocky's head via the measured head anchors.
  {
    id: "hat-rlx-cap",
    slot: "hat",
    name: "RLX cap",
    requirement: "Starter item",
    isUnlocked: always,
    price: 0,
  },
  {
    id: "hat-headset",
    slot: "hat",
    name: "Agent headset",
    requirement: "Earn the First Step badge",
    isUnlocked: (p) => p.badgeIds.includes("first_step"),
    price: 60,
  },
  {
    id: "hat-party",
    slot: "hat",
    name: "Party hat",
    requirement: "Pass your first QA audit",
    isUnlocked: (p) => p.qaPasses >= 1,
    price: 80,
  },
  {
    id: "hat-beanie",
    slot: "hat",
    name: "Green beanie",
    requirement: "Hit a 3-day streak",
    isUnlocked: (p) => p.bestStreak >= 3,
    price: 100,
  },
  {
    id: "hat-hardhat",
    slot: "hat",
    name: "Safety hard hat",
    requirement: "Reach level 3",
    isUnlocked: (p) => p.level >= 3,
    price: 120,
  },
  {
    id: "hat-vueltiao",
    slot: "hat",
    name: "Sombrero vueltiao",
    requirement: "Log 5 check-ins",
    isUnlocked: (p) => p.checkIns >= 5,
    price: 140,
  },
  {
    id: "hat-driver",
    slot: "hat",
    name: "Extra Miler cap",
    requirement: "Evolve into Young Rocky",
    isUnlocked: (p) => STAGE_RANK[p.stage] >= 1,
    price: 150,
  },
  {
    id: "hat-chef",
    slot: "hat",
    name: "Chef hat",
    requirement: "Pass 3 QA audits",
    isUnlocked: (p) => p.qaPasses >= 3,
    price: 150,
  },
  {
    id: "hat-cowboy",
    slot: "hat",
    name: "Rodeo hat",
    requirement: "Reach level 4",
    isUnlocked: (p) => p.level >= 4,
    price: 160,
  },
  {
    id: "hat-grad",
    slot: "hat",
    name: "Graduation cap",
    requirement: "Log 10 check-ins",
    isUnlocked: (p) => p.checkIns >= 10,
    price: 180,
  },
  {
    id: "hat-flowers",
    slot: "hat",
    name: "Flower crown",
    requirement: "Reach level 6",
    isUnlocked: (p) => p.level >= 6,
    price: 180,
  },
  {
    id: "hat-santa",
    slot: "hat",
    name: "Holiday hat",
    requirement: "Hit a 14-day streak",
    isUnlocked: (p) => p.bestStreak >= 14,
    price: 200,
  },
  {
    id: "hat-wizard",
    slot: "hat",
    name: "Wizard hat",
    requirement: "Collect 3 badges",
    isUnlocked: (p) => p.badgeIds.length >= 3,
    price: 220,
  },
  {
    id: "hat-crown",
    slot: "hat",
    name: "Elite crown",
    requirement: "Evolve into Elite Rocky",
    isUnlocked: (p) => STAGE_RANK[p.stage] >= 3,
    price: 400,
  },

  // Glasses — on the measured eyes, moving with the head.
  {
    id: "glasses-round",
    slot: "glasses",
    name: "Round specs",
    requirement: "Log 2 check-ins",
    isUnlocked: (p) => p.checkIns >= 2,
    price: 50,
  },
  {
    id: "glasses-sun",
    slot: "glasses",
    name: "Sunglasses",
    requirement: "Reach level 2",
    isUnlocked: (p) => p.level >= 2,
    price: 80,
  },
  {
    id: "glasses-3d",
    slot: "glasses",
    name: "Retro 3D glasses",
    requirement: "Pass 2 QA audits",
    isUnlocked: (p) => p.qaPasses >= 2,
    price: 120,
  },
  {
    id: "glasses-star",
    slot: "glasses",
    name: "Star shades",
    requirement: "Hit a 3-day streak",
    isUnlocked: (p) => p.bestStreak >= 3,
    price: 140,
  },
  {
    id: "glasses-heart",
    slot: "glasses",
    name: "Heart glasses",
    requirement: "Collect 2 badges",
    isUnlocked: (p) => p.badgeIds.length >= 2,
    price: 160,
  },

  // Neck — clothes and accessories worn at the collar.
  {
    id: "neck-lanyard",
    slot: "neck",
    name: "RLX ID badge",
    requirement: "Starter item",
    isUnlocked: always,
    price: 0,
  },
  {
    id: "neck-bowtie",
    slot: "neck",
    name: "Green bow tie",
    requirement: "Log your first check-in",
    isUnlocked: (p) => p.checkIns >= 1,
    price: 40,
  },
  {
    id: "neck-bandana",
    slot: "neck",
    name: "Navy bandana",
    requirement: "Log 4 check-ins",
    isUnlocked: (p) => p.checkIns >= 4,
    price: 90,
  },
  {
    id: "neck-scarf",
    slot: "neck",
    name: "Winter scarf",
    requirement: "Reach level 3",
    isUnlocked: (p) => p.level >= 3,
    price: 100,
  },
  {
    id: "neck-tie",
    slot: "neck",
    name: "Office tie",
    requirement: "Reach level 4",
    isUnlocked: (p) => p.level >= 4,
    price: 130,
  },
  {
    id: "neck-medal",
    slot: "neck",
    name: "Gold medal",
    requirement: "Hit a 7-day streak",
    isUnlocked: (p) => p.bestStreak >= 7,
    price: 200,
  },

  // Back — worn behind Rocky.
  {
    id: "back-backpack",
    slot: "back",
    name: "Delivery backpack",
    requirement: "Log 8 check-ins",
    isUnlocked: (p) => p.checkIns >= 8,
    price: 120,
  },
  {
    id: "back-cape",
    slot: "back",
    name: "Hero cape",
    requirement: "Evolve into Young Rocky",
    isUnlocked: (p) => STAGE_RANK[p.stage] >= 1,
    price: 180,
  },
  {
    id: "back-wings",
    slot: "back",
    name: "Angel wings",
    requirement: "Collect 3 badges",
    isUnlocked: (p) => p.badgeIds.length >= 3,
    price: 250,
  },

  // Scenes — where Rocky hangs out.
  {
    id: "scene-route",
    slot: "scene",
    name: "Delivery route",
    requirement: "Starter scene",
    isUnlocked: always,
    price: 0,
  },
  {
    id: "scene-sunset",
    slot: "scene",
    name: "Sunset route",
    requirement: "Log 3 check-ins",
    isUnlocked: (p) => p.checkIns >= 3,
    price: 120,
  },
  {
    id: "scene-warehouse",
    slot: "scene",
    name: "Warehouse",
    requirement: "Reach level 2",
    isUnlocked: (p) => p.level >= 2,
    price: 150,
  },
  {
    id: "scene-office",
    slot: "scene",
    name: "RLX office",
    requirement: "Reach level 4",
    isUnlocked: (p) => p.level >= 4,
    price: 250,
  },
  {
    id: "scene-ballpark",
    slot: "scene",
    name: "Ballpark",
    requirement: "Hit a 7-day streak",
    isUnlocked: (p) => p.bestStreak >= 7,
    price: 300,
  },
  {
    id: "scene-night",
    slot: "scene",
    name: "Night route",
    requirement: "Evolve into Advanced Rocky",
    isUnlocked: (p) => STAGE_RANK[p.stage] >= 2,
    price: 350,
  },
  {
    id: "scene-beach",
    slot: "scene",
    name: "Caribbean beach",
    requirement: "Hit a 14-day streak",
    isUnlocked: (p) => p.bestStreak >= 14,
    price: 380,
  },

  // Decor — props placed around Rocky.
  {
    id: "decor-boxes",
    slot: "decor",
    name: "Package stack",
    requirement: "Starter item",
    isUnlocked: always,
    price: 0,
  },
  {
    id: "decor-bowl",
    slot: "decor",
    name: "Snack bowl",
    requirement: "Starter item",
    isUnlocked: always,
    price: 0,
  },
  {
    id: "decor-hay",
    slot: "decor",
    name: "Hay bale",
    requirement: "Log your first check-in",
    isUnlocked: (p) => p.checkIns >= 1,
    price: 30,
  },
  {
    id: "decor-plant",
    slot: "decor",
    name: "Potted plant",
    requirement: "Reach level 2",
    isUnlocked: (p) => p.level >= 2,
    price: 50,
  },
  {
    id: "decor-balloons",
    slot: "decor",
    name: "RLX balloons",
    requirement: "Pass your first QA audit",
    isUnlocked: (p) => p.qaPasses >= 1,
    price: 60,
  },
  {
    id: "decor-lamp",
    slot: "decor",
    name: "Street lamp",
    requirement: "Log 5 check-ins",
    isUnlocked: (p) => p.checkIns >= 5,
    price: 70,
  },
  {
    id: "decor-trophy",
    slot: "decor",
    name: "Trophy",
    requirement: "Collect any badge",
    isUnlocked: (p) => p.badgeIds.length >= 1,
    price: 80,
  },
  {
    id: "decor-bench",
    slot: "decor",
    name: "Park bench",
    requirement: "Reach level 3",
    isUnlocked: (p) => p.level >= 3,
    price: 90,
  },
  {
    id: "decor-pennant",
    slot: "decor",
    name: "RLX pennant",
    requirement: "Evolve into Young Rocky",
    isUnlocked: (p) => STAGE_RANK[p.stage] >= 1,
    price: 120,
  },
  {
    id: "decor-mailbox",
    slot: "decor",
    name: "RLX mailbox",
    requirement: "Log 10 check-ins",
    isUnlocked: (p) => p.checkIns >= 10,
    price: 100,
  },
  {
    id: "decor-bed",
    slot: "decor",
    name: "Cozy bed",
    requirement: "Reach level 4",
    isUnlocked: (p) => p.level >= 4,
    price: 130,
  },
  {
    id: "decor-truck",
    slot: "decor",
    name: "Toy truck",
    requirement: "Hit a 7-day streak",
    isUnlocked: (p) => p.bestStreak >= 7,
    price: 150,
  },
  {
    id: "decor-barn",
    slot: "decor",
    name: "Rocky's barn",
    requirement: "Reach level 8",
    isUnlocked: (p) => p.level >= 8,
    price: 260,
  },

  // Ambience — a living layer over the scene.
  {
    id: "fx-leaves",
    slot: "fx",
    name: "Falling leaves",
    requirement: "Log your first check-in",
    isUnlocked: (p) => p.checkIns >= 1,
    price: 40,
  },
  {
    id: "fx-fireflies",
    slot: "fx",
    name: "Fireflies",
    requirement: "Reach level 2",
    isUnlocked: (p) => p.level >= 2,
    price: 90,
  },
  {
    id: "fx-snow",
    slot: "fx",
    name: "Snowfall",
    requirement: "Reach level 5",
    isUnlocked: (p) => p.level >= 5,
    price: 120,
  },
  {
    id: "fx-hearts",
    slot: "fx",
    name: "Floating hearts",
    requirement: "Collect 2 badges",
    isUnlocked: (p) => p.badgeIds.length >= 2,
    price: 150,
  },
  {
    id: "fx-confetti",
    slot: "fx",
    name: "Confetti party",
    requirement: "Hit a 7-day streak",
    isUnlocked: (p) => p.bestStreak >= 7,
    price: 220,
  },
  {
    id: "fx-notes",
    slot: "fx",
    name: "Flying notes",
    requirement: "Log your first check-in",
    isUnlocked: (p) => p.checkIns >= 1,
    price: 50,
  },
  {
    id: "fx-maple",
    slot: "fx",
    name: "Maple swirl",
    requirement: "Log 3 check-ins",
    isUnlocked: (p) => p.checkIns >= 3,
    price: 60,
  },
  {
    id: "fx-rain",
    slot: "fx",
    name: "Summer rain",
    requirement: "Reach level 2",
    isUnlocked: (p) => p.level >= 2,
    price: 70,
  },
  {
    id: "fx-bubbles",
    slot: "fx",
    name: "Bubble party",
    requirement: "Log 5 check-ins",
    isUnlocked: (p) => p.checkIns >= 5,
    price: 80,
  },
  {
    id: "fx-petals",
    slot: "fx",
    name: "Cherry blossoms",
    requirement: "Reach level 3",
    isUnlocked: (p) => p.level >= 3,
    price: 90,
  },
  {
    id: "fx-dandelion",
    slot: "fx",
    name: "Dandelion wishes",
    requirement: "Reach level 4",
    isUnlocked: (p) => p.level >= 4,
    price: 90,
  },
  {
    id: "fx-butterflies",
    slot: "fx",
    name: "Butterflies",
    requirement: "Pass your first QA audit",
    isUnlocked: (p) => p.qaPasses >= 1,
    price: 100,
  },
  {
    id: "fx-stars",
    slot: "fx",
    name: "Shooting stars",
    requirement: "Hit a 7-day streak",
    isUnlocked: (p) => p.bestStreak >= 7,
    price: 160,
  },
  {
    id: "fx-rainbow",
    slot: "fx",
    name: "Rainbow sparkle",
    requirement: "Hit a 14-day streak",
    isUnlocked: (p) => p.bestStreak >= 14,
    price: 180,
  },
  {
    id: "fx-fireworks",
    slot: "fx",
    name: "Fireworks show",
    requirement: "Reach level 8",
    isUnlocked: (p) => p.level >= 8,
    price: 250,
  },
  {
    id: "fx-coins",
    slot: "fx",
    name: "Coin shower",
    requirement: "Collect 3 badges",
    isUnlocked: (p) => p.badgeIds.length >= 3,
    price: 300,
  },

  // Red-and-white Barranquilla fan gear (a tribute: stripes and colours only, no official crests or sponsors).
  {
    id: "neck-jr-scarf",
    slot: "neck",
    name: "Tiburón fan scarf",
    requirement: "Log your first check-in",
    isUnlocked: (p) => p.checkIns >= 1,
    price: 70,
  },
  {
    id: "hat-jr-cap",
    slot: "hat",
    name: "Red & white cap",
    requirement: "Reach level 2",
    isUnlocked: (p) => p.level >= 2,
    price: 80,
  },
  {
    id: "decor-jr-flag",
    slot: "decor",
    name: "Rojiblanco flag",
    requirement: "Log 2 check-ins",
    isUnlocked: (p) => p.checkIns >= 2,
    price: 60,
  },
  {
    id: "decor-jr-shark",
    slot: "decor",
    name: "Inflatable shark",
    requirement: "Reach level 3",
    isUnlocked: (p) => p.level >= 3,
    price: 120,
  },
  {
    id: "decor-jr-goal",
    slot: "decor",
    name: "Mini goal",
    requirement: "Pass your first QA audit",
    isUnlocked: (p) => p.qaPasses >= 1,
    price: 140,
  },
  {
    id: "scene-jr-stadium",
    slot: "scene",
    name: "Rojiblanco stadium",
    requirement: "Reach level 4",
    isUnlocked: (p) => p.level >= 4,
    price: 280,
  },
  {
    id: "fx-jr-carnaval",
    slot: "fx",
    name: "Carnival confetti",
    requirement: "Hit a 3-day streak",
    isUnlocked: (p) => p.bestStreak >= 3,
    price: 150,
  },

  // Wings, hats and more (second wave).
  {
    id: "hat-propeller",
    slot: "hat",
    name: "Propeller cap",
    requirement: "Reach level 2",
    isUnlocked: (p) => p.level >= 2,
    price: 90,
  },
  {
    id: "hat-bunny",
    slot: "hat",
    name: "Bunny ears",
    requirement: "Log 4 check-ins",
    isUnlocked: (p) => p.checkIns >= 4,
    price: 90,
  },
  {
    id: "hat-beret",
    slot: "hat",
    name: "Artist beret",
    requirement: "Log 6 check-ins",
    isUnlocked: (p) => p.checkIns >= 6,
    price: 80,
  },
  {
    id: "hat-top",
    slot: "hat",
    name: "Top hat",
    requirement: "Reach level 3",
    isUnlocked: (p) => p.level >= 3,
    price: 120,
  },
  {
    id: "hat-pirate",
    slot: "hat",
    name: "Pirate hat",
    requirement: "Hit a 7-day streak",
    isUnlocked: (p) => p.bestStreak >= 7,
    price: 150,
  },
  {
    id: "hat-tiara",
    slot: "hat",
    name: "Tiara",
    requirement: "Collect 2 badges",
    isUnlocked: (p) => p.badgeIds.length >= 2,
    price: 150,
  },
  {
    id: "hat-viking",
    slot: "hat",
    name: "Viking helmet",
    requirement: "Reach level 5",
    isUnlocked: (p) => p.level >= 5,
    price: 160,
  },
  {
    id: "hat-halo",
    slot: "hat",
    name: "Golden halo",
    requirement: "Pass 2 QA audits",
    isUnlocked: (p) => p.qaPasses >= 2,
    price: 180,
  },
  {
    id: "hat-astronaut",
    slot: "hat",
    name: "Space helmet",
    requirement: "Reach level 10",
    isUnlocked: (p) => p.level >= 10,
    price: 300,
  },
  {
    id: "glasses-nerd",
    slot: "glasses",
    name: "Study glasses",
    requirement: "Log 2 check-ins",
    isUnlocked: (p) => p.checkIns >= 2,
    price: 60,
  },
  {
    id: "glasses-aviator",
    slot: "glasses",
    name: "Aviators",
    requirement: "Reach level 3",
    isUnlocked: (p) => p.level >= 3,
    price: 90,
  },
  {
    id: "glasses-monocle",
    slot: "glasses",
    name: "Monocle",
    requirement: "Reach level 6",
    isUnlocked: (p) => p.level >= 6,
    price: 120,
  },
  {
    id: "neck-lei",
    slot: "neck",
    name: "Flower lei",
    requirement: "Hit a 5-day streak",
    isUnlocked: (p) => p.bestStreak >= 5,
    price: 90,
  },
  {
    id: "neck-pearls",
    slot: "neck",
    name: "Pearl necklace",
    requirement: "Reach level 4",
    isUnlocked: (p) => p.level >= 4,
    price: 100,
  },
  {
    id: "neck-chain",
    slot: "neck",
    name: "Gold R chain",
    requirement: "Reach level 8",
    isUnlocked: (p) => p.level >= 8,
    price: 200,
  },
  {
    id: "back-butterfly-wings",
    slot: "back",
    name: "Butterfly wings",
    requirement: "Log 8 check-ins",
    isUnlocked: (p) => p.checkIns >= 8,
    price: 150,
  },
  {
    id: "back-fairy-wings",
    slot: "back",
    name: "Fairy wings",
    requirement: "Reach level 5",
    isUnlocked: (p) => p.level >= 5,
    price: 180,
  },
  {
    id: "back-jetpack",
    slot: "back",
    name: "RLX jetpack",
    requirement: "Reach level 7",
    isUnlocked: (p) => p.level >= 7,
    price: 240,
  },
  {
    id: "back-angel-gold",
    slot: "back",
    name: "Golden wings",
    requirement: "Pass 3 QA audits",
    isUnlocked: (p) => p.qaPasses >= 3,
    price: 260,
  },
  {
    id: "back-dragon-wings",
    slot: "back",
    name: "Dragon wings",
    requirement: "Reach level 9",
    isUnlocked: (p) => p.level >= 9,
    price: 280,
  },
  {
    id: "back-phoenix-wings",
    slot: "back",
    name: "Phoenix wings",
    requirement: "Hit a 14-day streak",
    isUnlocked: (p) => p.bestStreak >= 14,
    price: 320,
  },
  {
    id: "decor-flowerbed",
    slot: "decor",
    name: "Flower bed",
    requirement: "Log 3 check-ins",
    isUnlocked: (p) => p.checkIns >= 3,
    price: 70,
  },
  {
    id: "decor-arcade",
    slot: "decor",
    name: "Arcade cabinet",
    requirement: "Reach level 3",
    isUnlocked: (p) => p.level >= 3,
    price: 110,
  },
  {
    id: "decor-rocket",
    slot: "decor",
    name: "Toy rocket",
    requirement: "Reach level 6",
    isUnlocked: (p) => p.level >= 6,
    price: 160,
  },

  // Chat bubbles: how your messages look to everyone in Rocky chat.
  ...(
    [
      ["bubble-rlx", "RLX green bubble", "Log 2 check-ins", (p: ProgressFacts) => p.checkIns >= 2, 40],
      ["bubble-sky", "Sky bubble", "Log your first check-in", (p: ProgressFacts) => p.checkIns >= 1, 40],
      ["bubble-mint", "Mint bubble", "Reach level 2", (p: ProgressFacts) => p.level >= 2, 50],
      ["bubble-sunset", "Sunset bubble", "Reach level 3", (p: ProgressFacts) => p.level >= 3, 80],
      ["bubble-night", "Night mode bubble", "Hit a 3-day streak", (p: ProgressFacts) => p.bestStreak >= 3, 80],
      ["bubble-comic", "Comic pop bubble", "Log 5 check-ins", (p: ProgressFacts) => p.checkIns >= 5, 100],
      ["bubble-hearts", "Sweet hearts bubble", "Collect 2 badges", (p: ProgressFacts) => p.badgeIds.length >= 2, 120],
      ["bubble-neon", "Neon bubble", "Reach level 5", (p: ProgressFacts) => p.level >= 5, 160],
      ["bubble-galaxy", "Galaxy bubble", "Reach level 7", (p: ProgressFacts) => p.level >= 7, 220],
    ] as const
  ).map(
    ([id, name, requirement, isUnlocked, price]): ClosetItem => ({
      id,
      slot: "bubble",
      name,
      requirement,
      isUnlocked,
      price,
    }),
  ),

  // Third wave: glasses, hats, neckwear, home items and backgrounds.
  ...(
    [
      ["glasses-visor", "glasses", "Cyber visor", 140, "level", 4],
      ["glasses-shutter", "glasses", "Shutter shades", 70, "checkIns", 3],
      ["glasses-pixel", "glasses", "Pixel shades", 90, "qa", 1],
      ["glasses-rainbow", "glasses", "Rainbow glasses", 80, "badges", 1],
      ["glasses-steampunk", "glasses", "Steampunk goggles", 150, "streak", 7],
      ["glasses-swim", "glasses", "Swim goggles", 50, "checkIns", 2],
      ["glasses-flower", "glasses", "Flower glasses", 70, "level", 2],
      ["glasses-diamond", "glasses", "Diamond glasses", 200, "level", 7],
      ["glasses-laser", "glasses", "Laser visor", 180, "qa", 3],
      ["glasses-hipster", "glasses", "Thick frames", 60, "checkIns", 1],
      ["glasses-sport", "glasses", "Sport wraparounds", 110, "streak", 5],
      ["glasses-reading", "glasses", "Reading glasses", 50, "checkIns", 4],
      ["hat-bucket", "hat", "Bucket hat", 70, "checkIns", 2],
      ["hat-fez", "hat", "Fez", 80, "level", 2],
      ["hat-cat-ears", "hat", "Cat ears", 90, "badges", 1],
      ["hat-mushroom", "hat", "Mushroom cap", 110, "checkIns", 6],
      ["hat-sailor", "hat", "Sailor hat", 90, "qa", 1],
      ["hat-detective", "hat", "Detective hat", 130, "qa", 2],
      ["hat-unicorn", "hat", "Unicorn horn", 180, "streak", 7],
      ["hat-knight", "hat", "Knight helmet", 220, "level", 8],
      ["neck-headphones", "neck", "Neck headphones", 100, "level", 3],
      ["neck-bolo", "neck", "Bolo tie", 70, "checkIns", 3],
      ["neck-camera", "neck", "Photo camera", 120, "badges", 2],
      ["neck-whistle", "neck", "Coach whistle", 50, "checkIns", 1],
      ["neck-rainbow-scarf", "neck", "Rainbow scarf", 110, "streak", 5],
      ["neck-gem", "neck", "Amethyst pendant", 190, "level", 6],
      ["decor-sofa", "decor", "Comfy sofa", 160, "checkIns", 3],
      ["decor-tv", "decor", "Flat TV", 180, "level", 3],
      ["decor-bookshelf", "decor", "Bookshelf", 120, "checkIns", 2],
      ["decor-fridge", "decor", "Snack fridge", 140, "checkIns", 4],
      ["decor-aquarium", "decor", "Aquarium", 220, "streak", 7],
      ["decor-guitar", "decor", "Electric guitar", 130, "badges", 2],
      ["decor-clock", "decor", "Wall clock", 60, "checkIns", 1],
      ["decor-piano", "decor", "Grand piano", 260, "level", 7],
      ["decor-cactus", "decor", "Potted cactus", 50, "checkIns", 1],
      ["decor-beanbag", "decor", "Bean bag", 90, "level", 2],
      ["decor-fountain", "decor", "Garden fountain", 200, "qa", 3],
      ["decor-telescope", "decor", "Telescope", 170, "level", 5],
      ["decor-record-player", "decor", "Record player", 150, "badges", 3],
      ["decor-computer", "decor", "Gaming desk", 190, "qa", 2],
      ["decor-doghouse", "decor", "Rocky's doghouse", 120, "streak", 3],
      ["decor-disco-ball", "decor", "Disco ball", 160, "streak", 5],
      ["scene-forest", "scene", "Enchanted forest", 180, "checkIns", 3],
      ["scene-city", "scene", "Neon city", 220, "level", 4],
      ["scene-underwater", "scene", "Under the sea", 240, "streak", 7],
      ["scene-desert", "scene", "Desert dunes", 160, "checkIns", 5],
      ["scene-mountains", "scene", "Mountain valley", 180, "level", 3],
      ["scene-sakura", "scene", "Cherry blossoms", 230, "badges", 3],
      ["scene-candy", "scene", "Candy land", 200, "qa", 2],
      ["scene-space", "scene", "Outer space", 320, "level", 8],
    ] as const
  ).map(([id, slot, name, price, rule, n]): ClosetItem => ({ id, slot, name, price, ...unlockRule(rule, n) })),

  // Fourth wave (coffee country & tropical): open to everyone from day one — bought, never gifted.
  ...(
    [
      ["hat-straw", "hat", "Straw sun hat", 90],
      ["hat-frog", "hat", "Froggy hat", 110],
      ["hat-bee", "hat", "Bee antennae", 80],
      ["glasses-sunset", "glasses", "Sunset shades", 90],
      ["glasses-butterfly", "glasses", "Butterfly glasses", 110],
      ["glasses-robot", "glasses", "Robot eyes", 140],
      ["neck-coffee", "neck", "Coffee bean necklace", 100],
      ["neck-knit-scarf", "neck", "Chunky knit scarf", 90],
      ["neck-star-pendant", "neck", "Star pendant", 130],
      ["back-guitar", "back", "Guitar on the back", 150],
      ["back-surfboard", "back", "Surfboard", 140],
      ["back-balloons", "back", "Balloon bunch", 120],
      ["decor-hammock", "decor", "Hammock", 170],
      ["decor-coffee-cart", "decor", "Coffee cart", 190],
      ["decor-campfire", "decor", "Campfire", 150],
      ["scene-coffee-farm", "scene", "Coffee farm", 220],
      ["scene-caribbean", "scene", "Caribbean town", 240],
      ["scene-star-camp", "scene", "Starry camp", 230],
      ["fx-sparkles", "fx", "Sparkles", 120],
      ["fx-paper-planes", "fx", "Paper planes", 110],
      ["fx-balloons", "fx", "Floating balloons", 130],
      ["bubble-coffee", "bubble", "Latte bubble", 70],
      ["bubble-ocean", "bubble", "Ocean bubble", 90],
      ["bubble-gold", "bubble", "Gold foil bubble", 180],
    ] as const
  ).map(([id, slot, name, price]): ClosetItem => ({ id, slot, name, price, requirement: "Available to everyone", isUnlocked: always })),

  // Monthly Arcade tournament cups (top 3): gift-only, awarded by the server.
  ...(
    [
      ["decor-cup-gold", "Gold tournament cup", "Finish #1 in a monthly Arcade tournament"],
      ["decor-cup-silver", "Silver tournament cup", "Finish #2 in a monthly Arcade tournament"],
      ["decor-cup-bronze", "Bronze tournament cup", "Finish #3 in a monthly Arcade tournament"],
    ] as const
  ).map(([id, name, requirement]): ClosetItem => ({ id, slot: "decor", name, requirement, isUnlocked: () => false, price: 0, gift: true })),

  // Gifts only: an admin hands these out (Admin → bulk actions or the agent's card).
  {
    id: "decor-arcade-trophy",
    slot: "decor",
    name: "Arcade champion trophy",
    requirement: "Be #1 in an Arcade game for a week",
    isUnlocked: () => false,
    price: 0,
    gift: true,
  },
  {
    id: "back-tester-wings",
    slot: "back",
    name: "Tester prism wings",
    requirement: "A gift for Rocky's testers",
    isUnlocked: () => false,
    price: 0,
    gift: true,
  },

  // Rocky admins only (ROCKY_ADMIN_EMAILS): granted by the server, never sold.
  ...(
    [
      ["back-sovereign-wings", "back", "Sovereign wings"],
      ["back-nova-wings", "back", "Nova wings"],
      ["hat-vip-crown", "hat", "Royal crown"],
      ["fx-royal-aura", "fx", "Royal aura"],
      ["aura-golden", "aura", "Golden aura"],
      ["bubble-royal", "bubble", "Royal chat bubble"],
    ] as const
  ).map(
    ([id, slot, name]): ClosetItem => ({
      id,
      slot,
      name,
      requirement: "Rocky admins only",
      isUnlocked: () => false,
      price: 0,
      staff: true,
    }),
  ),

  // Seasonal specials — exclusive: buyable only while an admin has the collection open.
  ...seasonal("spooky", [
    ["hat-witch", "hat", "Witch hat", 90],
    ["hat-pumpkin", "hat", "Pumpkin hat", 110],
    ["glasses-mask", "glasses", "Masquerade mask", 70],
    ["neck-spooky-bow", "neck", "Spooky bow tie", 50],
    ["back-bat-wings", "back", "Bat wings", 160],
    ["scene-haunted", "scene", "Haunted hill", 220],
    ["scene-pumpkin-patch", "scene", "Pumpkin patch", 180],
    ["decor-jack", "decor", "Jack-o’-lantern", 40],
    ["decor-candy-bucket", "decor", "Candy bucket", 45],
    ["decor-tombstone", "decor", "Spooky tombstone", 60],
    ["decor-ghost", "decor", "Friendly ghost", 70],
    ["decor-cauldron", "decor", "Bubbling cauldron", 90],
    ["fx-bats", "fx", "Bat swarm", 120],
    ["fx-fog", "fx", "Spooky mist", 100],
    ["fx-ghosts", "fx", "Floating ghosts", 140],
    ["fx-candy", "fx", "Candy rain", 110],
    ["hat-spider", "hat", "Spider headband", 70],
    ["hat-bolts", "hat", "Monster bolts", 80],
    ["hat-mummy", "hat", "Mummy wrap", 90],
    ["glasses-cat-eye", "glasses", "Black-cat glasses", 70],
    ["neck-candy-corn", "neck", "Candy-corn necklace", 50],
    ["neck-vampire", "neck", "Vampire collar", 80],
    ["back-broom", "back", "Witch's broom", 130],
    ["back-vampire-cape", "back", "Vampire cape", 150],
    ["decor-spider-web", "decor", "Spider web", 50],
    ["decor-lantern-orange", "decor", "Orange lantern", 60],
    ["decor-coffin-candy", "decor", "Candy coffin", 70],
    ["decor-black-cat", "decor", "Black cat", 80],
    ["decor-scarecrow", "decor", "Scarecrow", 110],
    ["fx-spooky-leaves", "fx", "Spooky wind", 110],
    ["fx-pumpkins", "fx", "Pumpkin fall", 120],
    ["bubble-spooky", "bubble", "Spooky chat bubble", 60],
    ["glasses-skull", "glasses", "Skull shades", 80],
    ["glasses-bat", "glasses", "Bat mask", 90],
    ["neck-bone", "neck", "Bone necklace", 60],
    ["scene-graveyard", "scene", "Moonlit graveyard", 240],
    ["bubble-pumpkin", "bubble", "Pumpkin chat bubble", 60],
    ["bubble-web", "bubble", "Spider-web chat bubble", 70],
  ]),
  ...seasonal("holiday", [
    ["hat-elf", "hat", "Elf hat", 90],
    ["hat-reindeer", "hat", "Reindeer antlers", 100],
    ["glasses-snow", "glasses", "Snowflake glasses", 70],
    ["neck-bell", "neck", "Jingle bell collar", 60],
    ["neck-candy-scarf", "neck", "Candy-stripe scarf", 70],
    ["back-gift-sack", "back", "Gift sack", 120],
    ["scene-winter", "scene", "Winter village", 220],
    ["scene-north-pole", "scene", "North Pole lights", 260],
    ["decor-candy-cane", "decor", "Giant candy cane", 45],
    ["decor-gifts", "decor", "Gift pile", 60],
    ["decor-snowman", "decor", "Snowman", 80],
    ["decor-xmas-tree", "decor", "Holiday tree", 120],
    ["decor-sleigh", "decor", "Mini sleigh", 150],
    ["fx-lights", "fx", "Twinkle lights", 110],
    ["fx-snowflakes", "fx", "Snowflake storm", 120],
    ["fx-aurora", "fx", "Northern lights", 200],
    ["hat-pompom", "hat", "Pom-pom beanie", 70],
    ["hat-earmuffs", "hat", "Earmuffs", 80],
    ["hat-star-band", "hat", "Star headband", 80],
    ["hat-new-year", "hat", "New Year top hat", 100],
    ["glasses-star-gold", "glasses", "Gold star glasses", 90],
    ["neck-holly", "neck", "Holly bow", 60],
    ["neck-lights", "neck", "Light-up necklace", 90],
    ["back-gift-bow", "back", "Giant gift bow", 110],
    ["back-ice-wings", "back", "Ice crystal wings", 200],
    ["decor-stocking", "decor", "Stocking", 40],
    ["decor-reindeer-plush", "decor", "Reindeer plush", 80],
    ["decor-snow-globe", "decor", "Snow globe", 90],
    ["decor-nutcracker", "decor", "Nutcracker", 100],
    ["decor-gingerbread-house", "decor", "Gingerbread house", 130],
    ["decor-fireplace", "decor", "Cosy fireplace", 220],
    ["fx-gift-rain", "fx", "Gift shower", 120],
    ["fx-new-year", "fx", "New Year sparkle", 150],
    ["bubble-candy", "bubble", "Candy-cane chat bubble", 60],
  ]),
];

function seasonal(
  season: Collection,
  items: Array<[string, ItemSlot, string, number]>,
): ClosetItem[] {
  const requirement =
    season === "spooky" ? "Spooky season special" : "Holiday special";
  return items.map(([id, slot, name, price]) => ({
    id,
    slot,
    name,
    requirement,
    isUnlocked: always,
    price,
    season,
  }));
}

export interface Outfit {
  hat: string | null;
  glasses: string | null;
  neck: string | null;
  back: string | null;
  scene: string;
  /** Worn over the torso (jerseys). */
  body: string | null;
  decor: string[];
  /** Where each placed item stands: horizontal position in % of the stage (Pet Society style). */
  spots: Record<string, number>;
  /** Size of each placed item (one of SIZE_STEPS; missing = normal size). */
  sizes: Record<string, number>;
  fx: string | null;
  /** A glow around Rocky himself (admin-only for now). */
  aura?: string | null;
  /** The style of the agent's chat bubbles (everyone sees it). */
  bubble?: string | null;
}

export const DEFAULT_OUTFIT: Outfit = {
  hat: "hat-rlx-cap",
  glasses: null,
  neck: "neck-lanyard",
  back: null,
  scene: "scene-route",
  decor: ["decor-boxes", "decor-bowl"],
  body: null,
  spots: {},
  sizes: {},
  fx: null,
  aura: null,
  bubble: null,
};

/** Slots holding at most one item (decor holds up to MAX_DECOR; scene always has one). */
export const SINGLE_SLOTS = [
  "hat",
  "glasses",
  "neck",
  "back",
  "body",
  "fx",
  "aura",
  "bubble",
] as const;
export const MAX_DECOR = 12;
/** Sizes a placed item can take (a multiple of its normal size). Fixed steps, never smaller than the first. */
export const SIZE_STEPS = [0.85, 1, 1.25, 1.5, 1.8] as const;
export const SIZE_LABELS = ["S", "M", "L", "XL", "XXL"] as const;

/**
 * Items taken out of the game (e.g. the striped jersey, until Rocky's layered
 * art lets clothes fit properly). Agents who bought one get the coins back.
 */
/** Items only Rocky admins can have (see ClosetItem.staff). */
export const STAFF_ITEMS: readonly string[] = [
  "back-sovereign-wings",
  "back-nova-wings",
  "hat-vip-crown",
  "fx-royal-aura",
  "aura-golden",
  "bubble-royal",
];

/**
 * Admin perks: admins always hold the staff items; anyone else loses them
 * (and stops wearing them) — e.g. an admin removed from ROCKY_ADMIN_EMAILS.
 */
export function withStaffPerks<
  S extends { granted: string[]; owned: string[]; outfit: Outfit },
>(state: S, staff: boolean): S {
  if (staff) {
    const missing = STAFF_ITEMS.filter((id) => !state.granted.includes(id));
    return missing.length ? { ...state, granted: [...state.granted, ...missing] } : state;
  }
  const has = (id: string) => STAFF_ITEMS.includes(id);
  if (!state.granted.some(has) && !state.owned.some(has)) return state;
  const o = state.outfit;
  return {
    ...state,
    granted: state.granted.filter((id) => !has(id)),
    owned: state.owned.filter((id) => !has(id)),
    outfit: {
      ...o,
      hat: o.hat && has(o.hat) ? null : o.hat,
      back: o.back && has(o.back) ? null : o.back,
      fx: o.fx && has(o.fx) ? null : o.fx,
      aura: null,
      bubble: o.bubble && has(o.bubble) ? null : (o.bubble ?? null),
    },
  };
}

export const RETIRED_ITEMS: Record<string, number> = { "body-jr-jersey": 180 };

/** Keeps only sizes of placed items, snapped to the allowed steps (the default size is not stored). */
export function sanitizeSizes(
  sizes: unknown,
  decor: readonly string[],
): Record<string, number> {
  const out: Record<string, number> = {};
  if (!sizes || typeof sizes !== "object") return out;
  for (const id of decor) {
    const v = (sizes as Record<string, unknown>)[id];
    if (typeof v !== "number" || !Number.isFinite(v)) continue;
    const snapped = SIZE_STEPS.reduce(
      (best, step) => (Math.abs(step - v) < Math.abs(best - v) ? step : best),
      1 as number,
    );
    if (snapped !== 1) out[id] = snapped;
  }
  return out;
}
/** Placed items stay inside the stage. */
export const SPOT_MIN = 3;
export const SPOT_MAX = 95;

/** Keeps only positions of placed items, as rounded, clamped percentages. */
export function sanitizeSpots(
  spots: unknown,
  decor: readonly string[],
): Record<string, number> {
  const out: Record<string, number> = {};
  if (!spots || typeof spots !== "object") return out;
  for (const id of decor) {
    const v = (spots as Record<string, unknown>)[id];
    if (typeof v === "number" && Number.isFinite(v))
      out[id] = Math.round(Math.min(SPOT_MAX, Math.max(SPOT_MIN, v)) * 10) / 10;
  }
  return out;
}

/** The catalogue with admin price/availability edits applied; items of a closed collection are unavailable. */
export function resolveCatalog(
  overrides: CatalogOverrides = {},
  now: Date = new Date(),
): ClosetItem[] {
  const open = Object.fromEntries(
    COLLECTIONS.map((c) => [c.id, collectionOpen(overrides, c.id, now)]),
  ) as Record<Collection, boolean>;
  return CLOSET.map((item) => {
    const o = overrides[item.id];
    const closed = item.season !== undefined && !open[item.season];
    if (!o && !closed) return item;
    return {
      ...item,
      price:
        typeof o?.price === "number" && Number.isFinite(o.price) && o.price >= 0
          ? Math.round(o.price)
          : item.price,
      enabled: closed ? false : (o?.enabled ?? item.enabled),
    };
  });
}

export function findItem(
  id: string | null,
  catalog: ClosetItem[] = CLOSET,
): ClosetItem | undefined {
  return id ? catalog.find((i) => i.id === id) : undefined;
}

/** Unlock key for a whole shop section (see adminUnlocked). */
export const sectionUnlock = (slot: ItemSlot) => `slot:${slot}`;
/** Unlock key for the whole shop. */
export const SHOP_UNLOCK = "*";

/**
 * Whether an admin has unlocked this item for the agent to BUY with their own
 * coins (skipping the progress requirement, not the price): by item id, by
 * section ("slot:hat") or the whole shop ("*"). Staff and gift-only items
 * can never be unlocked this way — they are only ever given.
 */
export function adminUnlocked(item: ClosetItem, unlocks: readonly string[] = []): boolean {
  if (item.staff || item.gift || unlocks.length === 0) return false;
  return unlocks.includes(item.id) || unlocks.includes(sectionUnlock(item.slot)) || unlocks.includes(SHOP_UNLOCK);
}

/** Unlocked by progress, or by an admin (see adminUnlocked). */
export function isItemUnlocked(item: ClosetItem, facts: ProgressFacts, unlocks: readonly string[] = []): boolean {
  return item.isUnlocked(facts) || adminUnlocked(item, unlocks);
}

/**
 * Whether the agent may use an item right now: gifted by an admin, or
 * unlocked (by progress or an admin) AND owned (free or bought).
 */
export function isUsable(
  item: ClosetItem,
  facts: ProgressFacts,
  owned: readonly string[],
  granted: readonly string[] = [],
  unlocks: readonly string[] = [],
): boolean {
  if (granted.includes(item.id)) return true;
  return (
    isItemUnlocked(item, facts, unlocks) && (item.price === 0 || owned.includes(item.id))
  );
}

/** Drops anything the agent can no longer use (e.g. after an admin reset) and repairs malformed outfits. */
export function sanitizeOutfit(
  outfit: Partial<Outfit> | null | undefined,
  facts: ProgressFacts,
  owned: readonly string[],
  granted: readonly string[] = [],
  catalog: ClosetItem[] = CLOSET,
  unlocks: readonly string[] = [],
): Outfit {
  const ok = (id: unknown, slot: ItemSlot) => {
    if (typeof id !== "string") return false;
    const item = findItem(id, catalog);
    return Boolean(
      item && item.slot === slot && isUsable(item, facts, owned, granted, unlocks),
    );
  };
  const o = outfit ?? {};
  const decor = Array.isArray(o.decor)
    ? [...new Set(o.decor)].filter((d) => ok(d, "decor")).slice(-MAX_DECOR)
    : [];
  return {
    hat: ok(o.hat, "hat") ? (o.hat as string) : null,
    glasses: ok(o.glasses, "glasses") ? (o.glasses as string) : null,
    neck: ok(o.neck, "neck") ? (o.neck as string) : null,
    back: ok(o.back, "back") ? (o.back as string) : null,
    body: ok(o.body, "body") ? (o.body as string) : null,
    scene: ok(o.scene, "scene") ? (o.scene as string) : DEFAULT_OUTFIT.scene,
    decor,
    spots: sanitizeSpots(o.spots, decor),
    sizes: sanitizeSizes(o.sizes, decor),
    fx: ok(o.fx, "fx") ? (o.fx as string) : null,
    aura: ok(o.aura, "aura") ? (o.aura as string) : null,
    bubble: ok(o.bubble, "bubble") ? (o.bubble as string) : null,
  };
}

export function itemsFor(
  slot: ItemSlot,
  catalog: ClosetItem[] = CLOSET,
  granted: readonly string[] = [],
): ClosetItem[] {
  // Staff and gift-only items only show in the closet of someone who holds them.
  return catalog.filter((i) => i.slot === slot && ((!i.staff && !i.gift) || granted.includes(i.id)));
}
