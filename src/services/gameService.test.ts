import { beforeEach, describe, expect, it } from 'vitest'
import { fixedClock } from '../engine/clock'
import { recalculateStateFromEvents } from '../engine/gameEngine'
import { LocalStorageRepository } from '../repository/localStorageRepository'
import { GameService } from './gameService'

describe('GameService (localStorage persistence)', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('grants the check-in reward on the first check-in of the day', () => {
    const service = new GameService(new LocalStorageRepository())
    const result = service.checkIn(new Date('2026-09-04T09:00:00'))

    expect(result.alreadyCheckedInToday).toBe(false)
    // +10 base Check-in reward, plus +25 for the "First Step" achievement
    // (this is the agent's very first Check-in ever).
    expect(result.state.xp).toBe(35)
    expect(result.state.energy).toBe(75)
    expect(result.state.currentStreak).toBe(1)
    expect(result.events).toHaveLength(2) // CHECK_IN + ACHIEVEMENT
    expect(result.events[0].type).toBe('CHECK_IN')
    expect(result.newAchievements.map((a) => a.id)).toContain('first_step')
  })

  it('does not create a duplicate event or extra reward for a second check-in the same day', () => {
    const service = new GameService(new LocalStorageRepository())
    service.checkIn(new Date('2026-09-04T09:00:00'))
    const second = service.checkIn(new Date('2026-09-04T20:00:00'))

    expect(second.alreadyCheckedInToday).toBe(true)
    expect(second.events).toHaveLength(0)

    const events = service.getRecentEvents(10)
    expect(events.filter((e) => e.type === 'CHECK_IN')).toHaveLength(1)
  })

  it('persists XP, level, energy, streak, best streak, last check-in and events across a fresh service instance', () => {
    // First "session": app is opened and a check-in happens.
    const firstSession = new GameService(new LocalStorageRepository())
    firstSession.checkIn(new Date('2026-09-04T09:00:00'))

    // Simulate closing and reopening the app: a brand-new repository and
    // service instance, backed only by whatever is in localStorage.
    const secondSession = new GameService(new LocalStorageRepository())
    const snapshot = secondSession.getSnapshot()

    expect(snapshot.gameState.xp).toBe(35) // +10 check-in + 25 First Step
    expect(snapshot.gameState.level).toBe(1)
    expect(snapshot.gameState.energy).toBe(75)
    expect(snapshot.gameState.currentStreak).toBe(1)
    expect(snapshot.gameState.bestStreak).toBe(1)
    expect(snapshot.gameState.lastCheckInDate).toBe('2026-09-04')
    expect(snapshot.events).toHaveLength(2) // CHECK_IN + ACHIEVEMENT
  })

  it('keeps best streak persisted even after the current streak resets on a later day', () => {
    const repo = new LocalStorageRepository()
    const service = new GameService(repo)
    service.checkIn(new Date('2026-09-01T09:00:00'))
    service.checkIn(new Date('2026-09-02T09:00:00'))
    service.checkIn(new Date('2026-09-03T09:00:00'))
    // Missed a day, streak resets.
    service.checkIn(new Date('2026-09-06T09:00:00'))

    const reopened = new GameService(new LocalStorageRepository())
    const snapshot = reopened.getSnapshot()
    expect(snapshot.gameState.currentStreak).toBe(1)
    expect(snapshot.gameState.bestStreak).toBe(3)
    // 4 CHECK_IN events + 1 ACHIEVEMENT (First Step, day 1) + 1 STREAK_MILESTONE (3-day, day 3)
    expect(snapshot.events).toHaveLength(6)
  })

  it('grants a QA Pass reward and persists it across a fresh service instance', () => {
    const service = new GameService(new LocalStorageRepository())
    const result = service.qaPass(new Date('2026-09-04T09:00:00'))

    // +25 base QA Pass reward, plus +25 for "Getting Started" (first QA Pass ever).
    expect(result.state.xp).toBe(50)
    expect(result.state.energy).toBe(80)

    const reopened = new GameService(new LocalStorageRepository())
    const snapshot = reopened.getSnapshot()
    expect(snapshot.gameState.xp).toBe(50)
    expect(snapshot.gameState.energy).toBe(80)
    expect(snapshot.events).toHaveLength(2) // QA_PASS + ACHIEVEMENT
    expect(snapshot.events[0].type).toBe('QA_PASS')
  })

  it('records a Documentation Alert and persists it across a fresh service instance', () => {
    const service = new GameService(new LocalStorageRepository())
    service.checkIn(new Date('2026-09-04T09:00:00'))
    const result = service.documentationAlert(new Date('2026-09-04T12:00:00'))

    expect(result.state.currentStreak).toBe(0)
    expect(result.state.energy).toBe(55) // 70 + 5 (check-in) - 20 (alert)

    const reopened = new GameService(new LocalStorageRepository())
    const snapshot = reopened.getSnapshot()
    expect(snapshot.gameState.currentStreak).toBe(0)
    // Alert never removes XP: 10 (check-in) + 25 (First Step) stays untouched.
    expect(snapshot.gameState.xp).toBe(35)
    expect(snapshot.events).toHaveLength(3) // CHECK_IN + ACHIEVEMENT + DOCUMENTATION_ALERT
    expect(snapshot.events.some((e) => e.type === 'DOCUMENTATION_ALERT')).toBe(true)
  })

  it('caps daily Energy loss from multiple alerts at 40 through the service layer', () => {
    const service = new GameService(new LocalStorageRepository())
    service.documentationAlert(new Date('2026-09-04T08:00:00')) // 70 -> 50
    service.documentationAlert(new Date('2026-09-04T12:00:00')) // 50 -> 30
    const third = service.documentationAlert(new Date('2026-09-04T18:00:00')) // capped, no change

    expect(third.state.energy).toBe(30)
  })

  it('persists a Correction and reflects the recalculated state after reload', () => {
    const service = new GameService(new LocalStorageRepository())
    service.checkIn(new Date('2026-09-01T09:00:00'))
    const alert = service.documentationAlert(new Date('2026-09-01T10:00:00'))
    const alertEventId = alert.events[0].id

    service.correction(
      { originalEventId: alertEventId, correctedTo: 'PASS' },
      new Date('2026-09-01T11:00:00'),
    )

    const reopened = new GameService(new LocalStorageRepository())
    const snapshot = reopened.getSnapshot()
    expect(snapshot.gameState.currentStreak).toBe(1) // the alert no longer breaks the streak
    expect(snapshot.events.some((e) => e.type === 'CORRECTION')).toBe(true)
    // Original alert event is still there, untouched.
    expect(snapshot.events.find((e) => e.id === alertEventId)?.type).toBe('DOCUMENTATION_ALERT')
  })

  it('persists unlocked achievements across a fresh service instance', () => {
    const service = new GameService(new LocalStorageRepository())
    service.checkIn(new Date('2026-09-04T09:00:00'))

    const reopened = new GameService(new LocalStorageRepository())
    const progress = reopened.getAchievementProgress()
    expect(progress.unlocked.map((a) => a.id)).toContain('first_step')
  })

  it('never duplicates an achievement across repeated actions', () => {
    const service = new GameService(new LocalStorageRepository())
    service.checkIn(new Date('2026-09-01T09:00:00'))
    service.checkIn(new Date('2026-09-02T09:00:00'))
    service.checkIn(new Date('2026-09-03T09:00:00'))

    const progress = service.getAchievementProgress()
    expect(progress.unlocked.filter((a) => a.id === 'first_step')).toHaveLength(1)
  })

  it('devTriggerLevel jumps to the requested Level/Evolution and persists across a fresh instance', () => {
    const service = new GameService(new LocalStorageRepository())
    const result = service.devTriggerLevel(10, new Date('2026-09-04T09:00:00'))

    expect(result.state.level).toBe(10)
    expect(result.state.evolutionStage).toBe('Advanced')

    const reopened = new GameService(new LocalStorageRepository())
    const snapshot = reopened.getSnapshot()
    expect(snapshot.gameState.level).toBe(10)
    expect(snapshot.gameState.evolutionStage).toBe('Advanced')
    expect(snapshot.events.some((e) => e.type === 'LEVEL_UP')).toBe(true)
    expect(snapshot.events.some((e) => e.type === 'EVOLUTION')).toBe(true)
  })

  it('devTriggerNextEvolution advances one stage at a time', () => {
    const service = new GameService(new LocalStorageRepository())
    const first = service.devTriggerNextEvolution(new Date('2026-09-04T09:00:00'))
    expect(first.state.evolutionStage).toBe('Young')

    const second = service.devTriggerNextEvolution(new Date('2026-09-04T09:01:00'))
    expect(second.state.evolutionStage).toBe('Advanced')

    const third = service.devTriggerNextEvolution(new Date('2026-09-04T09:02:00'))
    expect(third.state.evolutionStage).toBe('Elite')
  })

  it('persists Level, XP, and Evolution Stage across a fresh service instance (Phase 4 persistence)', () => {
    const service = new GameService(new LocalStorageRepository())
    service.checkIn(new Date('2026-09-01T09:00:00'))
    service.devTriggerLevel(20, new Date('2026-09-01T09:01:00'))

    const reopened = new GameService(new LocalStorageRepository())
    const snapshot = reopened.getSnapshot()
    expect(snapshot.gameState.level).toBe(20)
    expect(snapshot.gameState.evolutionStage).toBe('Elite')
    expect(snapshot.gameState.xp).toBeGreaterThanOrEqual(2700)
    // Evolution / Level-Up history survives in the event log.
    expect(snapshot.events.filter((e) => e.type === 'EVOLUTION').length).toBeGreaterThan(0)
    expect(snapshot.events.filter((e) => e.type === 'LEVEL_UP').length).toBeGreaterThan(0)
  })

  it('a Documentation Alert after reaching Level 10 never reduces Level or Evolution Stage', () => {
    const service = new GameService(new LocalStorageRepository())
    service.devTriggerLevel(10, new Date('2026-09-01T09:00:00'))
    service.documentationAlert(new Date('2026-09-01T10:00:00'))

    const reopened = new GameService(new LocalStorageRepository())
    const snapshot = reopened.getSnapshot()
    expect(snapshot.gameState.level).toBe(10)
    expect(snapshot.gameState.evolutionStage).toBe('Advanced')
  })
})

