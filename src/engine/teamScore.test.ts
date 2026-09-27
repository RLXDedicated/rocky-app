import { describe, expect, it } from 'vitest'
import type { TeamMemberStats, TeamSummary } from '../types/team'
import {
  calculateTeamMetrics,
  calculateTeamMood,
  calculateTeamScore,
  evaluateTeamEvolution,
  evolutionStageForTeamScore,
  rankTeams,
} from './teamScore'

function member(overrides: Partial<TeamMemberStats>): TeamMemberStats {
  return {
    agentId: 'a',
    currentStreak: 0,
    bestStreak: 0,
    achievementCount: 0,
    qaPassCount: 0,
    qaAlertCount: 0,
    totalPositiveActions: 0,
    ...overrides,
  }
}

describe('calculateTeamMetrics / calculateTeamScore', () => {
  it('is deterministic for the same input', () => {
    const members = [member({ agentId: 'a', currentStreak: 5, totalPositiveActions: 10 }), member({ agentId: 'b', currentStreak: 10 })]
    const run1 = calculateTeamScore(calculateTeamMetrics(members))
    const run2 = calculateTeamScore(calculateTeamMetrics(members))
    expect(run1).toBe(run2)
  })

  it('is independent of member order', () => {
    const a = member({ agentId: 'a', currentStreak: 5, totalPositiveActions: 12 })
    const b = member({ agentId: 'b', currentStreak: 15, totalPositiveActions: 20 })
    const score1 = calculateTeamScore(calculateTeamMetrics([a, b]))
    const score2 = calculateTeamScore(calculateTeamMetrics([b, a]))
    expect(score1).toBe(score2)
  })

  it('normalizes by size: a bigger team is not automatically favored', () => {
    const oneStrongMember = [member({ agentId: 'a', currentStreak: 20, totalPositiveActions: 20, qaPassCount: 10, achievementCount: 6 })]
    const manyWeakMembers = Array.from({ length: 10 }, (_, i) =>
      member({ agentId: `w${i}`, currentStreak: 1, totalPositiveActions: 2 }),
    )
    const smallTeamScore = calculateTeamScore(calculateTeamMetrics(oneStrongMember))
    const bigTeamScore = calculateTeamScore(calculateTeamMetrics(manyWeakMembers))
    expect(smallTeamScore).toBeGreaterThan(bigTeamScore)
  })

  it('two teams with the same average metrics score the same regardless of team size', () => {
    const smallTeam = [member({ agentId: 'a', currentStreak: 10, totalPositiveActions: 20 })]
    const largeTeamSameAverage = [
      member({ agentId: 'b1', currentStreak: 10, totalPositiveActions: 20 }),
      member({ agentId: 'b2', currentStreak: 10, totalPositiveActions: 20 }),
      member({ agentId: 'b3', currentStreak: 10, totalPositiveActions: 20 }),
    ]
    const scoreSmall = calculateTeamScore(calculateTeamMetrics(smallTeam))
    const scoreLarge = calculateTeamScore(calculateTeamMetrics(largeTeamSameAverage))
    expect(scoreSmall).toBe(scoreLarge)
  })

  it('increasing Participation alone increases the score', () => {
    const base = [member({ agentId: 'a', totalPositiveActions: 2 })]
    const improved = [member({ agentId: 'a', totalPositiveActions: 20 })]
    expect(calculateTeamScore(calculateTeamMetrics(improved))).toBeGreaterThan(
      calculateTeamScore(calculateTeamMetrics(base)),
    )
  })

  it('increasing Average Streak alone increases the score', () => {
    const base = [member({ agentId: 'a', currentStreak: 0 })]
    const improved = [member({ agentId: 'a', currentStreak: 30 })]
    expect(calculateTeamScore(calculateTeamMetrics(improved))).toBeGreaterThan(
      calculateTeamScore(calculateTeamMetrics(base)),
    )
  })

  it('increasing QA Pass Performance alone increases the score', () => {
    const base = [member({ agentId: 'a', qaPassCount: 1, qaAlertCount: 9 })]
    const improved = [member({ agentId: 'a', qaPassCount: 9, qaAlertCount: 1 })]
    expect(calculateTeamScore(calculateTeamMetrics(improved))).toBeGreaterThan(
      calculateTeamScore(calculateTeamMetrics(base)),
    )
  })

  it('increasing Engagement (achievements) alone increases the score', () => {
    const base = [member({ agentId: 'a', achievementCount: 0 })]
    const improved = [member({ agentId: 'a', achievementCount: 6 })]
    expect(calculateTeamScore(calculateTeamMetrics(improved))).toBeGreaterThan(
      calculateTeamScore(calculateTeamMetrics(base)),
    )
  })

  it('total XP does NOT directly determine the score — XP is not one of the inputs at all', () => {
    // TeamMemberStats has no xp field; a member with sky-high XP but poor
    // engagement/streak/participation scores no differently than one with 0 XP.
    const members = [member({ agentId: 'a', currentStreak: 0, totalPositiveActions: 0 })]
    const metrics = calculateTeamMetrics(members)
    // @ts-expect-error -- xp deliberately does not exist on TeamMemberStats
    expect(members[0].xp).toBeUndefined()
    expect(calculateTeamScore(metrics)).toBeLessThan(50)
  })
})

