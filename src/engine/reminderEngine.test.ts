import { describe, expect, it } from 'vitest'
import { DEFAULT_AGENT_ID, INITIAL_GAME_STATE, type GameEvent, type GameState } from '../types/domain'
import { DEFAULT_WORKING_HOURS, type ReminderRecord } from '../types/reminder'
import {
  contextualCategoryPair,
  effectiveCooldownMinutes,
  evaluateReminderOpportunity,
  findPendingCelebration,
  hasReachedDailyLimit,
  isInCooldown,
  isRecoveryEligible,
  isSuppressedByRecentPositiveAction,
  isWithinWorkingHours,
  reminderCountToday,
} from './reminderEngine'

// Wednesday, within 08:00-18:00.
const WORK_TIME = new Date('2026-09-09T10:00:00')
// Sunday.
const WEEKEND_TIME = new Date('2026-09-06T10:00:00')
// Wednesday, 20:00 — after hours.
const AFTER_HOURS_TIME = new Date('2026-09-09T20:00:00')

function record(overrides: Partial<ReminderRecord>): ReminderRecord {
  return {
    id: 'r1',
    category: 'Documentation',
    message: 'test',
    timestamp: WORK_TIME.toISOString(),
    status: 'sent',
    actionable: true,
    ...overrides,
  }
}

function state(overrides: Partial<GameState>): GameState {
  return { ...INITIAL_GAME_STATE, ...overrides }
}

describe('isWithinWorkingHours', () => {
  it('is eligible during working hours on a weekday', () => {
    expect(isWithinWorkingHours(WORK_TIME, DEFAULT_WORKING_HOURS)).toBe(true)
  })

  it('is not eligible after hours on a weekday', () => {
    expect(isWithinWorkingHours(AFTER_HOURS_TIME, DEFAULT_WORKING_HOURS)).toBe(false)
  })

  it('is not eligible on a weekend', () => {
    expect(isWithinWorkingHours(WEEKEND_TIME, DEFAULT_WORKING_HOURS)).toBe(false)
  })

  it('is not eligible exactly at the end time (exclusive upper bound)', () => {
    expect(isWithinWorkingHours(new Date('2026-09-09T18:00:00'), DEFAULT_WORKING_HOURS)).toBe(false)
  })

  it('is eligible exactly at the start time (inclusive lower bound)', () => {
    expect(isWithinWorkingHours(new Date('2026-09-09T08:00:00'), DEFAULT_WORKING_HOURS)).toBe(true)
  })
})

describe('cooldown', () => {
  it('blocks a reminder sent 30 minutes ago', () => {
    const sentAt = new Date(WORK_TIME.getTime() - 30 * 60_000)
    const history = [record({ timestamp: sentAt.toISOString() })]
    expect(isInCooldown(WORK_TIME, history)).toBe(true)
  })

  it('allows a reminder once 90 minutes have passed', () => {
    const sentAt = new Date(WORK_TIME.getTime() - 90 * 60_000)
    const history = [record({ timestamp: sentAt.toISOString() })]
    expect(isInCooldown(WORK_TIME, history)).toBe(false)
  })

  it('allows a reminder when there is no history at all', () => {
    expect(isInCooldown(WORK_TIME, [])).toBe(false)
  })

  it('doubles the cooldown when the last 3 reminders were all ignored (adaptive frequency)', () => {
    const ignored = [
      record({ id: 'a', status: 'sent' }),
      record({ id: 'b', status: 'dismissed' }),
      record({ id: 'c', status: 'sent' }),
    ]
    expect(effectiveCooldownMinutes(ignored)).toBe(180)
  })

  it('keeps the normal cooldown if any of the last 3 reminders were engaged with', () => {
    const engaged = [
      record({ id: 'a', status: 'sent' }),
      record({ id: 'b', status: 'acted' }),
      record({ id: 'c', status: 'sent' }),
    ]
    expect(effectiveCooldownMinutes(engaged)).toBe(90)
  })
})

describe('daily frequency', () => {
  it('counts only reminders sent on the same local day', () => {
    const history = [
      record({ id: 'a', timestamp: '2026-09-09T09:00:00.000Z' }),
      record({ id: 'b', timestamp: '2026-09-08T09:00:00.000Z' }),
    ]
    expect(reminderCountToday(history, new Date('2026-09-09T15:00:00'))).toBe(1)
  })

  it('respects the daily limit of 3', () => {
    const history = Array.from({ length: 3 }, (_, i) => record({ id: `r${i}`, timestamp: WORK_TIME.toISOString() }))
    expect(hasReachedDailyLimit(history, WORK_TIME)).toBe(true)
  })

  it('does not report the limit reached below 3', () => {
    const history = Array.from({ length: 2 }, (_, i) => record({ id: `r${i}`, timestamp: WORK_TIME.toISOString() }))
    expect(hasReachedDailyLimit(history, WORK_TIME)).toBe(false)
  })
})

