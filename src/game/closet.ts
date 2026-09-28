// Rocky's shop catalogue: cosmetic items for his look and his world. Each
// item is first unlocked by REAL documentation progress (level, streaks,
// badges) and then bought with Coins, which are also earned only by real
// work (see economy.ts). Nothing here grants or spends XP, Energy or
// Streak, so dressing Rocky up is a reward for the habit, never a shortcut
// around it.
//
// Pure module: shared by the frontend and the backend (which is the source
// of truth in remote mode). No storage, no browser APIs.
import type { EvolutionStage } from '../types/domain'

export type ItemSlot = 'hat' | 'glasses' | 'neck' | 'back' | 'scene' | 'decor' | 'fx'

export interface ProgressFacts {
  level: number
  stage: EvolutionStage
  bestStreak: number
  checkIns: number
  qaPasses: number
  badgeIds: string[]
}

export interface ClosetItem {
  id: string
  slot: ItemSlot
  name: string
  /** Plain-language unlock rule shown on locked items. */
  requirement: string
  isUnlocked: (p: ProgressFacts) => boolean
  /** Coins to buy it once unlocked; 0 = free starter item. */
  price: number
  /** False when an admin has taken the item out of the shop (owned copies still work). */
  enabled?: boolean
}

/** Admin edits to the shop, per item id (see backend /api/admin/catalog). */
export type CatalogOverrides = Record<string, { price?: number; enabled?: boolean }>

const STAGE_RANK: Record<EvolutionStage, number> = { Baby: 0, Young: 1, Advanced: 2, Elite: 3 }
const always = () => true