describe('evolutionStageForTeamScore / evaluateTeamEvolution', () => {
  it('maps score ranges to the documented stages', () => {
    expect(evolutionStageForTeamScore(10)).toBe('Baby')
    expect(evolutionStageForTeamScore(50)).toBe('Young')
    expect(evolutionStageForTeamScore(70)).toBe('Advanced')
    expect(evolutionStageForTeamScore(90)).toBe('Elite')
  })

  it('never regresses even if the live score drops', () => {
    const afterGoodStreak = evaluateTeamEvolution(90, 'Baby') // reaches Elite
    expect(afterGoodStreak).toBe('Elite')
    const afterDrop = evaluateTeamEvolution(20, afterGoodStreak) // score crashes to Baby-range
    expect(afterDrop).toBe('Elite') // still Elite — evolution is permanent
  })

  it('evolution does not depend on any single member — one member dipping only dents the aggregate, and the displayed stage never regresses', () => {
    const strongTeam = [
      member({ agentId: 'a', currentStreak: 25, bestStreak: 25, totalPositiveActions: 25, qaPassCount: 10, achievementCount: 6 }),
      member({ agentId: 'b', currentStreak: 25, bestStreak: 25, totalPositiveActions: 25, qaPassCount: 10, achievementCount: 6 }),
      member({ agentId: 'c', currentStreak: 25, bestStreak: 25, totalPositiveActions: 25, qaPassCount: 10, achievementCount: 6 }),
    ]
    const scoreBefore = calculateTeamScore(calculateTeamMetrics(strongTeam))
    const stageReached = evaluateTeamEvolution(scoreBefore, 'Baby')

    // One member gets a single Documentation Alert (reflected as one more
    // qaAlertCount and a broken current streak, dropping their own
    // improvement to 0) — the TEAM aggregate only dents, it doesn't collapse.
    const oneStruggling = [
      member({ agentId: 'a', currentStreak: 0, bestStreak: 25, totalPositiveActions: 25, qaPassCount: 10, qaAlertCount: 1, achievementCount: 6 }),
      strongTeam[1],
      strongTeam[2],
    ]
    const scoreAfter = calculateTeamScore(calculateTeamMetrics(oneStruggling))

    expect(scoreBefore - scoreAfter).toBeLessThan(15) // a dent, not a collapse
    // Whatever the live score does, the displayed Evolution stage — driven
    // through evaluateTeamEvolution's ratchet — never regresses because of it.
    expect(evaluateTeamEvolution(scoreAfter, stageReached)).toBe(stageReached)
  })
})

describe('calculateTeamMood', () => {
  it('is Happy with a high score and high participation', () => {
    expect(calculateTeamMood(85, 80, null)).toBe('Happy')
  })

  it('is Motivated with a healthy-but-not-exceptional score', () => {
    expect(calculateTeamMood(60, 50, null)).toBe('Motivated')
  })

  it('is Worried with a low score', () => {
    expect(calculateTeamMood(30, 50, null)).toBe('Worried')
  })

  it('is Worried with low participation even if the score looks okay', () => {
    expect(calculateTeamMood(60, 10, null)).toBe('Worried')
  })

  it('is Recovery when climbing back up from a recent low score', () => {
    expect(calculateTeamMood(60, 50, 40)).toBe('Recovery')
  })

  it('is NOT Recovery if the score is not actually improving', () => {
    expect(calculateTeamMood(40, 50, 45)).not.toBe('Recovery')
  })
})

describe('rankTeams', () => {
  function team(overrides: Partial<TeamSummary>): TeamSummary {
    return {
      id: 't',
      name: 'Team',
      memberCount: 1,
      score: 0,
      evolutionStage: 'Baby',
      mood: 'Motivated',
      metrics: { participation: 0, averageStreak: 0, averageStreakScore: 0, qaPassRate: 0, improvement: 0, engagement: 0 },
      ...overrides,
    }
  }

  it('orders teams by score, descending', () => {
    const ranked = rankTeams([
      team({ id: 'low', score: 30 }),
      team({ id: 'high', score: 90 }),
      team({ id: 'mid', score: 60 }),
    ])
    expect(ranked.map((t) => t.id)).toEqual(['high', 'mid', 'low'])
  })

  it('breaks a score tie deterministically by id', () => {
    const run1 = rankTeams([team({ id: 'zeta', score: 50 }), team({ id: 'alpha', score: 50 })])
    const run2 = rankTeams([team({ id: 'zeta', score: 50 }), team({ id: 'alpha', score: 50 })])
    expect(run1.map((t) => t.id)).toEqual(['alpha', 'zeta'])
    expect(run2.map((t) => t.id)).toEqual(run1.map((t) => t.id))
  })
})
