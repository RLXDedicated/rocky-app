// Minimal Clock abstraction (Phase 9 §Rule 3). The Game Engine's pure
// functions already take `now: Date` as an explicit parameter — the actual
// non-determinism this fixes lives one layer up, in the Services, where a
// method's default parameter (`now: Date = new Date()`) previously called
// the browser clock directly. Routing that default through a swappable
// Clock means a test (or a future host environment) can inject a fixed time
// without reaching for global mocks.
//
// Deliberately tiny: one method, one production implementation. No timezone
// handling, no scheduling — just "what time is it right now."
export interface Clock {
  now(): Date
}

export const systemClock: Clock = {
  now: () => new Date(),
}

/** A fixed-time Clock for tests — `now()` always returns the same instant. */
export function fixedClock(at: Date | string): Clock {
  const fixed = new Date(at)
  return { now: () => fixed }
}