export const CLOSET: ClosetItem[] = [
  // Hats — sit on Rocky's head via the measured head anchors.
  { id: 'hat-rlx-cap', slot: 'hat', name: 'RLX cap', requirement: 'Starter item', isUnlocked: always, price: 0 },
  {
    id: 'hat-headset',
    slot: 'hat',
    name: 'Agent headset',
    requirement: 'Earn the First Step badge',
    isUnlocked: (p) => p.badgeIds.includes('first_step'),
    price: 60,
  },
  { id: 'hat-party', slot: 'hat', name: 'Party hat', requirement: 'Pass your first QA audit', isUnlocked: (p) => p.qaPasses >= 1, price: 80 },
  { id: 'hat-beanie', slot: 'hat', name: 'Green beanie', requirement: 'Hit a 3-day streak', isUnlocked: (p) => p.bestStreak >= 3, price: 100 },
  { id: 'hat-hardhat', slot: 'hat', name: 'Safety hard hat', requirement: 'Reach level 3', isUnlocked: (p) => p.level >= 3, price: 120 },
  { id: 'hat-vueltiao', slot: 'hat', name: 'Sombrero vueltiao', requirement: 'Log 5 check-ins', isUnlocked: (p) => p.checkIns >= 5, price: 140 },
  {
    id: 'hat-driver',
    slot: 'hat',
    name: 'Extra Miler cap',
    requirement: 'Evolve into Young Rocky',
    isUnlocked: (p) => STAGE_RANK[p.stage] >= 1,
    price: 150,
  },
  { id: 'hat-chef', slot: 'hat', name: 'Chef hat', requirement: 'Pass 3 QA audits', isUnlocked: (p) => p.qaPasses >= 3, price: 150 },
  { id: 'hat-cowboy', slot: 'hat', name: 'Rodeo hat', requirement: 'Reach level 4', isUnlocked: (p) => p.level >= 4, price: 160 },
  { id: 'hat-grad', slot: 'hat', name: 'Graduation cap', requirement: 'Log 10 check-ins', isUnlocked: (p) => p.checkIns >= 10, price: 180 },
  { id: 'hat-flowers', slot: 'hat', name: 'Flower crown', requirement: 'Reach level 6', isUnlocked: (p) => p.level >= 6, price: 180 },
  { id: 'hat-santa', slot: 'hat', name: 'Holiday hat', requirement: 'Hit a 14-day streak', isUnlocked: (p) => p.bestStreak >= 14, price: 200 },
  { id: 'hat-wizard', slot: 'hat', name: 'Wizard hat', requirement: 'Collect 3 badges', isUnlocked: (p) => p.badgeIds.length >= 3, price: 220 },
  {
    id: 'hat-crown',
    slot: 'hat',
    name: 'Elite crown',
    requirement: 'Evolve into Elite Rocky',
    isUnlocked: (p) => STAGE_RANK[p.stage] >= 3,
    price: 400,
  },

  // Glasses — on the measured eyes, moving with the head.
  { id: 'glasses-round', slot: 'glasses', name: 'Round specs', requirement: 'Log 2 check-ins', isUnlocked: (p) => p.checkIns >= 2, price: 50 },
  { id: 'glasses-sun', slot: 'glasses', name: 'Sunglasses', requirement: 'Reach level 2', isUnlocked: (p) => p.level >= 2, price: 80 },
  { id: 'glasses-3d', slot: 'glasses', name: 'Retro 3D glasses', requirement: 'Pass 2 QA audits', isUnlocked: (p) => p.qaPasses >= 2, price: 120 },
  { id: 'glasses-star', slot: 'glasses', name: 'Star shades', requirement: 'Hit a 3-day streak', isUnlocked: (p) => p.bestStreak >= 3, price: 140 },
  {
    id: 'glasses-heart',
    slot: 'glasses',
    name: 'Heart glasses',
    requirement: 'Collect 2 badges',
    isUnlocked: (p) => p.badgeIds.length >= 2,
    price: 160,
  },

  // Neck — clothes and accessories worn at the collar.
  { id: 'neck-lanyard', slot: 'neck', name: 'RLX ID badge', requirement: 'Starter item', isUnlocked: always, price: 0 },
  { id: 'neck-bowtie', slot: 'neck', name: 'Green bow tie', requirement: 'Log your first check-in', isUnlocked: (p) => p.checkIns >= 1, price: 40 },
  { id: 'neck-bandana', slot: 'neck', name: 'Navy bandana', requirement: 'Log 4 check-ins', isUnlocked: (p) => p.checkIns >= 4, price: 90 },
  { id: 'neck-scarf', slot: 'neck', name: 'Winter scarf', requirement: 'Reach level 3', isUnlocked: (p) => p.level >= 3, price: 100 },
  { id: 'neck-tie', slot: 'neck', name: 'Office tie', requirement: 'Reach level 4', isUnlocked: (p) => p.level >= 4, price: 130 },
  { id: 'neck-medal', slot: 'neck', name: 'Gold medal', requirement: 'Hit a 7-day streak', isUnlocked: (p) => p.bestStreak >= 7, price: 200 },

  // Back — worn behind Rocky.
  { id: 'back-backpack', slot: 'back', name: 'Delivery backpack', requirement: 'Log 8 check-ins', isUnlocked: (p) => p.checkIns >= 8, price: 120 },
  {
    id: 'back-cape',
    slot: 'back',
    name: 'Hero cape',
    requirement: 'Evolve into Young Rocky',
    isUnlocked: (p) => STAGE_RANK[p.stage] >= 1,
    price: 180,
  },
  { id: 'back-wings', slot: 'back', name: 'Angel wings', requirement: 'Collect 3 badges', isUnlocked: (p) => p.badgeIds.length >= 3, price: 250 },

  // Scenes — where Rocky hangs out.
  { id: 'scene-route', slot: 'scene', name: 'Delivery route', requirement: 'Starter scene', isUnlocked: always, price: 0 },
  { id: 'scene-sunset', slot: 'scene', name: 'Sunset route', requirement: 'Log 3 check-ins', isUnlocked: (p) => p.checkIns >= 3, price: 120 },
  { id: 'scene-warehouse', slot: 'scene', name: 'Warehouse', requirement: 'Reach level 2', isUnlocked: (p) => p.level >= 2, price: 150 },
  { id: 'scene-office', slot: 'scene', name: 'RLX office', requirement: 'Reach level 4', isUnlocked: (p) => p.level >= 4, price: 250 },
  { id: 'scene-ballpark', slot: 'scene', name: 'Ballpark', requirement: 'Hit a 7-day streak', isUnlocked: (p) => p.bestStreak >= 7, price: 300 },
  {
    id: 'scene-night',
    slot: 'scene',
    name: 'Night route',
    requirement: 'Evolve into Advanced Rocky',
    isUnlocked: (p) => STAGE_RANK[p.stage] >= 2,
    price: 350,
  },
  {
    id: 'scene-beach',
    slot: 'scene',
    name: 'Caribbean beach',
    requirement: 'Hit a 14-day streak',
    isUnlocked: (p) => p.bestStreak >= 14,
    price: 380,
  },

  // Decor — props placed around Rocky.
  { id: 'decor-boxes', slot: 'decor', name: 'Package stack', requirement: 'Starter item', isUnlocked: always, price: 0 },
  { id: 'decor-bowl', slot: 'decor', name: 'Snack bowl', requirement: 'Starter item', isUnlocked: always, price: 0 },
  { id: 'decor-hay', slot: 'decor', name: 'Hay bale', requirement: 'Log your first check-in', isUnlocked: (p) => p.checkIns >= 1, price: 30 },
  { id: 'decor-plant', slot: 'decor', name: 'Potted plant', requirement: 'Reach level 2', isUnlocked: (p) => p.level >= 2, price: 50 },
  {
    id: 'decor-balloons',
    slot: 'decor',
    name: 'RLX balloons',
    requirement: 'Pass your first QA audit',
    isUnlocked: (p) => p.qaPasses >= 1,
    price: 60,
  },
  { id: 'decor-lamp', slot: 'decor', name: 'Street lamp', requirement: 'Log 5 check-ins', isUnlocked: (p) => p.checkIns >= 5, price: 70 },
  { id: 'decor-trophy', slot: 'decor', name: 'Trophy', requirement: 'Collect any badge', isUnlocked: (p) => p.badgeIds.length >= 1, price: 80 },
  { id: 'decor-bench', slot: 'decor', name: 'Park bench', requirement: 'Reach level 3', isUnlocked: (p) => p.level >= 3, price: 90 },
  {
    id: 'decor-pennant',
    slot: 'decor',
    name: 'RLX pennant',
    requirement: 'Evolve into Young Rocky',
    isUnlocked: (p) => STAGE_RANK[p.stage] >= 1,
    price: 120,
  },
  { id: 'decor-mailbox', slot: 'decor', name: 'RLX mailbox', requirement: 'Log 10 check-ins', isUnlocked: (p) => p.checkIns >= 10, price: 100 },
  { id: 'decor-bed', slot: 'decor', name: 'Cozy bed', requirement: 'Reach level 4', isUnlocked: (p) => p.level >= 4, price: 130 },
  { id: 'decor-truck', slot: 'decor', name: 'Toy truck', requirement: 'Hit a 7-day streak', isUnlocked: (p) => p.bestStreak >= 7, price: 150 },
  { id: 'decor-barn', slot: 'decor', name: "Rocky's barn", requirement: 'Reach level 8', isUnlocked: (p) => p.level >= 8, price: 260 },

  // Ambience — a living layer over the scene.
  { id: 'fx-leaves', slot: 'fx', name: 'Falling leaves', requirement: 'Log your first check-in', isUnlocked: (p) => p.checkIns >= 1, price: 40 },
  { id: 'fx-fireflies', slot: 'fx', name: 'Fireflies', requirement: 'Reach level 2', isUnlocked: (p) => p.level >= 2, price: 90 },
  { id: 'fx-snow', slot: 'fx', name: 'Snowfall', requirement: 'Reach level 5', isUnlocked: (p) => p.level >= 5, price: 120 },
  { id: 'fx-hearts', slot: 'fx', name: 'Floating hearts', requirement: 'Collect 2 badges', isUnlocked: (p) => p.badgeIds.length >= 2, price: 150 },
  { id: 'fx-confetti', slot: 'fx', name: 'Confetti party', requirement: 'Hit a 7-day streak', isUnlocked: (p) => p.bestStreak >= 7, price: 220 },
]

