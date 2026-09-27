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
