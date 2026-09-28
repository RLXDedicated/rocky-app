// The browser side of Rocky the pet. Keeps a per-agent cached copy of the
// pet in localStorage so the screen paints instantly, applies each action
// right away with the same rules the server uses (src/game/pet.ts), and —
// in remote mode — sends it to the backend, which is the source of truth:
// once the server has answered every pending action, its copy replaces the
// local one. Without a backend the cache IS the pet (offline/demo mode).
import { apiClient, isRemoteModeEnabled, type PetView } from '../services/apiClient'
import { resolveCatalog, type CatalogOverrides, type ClosetItem, type ProgressFacts } from './closet'
import { applyPetAction, initialPetState, normalizePetState, type PetAction, type PetResult, type PetState } from './pet'
import { scopedKey } from './storage'

const KEY = 'rocky.pet.v1'

export interface PetCache {
  state: PetState
  overrides: CatalogOverrides
}

function readJson(key: string): unknown {
  try {
    const raw = window.localStorage.getItem(scopedKey(key))
    return raw ? JSON.parse(raw) : undefined
  } catch {
    return undefined
  }
}

/** One-time carry-over of the first local-only shop version (closet/care/wallet keys). */
function migrateLegacy(now: Date): PetState | null {
  const outfit = readJson('rocky.closet.v1') as PetState['outfit'] | undefined
  const wallet = readJson('rocky.wallet.v1') as { owned?: string[]; spentOnConsumables?: number; bonusTreats?: number } | undefined
  const care = readJson('rocky.care.v1') as { treatsUsed?: number } | undefined
  if (!outfit && !wallet && !care) return null
  const base = initialPetState(now)
  return normalizePetState(
    {
      ...base,
      outfit: outfit ?? base.outfit,
      owned: wallet?.owned ?? [],
      bonusTreats: wallet?.bonusTreats ?? 0,
      treatsUsed: care?.treatsUsed ?? 0,
      // Items bought then are counted as spent; prices come from the catalogue.
      coinsSpent:
        (wallet?.spentOnConsumables ?? 0) + (wallet?.owned ?? []).reduce((s, id) => s + (resolveCatalog().find((i) => i.id === id)?.price ?? 0), 0),
    },
    now,
  )
}

export function loadPetCache(now: Date = new Date()): PetCache {
  const raw = readJson(KEY) as Partial<PetCache> | undefined
  if (raw?.state) return { state: normalizePetState(raw.state, now), overrides: raw.overrides ?? {} }
  const legacy = isRemoteModeEnabled() ? null : migrateLegacy(now)
  return { state: legacy ?? initialPetState(now), overrides: {} }
}

export function savePetCache(cache: PetCache): void {
  try {
    window.localStorage.setItem(scopedKey(KEY), JSON.stringify(cache))
  } catch {
    // storage unavailable — the server copy (remote mode) is still safe
  }
}

export function catalogFor(cache: PetCache): ClosetItem[] {
  return resolveCatalog(cache.overrides)
}

export function fromView(view: PetView): PetCache {
  return { state: normalizePetState(view.state), overrides: view.catalog ?? {} }
}

/** Pulls the server's copy (remote mode). Returns null offline or on failure. */
export async function fetchPet(): Promise<PetCache | null> {
  if (!isRemoteModeEnabled()) return null
  try {
    const cache = fromView(await apiClient.getPet())
    savePetCache(cache)
    return cache
  } catch (err) {
    console.warn('[rocky] Could not load Rocky from the server, using this device’s copy:', err)
    return null
  }
}

let queue: Promise<unknown> = Promise.resolve()
let pending = 0

/**
 * Applies an action locally and (remote mode) queues it for the server, in
 * order. `onServer` receives the server's copy once no newer action is
 * still waiting, so quick taps never flicker back to an older state.
 */
export function performPetAction(cache: PetCache, action: PetAction, facts: ProgressFacts, onServer: (cache: PetCache) => void): PetResult {
  const result = applyPetAction(cache.state, action, { facts, now: new Date(), catalog: catalogFor(cache) })
  if (!result.ok) return result
  savePetCache({ ...cache, state: result.state })

  if (isRemoteModeEnabled()) {
    pending++
    queue = queue
      .then(() => apiClient.petAction(action))
      .then((res) => {
        pending--
        const next = fromView(res)
        savePetCache(next)
        if (pending === 0) onServer(next)
      })
      .catch(async (err) => {
        pending--
        console.warn('[rocky] Rocky’s server copy did not take that action; reloading it:', err)
        const fresh = await fetchPet()
        if (fresh && pending === 0) onServer(fresh)
      })
  }
  return result
}
