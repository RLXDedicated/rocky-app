import { beforeEach, describe, expect, it } from 'vitest'
import { CLOSET, DEFAULT_OUTFIT, loadOutfit, sanitizeOutfit, saveOutfit, type ProgressFacts } from './closet'
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

  it('persists the outfit and drops items the agent no longer qualifies for', () => {
    saveOutfit({ hat: 'hat-crown', scene: 'scene-night', decor: ['decor-boxes', 'decor-trophy'] })
    expect(loadOutfit().hat).toBe('hat-crown')
    expect(sanitizeOutfit(loadOutfit(), newbie)).toEqual({ hat: null, scene: DEFAULT_OUTFIT.scene, decor: ['decor-boxes'] })
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
  })

  it('never goes past the daily heart maximum', () => {
    let s = loadCare()
    for (let i = 0; i < 20; i++) s = play(s)
    expect(s.hearts).toBe(MAX_HEARTS)
  })
})