describe('resetProgress (Reset Demo / Reset All Data)', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('resetProgress(true) wipes game progress but keeps the agent\'s chosen name (Reset Demo)', () => {
    const repo = new LocalStorageRepository()
    const service = new GameService(repo)
    repo.saveAgent({ ...repo.getAgent(), rockyName: 'Bruiser' })
    service.checkIn(new Date('2026-09-01T09:00:00'))

    service.resetProgress(true)

    const snapshot = service.getSnapshot()
    expect(snapshot.gameState.xp).toBe(0)
    expect(snapshot.gameState.currentStreak).toBe(0)
    expect(snapshot.events).toHaveLength(0)
    expect(snapshot.agent.rockyName).toBe('Bruiser')
  })

  it('resetProgress(false) wipes the agent name too (Reset All Data)', () => {
    const repo = new LocalStorageRepository()
    const service = new GameService(repo)
    repo.saveAgent({ ...repo.getAgent(), rockyName: 'Bruiser' })
    service.checkIn(new Date('2026-09-01T09:00:00'))

    service.resetProgress(false)

    const snapshot = service.getSnapshot()
    expect(snapshot.gameState.xp).toBe(0)
    expect(snapshot.agent.rockyName).toBe('Rocky') // back to the default
  })

  it('resetProgress never leaves achievements behind', () => {
    const repo = new LocalStorageRepository()
    const service = new GameService(repo)
    service.checkIn(new Date('2026-09-01T09:00:00')) // unlocks First Step
    expect(repo.getAchievements().length).toBeGreaterThan(0)

    service.resetProgress(true)
    expect(repo.getAchievements()).toHaveLength(0)
  })
})

