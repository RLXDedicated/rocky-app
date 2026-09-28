import { gameService } from '../services/gameService'
import type { GameState } from '../types/domain'
import type { ProgressFacts } from './closet'
import { factsFrom } from './pet'

/** The progress the shop and the coin economy read, from this browser's copy of the Game Engine's state. */
export function buildProgressFacts(state: GameState): ProgressFacts {
  return factsFrom(state, gameService.getAchievementProgress())
}
