// My own title (QA analyst / team leader) and, for leaders, the team's
// spirit — loaded once after sign-in and refreshed now and then. Tiny
// external store so the top bar, the home name tag and Home share it.
import { useSyncExternalStore } from 'react'
import { isRemoteModeEnabled, peopleApi, type MyRole } from './apiClient'

let role: MyRole | null = null
const subs = new Set<() => void>()

export async function refreshMyRole(): Promise<void> {
  if (!isRemoteModeEnabled()) return
  try {
    role = await peopleApi.me()
    subs.forEach((s) => s())
  } catch {
    // keep the last one
  }
}

export function useMyRole(): MyRole | null {
  return useSyncExternalStore(
    (cb) => {
      subs.add(cb)
      return () => subs.delete(cb)
    },
    () => role,
  )
}