export interface Outfit {
  hat: string | null
  glasses: string | null
  neck: string | null
  back: string | null
  scene: string
  decor: string[]
  /** Where each placed item stands: horizontal position in % of the stage (Pet Society style). */
  spots: Record<string, number>
  fx: string | null
}

export const DEFAULT_OUTFIT: Outfit = {
  hat: 'hat-rlx-cap',
  glasses: null,
  neck: 'neck-lanyard',
  back: null,
  scene: 'scene-route',
  decor: ['decor-boxes', 'decor-bowl'],
  spots: {},
  fx: null,
}

/** Slots holding at most one item (decor holds up to MAX_DECOR; scene always has one). */
export const SINGLE_SLOTS = ['hat', 'glasses', 'neck', 'back', 'fx'] as const
export const MAX_DECOR = 6
/** Placed items stay inside the stage. */
export const SPOT_MIN = 3
export const SPOT_MAX = 95

/** Keeps only positions of placed items, as rounded, clamped percentages. */
export function sanitizeSpots(spots: unknown, decor: readonly string[]): Record<string, number> {
  const out: Record<string, number> = {}
  if (!spots || typeof spots !== 'object') return out
  for (const id of decor) {
    const v = (spots as Record<string, unknown>)[id]
    if (typeof v === 'number' && Number.isFinite(v)) out[id] = Math.round(Math.min(SPOT_MAX, Math.max(SPOT_MIN, v)) * 10) / 10
  }
  return out
}

