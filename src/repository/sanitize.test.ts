import { describe, expect, it } from 'vitest'
import { INITIAL_GAME_STATE } from '../types/domain'
import { isValidAgent, sanitizeAchievements, sanitizeEvents, sanitizeGameState, sanitizeReminders } from './sanitize'

describe('sanitizeGameState', () => {
  it('returns a fresh initial state for non-object input', () => {
    expect(sanitizeGameState(null)).toEqual(INITIAL_GAME_STATE)
    expect(sanitizeGameState('corrupt')).toEqual(INITIAL_GAME_STATE)
    expect(sanitizeGameState(42)).toEqual(INITIAL_GAME_STATE)
    expect(sanitizeGameState(undefined)).toEqual(INITIAL_GAME_STATE)
  })

  it('passes through a fully valid state unchanged', () => {
    const valid = { ...INITIAL_GAME_STATE, xp: 500, level: 3, currentStreak: 4, bestStreak: 9 }
    expect(sanitizeGameState(valid)).toEqual(valid)
  })

  it('clamps Energy outside 0-100', () => {
    expect(sanitizeGameState({ ...INITIAL_GAME_STATE, energy: 500 }).energy).toBe(100)
    expect(sanitizeGameState({ ...INITIAL_GAME_STATE, energy: -50 }).energy).toBe(0)
  })

  it('falls back to the default level for a negative or non-numeric level', () => {
    expect(sanitizeGameState({ ...INITIAL_GAME_STATE, level: -3 }).level).toBe(INITIAL_GAME_STATE.level)
    expect(sanitizeGameState({ ...INITIAL_GAME_STATE, level: 'ten' }).level).toBe(INITIAL_GAME_STATE.level)
  })

  it('falls back to the default mood for an unrecognized string', () => {
    expect(sanitizeGameState({ ...INITIAL_GAME_STATE, mood: 'Ecstatic' }).mood).toBe(INITIAL_GAME_STATE.mood)
  })

  it('falls back to the default evolution stage for an unrecognized string', () => {
    expect(sanitizeGameState({ ...INITIAL_GAME_STATE, evolutionStage: 'Ultimate' }).evolutionStage).toBe(
      INITIAL_GAME_STATE.evolutionStage,
    )
  })

  it('keeps valid fields even when one sibling field is corrupted (partial recovery)', () => {
    const result = sanitizeGameState({ ...INITIAL_GAME_STATE, xp: 1200, level: 6, energy: 'not-a-number' })
    expect(result.xp).toBe(1200)
    expect(result.level).toBe(6)
    expect(result.energy).toBe(INITIAL_GAME_STATE.energy)
  })

  it('rejects a negative streak', () => {
    expect(sanitizeGameState({ ...INITIAL_GAME_STATE, currentStreak: -1 }).currentStreak).toBe(0)
  })

  it('floors a fractional streak/level (defensive against hand-edited JSON)', () => {
    expect(sanitizeGameState({ ...INITIAL_GAME_STATE, currentStreak: 4.9 }).currentStreak).toBe(4)
  })
})

describe('sanitizeEvents', () => {
  it('returns an empty array for non-array input', () => {
    expect(sanitizeEvents(null)).toEqual([])
    expect(sanitizeEvents({})).toEqual([])
  })

  it('drops individually malformed entries but keeps valid ones', () => {
    const valid = { id: 'e1', type: 'CHECK_IN', agentId: 'a', date: '2026-01-01', timestamp: '2026-01-01T00:00:00.000Z' }
    const malformed = { id: 'e2', type: 'CHECK_IN' } // missing agentId/date/timestamp
    expect(sanitizeEvents([valid, malformed, 'not-an-object'])).toEqual([valid])
  })
})

describe('sanitizeAchievements', () => {
  it('drops malformed entries', () => {
    const valid = { id: 'first_step', name: 'First Step', description: 'x', unlockedAt: '2026-01-01T00:00:00.000Z' }
    expect(sanitizeAchievements([valid, { id: 'broken' }])).toEqual([valid])
  })
})

describe('sanitizeReminders', () => {
  it('drops malformed entries', () => {
    const valid = {
      id: 'r1',
      category: 'Documentation',
      message: 'hi',
      timestamp: '2026-01-01T00:00:00.000Z',
      status: 'sent',
      actionable: true,
    }
    expect(sanitizeReminders([valid, { id: 'broken' }])).toEqual([valid])
  })
})

describe('isValidAgent', () => {
  it('accepts a well-formed agent', () => {
    expect(isValidAgent({ id: 'a', name: 'Agent', rockyName: 'Rocky' })).toBe(true)
  })

  it('rejects a malformed agent', () => {
    expect(isValidAgent({ id: 'a' })).toBe(false)
    expect(isValidAgent(null)).toBe(false)
    expect(isValidAgent('Rocky')).toBe(false)
  })
})
