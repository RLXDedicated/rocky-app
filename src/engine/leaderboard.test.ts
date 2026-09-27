import { describe, expect, it } from 'vitest'
import type { LeaderboardAgent } from '../types/leaderboard'
import { findCurrentUserEntry, rankLeaderboardEntries, xpGapToNextRank } from './leaderboard'

function agent(overrides: Partial<LeaderboardAgent>): LeaderboardAgent {
  return {
    agentId: 'a',
    name: 'Agent',
    rockyName: 'Rocky',
    level: 1,
    xp: 0,
    currentStreak: 0,
    bestStreak: 0,
    evolutionStage: 'Baby',
    achievementCount: 0,
    isCurrentUser: false,
    ...overrides,
  }
}

describe('rankLeaderboardEntries', () => {
  it('orders by Level, descending', () => {
    const entries = rankLeaderboardEntries([
      agent({ agentId: 'low', level: 2 }),
      agent({ agentId: 'high', level: 8 }),
      agent({ agentId: 'mid', level: 5 }),
    ])
    expect(entries.map((e) => e.agentId)).toEqual(['high', 'mid', 'low'])
    expect(entries.map((e) => e.rank)).toEqual([1, 2, 3])
  })

  it('breaks a Level tie by XP, descending', () => {
    const entries = rankLeaderboardEntries([
      agent({ agentId: 'a', level: 5, xp: 750 }),
      agent({ agentId: 'b', level: 5, xp: 900 }),
    ])
    expect(entries.map((e) => e.agentId)).toEqual(['b', 'a'])
  })

  it('breaks a Level+XP tie by Current Streak, descending', () => {
    const entries = rankLeaderboardEntries([
      agent({ agentId: 'a', level: 5, xp: 700, currentStreak: 2 }),
      agent({ agentId: 'b', level: 5, xp: 700, currentStreak: 9 }),
    ])
    expect(entries.map((e) => e.agentId)).toEqual(['b', 'a'])
  })

  it('breaks a Level+XP+Streak tie by Best Streak, descending', () => {
    const entries = rankLeaderboardEntries([
      agent({ agentId: 'a', level: 5, xp: 700, currentStreak: 3, bestStreak: 3 }),
      agent({ agentId: 'b', level: 5, xp: 700, currentStreak: 3, bestStreak: 10 }),
    ])
    expect(entries.map((e) => e.agentId)).toEqual(['b', 'a'])
  })

  it('falls back to agentId (ascending) as a final, stable tiebreaker on an exact tie', () => {
    const entries = rankLeaderboardEntries([
      agent({ agentId: 'zeta', level: 5, xp: 700, currentStreak: 3, bestStreak: 3 }),
      agent({ agentId: 'alpha', level: 5, xp: 700, currentStreak: 3, bestStreak: 3 }),
    ])
    expect(entries.map((e) => e.agentId)).toEqual(['alpha', 'zeta'])
  })

  it('is deterministic — the same input always produces the same order', () => {
    const input = [
      agent({ agentId: 'a', level: 5, xp: 700 }),
      agent({ agentId: 'b', level: 8, xp: 100 }),
      agent({ agentId: 'c', level: 8, xp: 100 }),
    ]
    const run1 = rankLeaderboardEntries(input).map((e) => e.agentId)
    const run2 = rankLeaderboardEntries(input).map((e) => e.agentId)
    expect(run1).toEqual(run2)
  })

  it('does not mutate the input array', () => {
    const input = [agent({ agentId: 'b', level: 1 }), agent({ agentId: 'a', level: 5 })]
    const inputCopy = [...input]
    rankLeaderboardEntries(input)
    expect(input).toEqual(inputCopy)
  })
})

describe('findCurrentUserEntry', () => {
  it('identifies the current user entry correctly', () => {
    const entries = rankLeaderboardEntries([
      agent({ agentId: 'mock-1', level: 8 }),
      agent({ agentId: 'me', level: 5, isCurrentUser: true }),
    ])
    const me = findCurrentUserEntry(entries)
    expect(me?.agentId).toBe('me')
    expect(me?.rank).toBe(2)
  })

  it('returns undefined when no entry is the current user', () => {
    const entries = rankLeaderboardEntries([agent({ agentId: 'mock-1' })])
    expect(findCurrentUserEntry(entries)).toBeUndefined()
  })
})

describe('xpGapToNextRank', () => {
  it('returns the XP needed to overtake the agent one rank above', () => {
    const entries = rankLeaderboardEntries([
      agent({ agentId: 'above', level: 6, xp: 1050 }),
      agent({ agentId: 'me', level: 6, xp: 1000, isCurrentUser: true }),
    ])
    expect(xpGapToNextRank(entries)).toBe(51)
  })

  it('returns null when the current user is already #1', () => {
    const entries = rankLeaderboardEntries([
      agent({ agentId: 'me', level: 10, xp: 5000, isCurrentUser: true }),
      agent({ agentId: 'below', level: 2 }),
    ])
    expect(xpGapToNextRank(entries)).toBeNull()
  })

  it('returns null when there is no current user in the list', () => {
    const entries = rankLeaderboardEntries([agent({ agentId: 'a' }), agent({ agentId: 'b' })])
    expect(xpGapToNextRank(entries)).toBeNull()
  })
})