/** The catalogue with admin price/availability edits applied. */
export function resolveCatalog(overrides: CatalogOverrides = {}): ClosetItem[] {
  return CLOSET.map((item) => {
    const o = overrides[item.id]
    if (!o) return item
    return {
      ...item,
      price: typeof o.price === 'number' && Number.isFinite(o.price) && o.price >= 0 ? Math.round(o.price) : item.price,
      enabled: o.enabled ?? item.enabled,
    }
  })
}

export function findItem(id: string | null, catalog: ClosetItem[] = CLOSET): ClosetItem | undefined {
  return id ? catalog.find((i) => i.id === id) : undefined
}

/**
 * Whether the agent may use an item right now: gifted by an admin, or
 * unlocked by progress AND owned (free or bought).
 */
export function isUsable(item: ClosetItem, facts: ProgressFacts, owned: readonly string[], granted: readonly string[] = []): boolean {
  if (granted.includes(item.id)) return true
  return item.isUnlocked(facts) && (item.price === 0 || owned.includes(item.id))
}

/** Drops anything the agent can no longer use (e.g. after an admin reset) and repairs malformed outfits. */
export function sanitizeOutfit(
  outfit: Partial<Outfit> | null | undefined,
  facts: ProgressFacts,
  owned: readonly string[],
  granted: readonly string[] = [],
  catalog: ClosetItem[] = CLOSET,
): Outfit {
  const ok = (id: unknown, slot: ItemSlot) => {
    if (typeof id !== 'string') return false
    const item = findItem(id, catalog)
    return Boolean(item && item.slot === slot && isUsable(item, facts, owned, granted))
  }
  const o = outfit ?? {}
  const decor = Array.isArray(o.decor) ? [...new Set(o.decor)].filter((d) => ok(d, 'decor')).slice(-MAX_DECOR) : []
  return {
    hat: ok(o.hat, 'hat') ? (o.hat as string) : null,
    glasses: ok(o.glasses, 'glasses') ? (o.glasses as string) : null,
    neck: ok(o.neck, 'neck') ? (o.neck as string) : null,
    back: ok(o.back, 'back') ? (o.back as string) : null,
    scene: ok(o.scene, 'scene') ? (o.scene as string) : DEFAULT_OUTFIT.scene,
    decor,
    spots: sanitizeSpots(o.spots, decor),
    fx: ok(o.fx, 'fx') ? (o.fx as string) : null,
  }
}

export function itemsFor(slot: ItemSlot, catalog: ClosetItem[] = CLOSET): ClosetItem[] {
  return catalog.filter((i) => i.slot === slot)
}
