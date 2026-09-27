import { describe, expect, it } from 'vitest'
import { checkInWeek, levelProgress, nextEvolution, nextStreakMilestone } from './petProgress'
import type { GameEvent } from '../types/domain'

const checkIn = (date: string): GameEvent => ({ id: date, type: 'CHECK_IN', agentId: 'a', date, timestamp: `${date}T12:00:00Z` })

describe('petProgress', () => {
  it('measures progress inside the current level', () => {
    expect(levelProgress(175, 2)).toMatchObject({ intoLevel: 75, levelSpan: 150, toNext: 75, fraction: 0.5, isMax: false })
    expect(levelProgress(20000, 20).isMax).toBe(true)
  })

  it('marks the last 7 days that had a check-in, ending today', () => {
    const week = checkInWeek([checkIn('2026-09-20'), checkIn('2026-09-26'), checkIn('2026-09-10')], new Date('2026-09-26T15:00:00'))
    expect(week).toHaveLength(7)
    expect(week[0]!.key).toBe('2026-09-20')
    expect(week[0]!.checkedIn).toBe(true)
    expect(week[6]).toMatchObject({ key: '2026-09-26', checkedIn: true, isToday: true })
    expect(week.filter((d) => d.checkedIn)).toHaveLength(2)
  })

  it('finds the next streak milestone', () => {
    expect(nextStreakMilestone(0)).toMatchObject({ days: 3, daysToGo: 3 })
    expect(nextStreakMilestone(5)).toMatchObject({ days: 7, xp: 50, daysToGo: 2 })
    expect(nextStreakMilestone(90)).toBeNull()
  })

  it('finds the next evolution and the XP it needs', () => {
    expect(nextEvolution('Baby', 100)).toEqual({ stage: 'Young', atLevel: 5, xpToGo: 600 })
    expect(nextEvolution('Elite', 99999)).toBeNull()
  })
})
