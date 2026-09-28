import { describe, expect, it } from 'vitest'
import { DEFAULT_AGENT_ID, INITIAL_GAME_STATE, type GameEvent } from '../types/domain'
import {
  buildCorrectionMap,
  calculateEnergy,
  calculateLevel,
  calculateMood,
  calculateStreak,
  energyLossForNextAlert,
  evolutionForLevel,
  processCheckIn,
  processCorrection,
  processDevXpGrant,
  processDocumentationAlert,
  processQAPass,
  recalculateStateFromEvents,
} from './gameEngine'
import { LEVEL_THRESHOLDS } from './levels'

// Seed events used to isolate a reward calculation from the "first ever"
// Achievement bonus (First Step / Getting Started), when a test's intent is
// only to check the base Check-in / QA Pass reward math. Dated well in the
// past so they never interfere with streak-day-gap logic.
// Also seed the ACHIEVEMENT event itself — evaluateAchievements checks the
// set of already-unlocked achievement ids from ACHIEVEMENT events, not just
// the raw Check-in/QA Pass counts, so both are needed to fully isolate a
// reward-math test from the "first ever" bonus.
const SEED_CHECKIN: GameEvent = {
  id: 'seed-checkin',
  type: 'CHECK_IN',
  agentId: DEFAULT_AGENT_ID,
  date: '2000-01-01',
  timestamp: '2000-01-01T00:00:00.000Z',
}
const SEED_FIRST_STEP: GameEvent = {
  id: 'seed-first-step',
  type: 'ACHIEVEMENT',
  agentId: DEFAULT_AGENT_ID,
  date: '2000-01-01',
  timestamp: '2000-01-01T00:00:00.001Z',
  payload: { achievementId: 'first_step' },
}
const SEED_QA_PASS: GameEvent = {
  id: 'seed-qapass',
  type: 'QA_PASS',
  agentId: DEFAULT_AGENT_ID,
  date: '2000-01-01',
  timestamp: '2000-01-01T00:00:00.000Z',
}
const SEED_GETTING_STARTED: GameEvent = {
  id: 'seed-getting-started',
  type: 'ACHIEVEMENT',
  agentId: DEFAULT_AGENT_ID,
  date: '2000-01-01',
  timestamp: '2000-01-01T00:00:00.001Z',
  payload: { achievementId: 'getting_started' },
}
const ISOLATE_CHECKIN = [SEED_CHECKIN, SEED_FIRST_STEP]
const ISOLATE_QA_PASS = [SEED_QA_PASS, SEED_GETTING_STARTED]

describe('calculateLevel', () => {
  it('returns level 1 at 0 xp', () => {
    expect(calculateLevel(0)).toBe(1)
  })

  it('returns the correct level at each threshold', () => {
    expect(calculateLevel(99)).toBe(1)
    expect(calculateLevel(100)).toBe(2)
    expect(calculateLevel(250)).toBe(3)
    expect(calculateLevel(2700)).toBe(10)
  })
})

describe('calculateEnergy', () => {
  it('clamps to a maximum of 100', () => {
    expect(calculateEnergy(98, 10)).toBe(100)
  })

  it('never goes negative', () => {
    expect(calculateEnergy(5, -20)).toBe(0)
  })
})

describe('calculateStreak', () => {
  it('starts a new streak at 1 when there is no previous check-in', () => {
    expect(calculateStreak(0, null, '2026-09-04')).toEqual({ currentStreak: 1, alreadyCheckedInToday: false })
  })

  it('increments the streak on a consecutive day', () => {
    expect(calculateStreak(3, '2026-09-03', '2026-09-04')).toEqual({
      currentStreak: 4,
      alreadyCheckedInToday: false,
    })
  })

  it('resets the streak to 1 after a missed day', () => {
    expect(calculateStreak(5, '2026-09-01', '2026-09-04')).toEqual({
      currentStreak: 1,
      alreadyCheckedInToday: false,
    })
  })

  it('flags a same-day check-in as already claimed', () => {
    expect(calculateStreak(2, '2026-09-04', '2026-09-04')).toEqual({
      currentStreak: 2,
      alreadyCheckedInToday: true,
    })
  })
})

