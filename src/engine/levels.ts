import type { EvolutionStage } from '../types/domain'

// XP required to REACH each level (index 0 unused, level 1 = 0 XP).
// Levels 1-10 are the exact values fixed by the spec — never change them.
//
// Levels 11-20 are NOT given explicit values anywhere in the spec, but
// Evolution requires Level 20 (Elite) to be reachable, and XP is unbounded
// (QA Passes, Streak Milestones and Achievements keep accumulating past
// 2700). Without values here, calculateLevel would hard-cap at Level 10
// forever and Elite could never be reached — a real gap, not a style choice.
//
// Fix: the official 1-10 table follows a clean pattern — the XP cost to
// reach level L from L-1 is exactly 50*L (100, 150, 200, ... 500). Levels
// 11-20 continue that same +50-per-level step, which is the only
// self-consistent way to extend the given numbers rather than inventing an
// unrelated curve:
//   Level 11: 3250   Level 14: 5200   Level 17: 7600   Level 20: 10450
//   Level 12: 3850   Level 15: 5950   Level 18: 8500
//   Level 13: 4500   Level 16: 6750   Level 19: 9450
export const LEVEL_THRESHOLDS: number[] = [
  0, // level 0 unused
  0, // Level 1
  100, // Level 2
  250, // Level 3
  450, // Level 4
  700, // Level 5
  1000, // Level 6
  1350, // Level 7
  1750, // Level 8
  2200, // Level 9
  2700, // Level 10
  3250, // Level 11
  3850, // Level 12
  4500, // Level 13
  5200, // Level 14
  5950, // Level 15
  6750, // Level 16
  7600, // Level 17
  8500, // Level 18
  9450, // Level 19
  10450, // Level 20
]

export const MAX_DEFINED_LEVEL = LEVEL_THRESHOLDS.length - 1

export function calculateLevel(xp: number): number {
  let level = 1
  for (let l = 1; l <= MAX_DEFINED_LEVEL; l++) {
    if (xp >= LEVEL_THRESHOLDS[l]) {
      level = l
    } else {
      break
    }
  }
  return level
}

export function xpForNextLevel(level: number): number | null {
  if (level >= MAX_DEFINED_LEVEL) return null
  return LEVEL_THRESHOLDS[level + 1]
}

export function xpForCurrentLevel(level: number): number {
  return LEVEL_THRESHOLDS[Math.min(level, MAX_DEFINED_LEVEL)]
}

export function evolutionForLevel(level: number): EvolutionStage {
  if (level >= 20) return 'Elite'
  if (level >= 10) return 'Advanced'
  if (level >= 5) return 'Young'
  return 'Baby'
}

const EVOLUTION_ORDER: EvolutionStage[] = ['Baby', 'Young', 'Advanced', 'Elite']

export function evolutionRank(stage: EvolutionStage): number {
  return EVOLUTION_ORDER.indexOf(stage)
}
