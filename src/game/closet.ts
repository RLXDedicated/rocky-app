// Rocky's shop catalogue: cosmetic items for his look and his world. Each
// item is first unlocked by REAL documentation progress (level, streaks,
// badges) and then bought with Coins, which are also earned only by real
// work (see economy.ts). Nothing here grants or spends XP, Energy or
// Streak, so dressing Rocky up is a reward for the habit, never a shortcut
// around it.
import type { EvolutionStage } from '../types/domain'
import { scopedKey } from './storage'

export type ItemSlot = 'hat' | 'scene' | 'decor' | 'fx'

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
}

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
  { id: 'hat-hardhat', slot: 'hat', name: 'Safety hard hat', requirement: 'Reach level 3', isUnlocked: (p) => p.level >= 3, price: 120 },
  { id: 'hat-beanie', slot: 'hat', name: 'Green beanie', requirement: 'Hit a 3-day streak', isUnlocked: (p) => p.bestStreak >= 3, price: 100 },
  {
    id: 'hat-driver',
    slot: 'hat',
    name: 'Extra Miler cap',
    requirement: 'Evolve into Young Rocky',
    isUnlocked: (p) => STAGE_RANK[p.stage] >= 1,
    price: 150,
  },
  { id: 'hat-grad', slot: 'hat', name: 'Graduation cap', requirement: 'Log 10 check-ins', isUnlocked: (p) => p.checkIns >= 10, price: 180 },
  {
    id: 'hat-crown',
    slot: 'hat',
    name: 'Elite crown',
    requirement: 'Evolve into Elite Rocky',
    isUnlocked: (p) => STAGE_RANK[p.stage] >= 3,
    price: 400,
  },

  // Scenes — where Rocky hangs out.
  { id: 'scene-route', slot: 'scene', name: 'Delivery route', requirement: 'Starter scene', isUnlocked: always, price: 0 },
  { id: 'scene-sunset', slot: 'scene', name: 'Sunset route', requirement: 'Log 3 check-ins', isUnlocked: (p) => p.checkIns >= 3, price: 120 },
  { id: 'scene-warehouse', slot: 'scene', name: 'Warehouse', requirement: 'Reach level 2', isUnlocked: (p) => p.level >= 2, price: 150 },
  { id: 'scene-ballpark', slot: 'scene', name: 'Ballpark', requirement: 'Hit a 7-day streak', isUnlocked: (p) => p.bestStreak >= 7, price: 300 },
  {
    id: 'scene-night',
    slot: 'scene',
    name: 'Night route',
    requirement: 'Evolve into Advanced Rocky',
    isUnlocked: (p) => STAGE_RANK[p.stage] >= 2,
    price: 350,
  },

  // Decor — props placed around Rocky.
  { id: 'decor-boxes', slot: 'decor', name: 'Package stack', requirement: 'Starter item', isUnlocked: always, price: 0 },
  { id: 'decor-plant', slot: 'decor', name: 'Potted plant', requirement: 'Reach level 2', isUnlocked: (p) => p.level >= 2, price: 50 },
  { id: 'decor-trophy', slot: 'decor', name: 'Trophy', requirement: 'Collect any badge', isUnlocked: (p) => p.badgeIds.length >= 1, price: 80 },
  { id: 'decor-truck', slot: 'decor', name: 'Toy truck', requirement: 'Hit a 7-day streak', isUnlocked: (p) => p.bestStreak >= 7, price: 150 },
  {
    id: 'decor-pennant',
    slot: 'decor',
    name: 'RLX pennant',
    requirement: 'Evolve into Young Rocky',
    isUnlocked: (p) => STAGE_RANK[p.stage] >= 1,
    price: 120,
  },

  // Ambience — a living layer over the scene.
  { id: 'fx-leaves', slot: 'fx', name: 'Falling leaves', requirement: 'Log your first check-in', isUnlocked: (p) => p.checkIns >= 1, price: 40 },
  { id: 'fx-fireflies', slot: 'fx', name: 'Fireflies', requirement: 'Reach level 2', isUnlocked: (p) => p.level >= 2, price: 90 },
  { id: 'fx-confetti', slot: 'fx', name: 'Confetti party', requirement: 'Hit a 7-day streak', isUnlocked: (p) => p.bestStreak >= 7, price: 220 },
]

export interface Outfit {
  hat: string | null
  scene: string
  decor: string[]
  fx: string | null
}

export const DEFAULT_OUTFIT: Outfit = { hat: 'hat-rlx-cap', scene: 'scene-route', decor: ['decor-boxes'], fx: null }

const KEY = 'rocky.closet.v1'

export function loadOutfit(): Outfit {
  try {
    const raw = window.localStorage.getItem(scopedKey(KEY))
    if (!raw) return DEFAULT_OUTFIT
    const parsed = JSON.parse(raw) as Partial<Outfit>
    return {
      hat: parsed.hat === undefined ? DEFAULT_OUTFIT.hat : parsed.hat,
      scene: parsed.scene ?? DEFAULT_OUTFIT.scene,
      decor: Array.isArray(parsed.decor) ? parsed.decor : DEFAULT_OUTFIT.decor,
      fx: parsed.fx ?? null,
    }
  } catch {
    return DEFAULT_OUTFIT
  }
}

export function saveOutfit(outfit: Outfit): void {
  try {
    window.localStorage.setItem(scopedKey(KEY), JSON.stringify(outfit))
  } catch {
    // storage unavailable — the outfit just won't persist this time
  }
}

/** Items the agent can use right now: unlocked by progress AND owned (free or bought). */
export function isUsable(item: ClosetItem, facts: ProgressFacts, owned: readonly string[]): boolean {
  return item.isUnlocked(facts) && (item.price === 0 || owned.includes(item.id))
}

/** Drops anything the agent can no longer use (e.g. after an admin reset). */
export function sanitizeOutfit(outfit: Outfit, facts: ProgressFacts, owned: readonly string[]): Outfit {
  const ok = (id: string | null) => {
    const item = CLOSET.find((i) => i.id === id)
    return Boolean(item && isUsable(item, facts, owned))
  }
  return {
    hat: outfit.hat && ok(outfit.hat) ? outfit.hat : null,
    scene: ok(outfit.scene) ? outfit.scene : DEFAULT_OUTFIT.scene,
    decor: outfit.decor.filter(ok),
    fx: outfit.fx && ok(outfit.fx) ? outfit.fx : null,
  }
}

export function itemsFor(slot: ItemSlot): ClosetItem[] {
  return CLOSET.filter((i) => i.slot === slot)
}
