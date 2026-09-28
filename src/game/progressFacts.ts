import { gameService } from '../services/gameService'
import type { GameState } from '../types/domain'
import type { ProgressFacts } from './closet'

/** The progress the shop and the coin economy read, from the Game Engine's state. */
export function buildProgressFacts(state: GameState): ProgressFacts {
  const progress = gameService.getAchievementProgress()
  return {
    level: state.level,
    stage: state.evolutionStage,
    bestStreak: state.bestStreak,
    checkIns: progress.metrics.checkins,
    qaPasses: progress.metrics.qaPasses,
    badgeIds: progress.unlocked.map((a) => a.id),
  }
}