describe('calculateMood', () => {
  it('new agent (streak 0, no alerts) -> Motivated, never Worried by default', () => {
    expect(calculateMood({ energy: 80, currentStreak: 0, lastAlertAt: null, lastPositiveActionAt: null })).toBe(
      'Motivated',
    )
  })

  it('streak 1-2 with healthy energy -> Motivated (habit still forming, no problem)', () => {
    expect(calculateMood({ energy: 75, currentStreak: 1, lastAlertAt: null, lastPositiveActionAt: null })).toBe(
      'Motivated',
    )
    expect(calculateMood({ energy: 80, currentStreak: 2, lastAlertAt: null, lastPositiveActionAt: null })).toBe(
      'Motivated',
    )
  })

  it('an unanswered alert stops worrying Rocky once the alert window passes', () => {
    const alertAt = new Date('2026-09-01T09:00:00').toISOString()
    const now = new Date('2026-09-05T09:00:00')
    expect(calculateMood({ energy: 60, currentStreak: 0, lastAlertAt: alertAt, lastPositiveActionAt: null }, now)).toBe(
      'Motivated',
    )
  })

  it('streak 3 + energy 40 -> Motivated', () => {
    expect(calculateMood({ energy: 40, currentStreak: 3, lastAlertAt: null, lastPositiveActionAt: null })).toBe(
      'Motivated',
    )
  })

  it('streak 7 + energy 70 -> Happy', () => {
    expect(calculateMood({ energy: 70, currentStreak: 7, lastAlertAt: null, lastPositiveActionAt: null })).toBe(
      'Happy',
    )
  })

  it('energy < 40 -> Worried regardless of streak', () => {
    expect(calculateMood({ energy: 20, currentStreak: 8, lastAlertAt: null, lastPositiveActionAt: null })).toBe(
      'Worried',
    )
  })

  it('Alert alone -> Worried (never Recovery without a follow-up action)', () => {
    const alertAt = new Date().toISOString()
    expect(calculateMood({ energy: 50, currentStreak: 0, lastAlertAt: alertAt, lastPositiveActionAt: null })).toBe(
      'Worried',
    )
  })

  it('Alert + Check-in afterwards -> Recovery', () => {
    const alertAt = new Date('2026-09-04T09:00:00').toISOString()
    const checkInAt = new Date('2026-09-04T10:00:00').toISOString()
    const now = new Date('2026-09-04T10:05:00')
    expect(
      calculateMood({ energy: 50, currentStreak: 1, lastAlertAt: alertAt, lastPositiveActionAt: checkInAt }, now),
    ).toBe('Recovery')
  })

  it('Alert + QA Pass afterwards -> Recovery', () => {
    // QA Pass is also a "positive action" for Recovery purposes, same as Check-in.
    const alertAt = new Date('2026-09-04T09:00:00').toISOString()
    const qaPassAt = new Date('2026-09-04T09:30:00').toISOString()
    const now = new Date('2026-09-04T09:35:00')
    expect(
      calculateMood({ energy: 60, currentStreak: 0, lastAlertAt: alertAt, lastPositiveActionAt: qaPassAt }, now),
    ).toBe('Recovery')
  })

  it('Recovery does not occur without a follow-up positive action, even much later', () => {
    const alertAt = new Date('2026-09-04T09:00:00').toISOString()
    const now = new Date('2026-09-04T20:00:00')
    expect(
      calculateMood({ energy: 50, currentStreak: 0, lastAlertAt: alertAt, lastPositiveActionAt: null }, now),
    ).toBe('Worried')
  })

  it('does not report Recovery if the positive action happened before the alert', () => {
    const positiveActionAt = new Date('2026-09-04T08:00:00').toISOString()
    const alertAt = new Date('2026-09-04T09:00:00').toISOString()
    const now = new Date('2026-09-04T09:05:00')
    expect(
      calculateMood({ energy: 50, currentStreak: 0, lastAlertAt: alertAt, lastPositiveActionAt: positiveActionAt }, now),
    ).toBe('Worried')
  })

  it('Recovery fades back to Motivated/Happy once enough positive actions rebuild the streak', () => {
    // Once the Recovery window (24h since the last positive action) has
    // passed, Mood falls back to the normal rules based on Energy/Streak.
    const alertAt = new Date('2026-09-01T09:00:00').toISOString()
    const oldPositiveActionAt = new Date('2026-09-01T10:00:00').toISOString()
    const muchLater = new Date('2026-09-05T10:00:00')
    expect(
      calculateMood(
        { energy: 70, currentStreak: 3, lastAlertAt: alertAt, lastPositiveActionAt: oldPositiveActionAt },
        muchLater,
      ),
    ).toBe('Motivated')
  })
})

describe('processCheckIn', () => {
  it('grants +10 XP and +5 Energy on a fresh check-in', () => {
    const now = new Date('2026-09-04T09:00:00')
    const result = processCheckIn(INITIAL_GAME_STATE, ISOLATE_CHECKIN, now)
    expect(result.state.xp).toBe(10)
    expect(result.state.energy).toBe(75)
    expect(result.state.currentStreak).toBe(1)
    expect(result.state.bestStreak).toBe(1)
    expect(result.alreadyCheckedInToday).toBe(false)
  })

  it('does not grant a second reward for the same day', () => {
    const now = new Date('2026-09-04T09:00:00')
    const first = processCheckIn(INITIAL_GAME_STATE, ISOLATE_CHECKIN, now)
    const laterSameDay = new Date('2026-09-04T18:00:00')
    const second = processCheckIn(first.state, [...ISOLATE_CHECKIN, ...first.events], laterSameDay)

    expect(second.alreadyCheckedInToday).toBe(true)
    expect(second.state.xp).toBe(first.state.xp)
    expect(second.state.energy).toBe(first.state.energy)
    expect(second.events).toHaveLength(0)
  })

  it('preserves best streak when the current streak later resets', () => {
    let events: GameEvent[] = [...ISOLATE_CHECKIN]
    const day1 = processCheckIn(INITIAL_GAME_STATE, events, new Date('2026-09-01T09:00:00'))
    events = [...events, ...day1.events]
    const day2 = processCheckIn(day1.state, events, new Date('2026-09-02T09:00:00'))
    events = [...events, ...day2.events]
    const day3 = processCheckIn(day2.state, events, new Date('2026-09-03T09:00:00'))
    events = [...events, ...day3.events]
    expect(day3.state.bestStreak).toBe(3)

    const afterGap = processCheckIn(day3.state, events, new Date('2026-09-06T09:00:00'))
    expect(afterGap.state.currentStreak).toBe(1)
    expect(afterGap.state.bestStreak).toBe(3)
  })

  it('emits a LEVEL_UP event when XP crosses a threshold', () => {
    const nearLevelUp = { ...INITIAL_GAME_STATE, xp: 95 }
    const result = processCheckIn(nearLevelUp, ISOLATE_CHECKIN, new Date('2026-09-04T09:00:00'))
    expect(result.leveledUp).toBe(true)
    expect(result.events.some((e) => e.type === 'LEVEL_UP')).toBe(true)
  })

  it('does not fold XP from an achievement into a level-up already accounted for by the base reward alone (single LEVEL_UP event)', () => {
    // First-ever check-in: +10 base + 25 (First Step) = 35 total, enough to
    // cross the level-2 threshold (100) only if already close — here we just
    // assert exactly one LEVEL_UP event is emitted, not one per XP source.
    const nearLevelUp = { ...INITIAL_GAME_STATE, xp: 90 }
    const result = processCheckIn(nearLevelUp, [], new Date('2026-09-04T09:00:00'))
    expect(result.state.xp).toBe(90 + 10 + 25) // base + First Step achievement
    expect(result.events.filter((e) => e.type === 'LEVEL_UP')).toHaveLength(1)
  })
})