describe('suppression', () => {
  it('suppresses right after a Check-in / positive action', () => {
    const s = state({ lastPositiveActionAt: new Date(WORK_TIME.getTime() - 5 * 60_000).toISOString() })
    expect(isSuppressedByRecentPositiveAction(WORK_TIME, s)).toBe(true)
  })

  it('stops suppressing once enough time has passed since the positive action', () => {
    const s = state({ lastPositiveActionAt: new Date(WORK_TIME.getTime() - 45 * 60_000).toISOString() })
    expect(isSuppressedByRecentPositiveAction(WORK_TIME, s)).toBe(false)
  })

  it('the full evaluator suppresses immediately after a Check-in even if otherwise eligible', () => {
    const s = state({ lastPositiveActionAt: WORK_TIME.toISOString(), currentStreak: 0 })
    const result = evaluateReminderOpportunity({ now: WORK_TIME, state: s, events: [], history: [], agentId: DEFAULT_AGENT_ID })
    expect(result).toBeNull()
  })

  it('the full evaluator suppresses outside working hours', () => {
    const s = state({})
    const result = evaluateReminderOpportunity({ now: AFTER_HOURS_TIME, state: s, events: [], history: [], agentId: DEFAULT_AGENT_ID })
    expect(result).toBeNull()
  })

  it('a Documentation/Streak nudge falls back to Progress once the corresponding action is already done today', () => {
    // streak 3 -> Motivated mood -> [Streak, Progress] pair; already checked
    // in today -> falls back from Streak to Progress.
    const s = state({ currentStreak: 3, lastCheckInDate: '2026-09-09' })
    const result = evaluateReminderOpportunity({ now: WORK_TIME, state: s, events: [], history: [], agentId: DEFAULT_AGENT_ID })
    expect(result?.category).toBe('Progress')
  })

  it('avoids repeating the same category as the immediately preceding reminder', () => {
    const s = state({ currentStreak: 4 }) // healthy streak -> [Streak, Progress]
    const oldEnough = new Date(WORK_TIME.getTime() - 200 * 60_000).toISOString()
    const history = [record({ category: 'Streak', timestamp: oldEnough })]
    const result = evaluateReminderOpportunity({ now: WORK_TIME, state: s, events: [], history, agentId: DEFAULT_AGENT_ID })
    expect(result?.category).toBe('Progress')
  })
})

describe('contextual category selection', () => {
  it('streak 0 -> Documentation/Progress', () => {
    expect(contextualCategoryPair({ energy: 70, currentStreak: 0 }, 'Worried')).toEqual(['Recovery', 'Documentation'])
    expect(contextualCategoryPair({ energy: 70, currentStreak: 0 }, 'Motivated')).toEqual(['Documentation', 'Progress'])
  })

  it('streak 1-2 -> Streak/Documentation', () => {
    expect(contextualCategoryPair({ energy: 70, currentStreak: 1 }, 'Motivated')).toEqual(['Streak', 'Documentation'])
    expect(contextualCategoryPair({ energy: 70, currentStreak: 2 }, 'Motivated')).toEqual(['Streak', 'Documentation'])
  })

  it('streak >=3 -> Streak/Progress', () => {
    expect(contextualCategoryPair({ energy: 70, currentStreak: 3 }, 'Motivated')).toEqual(['Streak', 'Progress'])
  })

  it('streak >=7 -> Progress/Celebration', () => {
    expect(contextualCategoryPair({ energy: 70, currentStreak: 7 }, 'Happy')).toEqual(['Celebration', 'Progress'])
    expect(contextualCategoryPair({ energy: 70, currentStreak: 7 }, 'Motivated')).toEqual(['Progress', 'Celebration'])
  })

  it('low energy -> Recovery/Documentation', () => {
    expect(contextualCategoryPair({ energy: 25, currentStreak: 5 }, 'Motivated')).toEqual(['Recovery', 'Documentation'])
  })

  it('Worried mood -> Recovery/Documentation', () => {
    expect(contextualCategoryPair({ energy: 70, currentStreak: 5 }, 'Worried')).toEqual(['Recovery', 'Documentation'])
  })

  it('Recovery mood -> Recovery/Progress', () => {
    expect(contextualCategoryPair({ energy: 70, currentStreak: 5 }, 'Recovery')).toEqual(['Recovery', 'Progress'])
  })

  it('Happy mood -> Celebration/Progress', () => {
    expect(contextualCategoryPair({ energy: 70, currentStreak: 8 }, 'Happy')).toEqual(['Celebration', 'Progress'])
  })
})