describe('Clock injection (Phase 9 §Rule 3)', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('uses the injected Clock when no explicit `now` is passed to checkIn()', () => {
    const clock = fixedClock('2026-09-01T09:00:00')
    const service = new GameService(new LocalStorageRepository(), clock)
    const result = service.checkIn()
    expect(result.state.lastCheckInDate).toBe('2026-09-01')
  })

  it('an explicit `now` argument still overrides the injected Clock', () => {
    const clock = fixedClock('2026-09-01T09:00:00')
    const service = new GameService(new LocalStorageRepository(), clock)
    const result = service.checkIn(new Date('2026-09-05T09:00:00'))
    expect(result.state.lastCheckInDate).toBe('2026-09-05')
  })

  it('two services sharing a fixed Clock see the same "now" (deterministic in tests)', () => {
    const clock = fixedClock('2026-09-01T09:00:00')
    const repo = new LocalStorageRepository()
    const a = new GameService(repo, clock)
    const b = new GameService(repo, clock)
    const resultA = a.checkIn()
    expect(resultA.alreadyCheckedInToday).toBe(false)
    const resultB = b.checkIn() // same fixed instant, same day -> already checked in
    expect(resultB.alreadyCheckedInToday).toBe(true)
  })
})

describe('Demo determinism (Phase 9 §Rule 12)', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  function runDemoScript(repo: LocalStorageRepository) {
    const service = new GameService(repo)
    service.checkIn(new Date('2026-09-01T09:00:00'))
    service.qaPass(new Date('2026-09-01T10:00:00'))
    service.documentationAlert(new Date('2026-09-01T11:00:00'))
    service.checkIn(new Date('2026-09-02T09:00:00'))
    return service.getSnapshot()
  }

  it('Reset Demo + the same scripted sequence produces identical results every time', () => {
    const repoRun1 = new LocalStorageRepository()
    const snapshot1 = runDemoScript(repoRun1)

    window.localStorage.clear() // Reset Demo equivalent
    const repoRun2 = new LocalStorageRepository()
    const snapshot2 = runDemoScript(repoRun2)

    expect(snapshot2.gameState).toEqual(snapshot1.gameState)
    expect(snapshot2.events).toHaveLength(snapshot1.events.length)
    expect(snapshot2.events.map((e) => e.type)).toEqual(snapshot1.events.map((e) => e.type))
  })

  it('replaying the resulting event history reproduces the same persisted state', () => {
    const repo = new LocalStorageRepository()
    const snapshot = runDemoScript(repo)
    const agentId = snapshot.agent.id
    const replayed = recalculateStateFromEvents(snapshot.events, agentId)
    expect(replayed).toEqual(snapshot.gameState)
  })
})
