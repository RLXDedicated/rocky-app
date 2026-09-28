import { describe, expect, it } from 'vitest'
import { CLOSET, DEFAULT_OUTFIT, resolveCatalog, sanitizeOutfit, type ProgressFacts } from './closet'
import { coinsEarned, TREAT_BAG } from './economy'
import {
  adminAdjustCoins,
  adminGrantItem,
  adminRestoreNeeds,
  adminRevokeItem,
  applyPetAction,
  coinBalance,
  initialPetState,
  needsSummary,
  normalizePetState,
  PETS_PER_DAY,
  tickNeeds,
  treatsAvailable,
  type PetAction,
  type PetState,
} from './pet'

const NOW = new Date('2026-09-08T12:00:00.000Z')
const newbie: ProgressFacts = { level: 1, stage: 'Baby', bestStreak: 0, checkIns: 0, qaPasses: 0, badgeIds: [] }
const worker: ProgressFacts = { level: 3, stage: 'Baby', bestStreak: 7, checkIns: 8, qaPasses: 2, badgeIds: ['first_step'] }

function run(state: PetState, action: PetAction, facts = worker, now = NOW) {
  return applyPetAction(state, action, { facts, now })
}

describe('shop catalogue', () => {
  it('starts with only the starter items unlocked', () => {
    const unlocked = CLOSET.filter((i) => i.isUnlocked(newbie)).map((i) => i.id)
    expect(unlocked).toEqual(['hat-rlx-cap', 'neck-lanyard', 'scene-route', 'decor-boxes'])
  })

  it('has unique ids and a price for every item', () => {
    expect(new Set(CLOSET.map((i) => i.id)).size).toBe(CLOSET.length)
    for (const item of CLOSET) expect(item.price).toBeGreaterThanOrEqual(0)
  })

  it('applies admin price and availability edits', () => {
    const catalog = resolveCatalog({ 'hat-headset': { price: 5 }, 'hat-party': { enabled: false }, 'hat-beanie': { price: -3 } })
    expect(catalog.find((i) => i.id === 'hat-headset')!.price).toBe(5)
    expect(catalog.find((i) => i.id === 'hat-party')!.enabled).toBe(false)
    expect(catalog.find((i) => i.id === 'hat-beanie')!.price).toBe(100) // invalid edit ignored
  })

  it('repairs outfits: unknown, wrong-slot, unowned and duplicate items are dropped', () => {
    const outfit = sanitizeOutfit(
      {
        hat: 'scene-night',
        glasses: 'neck-tie',
        neck: 'neck-lanyard',
        back: 'back-wings',
        scene: 'nope',
        decor: ['decor-boxes', 'decor-boxes', 'hat-crown'],
        fx: 'fx-confetti',
      },
      worker,
      [],
    )
    expect(outfit).toEqual({ ...DEFAULT_OUTFIT, hat: null })
  })
})

describe('coins', () => {
  it('earns coins only from real work', () => {
    expect(coinsEarned(newbie)).toBe(0)
    // 8×10 check-ins + 2×25 QA + 1×40 badge + 2×30 levels + 1×50 streak week
    expect(coinsEarned(worker)).toBe(280)
  })

  it('buys unlocked items once, never with coins the agent does not have', () => {
    let s = initialPetState(NOW)
    expect(run(s, { type: 'buy', itemId: 'hat-crown' })).toMatchObject({ ok: false, reason: 'locked' })
    expect(run(s, { type: 'buy', itemId: 'hat-rlx-cap' })).toMatchObject({ ok: false, reason: 'owned' })
    expect(run(s, { type: 'buy', itemId: 'nope' })).toMatchObject({ ok: false, reason: 'unknown-item' })
    const r = run(s, { type: 'buy', itemId: 'hat-hardhat' })
    expect(r.ok && r.ledger).toEqual({ delta: -120, kind: 'purchase', itemId: 'hat-hardhat' })
    s = r.state
    expect(coinBalance(s, worker)).toBe(160)
    expect(run(s, { type: 'buy', itemId: 'hat-hardhat' })).toMatchObject({ ok: false, reason: 'owned' })
    expect(run(s, { type: 'buy', itemId: 'scene-ballpark' })).toMatchObject({ ok: false, reason: 'coins' })
  })

  it('will not sell an item an admin took out of the shop', () => {
    const r = applyPetAction(
      initialPetState(NOW),
      { type: 'buy', itemId: 'hat-headset' },
      { facts: worker, now: NOW, catalog: resolveCatalog({ 'hat-headset': { enabled: false } }) },
    )
    expect(r).toMatchObject({ ok: false, reason: 'unavailable' })
  })

  it('treat bags add treats and cost coins', () => {
    const r = run(initialPetState(NOW), { type: 'buyTreats' })
    expect(r.ok).toBe(true)
    expect(r.state.bonusTreats).toBe(TREAT_BAG.treats)
    expect(coinBalance(r.state, worker)).toBe(280 - TREAT_BAG.price)
    expect(run(initialPetState(NOW), { type: 'buyTreats' }, newbie)).toMatchObject({ ok: false, reason: 'coins' })
  })

  it('admin deductions never push the balance below zero', () => {
    const { state, ledger } = adminAdjustCoins(initialPetState(NOW), -1000, worker, 'test')
    expect(coinBalance(state, worker)).toBe(0)
    expect(ledger).toMatchObject({ delta: -280, kind: 'admin-deduct' })
  })
})

