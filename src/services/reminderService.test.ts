import { beforeEach, describe, expect, it } from 'vitest'
import { LocalStorageRepository } from '../repository/localStorageRepository'
import { GameService } from './gameService'
import {
  checkForReminder,
  devTriggerReminder,
  getReminderHistory,
  isForcingWorkingHours,
  markReminderActed,
  markReminderDismissed,
  markReminderOpened,
  resetReminderHistory,
  setForceWorkingHours,
} from './reminderService'

// Wednesday, within working hours.
const WORK_TIME = new Date('2026-09-09T10:00:00')

describe('checkForReminder', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('sends a reminder when eligible and persists it', () => {
    const repo = new LocalStorageRepository()
    const record = checkForReminder(repo, WORK_TIME)
    expect(record).not.toBeNull()
    expect(record!.status).toBe('sent')
    expect(repo.getReminders()).toHaveLength(1)
  })

  it('never modifies GameState/XP/Energy/Streak or generates game events', () => {
    const repo = new LocalStorageRepository()
    const service = new GameService(repo)
    service.checkIn(new Date('2026-09-08T09:00:00'))
    const beforeState = repo.getGameState()
    const beforeEvents = repo.getEvents()
    const beforeAchievements = repo.getAchievements()

    checkForReminder(repo, WORK_TIME)

    expect(repo.getGameState()).toEqual(beforeState)
    expect(repo.getEvents()).toEqual(beforeEvents)
    expect(repo.getAchievements()).toEqual(beforeAchievements)
  })

  it('does not send a second reminder within the cooldown window (simulating a rapid double-call, e.g. React StrictMode)', () => {
    const repo = new LocalStorageRepository()
    const first = checkForReminder(repo, WORK_TIME)
    const second = checkForReminder(repo, WORK_TIME) // same instant
    expect(first).not.toBeNull()
    expect(second).toBeNull()
    expect(repo.getReminders()).toHaveLength(1)
  })

  it('never celebrates the same event twice, no matter how many times it is evaluated', () => {
    const repo = new LocalStorageRepository()
    const service = new GameService(repo)
    const result = service.devTriggerLevel(5, new Date('2026-09-08T09:00:00')) // LEVEL_UP + EVOLUTION events
    expect(result.events.length).toBeGreaterThan(0)

    const first = checkForReminder(repo, WORK_TIME)
    expect(first?.category).toBe('Celebration')

    // Even well after cooldown, the same event must never celebrate again.
    const muchLater = new Date(WORK_TIME.getTime() + 200 * 60_000)
    const second = checkForReminder(repo, muchLater)
    expect(second?.dedupeKey).not.toBe(first?.dedupeKey)
    // No matter what the second reminder is, it must not reuse the same dedupeKey.
    const celebrationDedupeKeys = repo
      .getReminders()
      .filter((r) => r.category === 'Celebration')
      .map((r) => r.dedupeKey)
    expect(new Set(celebrationDedupeKeys).size).toBe(celebrationDedupeKeys.length)
  })

  it('respects working hours (no reminder outside the window)', () => {
    const repo = new LocalStorageRepository()
    const afterHours = new Date('2026-09-09T22:00:00')
    expect(checkForReminder(repo, afterHours)).toBeNull()
  })

  it('Simulate Working Hours bypasses the working-hours check', () => {
    const repo = new LocalStorageRepository()
    const afterHours = new Date('2026-09-09T22:00:00')
    setForceWorkingHours(true)
    expect(isForcingWorkingHours()).toBe(true)
    expect(checkForReminder(repo, afterHours)).not.toBeNull()
    setForceWorkingHours(false)
  })

  it('reflects the persisted reminder history after a fresh repository instance (reload)', () => {
    const repo1 = new LocalStorageRepository()
    checkForReminder(repo1, WORK_TIME)

    const repo2 = new LocalStorageRepository()
    expect(getReminderHistory(repo2)).toHaveLength(1)
  })
})

describe('reminder lifecycle', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('moves sent -> opened -> acted', () => {
    const repo = new LocalStorageRepository()
    const record = checkForReminder(repo, WORK_TIME)!
    expect(record.status).toBe('sent')

    markReminderOpened(record.id, repo)
    expect(repo.getReminders()[0].status).toBe('opened')

    markReminderActed(record.id, repo)
    expect(repo.getReminders()[0].status).toBe('acted')
  })

  it('moves sent -> dismissed', () => {
    const repo = new LocalStorageRepository()
    const record = checkForReminder(repo, WORK_TIME)!
    markReminderDismissed(record.id, repo)
    expect(repo.getReminders()[0].status).toBe('dismissed')
  })

  it('does not downgrade a terminal status (acted/dismissed) back to opened', () => {
    const repo = new LocalStorageRepository()
    const record = checkForReminder(repo, WORK_TIME)!
    markReminderActed(record.id, repo)
    markReminderOpened(record.id, repo) // a late/duplicate "opened" call
    expect(repo.getReminders()[0].status).toBe('acted')
  })
})

describe('devTriggerReminder', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('creates a reminder of the requested category regardless of cooldown/hours', () => {
    const repo = new LocalStorageRepository()
    const afterHours = new Date('2026-09-09T22:00:00')
    const record = devTriggerReminder('Celebration', repo, afterHours)
    expect(record.category).toBe('Celebration')
    expect(repo.getReminders()).toHaveLength(1)
  })
})

describe('resetReminderHistory', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('clears all reminder history', () => {
    const repo = new LocalStorageRepository()
    checkForReminder(repo, WORK_TIME)
    expect(getReminderHistory(repo).length).toBeGreaterThan(0)
    resetReminderHistory(repo)
    expect(getReminderHistory(repo)).toHaveLength(0)
  })
})