describe('processQAPass', () => {
  it('grants +25 XP and +10 Energy and logs a QA_PASS event with activity', () => {
    const now = new Date('2026-09-04T09:00:00')
    const result = processQAPass(INITIAL_GAME_STATE, ISOLATE_QA_PASS, now)

    expect(result.state.xp).toBe(25)
    expect(result.state.energy).toBe(80)
    expect(result.events).toHaveLength(1)
    expect(result.events[0].type).toBe('QA_PASS')
    expect(result.state.lastActivityLabel).toBeTruthy()
    expect(result.state.lastActivityAt).toBe(now.toISOString())
  })

  it('does not require a Check-in first', () => {
    const result = processQAPass(INITIAL_GAME_STATE, ISOLATE_QA_PASS, new Date('2026-09-04T09:00:00'))
    expect(result.state.xp).toBe(25)
  })

  it('never pushes Energy above 100', () => {
    const nearFull = { ...INITIAL_GAME_STATE, energy: 95 }
    const result = processQAPass(nearFull, ISOLATE_QA_PASS, new Date('2026-09-04T09:00:00'))
    expect(result.state.energy).toBe(100)
  })

  it('does not affect Streak', () => {
    const state = { ...INITIAL_GAME_STATE, currentStreak: 4 }
    const result = processQAPass(state, ISOLATE_QA_PASS, new Date('2026-09-04T09:00:00'))
    expect(result.state.currentStreak).toBe(4)
  })
})

describe('processDocumentationAlert', () => {
  it('reduces Energy by 20 and breaks the current streak', () => {
    const state = { ...INITIAL_GAME_STATE, energy: 80, currentStreak: 5, bestStreak: 5, xp: 300, level: 3 }
    const result = processDocumentationAlert(state, [], new Date('2026-09-04T09:00:00'))

    expect(result.state.energy).toBe(60)
    expect(result.state.currentStreak).toBe(0)
    expect(result.events).toHaveLength(1)
    expect(result.events[0].type).toBe('DOCUMENTATION_ALERT')
  })

  it('never drops Energy below 0', () => {
    const state = { ...INITIAL_GAME_STATE, energy: 10 }
    const result = processDocumentationAlert(state, [], new Date('2026-09-04T09:00:00'))
    expect(result.state.energy).toBe(0)
  })

  it('does NOT change XP, Level, or evolution stage', () => {
    const state = { ...INITIAL_GAME_STATE, xp: 300, level: 3, evolutionStage: 'Young' as const, energy: 80 }
    const result = processDocumentationAlert(state, [], new Date('2026-09-04T09:00:00'))

    expect(result.state.xp).toBe(300)
    expect(result.state.level).toBe(3)
    expect(result.state.evolutionStage).toBe('Young')
  })

  it('preserves Best Streak even though Current Streak breaks', () => {
    const state = { ...INITIAL_GAME_STATE, currentStreak: 5, bestStreak: 5 }
    const result = processDocumentationAlert(state, [], new Date('2026-09-04T09:00:00'))
    expect(result.state.currentStreak).toBe(0)
    expect(result.state.bestStreak).toBe(5)
  })

  it('never causes a Level Down', () => {
    const state = { ...INITIAL_GAME_STATE, xp: 300, level: 3, currentStreak: 5, energy: 10 }
    const result = processDocumentationAlert(state, [], new Date('2026-09-04T09:00:00'))
    expect(result.state.level).toBe(3)
  })

  it('sets Mood to Worried right after the alert (not Recovery)', () => {
    const state = { ...INITIAL_GAME_STATE, energy: 80, currentStreak: 5 }
    const result = processDocumentationAlert(state, [], new Date('2026-09-04T09:00:00'))
    expect(result.state.mood).toBe('Worried')
  })

  it('caps total daily Energy loss from alerts at 40', () => {
    let state = { ...INITIAL_GAME_STATE, energy: 100 }
    let events: ReturnType<typeof processDocumentationAlert>['events'] = []

    const first = processDocumentationAlert(state, events, new Date('2026-09-04T08:00:00'))
    state = first.state
    events = [...events, ...first.events]
    expect(state.energy).toBe(80) // -20

    const second = processDocumentationAlert(state, events, new Date('2026-09-04T12:00:00'))
    state = second.state
    events = [...events, ...second.events]
    expect(state.energy).toBe(60) // -20, total -40 today

    const third = processDocumentationAlert(state, events, new Date('2026-09-04T18:00:00'))
    state = third.state
    expect(state.energy).toBe(60) // no further loss — daily cap reached
  })

  it('resets the daily alert cap on a new day', () => {
    let state = { ...INITIAL_GAME_STATE, energy: 100 }
    const day1a = processDocumentationAlert(state, [], new Date('2026-09-04T08:00:00'))
    state = day1a.state
    const day1b = processDocumentationAlert(state, day1a.events, new Date('2026-09-04T12:00:00'))
    state = day1b.state
    expect(state.energy).toBe(60)

    const allEvents = [...day1a.events, ...day1b.events]
    const day2 = processDocumentationAlert(state, allEvents, new Date('2026-09-05T08:00:00'))
    expect(day2.state.energy).toBe(40) // fresh -20 on a new day
  })
})

describe('energyLossForNextAlert', () => {
  it('costs the full 20 for the first two alerts of the day', () => {
    expect(energyLossForNextAlert(0)).toBe(20)
    expect(energyLossForNextAlert(1)).toBe(20)
  })

  it('costs nothing once the daily cap of 40 is reached', () => {
    expect(energyLossForNextAlert(2)).toBe(0)
    expect(energyLossForNextAlert(5)).toBe(0)
  })
})

