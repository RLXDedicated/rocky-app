import type { TeamMood, TeamRankChange } from '../types/team'

// No punitive language anywhere here — never "your team is failing", never
// calling out an individual. A dip is always framed as a shared, temporary
// thing to rebuild, per Phase 6 §7/§13.
export function teamMoodMessage(mood: TeamMood): string {
  switch (mood) {
    case 'Happy':
      return 'The team is thriving — excellent collective consistency.'
    case 'Motivated':
      return 'The team is building consistency.'
    case 'Worried':
      return "The team's momentum has slowed — let's build it back together."
    case 'Recovery':
      return 'The team is bouncing back — great collective effort.'
  }
}

export function teamRockyReaction(rankChange: TeamRankChange, mood: TeamMood): string {
  if (rankChange === 'up') return '🔼 Team Rocky moved up!'
  if (mood === 'Recovery' || rankChange === 'down') return "Let's build it back together."
  if (mood === 'Happy' || mood === 'Motivated') return 'Strong teamwork.'
  return 'Great team momentum.'
}
