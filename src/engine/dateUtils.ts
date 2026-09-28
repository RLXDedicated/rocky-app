// Local-day helpers. Rocky's day boundary is the player's local midnight.

export function todayKey(now: Date = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function dayKeyFromDate(date: Date): string {
  return todayKey(date)
}

export function daysBetweenKeys(a: string, b: string): number {
  const da = new Date(`${a}T00:00:00`)
  const db = new Date(`${b}T00:00:00`)
  const msPerDay = 24 * 60 * 60 * 1000
  return Math.round((db.getTime() - da.getTime()) / msPerDay)
}

/** Monday–Friday: the pilot's working week (same as the reminder schedule's default). */
export const WORKING_DAYS: readonly number[] = [1, 2, 3, 4, 5]

/**
 * Working days strictly between two day keys (a < b) — the days an agent
 * was expected to check in and didn't. Weekends and other non-working days
 * are never counted, so Friday → Monday misses nothing. Used for operational
 * signals (admin "at risk"), not for the Streak rule itself.
 */
export function missedWorkingDays(a: string, b: string, workingDays: readonly number[] = WORKING_DAYS): number {
  const gap = daysBetweenKeys(a, b)
  let missed = 0
  const d = new Date(`${a}T12:00:00`)
  for (let i = 1; i < gap; i++) {
    d.setDate(d.getDate() + 1)
    if (workingDays.includes(d.getDay())) missed++
  }
  return missed
}