describe('Streak across Check-in and Documentation Alert history', () => {
  it('matches the spec example: 3-day streak, alert breaks it, then a fresh day rebuilds it', () => {
    let events: GameEvent[] = []
    let state = INITIAL_GAME_STATE

    const day1 = processCheckIn(state, events, new Date('2026-09-01T09:00:00'))
    events = [...events, ...day1.events]
    state = day1.state
    const day2 = processCheckIn(state, events, new Date('2026-09-02T09:00:00'))
    events = [...events, ...day2.events]
    state = day2.state
    const day3 = processCheckIn(state, events, new Date('2026-09-03T09:00:00'))
    events = [...events, ...day3.events]
    state = day3.state
    expect(state.currentStreak).toBe(3)
    expect(state.bestStreak).toBe(3)

    // Day 4 -> Documentation Alert -> streak 0
    const alert = processDocumentationAlert(state, events, new Date('2026-09-04T09:00:00'))
    events = [...events, ...alert.events]
    state = alert.state
    expect(state.currentStreak).toBe(0)
    expect(state.bestStreak).toBe(3)

    // Day 5 -> Check-in -> streak 1, Best Streak still 3
    const day5 = processCheckIn(state, events, new Date('2026-09-05T09:00:00'))
    state = day5.state
    expect(state.currentStreak).toBe(1)
    expect(state.bestStreak).toBe(3)
  })

  it('Recovery Flow: Alert -> Worried, Check-in afterwards -> Recovery', () => {
    let events: GameEvent[] = []
    let state = INITIAL_GAME_STATE

    const ci1 = processCheckIn(state, events, new Date('2026-09-01T09:00:00'))
    events = [...events, ...ci1.events]
    state = ci1.state

    const alert = processDocumentationAlert(state, events, new Date('2026-09-02T09:00:00'))
    events = [...events, ...alert.events]
    state = alert.state
    expect(state.mood).toBe('Worried')
    expect(state.energy).toBe(55) // 70 + 5 (check-in) - 20 (alert)
    expect(state.currentStreak).toBe(0)

    const ci2 = processCheckIn(state, events, new Date('2026-09-03T09:00:00'))
    state = ci2.state
    expect(state.mood).toBe('Recovery')
    expect(state.energy).toBe(60) // 55 + 5
    expect(state.currentStreak).toBe(1)
  })

  it('Recovery Flow: Alert -> QA Pass afterwards -> Recovery', () => {
    let events: GameEvent[] = []
    const alert = processDocumentationAlert(INITIAL_GAME_STATE, events, new Date('2026-09-02T09:00:00'))
    events = [...events, ...alert.events]
    expect(alert.state.mood).toBe('Worried')

    const qaPass = processQAPass(alert.state, events, new Date('2026-09-02T11:00:00'))
    expect(qaPass.state.mood).toBe('Recovery')
  })
})

describe('processCorrection', () => {
  it('turns a Documentation Alert into a PASS and recalculates state (Energy restored, streak not broken)', () => {
    const checkIn = processCheckIn(INITIAL_GAME_STATE, [], new Date('2026-09-01T09:00:00'))
    let events = checkIn.events
    let state = checkIn.state

    const alert = processDocumentationAlert(state, events, new Date('2026-09-01T10:00:00'))
    events = [...events, ...alert.events]
    state = alert.state
    expect(state.currentStreak).toBe(0)
    expect(state.energy).toBeLessThan(checkIn.state.energy)

    const alertEventId = alert.events[0].id
    const correction = processCorrection(
      events,
      { originalEventId: alertEventId, correctedTo: 'PASS' },
      new Date('2026-09-01T11:00:00'),
    )

    expect(correction.correctionEvent.type).toBe('CORRECTION')
    expect(correction.correctionEvent.correctsEventId).toBe(alertEventId)
    // The original event is still in history, untouched.
    expect(correction.events.find((e) => e.id === alertEventId)?.type).toBe('DOCUMENTATION_ALERT')
    // But the recalculated state now reflects a QA Pass instead: streak survives, energy goes up not down.
    expect(correction.state.currentStreak).toBe(1)
    expect(correction.state.energy).toBeGreaterThan(checkIn.state.energy)
  })

  it('turns a QA Pass into an ALERT and recalculates state accordingly', () => {
    const qaPass = processQAPass(INITIAL_GAME_STATE, [], new Date('2026-09-01T09:00:00'))
    const events = qaPass.events
    const qaEventId = events[0].id

    const correction = processCorrection(
      events,
      { originalEventId: qaEventId, correctedTo: 'ALERT' },
      new Date('2026-09-01T10:00:00'),
    )

    expect(correction.state.xp).toBe(0) // the +25 XP from the (now corrected-away) QA Pass is gone
    expect(correction.state.currentStreak).toBe(0)
  })

  it('throws when correcting an unknown event id', () => {
    expect(() => processCorrection([], { originalEventId: 'nope', correctedTo: 'PASS' })).toThrow()
  })
})

describe('recalculateStateFromEvents', () => {
  it('rebuilds the same state as the incremental path for a plain history', () => {
    const day1 = processCheckIn(INITIAL_GAME_STATE, [], new Date('2026-09-01T09:00:00'))
    const day2 = processQAPass(day1.state, day1.events, new Date('2026-09-02T09:00:00'))
    const events = [...day1.events, ...day2.events]

    const recalculated = recalculateStateFromEvents(events, events[0].agentId)
    expect(recalculated.xp).toBe(day2.state.xp)
    expect(recalculated.energy).toBe(day2.state.energy)
    expect(recalculated.currentStreak).toBe(day2.state.currentStreak)
  })
})

