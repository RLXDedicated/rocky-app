// First-time-experience flag. Deliberately not part of GameState/events — it
// is a UI-flow concern ("has this browser seen the intro"), not game
// progress, so a reset of it never touches XP/Level/Energy/Streak.
const ONBOARDING_KEY = 'rocky.onboarding.completed'

export function hasCompletedOnboarding(): boolean {
  return window.localStorage.getItem(ONBOARDING_KEY) === '1'
}

export function completeOnboarding(): void {
  window.localStorage.setItem(ONBOARDING_KEY, '1')
}

export function resetOnboarding(): void {
  window.localStorage.removeItem(ONBOARDING_KEY)
}
