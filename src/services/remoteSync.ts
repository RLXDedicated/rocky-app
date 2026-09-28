// Runs once, before the app's first render (see main.tsx). In remote mode
// it pulls this agent's real data down from the backend — game state,
// badges, the full event history, Rocky's name, whether they finished the
// intro, and Rocky the pet — and seeds this browser's copy with it. That is
// what makes progress follow the agent to any device: nothing the agent
// sees is only in one browser anymore.
//
// If this browser last held a DIFFERENT agent's data (a shared PC), that
// copy is wiped first so two agents never mix.
//
// Fails open on network trouble (the app keeps this browser's last copy),
// but a 401 means "sign in again" and is reported to the app.
import { AuthRequiredError, apiClient, isRemoteModeEnabled } from './apiClient'
import { captureIdentityFromUrl, setAgentRole } from './identityService'
import { completeOnboarding, hasCompletedOnboarding } from './onboardingService'
import { repository } from '../repository/localStorageRepository'
import { fromView, savePetCache } from '../game/petClient'

let loginRequired = false

/** True when the backend rejected this browser's identity during start-up sync. */
export function isLoginRequired(): boolean {
  return loginRequired
}

export async function initializeIdentityAndSync(): Promise<void> {
  captureIdentityFromUrl()
  loginRequired = false

  if (!isRemoteModeEnabled()) {
    setAgentRole(null)
    return
  }

  // Cleared up front so a stale elevated role never survives a failed sync
  // or a switch to a different agent's link on the same browser.
  setAgentRole(null)

  try {
    const [agent, gameState, achievements, history, pet] = await Promise.all([
      apiClient.getAgent(),
      apiClient.getGameState(),
      apiClient.getAchievements(),
      apiClient.getEvents(),
      apiClient.getPet(),
    ])

    const local = repository.getAgent()
    const sameAgent = local.id === agent.id
    const locallyOnboarded = sameAgent && hasCompletedOnboarding()
    if (!sameAgent) repository.resetAll()

    const { role, via: _via, ...remoteAgent } = agent
    setAgentRole(role)

    // Rocky's name lives on the server. A name chosen in this browser before
    // names were synced is carried up once.
    let rockyName = remoteAgent.rockyName
    if (sameAgent && remoteAgent.rockyName === 'Rocky' && local.rockyName !== 'Rocky') {
      rockyName = local.rockyName
      apiClient.renameRocky(rockyName).catch(() => {})
    }
    repository.saveAgent({ ...remoteAgent, rockyName })
    repository.saveGameState(gameState)
    repository.replaceEvents(history.events)
    repository.replaceAchievements(achievements.unlocked)
    savePetCache(fromView(pet))

    // The intro is shown once per agent, not once per browser.
    if (pet.state.onboardedAt || history.events.length > 0 || locallyOnboarded) {
      completeOnboarding()
      if (!pet.state.onboardedAt) apiClient.markOnboarded().catch(() => {})
    } else if (!sameAgent) {
      window.localStorage.removeItem('rocky.onboarding.completed')
    }
  } catch (err) {
    if (err instanceof AuthRequiredError) {
      loginRequired = true
      return
    }
    console.warn('[rocky] Could not sync with the backend, continuing with local data:', err)
  }
}