describe('buildCorrectionMap', () => {
  it('maps an original event id to its corrected outcome', () => {
    const events = [
      { id: 'e1', type: 'QA_PASS', agentId: 'a', date: '2026-09-01', timestamp: '2026-09-01T09:00:00.000Z' },
      {
        id: 'e2',
        type: 'CORRECTION',
        agentId: 'a',
        date: '2026-09-01',
        timestamp: '2026-09-01T10:00:00.000Z',
        correctsEventId: 'e1',
        payload: { correctedTo: 'ALERT' },
      },
    ] as Parameters<typeof buildCorrectionMap>[0]

    expect(buildCorrectionMap(events).get('e1')).toBe('ALERT')
  })
})

describe('Achievements', () => {
  it('First Step unlocks (+25 XP) on the very first Check-in', () => {
    const result = processCheckIn(INITIAL_GAME_STATE, [], new Date('2026-09-04T09:00:00'))
    expect(result.newAchievements.map((a) => a.id)).toContain('first_step')
    expect(result.state.xp).toBe(10 + 25)
  })

  it('First Step does NOT unlock again on a second Check-in', () => {
    const first = processCheckIn(INITIAL_GAME_STATE, [], new Date('2026-09-04T09:00:00'))
    const second = processCheckIn(first.state, first.events, new Date('2026-09-05T09:00:00'))
    expect(second.newAchievements.map((a) => a.id)).not.toContain('first_step')
    // Base check-in reward only, no repeat achievement XP.
    expect(second.state.xp).toBe(first.state.xp + 10)
  })

  it('Getting Started unlocks (+25 XP) on the very first QA Pass', () => {
    const result = processQAPass(INITIAL_GAME_STATE, [], new Date('2026-09-04T09:00:00'))
    expect(result.newAchievements.map((a) => a.id)).toContain('getting_started')
    expect(result.state.xp).toBe(25 + 25)
  })

  it('One Week Strong unlocks at a 7-day streak (no extra XP beyond the milestone)', () => {
    let events: GameEvent[] = []
    let state = INITIAL_GAME_STATE
    let last: ReturnType<typeof processCheckIn> | null = null
    for (let day = 1; day <= 7; day++) {
      last = processCheckIn(state, events, new Date(`2026-09-0${day}T09:00:00`))
      events = [...events, ...last.events]
      state = last.state
    }
    expect(state.currentStreak).toBe(7)
    expect(last!.newAchievements.map((a) => a.id)).toContain('one_week_strong')
    // Streak Milestone (+50) fires alongside; the achievement itself adds no XP.
    expect(last!.events.some((e) => e.type === 'STREAK_MILESTONE' && e.payload?.days === 7)).toBe(true)
  })

  it('Two Weeks Strong unlocks at a 14-day streak', () => {
    let events: GameEvent[] = []
    let state = INITIAL_GAME_STATE
    let last: ReturnType<typeof processCheckIn> | null = null
    for (let day = 1; day <= 14; day++) {
      const date = new Date('2026-09-01T09:00:00')
      date.setDate(date.getDate() + (day - 1))
      last = processCheckIn(state, events, date)
      events = [...events, ...last.events]
      state = last.state
    }
    expect(state.currentStreak).toBe(14)
    expect(last!.newAchievements.map((a) => a.id)).toContain('two_weeks_strong')
  })

  it('Monthly Champion unlocks at a 30-day streak', () => {
    let events: GameEvent[] = []
    let state = INITIAL_GAME_STATE
    let last: ReturnType<typeof processCheckIn> | null = null
    for (let day = 1; day <= 30; day++) {
      const date = new Date('2026-09-01T09:00:00')
      date.setDate(date.getDate() + (day - 1))
      last = processCheckIn(state, events, date)
      events = [...events, ...last.events]
      state = last.state
    }
    expect(state.currentStreak).toBe(30)
    expect(last!.newAchievements.map((a) => a.id)).toContain('monthly_champion')
  })

  it('achievements are never granted twice, even if re-evaluated with the same history', () => {
    const first = processCheckIn(INITIAL_GAME_STATE, [], new Date('2026-09-04T09:00:00'))
    // Re-running processCheckIn with the exact same (already-checked-in) state
    // and history should not re-grant First Step.
    const repeat = processCheckIn(first.state, first.events, new Date('2026-09-04T09:30:00'))
    expect(repeat.alreadyCheckedInToday).toBe(true)
    expect(repeat.newAchievements).toHaveLength(0)
  })

  it('a Documentation Alert never removes an already-unlocked achievement', () => {
    const checkIn = processCheckIn(INITIAL_GAME_STATE, [], new Date('2026-09-01T09:00:00'))
    expect(checkIn.newAchievements.map((a) => a.id)).toContain('first_step')

    const events = checkIn.events
    const alert = processDocumentationAlert(checkIn.state, events, new Date('2026-09-01T12:00:00'))

    // Achievements aren't part of GameState at all — they live in the event
    // log / achievements store, which a Documentation Alert never touches.
    // Re-deriving from history still shows it unlocked.
    const fullHistory = [...events, ...alert.events]
    expect(fullHistory.filter((e) => e.type === 'ACHIEVEMENT' && e.payload?.achievementId === 'first_step')).toHaveLength(1)
  })

  it('Streak Milestone XP is granted exactly once per milestone, even if the streak is rebuilt past it again', () => {
    let events: GameEvent[] = []
    let state = INITIAL_GAME_STATE
    // Build a 3-day streak (grants +25 at day 3).
    for (let day = 1; day <= 3; day++) {
      const result = processCheckIn(state, events, new Date(`2026-09-0${day}T09:00:00`))
      events = [...events, ...result.events]
      state = result.state
    }
    expect(events.filter((e) => e.type === 'STREAK_MILESTONE' && e.payload?.days === 3)).toHaveLength(1)

    // Break it, then rebuild past 3 days again.
    const alert = processDocumentationAlert(state, events, new Date('2026-09-04T09:00:00'))
    events = [...events, ...alert.events]
    state = alert.state

    for (let day = 5; day <= 8; day++) {
      const result = processCheckIn(state, events, new Date(`2026-09-0${day}T09:00:00`))
      events = [...events, ...result.events]
      state = result.state
    }
    // Still only ever granted once, even though the streak passed day-3-length again.
    expect(events.filter((e) => e.type === 'STREAK_MILESTONE' && e.payload?.days === 3)).toHaveLength(1)
  })
})

