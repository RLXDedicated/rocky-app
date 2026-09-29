import type { EvolutionStage, Mood } from '../types/domain'

// Evolution Stage -> Visual Asset boundary. The game engine only ever knows
// about the EvolutionStage string ('Baby' | 'Young' | 'Advanced' | 'Elite')
// and the Mood string; it never references a concrete illustration. This
// module is the single place that translates (stage, mood) into what gets
// drawn — everything else (RockyAvatar and its callers) asks for
// `getRockyAsset(stage, mood)`/`getReactionAsset(key)` and never imports a
// PNG path itself. That keeps a future move to a CDN/Azure Storage to a
// one-file change.
//
// The approved Rocky 2.5D asset set (Phase "Approved Rocky Asset
// Integration") is the visual source of truth — see
// docs/rocky-assets-source/ for the original package and its manifest.
import babyHappy from '../assets/rocky/baby/happy.png'
import babyMotivated from '../assets/rocky/baby/motivated.png'
import babyWorried from '../assets/rocky/baby/worried.png'
import babyRecovery from '../assets/rocky/baby/recovery.png'
import youngHappy from '../assets/rocky/young/happy.png'
import youngMotivated from '../assets/rocky/young/motivated.png'
import youngWorried from '../assets/rocky/young/worried.png'
import youngRecovery from '../assets/rocky/young/recovery.png'
import advancedHappy from '../assets/rocky/advanced/happy.png'
import advancedMotivated from '../assets/rocky/advanced/motivated.png'
import advancedWorried from '../assets/rocky/advanced/worried.png'
import advancedRecovery from '../assets/rocky/advanced/recovery.png'
import eliteHappy from '../assets/rocky/elite/happy.png'
import eliteMotivated from '../assets/rocky/elite/motivated.png'
import eliteWorried from '../assets/rocky/elite/worried.png'
import eliteRecovery from '../assets/rocky/elite/recovery.png'
import reactionCheckIn from '../assets/rocky/reactions/check-in.png'
import reactionQaPass from '../assets/rocky/reactions/qa-pass.png'
import reactionAlert from '../assets/rocky/reactions/alert.png'
import reactionLevelUp from '../assets/rocky/reactions/level-up.png'
import reactionEvolution from '../assets/rocky/reactions/evolution.png'
import reactionRecovery from '../assets/rocky/reactions/recovery.png'

export interface RockyVisualConfig {
  label: string
}

export const ROCKY_VISUALS: Record<EvolutionStage, RockyVisualConfig> = {
  Baby: { label: 'Baby Rocky' },
  Young: { label: 'Young Rocky' },
  Advanced: { label: 'Advanced Rocky' },
  Elite: { label: 'Elite Rocky' },
}

export const EVOLUTION_STAGE_ORDER: EvolutionStage[] = ['Baby', 'Young', 'Advanced', 'Elite']

// Evolution and Mood are independent dimensions — this table is the full
// 4x4 matrix, never a derived/computed path, so every combination is an
// explicit, reviewable mapping.
const ROCKY_ASSETS: Record<EvolutionStage, Record<Mood, string>> = {
  Baby: { Happy: babyHappy, Motivated: babyMotivated, Worried: babyWorried, Recovery: babyRecovery },
  Young: { Happy: youngHappy, Motivated: youngMotivated, Worried: youngWorried, Recovery: youngRecovery },
  Advanced: { Happy: advancedHappy, Motivated: advancedMotivated, Worried: advancedWorried, Recovery: advancedRecovery },
  Elite: { Happy: eliteHappy, Motivated: eliteMotivated, Worried: eliteWorried, Recovery: eliteRecovery },
}

/** The persistent Rocky illustration for a given (evolutionStage, mood) pair. */
export function getRockyAsset(evolutionStage: EvolutionStage, mood: Mood): string {
  return ROCKY_ASSETS[evolutionStage][mood]
}

export type RockyReactionKey = 'check-in' | 'qa-pass' | 'alert' | 'level-up' | 'evolution' | 'recovery'

const REACTION_ASSETS: Record<RockyReactionKey, string> = {
  'check-in': reactionCheckIn,
  'qa-pass': reactionQaPass,
  alert: reactionAlert,
  'level-up': reactionLevelUp,
  evolution: reactionEvolution,
  recovery: reactionRecovery,
}

/**
 * A universal, transient reaction illustration (Check-in / QA Pass / Alert /
 * Level Up / Evolution / Recovery). These are for temporary feedback only —
 * callers are responsible for reverting to `getRockyAsset(...)` once the
 * moment has passed; this module holds no timers or state of its own.
 */
export function getReactionAsset(reaction: RockyReactionKey): string {
  return REACTION_ASSETS[reaction]
}

/** Every Rocky illustration, for preloading (so a network blip never leaves Rocky invisible). */
export const ALL_ROCKY_ASSETS: string[] = [
  ...Object.values(ROCKY_ASSETS).flatMap((moods) => Object.values(moods)),
  ...Object.values(REACTION_ASSETS),
]
