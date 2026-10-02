import type { EvolutionStage, Mood } from '../types/domain'

// Visual boundary: the single place that turns a mood, a reaction or a
// pose name into an image. Everything else asks for getRockyAsset /
// getReactionAsset / getPoseAsset and never imports a PNG itself.
//
// Rocky's identity is fixed by the client: only the official artwork in
// src/assets/rocky/official/ is used (no evolutions, 3D or redrawn variants).

// Official Rocky poses delivered by the client (Marketing-approved). Shown
// exactly as delivered — only cut out of the original sheets (see
// tools/slice-rocky-sheet.py), never redrawn, recoloured or deformed.
// Catalogue: src/assets/rocky/official/README.md · sheets: docs/rocky-assets-source/official/sheets/.
import poseThumbsUpBoth from '../assets/rocky/official/poses/thumbs-up-both.png'
import posePointingUp from '../assets/rocky/official/poses/pointing-up.png'
import poseThumbsUp from '../assets/rocky/official/poses/thumbs-up.png'
import poseArmsCrossed from '../assets/rocky/official/poses/arms-crossed.png'
import poseHandTruck from '../assets/rocky/official/poses/hand-truck.png'
import poseWaving from '../assets/rocky/official/poses/waving.png'
import poseHello from '../assets/rocky/official/poses/hello.png'
import poseCheering from '../assets/rocky/official/poses/cheering.png'
import poseThumbsUpHip from '../assets/rocky/official/poses/thumbs-up-hip.png'
import poseThinking from '../assets/rocky/official/poses/thinking.png'
import poseLaptop from '../assets/rocky/official/poses/laptop.png'
import poseIdea from '../assets/rocky/official/poses/idea.png'
import poseCelebrating from '../assets/rocky/official/poses/celebrating.png'
import poseLove from '../assets/rocky/official/poses/love.png'
import poseLaughing from '../assets/rocky/official/poses/laughing.png'
import poseNervous from '../assets/rocky/official/poses/nervous.png'
import poseDetermined from '../assets/rocky/official/poses/determined.png'
import poseCool from '../assets/rocky/official/poses/cool.png'
import poseJumpingJoy from '../assets/rocky/official/poses/jumping-joy.png'
import poseThumbsUpSparkle from '../assets/rocky/official/poses/thumbs-up-sparkle.png'
import poseWarning from '../assets/rocky/official/poses/warning.png'
import poseConfused from '../assets/rocky/official/poses/confused.png'
import poseProud from '../assets/rocky/official/poses/proud.png'
import poseSleeping from '../assets/rocky/official/poses/sleeping.png'
import poseFistPump from '../assets/rocky/official/poses/fist-pump.png'
import poseOkWink from '../assets/rocky/official/poses/ok-wink.png'
import poseTrophy from '../assets/rocky/official/poses/trophy.png'
import posePanic from '../assets/rocky/official/poses/panic.png'
import poseSittingLaptop from '../assets/rocky/official/poses/sitting-laptop.png'
import poseYawning from '../assets/rocky/official/poses/yawning.png'

import worldThumbsUp from '../assets/rocky/official/world/thumbs-up.png'
import worldProud from '../assets/rocky/official/world/proud.png'
import worldThinking from '../assets/rocky/official/world/thinking.png'
import worldYawning from '../assets/rocky/official/world/yawning.png'
import { EMOTE_POSE, WORLD_POSE, type WorldPose } from './rockyWorldRig'

export const ROCKY_POSES = [
  'jumping-joy',
  'thumbs-up-sparkle',
  'warning',
  'confused',
  'proud',
  'sleeping',
  'fist-pump',
  'ok-wink',
  'trophy',
  'panic',
  'sitting-laptop',
  'yawning',
  'thumbs-up-both',
  'pointing-up',
  'thumbs-up',
  'arms-crossed',
  'hand-truck',
  'waving',
  'hello',
  'cheering',
  'thumbs-up-hip',
  'thinking',
  'laptop',
  'idea',
  'celebrating',
  'love',
  'laughing',
  'nervous',
  'determined',
  'cool',
] as const

export type RockyPose = (typeof ROCKY_POSES)[number]

const POSE_ASSETS: Record<RockyPose, string> = {
  'jumping-joy': poseJumpingJoy,
  'thumbs-up-sparkle': poseThumbsUpSparkle,
  'warning': poseWarning,
  'confused': poseConfused,
  'proud': poseProud,
  'sleeping': poseSleeping,
  'fist-pump': poseFistPump,
  'ok-wink': poseOkWink,
  'trophy': poseTrophy,
  'panic': posePanic,
  'sitting-laptop': poseSittingLaptop,
  'yawning': poseYawning,
  'thumbs-up-both': poseThumbsUpBoth,
  'pointing-up': posePointingUp,
  'thumbs-up': poseThumbsUp,
  'arms-crossed': poseArmsCrossed,
  'hand-truck': poseHandTruck,
  waving: poseWaving,
  hello: poseHello,
  cheering: poseCheering,
  'thumbs-up-hip': poseThumbsUpHip,
  thinking: poseThinking,
  laptop: poseLaptop,
  idea: poseIdea,
  celebrating: poseCelebrating,
  love: poseLove,
  laughing: poseLaughing,
  nervous: poseNervous,
  determined: poseDetermined,
  cool: poseCool,
}

/** An official Rocky pose. */
export function getPoseAsset(pose: RockyPose): string {
  return POSE_ASSETS[pose]
}

export interface RockyVisualConfig {
  label: string
}

export const ROCKY_VISUALS: Record<EvolutionStage, RockyVisualConfig> = {
  // One official Rocky at every rank: the label is the same everywhere.
  Baby: { label: 'Rocky' },
  Young: { label: 'Rocky' },
  Advanced: { label: 'Rocky' },
  Elite: { label: 'Rocky' },
}

export const EVOLUTION_STAGE_ORDER: EvolutionStage[] = ['Baby', 'Young', 'Advanced', 'Elite']

// One official Rocky for every level (no evolutions): the mood picks which
// approved pose he shows — see rockyWorldRig.ts. These are the square world
// canvases (tools/build-rocky-world-art.py), also used as his avatar.
const WORLD_ART: Record<WorldPose, string> = {
  'thumbs-up': worldThumbsUp,
  proud: worldProud,
  thinking: worldThinking,
  yawning: worldYawning,
}

/** Rocky's picture for a mood. The stage no longer changes how he looks. */
export function getRockyAsset(_evolutionStage: EvolutionStage, mood: Mood): string {
  return WORLD_ART[WORLD_POSE[mood]]
}

export type RockyReactionKey = 'check-in' | 'qa-pass' | 'alert' | 'level-up' | 'evolution' | 'recovery'

// Reactions use the official poses.
const REACTION_ASSETS: Record<RockyReactionKey, string> = {
  'check-in': poseThumbsUp,
  'qa-pass': poseThumbsUpSparkle,
  alert: poseWarning,
  'level-up': poseCelebrating,
  evolution: poseCelebrating,
  recovery: poseDetermined,
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
  ...Object.values(WORLD_ART),
  ...Object.values(EMOTE_POSE).map((pose) => POSE_ASSETS[pose]),
  ...Object.values(REACTION_ASSETS),
]