describe('Levels — thresholds (Phase 4)', () => {
  it('matches the exact spec thresholds for levels 1-10', () => {
    expect(calculateLevel(0)).toBe(1)
    expect(calculateLevel(100)).toBe(2)
    expect(calculateLevel(250)).toBe(3)
    expect(calculateLevel(450)).toBe(4)
    expect(calculateLevel(700)).toBe(5)
    expect(calculateLevel(1000)).toBe(6)
    expect(calculateLevel(1350)).toBe(7)
    expect(calculateLevel(1750)).toBe(8)
    expect(calculateLevel(2200)).toBe(9)
    expect(calculateLevel(2700)).toBe(10)
  })

  it('XP exactly at a threshold reaches that level', () => {
    expect(calculateLevel(700)).toBe(5)
  })

  it('XP just below a threshold stays at the previous level', () => {
    expect(calculateLevel(699)).toBe(4)
  })

  it('XP just above a threshold reaches the new level', () => {
    expect(calculateLevel(701)).toBe(5)
  })

  it('handles multiple level jumps from a single XP amount', () => {
    // Level 4 starts at 450 XP; enough XP to reach 1000 jumps straight to Level 6.
    expect(calculateLevel(1000)).toBe(6)
  })
})

describe('Evolution stages (Phase 4)', () => {
  it('Level 1 -> Baby', () => {
    expect(evolutionForLevel(1)).toBe('Baby')
    expect(evolutionForLevel(4)).toBe('Baby')
  })

  it('Level 5 -> Young', () => {
    expect(evolutionForLevel(5)).toBe('Young')
    expect(evolutionForLevel(9)).toBe('Young')
  })

  it('Level 10 -> Advanced', () => {
    expect(evolutionForLevel(10)).toBe('Advanced')
    expect(evolutionForLevel(19)).toBe('Advanced')
  })

  it('Level 20 -> Elite', () => {
    expect(evolutionForLevel(20)).toBe('Elite')
    expect(evolutionForLevel(30)).toBe('Elite')
  })

  it('a single Check-in can jump Level and Evolution together (e.g. straight to Level 5 = Young)', () => {
    const nearYoung = { ...INITIAL_GAME_STATE, xp: 695 } // 5 XP away from Level 5 (700)
    const result = processCheckIn(nearYoung, [], new Date('2026-09-04T09:00:00'))
    expect(result.state.level).toBe(5)
    expect(result.state.evolutionStage).toBe('Young')
    expect(result.evolved).toBe(true)
  })
})

describe('LEVEL_UP / EVOLUTION event payloads (Phase 4)', () => {
  it('LEVEL_UP carries previousLevel and newLevel', () => {
    const nearLevelUp = { ...INITIAL_GAME_STATE, xp: 90, level: 1 }
    const result = processCheckIn(nearLevelUp, [], new Date('2026-09-04T09:00:00'))
    const levelUpEvent = result.events.find((e) => e.type === 'LEVEL_UP')
    expect(levelUpEvent).toBeDefined()
    expect(levelUpEvent!.payload?.previousLevel).toBe(1)
    expect(levelUpEvent!.payload?.newLevel).toBe(2)
  })

  it('EVOLUTION carries previousStage and newStage', () => {
    const nearYoung = { ...INITIAL_GAME_STATE, xp: 695 }
    const result = processCheckIn(nearYoung, [], new Date('2026-09-04T09:00:00'))
    const evolutionEvent = result.events.find((e) => e.type === 'EVOLUTION')
    expect(evolutionEvent).toBeDefined()
    expect(evolutionEvent!.payload?.previousStage).toBe('Baby')
    expect(evolutionEvent!.payload?.newStage).toBe('Young')
  })

  it('emits exactly one LEVEL_UP event even when multiple thresholds are crossed at once', () => {
    // Level 4 (450 XP) + a QA Pass (+25) alone wouldn't cross far, so bump
    // state xp close to Level 6's threshold instead, one QA Pass away.
    const nearLevel6 = { ...INITIAL_GAME_STATE, xp: 985, level: 4 }
    const result = processQAPass(nearLevel6, [], new Date('2026-09-04T09:00:00'))
    const levelUpEvents = result.events.filter((e) => e.type === 'LEVEL_UP')
    expect(levelUpEvents).toHaveLength(1)
    expect(levelUpEvents[0].payload?.previousLevel).toBe(4)
    expect(levelUpEvents[0].payload?.newLevel).toBe(6)
  })

  it('does not emit EVOLUTION again once a stage was already reached', () => {
    const alreadyYoung = { ...INITIAL_GAME_STATE, xp: 700, level: 5, evolutionStage: 'Young' as const }
    const result = processCheckIn(alreadyYoung, [], new Date('2026-09-04T09:00:00'))
    expect(result.evolved).toBe(false)
    expect(result.events.some((e) => e.type === 'EVOLUTION')).toBe(false)
  })

  it('Documentation Alert never emits LEVEL_UP or EVOLUTION, and never reduces them', () => {
    const advanced = { ...INITIAL_GAME_STATE, xp: 2700, level: 10, evolutionStage: 'Advanced' as const, energy: 80 }
    const result = processDocumentationAlert(advanced, [], new Date('2026-09-04T09:00:00'))
    expect(result.events.some((e) => e.type === 'LEVEL_UP' || e.type === 'EVOLUTION')).toBe(false)
    expect(result.state.level).toBe(10)
    expect(result.state.evolutionStage).toBe('Advanced')
  })
})

