// The frontend's teamService.ts / leaderboardService.ts / reminderService.ts
// keep a handful of small, NON-ECONOMY, UI-facing bookkeeping values
// (last-seen leaderboard rank, a team's Evolution high-water mark, a
// dev-only "simulate working hours" override) directly under
// `window.localStorage` keys, deliberately outside the `Repository`
// interface — see DATA_MODEL.md's "non-economy bookkeeping" section. None
// of it is game state; none of it is written by this backend's Repository.
//
// Rather than re-implement (and risk subtly diverging from) that
// bookkeeping here, this backend imports those service files UNCHANGED
// and gives them a minimal, in-memory Web-Storage-shaped `window` so their
// existing `window.localStorage.getItem/setItem/removeItem` calls keep
// working under Node exactly as they do in a browser. This file contains
// zero business logic — it is an environment polyfill, not a domain
// reimplementation. See docs/BACKEND_FOUNDATION.md §Repository boundary.
//
// Each request gets its own throwaway instance in this backend's tests
// (see tests/testApp.ts) so state never leaks between test cases; a real
// long-running server process shares one instance for its lifetime, same
// as a browser tab would.

class InMemoryWebStorage {
  private store = new Map<string, string>()

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value)
  }

  removeItem(key: string): void {
    this.store.delete(key)
  }

  clear(): void {
    this.store.clear()
  }
}

interface ShimmedGlobal {
  window?: { localStorage: InMemoryWebStorage }
}

/**
 * Installs the shim if it isn't already present. Idempotent — safe to call
 * more than once (e.g. once per test file).
 */
export function installBrowserGlobalsShim(): void {
  const g = globalThis as unknown as ShimmedGlobal
  if (!g.window) {
    g.window = { localStorage: new InMemoryWebStorage() }
  }
}

/** Test-only: reset the shimmed localStorage to a clean slate. */
export function resetBrowserGlobalsShim(): void {
  const g = globalThis as unknown as ShimmedGlobal
  g.window = { localStorage: new InMemoryWebStorage() }
}
