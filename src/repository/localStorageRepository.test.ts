import { beforeEach, describe, expect, it } from 'vitest'
import { INITIAL_GAME_STATE } from '../types/domain'
import { LocalStorageRepository } from './localStorageRepository'

describe('LocalStorageRepository — corruption hardening (Phase 9 §Rule 9)', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('never throws and falls back to a clean state when gameState JSON is invalid', () => {
    window.localStorage.setItem('rocky.gameState', '{not valid json')
    const repo = new LocalStorageRepository()
    expect(() => repo.getGameState()).not.toThrow()
    expect(repo.getGameState()).toEqual(INITIAL_GAME_STATE)
  })

  it('recovers a partially-corrupted gameState instead of discarding all of it', () => {
    window.localStorage.setItem(
      'rocky.gameState',
      JSON.stringify({ ...INITIAL_GAME_STATE, xp: 900, level: 5, energy: 9999 }),
    )
    const repo = new LocalStorageRepository()
    const state = repo.getGameState()
    expect(state.xp).toBe(900)
    expect(state.level).toBe(5)
    expect(state.energy).toBe(100) // clamped, not discarded
  })

  it('never throws when events is missing, null, or a non-array value', () => {
    const repo = new LocalStorageRepository()
    expect(repo.getEvents()).toEqual([])

    window.localStorage.setItem('rocky.events', 'null')
    expect(repo.getEvents()).toEqual([])

    window.localStorage.setItem('rocky.events', '"not-an-array"')
    expect(() => repo.getEvents()).not.toThrow()
    expect(repo.getEvents()).toEqual([])
  })

  it('drops only the malformed events, keeping valid ones readable', () => {
    window.localStorage.setItem(
      'rocky.events',
      JSON.stringify([
        { id: 'ok', type: 'CHECK_IN', agentId: 'a', date: '2026-01-01', timestamp: '2026-01-01T00:00:00.000Z' },
        { id: 'broken' }, // missing required fields
      ]),
    )
    const repo = new LocalStorageRepository()
    const events = repo.getEvents()
    expect(events).toHaveLength(1)
    expect(events[0].id).toBe('ok')
  })

  it('falls back to the default agent when the agent record is malformed', () => {
    window.localStorage.setItem('rocky.agent', JSON.stringify({ id: 'a' })) // missing name/rockyName
    const repo = new LocalStorageRepository()
    expect(repo.getAgent().rockyName).toBe('Rocky')
  })
})

describe('LocalStorageRepository — idempotent writes (Phase 9 §Rule 6)', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('saveEvent never inserts the same event id twice', () => {
    const repo = new LocalStorageRepository()
    const event = { id: 'evt-1', type: 'CHECK_IN' as const, agentId: 'a', date: '2026-01-01', timestamp: '2026-01-01T00:00:00.000Z' }
    repo.saveEvent(event)
    repo.saveEvent(event) // duplicate id, e.g. a retried write
    repo.saveEvent({ ...event, payload: { different: true } }) // same id, different payload
    expect(repo.getEvents()).toHaveLength(1)
  })

  it('saveAchievement never inserts the same achievement id twice', () => {
    const repo = new LocalStorageRepository()
    const achievement = { id: 'first_step', name: 'First Step', description: 'x', unlockedAt: '2026-01-01T00:00:00.000Z' }
    repo.saveAchievement(achievement)
    repo.saveAchievement(achievement)
    expect(repo.getAchievements()).toHaveLength(1)
  })

  it('saveReminder never inserts the same reminder id twice', () => {
    const repo = new LocalStorageRepository()
    const reminder = {
      id: 'rem-1',
      category: 'Documentation' as const,
      message: 'hi',
      timestamp: '2026-01-01T00:00:00.000Z',
      status: 'sent' as const,
      actionable: true,
    }
    repo.saveReminder(reminder)
    repo.saveReminder(reminder)
    expect(repo.getReminders()).toHaveLength(1)
  })
})