describe('processDevXpGrant (Developer Controls)', () => {
  it('jumps straight to a target Level threshold and emits LEVEL_UP', () => {
    const result = processDevXpGrant(INITIAL_GAME_STATE, LEVEL_THRESHOLDS[5], new Date('2026-09-04T09:00:00'))
    expect(result.state.level).toBe(5)
    expect(result.state.evolutionStage).toBe('Young')
    expect(result.leveledUp).toBe(true)
    expect(result.evolved).toBe(true)
    expect(result.events.some((e) => e.type === 'LEVEL_UP')).toBe(true)
    expect(result.events.some((e) => e.type === 'EVOLUTION')).toBe(true)
  })

  it('never decreases XP or Level, even if given a lower target', () => {
    const state = { ...INITIAL_GAME_STATE, xp: 2700, level: 10, evolutionStage: 'Advanced' as const }
    const result = processDevXpGrant(state, LEVEL_THRESHOLDS[2], new Date('2026-09-04T09:00:00'))
    expect(result.state.xp).toBe(2700)
    expect(result.state.level).toBe(10)
    expect(result.state.evolutionStage).toBe('Advanced')
  })

  it('never touches Streak, Energy, or Achievements', () => {
    const state = { ...INITIAL_GAME_STATE, currentStreak: 4, bestStreak: 4, energy: 55 }
    const result = processDevXpGrant(state, LEVEL_THRESHOLDS[5], new Date('2026-09-04T09:00:00'))
    expect(result.state.currentStreak).toBe(4)
    expect(result.state.bestStreak).toBe(4)
    expect(result.state.energy).toBe(55)
  })
})

describe('recalculateStateFromEvents — idempotent replay (Phase 9 §Rule 6/7)', () => {
  it('applies a duplicated event id only once, no matter how many times it appears', () => {
    const checkIn = processCheckIn(INITIAL_GAME_STATE, [], new Date('2026-09-01T09:00:00'))
    const checkInEvent = checkIn.events[0]

    const withoutDuplicate = recalculateStateFromEvents(checkIn.events, checkInEvent.agentId)
    const withDuplicate = recalculateStateFromEvents([...checkIn.events, checkInEvent, checkInEvent], checkInEvent.agentId)

    expect(withDuplicate).toEqual(withoutDuplicate)
    expect(withDuplicate.xp).toBe(checkIn.state.xp) // not double-counted
  })

  it('a duplicated QA_PASS event id never doubles XP or Energy on replay', () => {
    const qaPass = processQAPass(INITIAL_GAME_STATE, [], new Date('2026-09-01T09:00:00'))
    const qaEvent = qaPass.events[0]

    const replayed = recalculateStateFromEvents([qaEvent, qaEvent, qaEvent], qaEvent.agentId)
    expect(replayed.xp).toBe(qaPass.state.xp)
    expect(replayed.energy).toBe(qaPass.state.energy)
  })

  it('running replay twice on the same history produces an identical result (deterministic)', () => {
    const day1 = processCheckIn(INITIAL_GAME_STATE, [], new Date('2026-09-01T09:00:00'))
    const day2 = processQAPass(day1.state, day1.events, new Date('2026-09-02T09:00:00'))
    const events = [...day1.events, ...day2.events]

    const run1 = recalculateStateFromEvents(events, events[0].agentId)
    const run2 = recalculateStateFromEvents(events, events[0].agentId)
    expect(run1).toEqual(run2)
  })
})

