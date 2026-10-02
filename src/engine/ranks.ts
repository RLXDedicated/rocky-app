// Rocky's stages are ranks of the agent, never a different-looking Rocky
// (Marketing: one official Rocky). Internally the stage keeps its old id
// (Baby/Young/Advanced/Elite) so saved data and rules don't change; every
// text a person reads uses the rank name.
import type { EvolutionStage } from '../types/domain'

export const RANK_NAME: Record<EvolutionStage, string> = {
  Baby: 'Rookie',
  Young: 'Pro',
  Advanced: 'Expert',
  Elite: 'Legend',
}

export function rankName(stage: unknown): string {
  return typeof stage === 'string' ? (RANK_NAME[stage as EvolutionStage] ?? stage) : ''
}