describe('findPendingCelebration + priority', () => {
  function event(overrides: Partial<GameEvent>): GameEvent {
    return { id: 'e1', type: 'LEVEL_UP', agentId: DEFAULT_AGENT_ID, date: '2026-09-09', timestamp: WORK_TIME.toISOString(), ...overrides }
  }

  it('prioritizes Evolution over Level Up', () => {
    const events = [event({ id: 'lvl', type: 'LEVEL_UP' }), event({ id: 'evo', type: 'EVOLUTION' })]
    expect(findPendingCelebration(events, DEFAULT_AGENT_ID, [])?.id).toBe('evo')
  })

  it('prioritizes Level Up over Achievement', () => {
    const events = [event({ id: 'ach', type: 'ACHIEVEMENT' }), event({ id: 'lvl', type: 'LEVEL_UP' })]
    expect(findPendingCelebration(events, DEFAULT_AGENT_ID, [])?.id).toBe('lvl')
  })

  it('never returns an event already celebrated (by dedupeKey in history)', () => {
    const events = [event({ id: 'lvl', type: 'LEVEL_UP' })]
    const history = [record({ dedupeKey: 'lvl' })]
    expect(findPendingCelebration(events, DEFAULT_AGENT_ID, history)).toBeUndefined()
  })

  it('skips celebrations older than two days (an old evolution is old news)', () => {
    const old = event({ id: 'evo', type: 'EVOLUTION', timestamp: new Date(WORK_TIME.getTime() - 72 * 3_600_000).toISOString() })
    const recent = event({ id: 'lvl', type: 'LEVEL_UP' })
    expect(findPendingCelebration([old], DEFAULT_AGENT_ID, [], WORK_TIME)).toBeUndefined()
    expect(findPendingCelebration([old, recent], DEFAULT_AGENT_ID, [], WORK_TIME)?.id).toBe('lvl')
  })

  it('ignores events belonging to a different agent', () => {
    const events = [event({ id: 'lvl', type: 'LEVEL_UP', agentId: 'someone-else' })]
    expect(findPendingCelebration(events, DEFAULT_AGENT_ID, [])).toBeUndefined()
  })

  it('the full evaluator returns a Celebration candidate with the event as dedupeKey, ahead of everything else', () => {
    const s = state({ currentStreak: 0 }) // would otherwise be Documentation
    const events = [event({ id: 'lvl', type: 'LEVEL_UP' })]
    const result = evaluateReminderOpportunity({ now: WORK_TIME, state: s, events, history: [], agentId: DEFAULT_AGENT_ID })
    expect(result?.category).toBe('Celebration')
    expect(result?.dedupeKey).toBe('lvl')
  })
})

describe('isRecoveryEligible', () => {
  it('is not eligible immediately after an Alert', () => {
    const s = state({ lastAlertAt: WORK_TIME.toISOString() })
    expect(isRecoveryEligible(WORK_TIME, s)).toBe(false)
  })

  it('becomes eligible once the recovery delay has passed', () => {
    const alertAt = new Date(WORK_TIME.getTime() - 45 * 60_000)
    const s = state({ lastAlertAt: alertAt.toISOString() })
    expect(isRecoveryEligible(WORK_TIME, s)).toBe(true)
  })

  it('is not eligible once a positive action already followed the alert', () => {
    const alertAt = new Date(WORK_TIME.getTime() - 45 * 60_000)
    const positiveAt = new Date(WORK_TIME.getTime() - 40 * 60_000)
    const s = state({ lastAlertAt: alertAt.toISOString(), lastPositiveActionAt: positiveAt.toISOString() })
    expect(isRecoveryEligible(WORK_TIME, s)).toBe(false)
  })
})

describe('evaluateReminderOpportunity — determinism', () => {
  it('is fully deterministic given a fixed `now` and injected random', () => {
    const s = state({ currentStreak: 3 })
    const ctx = { now: WORK_TIME, state: s, events: [], history: [], agentId: DEFAULT_AGENT_ID, random: () => 0.42 }
    const a = evaluateReminderOpportunity(ctx)
    const b = evaluateReminderOpportunity(ctx)
    expect(a).toEqual(b)
  })
})
