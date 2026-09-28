import { beforeEach, describe, expect, it } from 'vitest'
import { CLOSET, DEFAULT_OUTFIT, loadOutfit, sanitizeOutfit, saveOutfit, type ProgressFacts } from './closet'
import { balance, buyItem, buyTreatBag, coinsEarned, loadWallet, TREAT_BAG } from './economy'
import { HEARTS, MAX_HEARTS, PET_HEART_CAP, feed, loadCare, pet, play, treatsAvailable } from './care'

const newbie: ProgressFacts = { level: 1, stage: 'Baby', bestStreak: 0, checkIns: 0, qaPasses: 0, badgeIds: [] }

describe('closet', () => {
  beforeEach(() => window.localStorage.clear())

  it('starts with only the starter items unlocked', () => {
    const unlocked = CLOSET.filter((i) => i.isUnlocked(newbie)).map((i) => i.id)
    expect(unlocked).toEqual(['hat-rlx-cap', 'scene-route', 'decor-boxes'])
  })

  it('unlocks items from real progress', () => {
    const pro: ProgressFacts = { level: 12, stage: 'Advanced', bestStreak: 8, checkIns: 12, qaPasses: 3, badgeIds: ['first_step'] }
    const locked = CLOSET.filter((i) => !i.isUnlocked(pro)).map((i) => i.id)
    expect(locked).toEqual(['hat-crown'])
  })

  it('persists the outfit and drops items the agent can no longer use', () => {
    saveOutfit({ hat: 'hat-crown', scene: 'scene-night', decor: ['decor-boxes', 'decor-trophy'], fx: 'fx-confetti' })
    expect(loadOutfit().hat).toBe('hat-crown')
    expect(sanitizeOutfit(loadOutfit(), newbie, [])).toEqual({ ...DEFAULT_OUTFIT, hat: null })
  })

  it('needs an unlocked item to be bought before it can be used', () => {
    const lvl2: ProgressFacts = { ...newbie, level: 2 }
    const outfit = { ...DEFAULT_OUTFIT, scene: 'scene-warehouse' }
    expect(sanitizeOutfit(outfit, lvl2, []).scene).toBe(DEFAULT_OUTFIT.scene)
    expect(sanitizeOutfit(outfit, lvl2, ['scene-warehouse']).scene).toBe('scene-warehouse')
  })
})

describe('coins', () => {
  beforeEach(() => window.localStorage.clear())
  const worker: ProgressFacts = { level: 3, stage: 'Baby', bestStreak: 7, checkIns: 8, qaPasses: 2, badgeIds: ['first_step'] }

  it('earns coins only from real work', () => {
    expect(coinsEarned(newbie)).toBe(0)
    // 8×10 check-ins + 2×25 QA + 1×40 badge + 2×30 levels + 1×50 streak week
    expect(coinsEarned(worker)).toBe(280)
  })

  it('buys unlocked items once, and never with coins the agent does not have', () => {
    let w = loadWallet()
    expect(buyItem(w, worker, 'hat-crown')).toEqual({ ok: false, reason: 'locked' })
    expect(buyItem(w, worker, 'hat-rlx-cap')).toEqual({ ok: false, reason: 'owned' })
    const r = buyItem(w, worker, 'hat-hardhat')
    expect(r.ok).toBe(true)
    if (r.ok) w = r.wallet
    expect(balance(w, worker)).toBe(160)
    expect(buyItem(w, worker, 'hat-hardhat')).toEqual({ ok: false, reason: 'owned' })
    expect(buyItem(w, worker, 'scene-ballpark')).toEqual({ ok: false, reason: 'coins' })
    expect(loadWallet().owned).toEqual(['hat-hardhat'])
  })

  it('treat bags add treats and cost coins', () => {
    const r = buyTreatBag(loadWallet(), worker)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.wallet.bonusTreats).toBe(TREAT_BAG.treats)
    expect(balance(r.wallet, worker)).toBe(280 - TREAT_BAG.price)
    expect(buyTreatBag(loadWallet(), newbie)).toEqual({ ok: false, reason: 'coins' })
  })
})

describe('care', () => {
  beforeEach(() => window.localStorage.clear())

  it('caps the hearts petting alone can give', () => {
    let s = loadCare()
    for (let i = 0; i < 10; i++) s = pet(s)
    expect(s.hearts).toBe(PET_HEART_CAP * HEARTS.pet)
  })

  it('spends earned treats and never goes below zero', () => {
    let s = loadCare()
    expect(treatsAvailable(s, 1, 1)).toBe(3)
    s = feed(s, treatsAvailable(s, 1, 1))
    expect(treatsAvailable(s, 1, 1)).toBe(2)
    expect(feed(s, 0)).toBe(s)
    expect(treatsAvailable(s, 1, 1, 3)).toBe(5)
  })

  it('never goes past the daily heart maximum', () => {
    let s = loadCare()
    for (let i = 0; i < 20; i++) s = play(s)
    expect(s.hearts).toBe(MAX_HEARTS)
  })
})