describe('Rule 16 — explicit deterministic replay scenarios', () => {
  // NOTE on the numbers below: Phase 9's brief illustrates Scenario A/B with
  // "XP 10" / "XP 45" — the BASE Check-in/QA Pass reward alone, without
  // Achievement bonuses. That doesn't match the actually-approved engine:
  // Phase 3 (approved) has a brand-new agent's first-ever Check-in also
  // unlock "First Step" (+25 XP) and first-ever QA Pass unlock "Getting
  // Started" (+25 XP). Per this phase's own rule ("behavior must remain
  // unchanged unless a bug is discovered" / "do not silently change
  // values"), these tests assert the real, already-approved totals rather
  // than the brief's simplified illustration — see the Completion Report.

  it('Scenario A: New agent -> Check-in -> base +10 XP (+25 First Step achievement), Energy 75, Streak 1', () => {
    const result = processCheckIn(INITIAL_GAME_STATE, [], new Date('2026-09-01T09:00:00'))
    expect(result.state.xp).toBe(35) // 10 base + 25 First Step (first-ever check-in)
    expect(result.state.energy).toBe(75)
    expect(result.state.currentStreak).toBe(1)
  })

  it('Scenario B: Check-in -> QA Pass -> XP accumulates, Energy +5 then +10, Streak unchanged by QA Pass', () => {
    const checkIn = processCheckIn(INITIAL_GAME_STATE, [], new Date('2026-09-01T09:00:00'))
    const qaPass = processQAPass(checkIn.state, checkIn.events, new Date('2026-09-01T10:00:00'))

    // Check-in: +10 base +25 First Step = 35. QA Pass: +25 base +25 Getting Started = 50. Total 85.
    expect(qaPass.state.xp).toBe(85)
    expect(qaPass.state.energy).toBe(85) // 70 +5 +10
    expect(qaPass.state.currentStreak).toBe(1) // unchanged by QA Pass
  })

  it('Scenario C: Check-in -> QA Pass -> Alert -> XP preserved, Energy -20, current streak resets, best streak preserved', () => {
    const checkIn = processCheckIn(INITIAL_GAME_STATE, [], new Date('2026-09-01T09:00:00'))
    const qaPass = processQAPass(checkIn.state, checkIn.events, new Date('2026-09-01T10:00:00'))
    const events = [...checkIn.events, ...qaPass.events]
    const alert = processDocumentationAlert(qaPass.state, events, new Date('2026-09-01T11:00:00'))

    expect(alert.state.xp).toBe(qaPass.state.xp) // preserved
    expect(alert.state.energy).toBe(qaPass.state.energy - 20)
    expect(alert.state.currentStreak).toBe(0)
    expect(alert.state.bestStreak).toBe(1) // preserved
  })

  it('Scenario D: multiple Alerts same day -> maximum Alert Energy loss is 40', () => {
    let state = { ...INITIAL_GAME_STATE, energy: 100 }
    let events: ReturnType<typeof processDocumentationAlert>['events'] = []
    for (let i = 0; i < 4; i++) {
      const result = processDocumentationAlert(state, events, new Date(`2026-09-01T1${i}:00:00`))
      state = result.state
      events = [...events, ...result.events]
    }
    expect(state.energy).toBe(60) // 100 - 40, capped — not 100 - 80
  })

  it('Scenario E: repeated same event id -> no duplicate reward (via replay)', () => {
    const qaPass = processQAPass(INITIAL_GAME_STATE, [], new Date('2026-09-01T09:00:00'))
    const duplicated = [...qaPass.events, ...qaPass.events]
    const replayed = recalculateStateFromEvents(duplicated, qaPass.events[0].agentId)
    expect(replayed.xp).toBe(qaPass.state.xp)
  })

  it('Scenario F: Alert -> positive action -> Recovery state', () => {
    const alert = processDocumentationAlert(INITIAL_GAME_STATE, [], new Date('2026-09-01T09:00:00'))
    const checkIn = processCheckIn(alert.state, alert.events, new Date('2026-09-01T10:00:00'))
    expect(checkIn.state.mood).toBe('Recovery')
  })

  it('Scenario G: long progression to Level 20 -> Elite Rocky, never regresses below Elite', () => {
    const grant = processDevXpGrant(INITIAL_GAME_STATE, LEVEL_THRESHOLDS[20], new Date('2026-09-01T09:00:00'))
    expect(grant.state.level).toBe(20)
    expect(grant.state.evolutionStage).toBe('Elite')

    // A subsequent Alert (or any non-XP-granting action) must not regress it.
    const alert = processDocumentationAlert(grant.state, [], new Date('2026-09-01T10:00:00'))
    expect(alert.state.evolutionStage).toBe('Elite')
    expect(alert.state.level).toBe(20)
  })
})

describe('Streak — weekend / non-working-day behavior (Phase 10 §Rule 7)', () => {
  // Documented product decision (unchanged by Phase 10): Current Streak is a
  // pure calendar-day count. There is no "working day" or "weekend grace"
  // concept in the Streak calculation itself — that concept only exists for
  // *Reminders* (when Rocky is allowed to nudge you), never for whether a
  // Check-in counts. A Check-in on a Saturday or Sunday continues the streak
  // exactly like any other consecutive day, and skipping a Saturday still
  // breaks it like skipping any other day. These tests lock in that this
  // stays true — no grace period was ever approved, so none is invented here.

  it('a Check-in on a Saturday continues the streak like any other consecutive day', () => {
    // 2026-09-04 is a Friday; 2026-09-05 is a Saturday.
    const friday = processCheckIn(INITIAL_GAME_STATE, [], new Date('2026-09-04T09:00:00'))
    const saturday = processCheckIn(friday.state, friday.events, new Date('2026-09-05T09:00:00'))
    expect(saturday.state.currentStreak).toBe(2)
  })

  it('a Check-in on a Sunday continues into Monday normally (no weekend reset)', () => {
    // 2026-09-05 Saturday, 2026-09-06 Sunday, 2026-09-07 Monday.
    let events: GameEvent[] = []
    let state = INITIAL_GAME_STATE
    for (const iso of ['2026-09-05T09:00:00', '2026-09-06T09:00:00', '2026-09-07T09:00:00']) {
      const result = processCheckIn(state, events, new Date(iso))
      state = result.state
      events = [...events, ...result.events]
    }
    expect(state.currentStreak).toBe(3)
  })

  it('skipping a Saturday breaks the streak exactly like skipping any weekday', () => {
    const friday = processCheckIn(INITIAL_GAME_STATE, [], new Date('2026-09-04T09:00:00'))
    // Skip Saturday 09-05 entirely; check in Sunday 09-06 instead (a 2-day gap).
    const sunday = processCheckIn(friday.state, friday.events, new Date('2026-09-06T09:00:00'))
    expect(sunday.state.currentStreak).toBe(1) // reset, no weekend grace
  })

  it('there is no "one missed day per rolling 30 days" grace — any gap resets to 1', () => {
    let events: GameEvent[] = []
    let state = INITIAL_GAME_STATE
    for (let day = 1; day <= 5; day++) {
      const result = processCheckIn(state, events, new Date(`2026-09-0${day}T09:00:00`))
      state = result.state
      events = [...events, ...result.events]
    }
    expect(state.currentStreak).toBe(5)

    // Miss one day (09-06), resume on 09-07 — no grace credit for the streak so far.
    const afterGap = processCheckIn(state, events, new Date('2026-09-07T09:00:00'))
    expect(afterGap.state.currentStreak).toBe(1)
    expect(afterGap.state.bestStreak).toBe(5) // history preserved, just not the live streak
  })

  it('a configured non-working day never suppresses a real Check-in — Streak logic has no WorkingHoursSettings dependency', () => {
    // Sanity check that calculateStreak's signature can't even see working
    // hours/days — it only ever takes (previousStreak, lastCheckInDate, today).
    expect(calculateStreak.length).toBe(3)
  })
})
