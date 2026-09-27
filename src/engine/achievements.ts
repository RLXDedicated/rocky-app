// Achievement catalog for the local prototype.
//
// Design decision on XP: the three streak-based achievements (One Week
// Strong / Two Weeks Strong / Monthly Champion) unlock at the exact same
// moment as the corresponding Streak Milestone (see streakMilestones.ts),
// which already grants XP for reaching that streak length. To avoid
// granting the same accomplishment's XP twice, those achievements carry a
// rewardXp of 0 — their "reward" is the badge itself, the milestone already
// paid the XP. First Step, Getting Started and Consistency have no other
// event granting XP for the same thing, so they carry their own reward.
//
// Consistency rule (documented per spec 5/6 — "define a simple rule without
// introducing new complex metrics"): reusing the check-in count we already
// track, Consistency unlocks at 10 lifetime Check-ins, regardless of streak
// breaks in between. It rewards showing up over time, not a perfect streak —
// directly reflecting "Consistency over perfection".

export type AchievementMetric = 'checkins' | 'qaPasses' | 'streak'

export interface AchievementDef {
  id: string
  name: string
  description: string
  metric: AchievementMetric
  target: number
  rewardXp: number
}

export const ACHIEVEMENT_CATALOG: AchievementDef[] = [
  {
    id: 'first_step',
    name: 'First Step',
    description: 'Complete your first Check-in with Rocky.',
    metric: 'checkins',
    target: 1,
    rewardXp: 25,
  },
  {
    id: 'getting_started',
    name: 'Getting Started',
    description: 'Pass your first QA audit.',
    metric: 'qaPasses',
    target: 1,
    rewardXp: 25,
  },
  {
    id: 'one_week_strong',
    name: 'One Week Strong',
    description: 'Reach a 7-day Check-in streak.',
    metric: 'streak',
    target: 7,
    rewardXp: 0, // XP already granted by the 7-day Streak Milestone.
  },
  {
    id: 'two_weeks_strong',
    name: 'Two Weeks Strong',
    description: 'Reach a 14-day Check-in streak.',
    metric: 'streak',
    target: 14,
    rewardXp: 0, // XP already granted by the 14-day Streak Milestone.
  },
  {
    id: 'monthly_champion',
    name: 'Monthly Champion',
    description: 'Reach a 30-day Check-in streak.',
    metric: 'streak',
    target: 30,
    rewardXp: 0, // XP already granted by the 30-day Streak Milestone.
  },
  {
    id: 'consistency',
    name: 'Consistency',
    description: 'Log 10 total Check-ins — showing up matters more than a perfect streak.',
    metric: 'checkins',
    target: 10,
    rewardXp: 50,
  },
]

export interface AchievementMetrics {
  checkins: number
  qaPasses: number
  streak: number
}

export function evaluateAchievements(metrics: AchievementMetrics, alreadyUnlocked: Set<string>): AchievementDef[] {
  return ACHIEVEMENT_CATALOG.filter((def) => !alreadyUnlocked.has(def.id) && metrics[def.metric] >= def.target)
}