describe('needs and care', () => {
  it('happiness fades, dirt builds up and a long absence is capped', () => {
    const base = initialPetState(NOW).needs
    const later = tickNeeds(base, new Date(NOW.getTime() + 10 * 3_600_000))
    expect(later.happiness).toBe(65)
    expect(later.dirt).toBe(30)
    expect(later.health).toBe(100)
    const week = tickNeeds(base, new Date(NOW.getTime() + 7 * 86_400_000))
    const cap = tickNeeds(base, new Date(NOW.getTime() + 72 * 3_600_000))
    expect(week).toEqual({ ...cap, updatedAt: week.updatedAt })
  })

  it('health only drops while Rocky is neglected, and recovers with care', () => {
    const neglected = { health: 80, happiness: 10, dirt: 90, updatedAt: NOW.toISOString() }
    expect(tickNeeds(neglected, new Date(NOW.getTime() + 10 * 3_600_000)).health).toBeLessThan(80)
    const cared = { health: 50, happiness: 90, dirt: 0, updatedAt: NOW.toISOString() }
    expect(tickNeeds(cared, new Date(NOW.getTime() + 4 * 3_600_000)).health).toBe(56)
  })

  it('petting cheers Rocky up a limited number of times a day', () => {
    let s = { ...initialPetState(NOW), needs: { ...initialPetState(NOW).needs, happiness: 0 } }
    for (let i = 0; i < PETS_PER_DAY + 5; i++) s = run(s, { type: 'pet' }).state
    expect(s.needs.happiness).toBe(PETS_PER_DAY * 5)
  })

  it('treats need earned treats; bath washes the mud off', () => {
    expect(run(initialPetState(NOW), { type: 'feed' }, newbie)).toMatchObject({ ok: false, reason: 'no-treats' })
    const fed = run(initialPetState(NOW), { type: 'feed' })
    expect(fed.ok).toBe(true)
    expect(treatsAvailable(fed.state, worker)).toBe(treatsAvailable(initialPetState(NOW), worker) - 1)

    const played = run(initialPetState(NOW), { type: 'play' })
    expect(played.state.needs.dirt).toBeGreaterThan(initialPetState(NOW).needs.dirt)
    const bathed = run(played.state, { type: 'bath' })
    expect(bathed.state.needs.dirt).toBe(0)
    expect(needsSummary({ health: 90, happiness: 80, dirt: 85, updatedAt: '' })).toBe('dirty')
  })

  it('equips only usable items; admin gifts bypass the unlock and can be taken back', () => {
    let s = initialPetState(NOW)
    s = run(s, { type: 'equip', outfit: { ...DEFAULT_OUTFIT, hat: 'hat-crown', decor: [] } }).state
    expect(s.outfit.hat).toBeNull()
    s = adminGrantItem(s, 'hat-crown')
    s = run(s, { type: 'equip', outfit: { ...DEFAULT_OUTFIT, hat: 'hat-crown', decor: [] } }).state
    expect(s.outfit.hat).toBe('hat-crown')
    s = adminRevokeItem(s, 'hat-crown', worker)
    expect(s.outfit.hat).toBeNull()
    expect(adminRestoreNeeds(s, NOW).needs).toMatchObject({ health: 100, happiness: 100, dirt: 0 })
  })

  it('repairs corrupted saves instead of crashing', () => {
    const s = normalizePetState({ needs: { health: 'x', happiness: 400, dirt: -3 }, owned: ['a', 3, 'a'], coinsSpent: -5 }, NOW)
    expect(s.needs).toMatchObject({ health: 100, happiness: 100, dirt: 0 })
    expect(s.owned).toEqual(['a'])
    expect(s.coinsSpent).toBe(0)
    expect(normalizePetState(null, NOW)).toEqual(initialPetState(NOW))
  })
})

describe('Note Check (notes quiz)', () => {
  it('picks the same five questions for everyone on a day, and rewards only the first round', async () => {
    const { dailyQuestions, QUIZ_BANK } = await import('./notesQuiz')
    const round = dailyQuestions(NOW)
    expect(round).toHaveLength(5)
    expect(new Set(round.map((q) => q.id)).size).toBe(5)
    expect(dailyQuestions(NOW).map((q) => q.id)).toEqual(round.map((q) => q.id))
    for (const q of QUIZ_BANK) expect(q.answer).toBeLessThan(q.options.length)

    const perfect = Object.fromEntries(round.map((q) => [q.id, q.answer]))
    const first = run(initialPetState(NOW), { type: 'quiz', answers: perfect })
    expect(first.ok).toBe(true)
    expect(first.state.quiz.lastScore).toBe(5)
    expect(first.state.gameCoins).toBe(30)
    expect(first.state.bonusTreats).toBe(1)
    expect(first.ok && first.ledger).toEqual({ delta: 30, kind: 'quiz', note: 'Note Check 5/5' })
    expect(coinBalance(first.state, newbie)).toBe(30)

    const again = run(first.state, { type: 'quiz', answers: perfect })
    expect(again.state.gameCoins).toBe(30)
    expect(again.ok && again.ledger).toBeUndefined()
    expect(again.state.quiz.played).toBe(2)

    const wrong = Object.fromEntries(round.map((q) => [q.id, (q.answer + 1) % q.options.length]))
    const tomorrow = new Date(NOW.getTime() + 86_400_000)
    const zero = run(first.state, { type: 'quiz', answers: wrong }, worker, tomorrow)
    expect(zero.state.quiz.lastScore).toBeLessThanOrEqual(5)
  })
})
