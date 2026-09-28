import { describe, expect, it } from 'vitest'
import { CLOSET, DEFAULT_OUTFIT, MAX_DECOR, resolveCatalog, sanitizeOutfit, type ProgressFacts } from './closet'
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
  hostSide,
  refreshPetState,
  spawnLitter,
  unreadInbox,
  visitorSide,
  type PetAction,
  type PetState,
} from './pet'
import { GAME_CAPS, keepyReward, litterReward, LITTER } from './pantry'

const NOW = new Date('2026-09-08T12:00:00.000Z')
const newbie: ProgressFacts = { level: 1, stage: 'Baby', bestStreak: 0, checkIns: 0, qaPasses: 0, badgeIds: [] }
const worker: ProgressFacts = { level: 3, stage: 'Baby', bestStreak: 7, checkIns: 8, qaPasses: 2, badgeIds: ['first_step'] }

function run(state: PetState, action: PetAction, facts = worker, now = NOW) {
  return applyPetAction(state, action, { facts, now })
}

describe('shop catalogue', () => {
  it('starts with only the starter items unlocked', () => {
    const unlocked = CLOSET.filter((i) => !i.season && i.isUnlocked(newbie)).map((i) => i.id)
    expect(unlocked).toEqual(['hat-rlx-cap', 'neck-lanyard', 'scene-route', 'decor-boxes', 'decor-bowl'])
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
    expect(outfit).toEqual({ ...DEFAULT_OUTFIT, hat: null, decor: ['decor-boxes'] })
  })
})

describe('placed items (Pet Society style)', () => {
  it('keeps positions only for placed items, clamped to the stage', () => {
    const outfit = sanitizeOutfit(
      { ...DEFAULT_OUTFIT, decor: ['decor-boxes', 'decor-bowl'], spots: { 'decor-boxes': 140, 'decor-bowl': 33.33, 'decor-barn': 50 } },
      worker,
      [],
    )
    expect(outfit.spots).toEqual({ 'decor-boxes': 95, 'decor-bowl': 33.3 })
  })

  it('drops junk positions and allows up to six items', () => {
    const outfit = sanitizeOutfit({ ...DEFAULT_OUTFIT, spots: { 'decor-boxes': Number.NaN, 'decor-bowl': 'x' } as never }, worker, [])
    expect(outfit.spots).toEqual({})
    expect(MAX_DECOR).toBe(6)
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

describe('inventory, soaps and the mini-games', () => {
  it('feeds foods from the bag and only bathes with soaps the agent has', () => {
    let s = initialPetState(NOW)
    expect(s.inventory).toEqual({ 'soap-basic': 1, 'food-apple': 2 })
    s = { ...s, needs: { ...s.needs, health: 50 } }
    const fed = run(s, { type: 'feed', food: 'food-apple' })
    expect(fed.ok && fed.state.inventory['food-apple']).toBe(1)
    expect(fed.state.needs.health).toBe(60)
    expect(run(s, { type: 'feed', food: 'food-cake' })).toMatchObject({ ok: false, reason: 'no-food' })
    expect(run(s, { type: 'bath', soap: 'soap-lavender' })).toMatchObject({ ok: false, reason: 'no-soap' })
    expect(run(s, { type: 'bath' }).ok).toBe(true)
  })

  it('pays keep-it-up streaks by tiers, clamps silly numbers and caps the day', () => {
    expect(keepyReward(2)).toEqual({ coins: 0, xp: 0 })
    expect(keepyReward(5)).toEqual({ coins: 1, xp: 1 })
    expect(keepyReward(20)).toEqual({ coins: 6 + 3 + 5, xp: 3 })
    let s = initialPetState(NOW)
    let coins = 0
    let xp = 0
    for (let i = 0; i < 20; i++) {
      const r = run(s, { type: 'keepy', touches: 999 })
      if (!r.ok) throw new Error('keepy failed')
      s = r.state
      coins += r.reward?.coins ?? 0
      xp += r.xp?.xp ?? 0
    }
    expect(coins).toBe(GAME_CAPS.coins)
    expect(xp).toBe(GAME_CAPS.xp)
    expect(s.games.bestKeepy).toBe(80)
    // A new day, new caps.
    const tomorrow = new Date(NOW.getTime() + 86_400_000)
    const r = run(s, { type: 'keepy', touches: 10 }, worker, tomorrow)
    expect(r.ok && r.reward).toEqual(keepyReward(10))
  })

  it('drops litter deterministically every few hours, never more than the max', () => {
    const s = initialPetState(NOW)
    const later = new Date(NOW.getTime() + 100 * 3_600_000)
    const a = spawnLitter(s.litter, later)
    const b = spawnLitter(s.litter, later)
    expect(a).toEqual(b)
    expect(a.items).toHaveLength(LITTER.max)
    expect(new Set(a.items.map((i) => i.id)).size).toBe(LITTER.max)
    const withLitter = refreshPetState(s, later)
    const piece = withLitter.litter.items[0]!
    const picked = run(withLitter, { type: 'litter', id: piece.id }, worker, later)
    expect(picked.ok && picked.reward?.coins).toBe(litterReward(piece.id, s.litter.seed).coins)
    expect(run(picked.state, { type: 'litter', id: piece.id }, worker, later)).toMatchObject({ ok: false, reason: 'gone' })
  })

  it('gives old saves the starter bag and a little litter', () => {
    const old = normalizePetState({ outfit: DEFAULT_OUTFIT, needs: { health: 90, happiness: 80, dirt: 10, updatedAt: NOW.toISOString() } }, NOW)
    expect(old.inventory['soap-basic']).toBe(1)
    expect(refreshPetState(old, NOW).litter.items.length).toBe(2)
  })
})

describe('visits between friends', () => {
  it('pays the visitor once per friend a day and cheers the host up', () => {
    const me = initialPetState(NOW)
    const first = visitorSide(me, 'f-1', 'wave', worker, NOW)
    expect(first.ok && first.reward?.coins).toBe(2)
    const again = visitorSide(first.state, 'f-1', 'pet', worker, NOW)
    expect(again.ok && again.reward?.coins).toBe(0)
    const treat = visitorSide(first.state, 'f-2', 'treat', worker, NOW)
    expect(treat.ok && treatsAvailable(treat.state, worker)).toBe(treatsAvailable(first.state, worker) - 1)
    expect(visitorSide(me, 'f-3', 'treat', newbie, NOW)).toMatchObject({ ok: false, reason: 'no-treats' })

    const host = hostSide(initialPetState(NOW), 'Ana Diaz', 'treat', NOW)
    expect(host.bonusTreats).toBe(1)
    expect(unreadInbox(host)).toHaveLength(1)
    expect(host.inbox[0]!.text).toContain('Ana Diaz')
    const read = run(host, { type: 'readInbox' }, worker, new Date(NOW.getTime() + 1000))
    expect(unreadInbox(read.state)).toHaveLength(0)
  })
})
