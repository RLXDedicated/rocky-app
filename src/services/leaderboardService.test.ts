import { beforeEach, describe, expect, it } from 'vitest'
import { LocalStorageRepository } from '../repository/localStorageRepository'
import { GameService } from './gameService'
import { getIndividualLeaderboard, getIndividualLeaderboardWithRankChange } from './leaderboardService'
import { MOCK_AGENTS } from './mockAgents'

describe('getIndividualLeaderboard', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('includes the current user exactly once, correctly identified', () => {
    const repo = new LocalStorageRepository()
    const entries = getIndividualLeaderboard(repo)
    const currentUserEntries = entries.filter((e) => e.isCurrentUser)
    expect(currentUserEntries).toHaveLength(1)
    expect(currentUserEntries[0].agentId).toBe(repo.getAgent().id)
  })

  it('includes every mock agent plus the current user', () => {
    const entries = getIndividualLeaderboard(new LocalStorageRepository())
    expect(entries).toHaveLength(MOCK_AGENTS.length + 1)
  })

  it("computes the current user's rank correctly relative to fixed mock competitors", () => {
    const repo = new LocalStorageRepository()
    const service = new GameService(repo)
    // Push the local agent to exactly Level 12's threshold — strictly above
    // Alex/Maria (Level 2/6), strictly below James/Sarah (Level 12/20 with
    // higher XP), landing at a clearly predictable rank.
    service.devTriggerLevel(12)

    const entries = getIndividualLeaderboard(repo)
    const me = entries.find((e) => e.isCurrentUser)
    // Ties James on Level 12; James has more XP (3900 vs the exact
    // threshold), so James ranks above — the local agent lands at #3
    // (behind Sarah #1 and James #2, ahead of Maria and Alex).
    expect(me?.rank).toBe(3)
  })

  it('never modifies GameState, XP, Energy, Streak, or the event log — read-only', () => {
    const repo = new LocalStorageRepository()
    const service = new GameService(repo)
    service.checkIn(new Date('2026-09-04T09:00:00'))

    const beforeState = repo.getGameState()
    const beforeEvents = repo.getEvents()

    getIndividualLeaderboard(repo)
    getIndividualLeaderboardWithRankChange(repo)

    expect(repo.getGameState()).toEqual(beforeState)
    expect(repo.getEvents()).toEqual(beforeEvents)
    expect(repo.getEvents()).toHaveLength(beforeEvents.length) // no new events generated
  })

  it('reflects the persisted state correctly after a fresh service/repository instance (reload)', () => {
    const service = new GameService(new LocalStorageRepository())
    service.checkIn(new Date('2026-09-04T09:00:00'))

    const reopenedRepo = new LocalStorageRepository()
    const entries = getIndividualLeaderboard(reopenedRepo)
    const me = entries.find((e) => e.isCurrentUser)
    expect(me?.xp).toBe(35) // +10 check-in + 25 First Step, same as gameService.test.ts
    expect(me?.currentStreak).toBe(1)
  })

  it('a Documentation Alert does not remove the user from the leaderboard or crash ranking', () => {
    const repo = new LocalStorageRepository()
    const service = new GameService(repo)
    service.checkIn(new Date('2026-09-04T09:00:00'))
    service.documentationAlert(new Date('2026-09-04T10:00:00'))

    const entries = getIndividualLeaderboard(repo)
    const me = entries.find((e) => e.isCurrentUser)
    expect(me).toBeDefined()
    expect(me?.currentStreak).toBe(0) // reflects the real, current streak — not artificially lowered further
    expect(me?.xp).toBe(35) // alert never removes XP
  })
})

describe('getIndividualLeaderboardWithRankChange', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('reports "first-time" the first time the leaderboard is viewed', () => {
    const result = getIndividualLeaderboardWithRankChange(new LocalStorageRepository())
    expect(result.rankChange).toBe('first-time')
  })

  it('reports "same" when rank has not changed since the last view', () => {
    const repo = new LocalStorageRepository()
    getIndividualLeaderboardWithRankChange(repo)
    const second = getIndividualLeaderboardWithRankChange(repo)
    expect(second.rankChange).toBe('same')
  })

  it('reports "up" when the user climbs the ranking', () => {
    const repo = new LocalStorageRepository()
    const service = new GameService(repo)
    getIndividualLeaderboardWithRankChange(repo) // establish baseline rank (last, at Level 1)

    service.devTriggerLevel(20) // now ties for the top
    const after = getIndividualLeaderboardWithRankChange(repo)
    expect(after.rankChange).toBe('up')
  })
})
