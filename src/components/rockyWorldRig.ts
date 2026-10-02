// Rocky in his world: which official pose he shows for each mood, and where
// his head, eyes, collar and hips are on that art (fractions of the square
// canvas built by tools/build-rocky-world-art.py) so closet items sit on him.
//
// The art is the client's approved Rocky, shown as delivered: he moves as a
// whole image (hops, sways, walks), never deformed. Poses without measured
// points (sitting, hand on the chin) show without worn items.
import type { Mood } from '../types/domain'
import type { RockyPose } from './rockyVisuals'

export interface HeadAnchor {
  /** Top-centre of the head (hair), fractions of the canvas. */
  x: number
  y: number
  /** Face width. */
  w: number
  figureTop: number
  figureBottom: number
}

export interface RockyRigPoints {
  neck: number
  pivot: { x: number; y: number }
  chest: number
  feet: number
  top: number
  hip: number
  splitX: number
  eyes: { x: number; y: number; r: number }[]
}

export type WorldPose = 'thumbs-up' | 'proud' | 'thinking' | 'yawning'

/** The pose Rocky holds while idle or walking, per mood. */
export const WORLD_POSE: Record<Mood, WorldPose> = {
  Happy: 'thumbs-up',
  Motivated: 'proud',
  Worried: 'thinking',
  Recovery: 'yawning',
}

const ANCHORS: Record<WorldPose, HeadAnchor> = {
  'thumbs-up': { x: 0.475, y: 0.1, w: 0.36, figureTop: 0.085, figureBottom: 0.94 },
  proud: { x: 0.525, y: 0.11, w: 0.36, figureTop: 0.1, figureBottom: 0.94 },
  thinking: { x: 0.5, y: 0.1, w: 0.36, figureTop: 0.08, figureBottom: 0.94 },
  yawning: { x: 0.5, y: 0.1, w: 0.36, figureTop: 0.08, figureBottom: 0.94 },
}

const RIG: Partial<Record<WorldPose, RockyRigPoints>> = {
  'thumbs-up': {
    neck: 0.45,
    pivot: { x: 0.475, y: 0.43 },
    chest: 0.52,
    feet: 0.94,
    top: 0.085,
    hip: 0.64,
    splitX: 0.5,
    eyes: [
      { x: 0.444, y: 0.278, r: 0.03 },
      { x: 0.578, y: 0.278, r: 0.03 },
    ],
  },
  proud: {
    neck: 0.41,
    pivot: { x: 0.53, y: 0.4 },
    chest: 0.5,
    feet: 0.94,
    top: 0.1,
    hip: 0.62,
    splitX: 0.52,
    eyes: [
      { x: 0.48, y: 0.29, r: 0.03 },
      { x: 0.625, y: 0.29, r: 0.03 },
    ],
  },
}

export function worldAnchor(mood: Mood): HeadAnchor {
  return ANCHORS[WORLD_POSE[mood]]
}

/** Measured points for the mood's pose, or null when worn items don't fit it. */
export function worldRig(mood: Mood): RockyRigPoints | null {
  return RIG[WORLD_POSE[mood]] ?? null
}

/** Short official-pose moments that replace the old 3D clips (a hop of joy, a bite, a wave…). */
export const EMOTE_POSE = {
  Happy: 'cheering',
  Motivated: 'fist-pump',
  Worried: 'nervous',
  Recovery: 'determined',
  Celebrate: 'celebrating',
  Eat: 'love',
  Wave: 'hello',
} as const satisfies Record<string, RockyPose>

export type RockyEmote = keyof typeof EMOTE_POSE
