// Application Service for the QA/ADMIN roster view. Read-only by design:
// it lists which agents exist and their current (engine-computed) state so
// a QA coordinator can pick who to record a QA Pass / Documentation Alert /
// Correction for — those still go through qaApplicationService, the only
// path that changes an agent's state (ADR-0002).
import type { PersistenceContext } from '../infrastructure/persistenceContext'
import type { AdminAgentsResponse } from '../types/dto'

export interface AdminApplicationServiceDeps {
  persistence: PersistenceContext
}

export function createAdminApplicationService({ persistence }: AdminApplicationServiceDeps) {
  return {
    listAgents(): AdminAgentsResponse {
      const agents = persistence.repoStore.listAgentIds().map((agentId) => {
        const repo = persistence.repoStore.forAgent(agentId)
        return { id: agentId, name: repo.getAgent().name, state: repo.getGameState() }
      })
      return { agents }
    },
  }
}

export type AdminApplicationService = ReturnType<typeof createAdminApplicationService>
