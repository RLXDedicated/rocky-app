// Agent-level choices that must follow the agent to every device: Rocky's
// name and having finished the intro. Saved in this browser immediately
// and, in remote mode, on the server (best-effort; the next start-up sync
// reconciles anything that didn't make it).
import type { Agent } from '../types/domain'
import { repository } from '../repository/localStorageRepository'
import { apiClient, isRemoteModeEnabled } from './apiClient'
import { completeOnboarding } from './onboardingService'

export function saveRockyName(name: string): Agent {
  const next = { ...repository.getAgent(), rockyName: name }
  repository.saveAgent(next)
  if (isRemoteModeEnabled()) apiClient.renameRocky(name).catch((err) => console.warn('[rocky] Could not save Rocky’s name on the server:', err))
  return next
}

export function finishOnboarding(rockyName: string): void {
  saveRockyName(rockyName)
  completeOnboarding()
  if (isRemoteModeEnabled()) apiClient.markOnboarded().catch(() => {})
}
