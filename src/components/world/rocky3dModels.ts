// Which evolution stages have a 3D Rocky. Stages not listed keep the approved
// 2.5D artwork. Add Young/Advanced/Elite here as their GLBs are delivered.
import type { EvolutionStage } from '../../types/domain'
import babyGlb from '../../assets/rocky3d/baby.glb?url'

export const ROCKY_3D_MODELS: Partial<Record<EvolutionStage, string>> = {
  Baby: babyGlb,
}

const PREF_KEY = 'rocky.3d'

/**
 * 3D is on by default. `?rocky3d=0` turns it off on this browser (and
 * `?rocky3d=1` back on) — a quick escape hatch if a PC struggles with it.
 */
export function rocky3dEnabled(): boolean {
  if (import.meta.env.MODE === 'test') return false
  try {
    const q = new URLSearchParams(window.location.search).get('rocky3d')
    if (q === '0') window.localStorage.setItem(PREF_KEY, 'off')
    if (q === '1') window.localStorage.removeItem(PREF_KEY)
    return window.localStorage.getItem(PREF_KEY) !== 'off'
  } catch {
    return true
  }
}

export function webglAvailable(): boolean {
  try {
    const c = document.createElement('canvas')
    return Boolean(c.getContext('webgl2') ?? c.getContext('webgl'))
  } catch {
    return false
  }
}
