// Between-check-in care: petting, treats and play. Purely for fun and
// connection with Rocky — hearts and treats never feed back into XP,
// Energy, Streak or Mood (those only move on check-ins and QA events).
import { todayKey } from '../engine/dateUtils'
import { scopedKey } from './storage'

export const MAX_HEARTS = 10
export const HEARTS = { pet: 1, treat: 2, play: 2 } as const
/** Petting alone can fill at most this many hearts a day. */
export const PET_HEART_CAP = 4

export interface CareState {
  date: string
  hearts: number
  petHearts: number
  treatsUsed: number
}

const KEY = 'rocky.care.v1'

function fresh(date: string, treatsUsed = 0): CareState {
  return { date, hearts: 0, petHearts: 0, treatsUsed }
}

export function loadCare(now: Date = new Date()): CareState {
  const today = todayKey(now)
  try {
    const raw = window.localStorage.getItem(scopedKey(KEY))
    if (!raw) return fresh(today)
    const s = JSON.parse(raw) as CareState
    // Hearts reset every day; treats used are lifetime (treats are earned lifetime).
    return s.date === today ? s : fresh(today, s.treatsUsed ?? 0)
  } catch {
    return fresh(today)
  }
}

function save(s: CareState): CareState {
  try {
    window.localStorage.setItem(scopedKey(KEY), JSON.stringify(s))
  } catch {
    // ignore — care is best-effort
  }
  return s
}

/** Treats are earned by real work: 1 per check-in, 2 per clean QA audit. */
export function treatsEarned(checkIns: number, qaPasses: number): number {
  return checkIns + qaPasses * 2
}

export function treatsAvailable(state: CareState, checkIns: number, qaPasses: number): number {
  return Math.max(0, treatsEarned(checkIns, qaPasses) - state.treatsUsed)
}

export function pet(state: CareState): CareState {
  if (state.petHearts >= PET_HEART_CAP) return state
  return save({ ...state, petHearts: state.petHearts + HEARTS.pet, hearts: Math.min(MAX_HEARTS, state.hearts + HEARTS.pet) })
}

export function feed(state: CareState, available: number): CareState {
  if (available <= 0) return state
  return save({ ...state, treatsUsed: state.treatsUsed + 1, hearts: Math.min(MAX_HEARTS, state.hearts + HEARTS.treat) })
}

export function play(state: CareState): CareState {
  return save({ ...state, hearts: Math.min(MAX_HEARTS, state.hearts + HEARTS.play) })
}
