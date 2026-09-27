// Runs once, before the app's first render (see main.tsx). In remote mode
// it pulls this agent's real state down from the backend and seeds the
// local repository with it, so every screen's synchronous reads
// (Home/Achievements/Leaderboard/DevControls all read through
// gameService -> repository) show the agent's REAL, durable progress from
// the very first paint — not the empty/default local state a brand-new
// browser would otherwise start from.
//
// Deliberately fails open: any network problem here (backend briefly down,
// CORS misconfigured, agent not in the pilot roster yet) is logged and
// swallowed, and the app falls back to whatever's already in this
// browser's localStorage — never a blank screen. This mirrors Home.tsx's
// own "Rocky couldn't save that action" philosophy: a demo an agent is
// about to be shown must never hard-fail.
import { apiClient, isRemoteModeEnabled } from './apiClient'
import { captureIdentityFromUrl, setAgentRole } from './identityService'
import { repository } from '../repository/localStorageRepository'

export async function initializeIdentityAndSync(): Promise<void> {
  captureIdentityFromUrl()

  if (!isRemoteModeEnabled()) {
    setAgentRole(null)
    return
  }

  // Cleared up front so a stale elevated role never survives a failed sync
  // or a switch to a different agent's link on the same browser.
  setAgentRole(null)

  try {
    const [agent, gameState, achievements] = await Promise.all([
      apiClient.getAgent(),
      apiClient.getGameState(),
      apiClient.getAchievements(),
    ])

    // Keep whatever Rocky name this browser already chose during onboarding
    // (see onboardingService.ts) rather than overwriting it with the
    // backend's generic default — naming is a local-only, one-time choice
    // in this prototype (see README) and isn't pushed to the backend yet.
    const { role, ...remoteAgent } = agent
    setAgentRole(role)
    const localAgent = repository.getAgent()
    repository.saveAgent({ ...remoteAgent, rockyName: localAgent.rockyName !== 'Rocky' ? localAgent.rockyName : remoteAgent.rockyName })

    repository.saveGameState(gameState)
    for (const achievement of achievements.unlocked) {
      repository.saveAchievement(achievement)
    }
  } catch (err) {
    console.warn('[rocky] Could not sync with the backend, continuing with local data:', err)
  }
}
