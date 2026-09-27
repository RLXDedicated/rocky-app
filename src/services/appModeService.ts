// Agent Mode vs QA Mode (Phase 8 §23-24). The everyday agent experience
// (Home / Leaderboard / Achievements / Team / Team Leaderboard) never shows
// QA/dev tooling. QA Simulator is opt-in via this toggle, persisted so a
// tester doesn't have to re-enable it every reload; Developer Controls stay
// additionally gated by import.meta.env.DEV regardless of this flag.
const QA_MODE_KEY = 'rocky.mode.qa'

export function isQaModeEnabled(): boolean {
  return window.localStorage.getItem(QA_MODE_KEY) === '1'
}

export function setQaModeEnabled(enabled: boolean): void {
  if (enabled) window.localStorage.setItem(QA_MODE_KEY, '1')
  else window.localStorage.removeItem(QA_MODE_KEY)
}
