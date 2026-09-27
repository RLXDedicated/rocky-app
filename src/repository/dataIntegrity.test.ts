import { beforeEach, describe, expect, it } from 'vitest'
import { recalculateStateFromEvents } from '../engine/gameEngine'
import { GameService } from '../services/gameService'
import { LocalStorageRepository } from './localStorageRepository'

describe('Data integrity (Phase 10 §Rule 19)', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('replays correctly even when events are stored in scrambled (non-chronological) order', () => {
    const repo = new LocalStorageRepository()
    const service = new GameService(repo)
    service.checkIn(new Date('2026-09-01T09:00:00'))
    service.qaPass(new Date('2026-09-02T09:00:00'))
    service.checkIn(new Date('2026-09-03T09:00:00'))

    const inOrder = repo.getEvents()
    const scrambled = [...inOrder].reverse()

    const replayedInOrder = recalculateStateFromEvents(inOrder, inOrder[0].agentId)
    const replayedScrambled = recalculateStateFromEvents(scrambled, inOrder[0].agentId)

    // recalculateStateFromEvents sorts by timestamp internally, so array
    // order in storage must never matter.
    expect(replayedScrambled).toEqual(replayedInOrder)
  })

  it('an unrecognized/missing schemaVersion value never breaks reads', () => {
    window.localStorage.setItem('rocky.schemaVersion', '999') // "from the future"
    const repo = new LocalStorageRepository()
    expect(() => repo.getGameState()).not.toThrow()
    expect(() => repo.getEvents()).not.toThrow()

    window.localStorage.removeItem('rocky.schemaVersion') // absent entirely
    expect(() => repo.getGameState()).not.toThrow()
  })

  it('a partially-missing collection (achievements absent, events present) does not crash the app', () => {
    const repo = new LocalStorageRepository()
    const service = new GameService(repo)
    service.checkIn(new Date('2026-09-01T09:00:00')) // writes events + achievements + gameState
    window.localStorage.removeItem('rocky.achievements')

    expect(() => repo.getAchievements()).not.toThrow()
    expect(repo.getAchievements()).toEqual([])
    // The rest of the snapshot is unaffected by the missing collection.
    expect(repo.getGameState().xp).toBe(35)
    expect(repo.getEvents().length).toBeGreaterThan(0)
  })

  it('an event with an unrecognized/invalid payload shape is still replayable (payload is opaque to the Repository)', () => {
    const repo = new LocalStorageRepository()
    const weirdEvent = {
      id: 'evt-weird',
      type: 'CHECK_IN' as const,
      agentId: 'local-agent',
      date: '2026-09-01',
      timestamp: '2026-09-01T09:00:00.000Z',
      payload: { unexpectedField: { nested: true }, xpGained: 'not-a-number' },
    }
    repo.saveEvent(weirdEvent)
    expect(() => repo.getEvents()).not.toThrow()
    expect(() => recalculateStateFromEvents(repo.getEvents(), 'local-agent')).not.toThrow()
  })

  it('an empty event history replays to a valid initial-equivalent state without crashing', () => {
    expect(() => recalculateStateFromEvents([], 'local-agent')).not.toThrow()
    const state = recalculateStateFromEvents([], 'local-agent')
    expect(state.xp).toBe(0)
    expect(state.level).toBe(1)
  })
})
