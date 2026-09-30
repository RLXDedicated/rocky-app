import { systemClock } from '../engine/clock'
import { evaluateReminderOpportunity, type ReminderCandidate } from '../engine/reminderEngine'
import { repository } from '../repository/localStorageRepository'
import type { Repository } from '../repository/repository'
import { DEFAULT_AGENT_ID } from '../types/domain'
import type { ReminderCategory, ReminderRecord, ReminderStatus, WorkingHoursSettings } from '../types/reminder'

let idCounter = 0
function makeReminderId(): string {
  idCounter += 1
  return `rem_${Date.now()}_${idCounter}`
}

/** Fired when a dev-triggered reminder is created, so ReminderHost can show it immediately instead of waiting for its next poll tick. */
export const REMINDER_DEV_EVENT = 'rocky:dev-reminder'

// Dev-only override so Developer Controls can "Simulate Working Hours"
// without touching the system clock. Never read by real gameplay logic
// outside this service, and has no effect on GameState/XP/Energy/Streak.
const FORCE_WORKING_HOURS_KEY = 'rocky.dev.forceWorkingHours'

export function setForceWorkingHours(force: boolean): void {
  if (force) window.localStorage.setItem(FORCE_WORKING_HOURS_KEY, '1')
  else window.localStorage.removeItem(FORCE_WORKING_HOURS_KEY)
}

export function isForcingWorkingHours(): boolean {
  return window.localStorage.getItem(FORCE_WORKING_HOURS_KEY) === '1'
}

function toRecord(candidate: ReminderCandidate, now: Date): ReminderRecord {
  return {
    id: makeReminderId(),
    category: candidate.category,
    message: candidate.message,
    timestamp: now.toISOString(),
    status: 'sent',
    actionable: candidate.actionable,
    dedupeKey: candidate.dedupeKey,
  }
}

/**
 * The one entry point the UI should poll (e.g. on an interval, or on
 * mount/navigation). Reads GameState/events/reminder history from the
 * Repository, asks the pure engine whether a reminder is due, and — only if
 * so — persists it as 'sent' and returns it. Returns null otherwise. Never
 * touches XP/Energy/Streak/Achievements (Phase 7 §25).
 */
export function checkForReminder(repo: Repository = repository, now: Date = systemClock.now(), settings?: WorkingHoursSettings): ReminderRecord | null {
  const state = repo.getGameState()
  const events = repo.getEvents()
  const history = repo.getReminders()
  const agentId = repo.getAgent().id ?? DEFAULT_AGENT_ID

  const candidate = evaluateReminderOpportunity({
    now,
    state,
    events,
    history,
    agentId,
    forceWorkingHours: isForcingWorkingHours(),
    settings,
  })
  if (!candidate) return null

  const record = toRecord(candidate, now)
  repo.saveReminder(record)
  return record
}

/**
 * Developer-only: force a reminder of the given category to appear right
 * now, bypassing working hours/cooldown/daily-limit/suppression. Still goes
 * through the same message catalog and is recorded in history like a real
 * one, so it exercises the exact same lifecycle/UI path.
 */
export function devTriggerReminder(category: ReminderCategory, repo: Repository = repository, now: Date = systemClock.now()): ReminderRecord {
  const messages: Record<ReminderCategory, string> = {
    Documentation: 'Rocky is ready when you are.',
    Streak: 'Keep the streak alive.',
    Progress: "You're getting closer to the next level.",
    Celebration: "Rocky's on a roll!",
    Recovery: "Good comeback. Let's keep rebuilding.",
  }
  const actionable = category === 'Documentation' || category === 'Streak' || category === 'Recovery'
  const record = toRecord({ category, message: messages[category], actionable }, now)
  repo.saveReminder(record)
  // ReminderHost polls on an interval; dispatch so a dev-triggered reminder
  // is visible immediately instead of waiting for the next tick.
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent<ReminderRecord>(REMINDER_DEV_EVENT, { detail: record }))
  }
  return record
}

export function markReminderOpened(id: string, repo: Repository = repository): void {
  repo.updateReminderStatus(id, 'opened')
}

export function markReminderDismissed(id: string, repo: Repository = repository): void {
  repo.updateReminderStatus(id, 'dismissed')
}

export function markReminderActed(id: string, repo: Repository = repository): void {
  repo.updateReminderStatus(id, 'acted')
}

export function getReminderHistory(repo: Repository = repository): ReminderRecord[] {
  return repo.getReminders()
}

export function resetReminderHistory(repo: Repository = repository): void {
  repo.resetReminders()
}

export type { ReminderCategory, ReminderRecord, ReminderStatus }
