// Streak-length XP milestones. Each fires exactly once per agent, the first
// time the current streak reaches that length — never again, even if the
// streak later breaks and is rebuilt past the same length.

export interface StreakMilestone {
  days: number
  xp: number
}

export const STREAK_MILESTONES: StreakMilestone[] = [
  { days: 3, xp: 25 },
  { days: 7, xp: 50 },
  { days: 14, xp: 100 },
  { days: 30, xp: 250 },
  { days: 60, xp: 500 },
  { days: 90, xp: 750 },
]

export function evaluateStreakMilestones(currentStreak: number, alreadyGrantedDays: Set<number>): StreakMilestone[] {
  return STREAK_MILESTONES.filter((m) => currentStreak >= m.days && !alreadyGrantedDays.has(m.days))
}
