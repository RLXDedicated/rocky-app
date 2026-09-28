// Rocky Coins — the pet's economy. Coins are EARNED only by real work
// (check-ins, clean QA audits, badges, levels, long streaks) and SPENT in
// Rocky's shop on looks, places, decor, ambience and treat bags.
//
// The balance is never stored as a number the browser could inflate: what
// an agent has earned is recomputed from progress the Game Engine already
// tracks, and only what they spent (their purchases) is saved. Balance =
// earned − spent. Coins never feed back into XP, Energy, Streak or Mood.
//
// Today the wallet lives in this browser (per agent, like the closet). To
// follow agents across PCs, move `Wallet` to the backend next to the game
// state (`GET/POST /api/wallet`) and keep `coinsEarned` in the shared engine.
import { CLOSET, type ProgressFacts } from './closet'
import { scopedKey } from './storage'

export const COIN_RATES = {
  checkIn: 10,
  qaPass: 25,
  badge: 40,
  /** Per level reached above level 1. */
  level: 30,
  /** Per full week in the agent's best streak. */
  streakWeek: 50,
} as const

/** Consumables: bought as often as the agent likes. */
export const TREAT_BAG = { id: 'treat-bag', name: 'Treat bag', treats: 3, price: 30 } as const

export interface Wallet {
  /** Shop items bought (ids from CLOSET). */
  owned: string[]
  /** Coins spent on consumables. */
  spentOnConsumables: number
  /** Treats bought with treat bags (added to the treats earned by work). */
  bonusTreats: number
}

const KEY = 'rocky.wallet.v1'
const EMPTY: Wallet = { owned: [], spentOnConsumables: 0, bonusTreats: 0 }

export function coinsEarned(p: ProgressFacts): number {
  return (
    p.checkIns * COIN_RATES.checkIn +
    p.qaPasses * COIN_RATES.qaPass +
    p.badgeIds.length * COIN_RATES.badge +
    Math.max(0, p.level - 1) * COIN_RATES.level +
    Math.floor(p.bestStreak / 7) * COIN_RATES.streakWeek
  )
}

export function coinsSpent(w: Wallet): number {
  const items = w.owned.reduce((sum, id) => sum + (CLOSET.find((i) => i.id === id)?.price ?? 0), 0)
  return items + w.spentOnConsumables
}

export function balance(w: Wallet, p: ProgressFacts): number {
  return Math.max(0, coinsEarned(p) - coinsSpent(w))
}

export function loadWallet(): Wallet {
  try {
    const raw = window.localStorage.getItem(scopedKey(KEY))
    if (!raw) return EMPTY
    const w = JSON.parse(raw) as Partial<Wallet>
    return {
      owned: Array.isArray(w.owned) ? w.owned.filter((id) => typeof id === 'string') : [],
      spentOnConsumables: Number(w.spentOnConsumables) || 0,
      bonusTreats: Number(w.bonusTreats) || 0,
    }
  } catch {
    return EMPTY
  }
}

function save(w: Wallet): Wallet {
  try {
    window.localStorage.setItem(scopedKey(KEY), JSON.stringify(w))
  } catch {
    // storage unavailable — the purchase just won't persist this time
  }
  return w
}

export type BuyResult = { ok: true; wallet: Wallet } | { ok: false; reason: 'locked' | 'owned' | 'coins' | 'unknown' }

export function buyItem(w: Wallet, p: ProgressFacts, id: string): BuyResult {
  const item = CLOSET.find((i) => i.id === id)
  if (!item) return { ok: false, reason: 'unknown' }
  if (item.price === 0 || w.owned.includes(id)) return { ok: false, reason: 'owned' }
  if (!item.isUnlocked(p)) return { ok: false, reason: 'locked' }
  if (balance(w, p) < item.price) return { ok: false, reason: 'coins' }
  return { ok: true, wallet: save({ ...w, owned: [...w.owned, id] }) }
}

export function buyTreatBag(w: Wallet, p: ProgressFacts): BuyResult {
  if (balance(w, p) < TREAT_BAG.price) return { ok: false, reason: 'coins' }
  return {
    ok: true,
    wallet: save({ ...w, spentOnConsumables: w.spentOnConsumables + TREAT_BAG.price, bonusTreats: w.bonusTreats + TREAT_BAG.treats }),
  }
}
