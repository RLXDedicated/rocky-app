// Rocky Coins — the pet's economy. Coins are EARNED only by real work
// (check-ins, clean QA audits, badges, levels, long streaks) and SPENT in
// Rocky's shop on looks, places, decor, ambience and treat bags. Admins can
// grant or take away coins; every movement is kept in a ledger (backend).
//
// The balance is never stored as a number anyone could inflate: what an
// agent has earned is recomputed from progress the Game Engine already
// tracks, and only spending and admin adjustments are recorded.
// Balance = earned + adjustments − spent. Coins never feed back into XP,
// Energy, Streak or Mood.
//
// Pure module: shared by the frontend and the backend.
import type { ProgressFacts } from './closet'

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

export interface CoinBreakdown {
  checkIns: number
  qaPasses: number
  badges: number
  levels: number
  streakWeeks: number
  total: number
}

export function coinBreakdown(p: ProgressFacts): CoinBreakdown {
  const b = {
    checkIns: p.checkIns * COIN_RATES.checkIn,
    qaPasses: p.qaPasses * COIN_RATES.qaPass,
    badges: p.badgeIds.length * COIN_RATES.badge,
    levels: Math.max(0, p.level - 1) * COIN_RATES.level,
    streakWeeks: Math.floor(p.bestStreak / 7) * COIN_RATES.streakWeek,
  }
  return { ...b, total: b.checkIns + b.qaPasses + b.badges + b.levels + b.streakWeeks }
}

export function coinsEarned(p: ProgressFacts): number {
  return coinBreakdown(p).total
}
