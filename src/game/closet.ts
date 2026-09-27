// Rocky's closet and room: cosmetic items unlocked by REAL documentation
// progress (level, streaks, badges). Nothing here grants or spends XP,
// Energy or Streak — it only reads progress the Game Engine already
// computed, so dressing Rocky up is a reward for the habit, never a
// shortcut around it.
import type { EvolutionStage } from '../types/domain'
import { scopedKey } from './storage'

export type ItemSlot = 'hat' | 'scene' | 'decor'

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
}

const STAGE_RANK: Record<EvolutionStage, number> = { Baby: 0, Young: 1, Advanced: 2, Elite: 3 }
const always = () => true

export const CLOSET: ClosetItem[] = [
  // Hats — sit on Rocky's head via the measured head anchors.
  { id: 'hat-rlx-cap', slot: 'hat', name: 'RLX cap', requirement: 'Starter item', isUnlocked: always },
  { id: 'hat-headset', slot: 'hat', name: 'Agent headset', requirement: 'Earn the First Step badge', isUnlocked: (p) => p.badgeIds.includes('first_step') },
  { id: 'hat-party', slot: 'hat', name: 'Party hat', requirement: 'Pass your first QA audit', isUnlocked: (p) => p.qaPasses >= 1 },
  { id: 'hat-hardhat', slot: 'hat', name: 'Safety hard hat', requirement: 'Reach level 3', isUnlocked: (p) => p.level >= 3 },
  { id: 'hat-beanie', slot: 'hat', name: 'Green beanie', requirement: 'Hit a 3-day streak', isUnlocked: (p) => p.bestStreak >= 3 },
  { id: 'hat-driver', slot: 'hat', name: 'Extra Miler cap', requirement: 'Evolve into Young Rocky', isUnlocked: (p) => STAGE_RANK[p.stage] >= 1 },
  { id: 'hat-grad', slot: 'hat', name: 'Graduation cap', requirement: 'Log 10 check-ins', isUnlocked: (p) => p.checkIns >= 10 },
  { id: 'hat-crown', slot: 'hat', name: 'Elite crown', requirement: 'Evolve into Elite Rocky', isUnlocked: (p) => STAGE_RANK[p.stage] >= 3 },

  // Scenes — where Rocky hangs out.
  { id: 'scene-route', slot: 'scene', name: 'Delivery route', requirement: 'Starter scene', isUnlocked: always },
  { id: 'scene-warehouse', slot: 'scene', name: 'Warehouse', requirement: 'Reach level 2', isUnlocked: (p) => p.level >= 2 },
  { id: 'scene-ballpark', slot: 'scene', name: 'Ballpark', requirement: 'Hit a 7-day streak', isUnlocked: (p) => p.bestStreak >= 7 },
  { id: 'scene-night', slot: 'scene', name: 'Night route', requirement: 'Evolve into Advanced Rocky', isUnlocked: (p) => STAGE_RANK[p.stage] >= 2 },

  // Decor — props placed around Rocky.
  { id: 'decor-boxes', slot: 'decor', name: 'Package stack', requirement: 'Starter item', isUnlocked: always },
  { id: 'decor-plant', slot: 'decor', name: 'Potted plant', requirement: 'Reach level 2', isUnlocked: (p) => p.level >= 2 },
  { id: 'decor-trophy', slot: 'decor', name: 'Trophy', requirement: 'Collect any badge', isUnlocked: (p) => p.badgeIds.length >= 1 },
  { id: 'decor-truck', slot: 'decor', name: 'Toy truck', requirement: 'Hit a 7-day streak', isUnlocked: (p) => p.bestStreak >= 7 },
  { id: 'decor-pennant', slot: 'decor', name: 'RLX pennant', requirement: 'Evolve into Young Rocky', isUnlocked: (p) => STAGE_RANK[p.stage] >= 1 },
]

export interface Outfit {
  hat: string | null
  scene: string
  decor: string[]
}

export const DEFAULT_OUTFIT: Outfit = { hat: 'hat-rlx-cap', scene: 'scene-route', decor: ['decor-boxes'] }

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

/** Drops anything the agent no longer qualifies for (e.g. after an admin reset). */
export function sanitizeOutfit(outfit: Outfit, facts: ProgressFacts): Outfit {
  const ok = (id: string | null) => {
    const item = CLOSET.find((i) => i.id === id)
    return Boolean(item && item.isUnlocked(facts))
  }
  return {
    hat: outfit.hat && ok(outfit.hat) ? outfit.hat : null,
    scene: ok(outfit.scene) ? outfit.scene : DEFAULT_OUTFIT.scene,
    decor: outfit.decor.filter(ok),
  }
}

export function itemsFor(slot: ItemSlot): ClosetItem[] {
  return CLOSET.filter((i) => i.slot === slot)
}
