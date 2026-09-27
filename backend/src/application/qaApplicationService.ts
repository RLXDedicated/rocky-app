// Application Service (Phase 12 §5, §11; Phase 13 §6-7): the QA
// integration boundary. QA Console (and this service) is an EVENT
// PRODUCER — it can only ever ask the Game Engine to process a QA Pass, a
// Documentation Alert, or a Correction. It has no method, and must never
// grow one, that sets XP, Energy, Streak, Mood, Evolution, or Achievements
// directly (ADR-0002, docs/API_CONTRACTS.md §3).
//
// Phase 13: the Idempotency-Key check, the Game Engine call, and the
// idempotency record write all happen inside ONE `withTransaction` block —
// so a crash between "the QA Pass was applied" and "the idempotency
// record was written" cannot happen: either both land, or (on a thrown
// error) neither does, and the client's retry finds no record and safely
// re-executes instead of being stuck in limbo.
import { ApiError } from '../api/errors'
import { hashRequest } from '../infrastructure/idempotency/IdempotencyPort'
import type { PersistenceContext } from '../infrastructure/persistenceContext'
import { GameService, systemClock, type Clock, type QAOutcome } from '../domain/rockyEngine'
import type { CorrectionResponse, DocumentationAlertResponse, QAPassResponse } from '../types/dto'

export interface QaApplicationServiceDeps {
  persistence: PersistenceContext
  clock?: Clock
}

export interface QaActionInput {
  agentId: string
  auditDate: string
  idempotencyKey?: string
}

export interface CorrectionInputDto {
  agentId: string
  originalEventId: string
  correctedTo: QAOutcome
  reason?: string
}

/** Runs `execute` under the durable idempotency guard described above, or directly if no key was supplied (§Idempotency in docs/BACKEND_FOUNDATION.md: no key means "treat as a genuine new submission"). */
function withIdempotency<T>(persistence: PersistenceContext, agentId: string, route: string, key: string | undefined, requestPayload: unknown, execute: () => T): T {
  if (!key) return persistence.withTransaction(execute)

  const requestHash = hashRequest(requestPayload)
  return persistence.withTransaction(() => {
    const check = persistence.idempotency.check(agentId, route, key, requestHash)
    if (check.kind === 'duplicate') return check.response as T
    if (check.kind === 'conflict') {
      throw ApiError.conflict(`Idempotency-Key "${key}" was already used with a different request payload on this route.`)
    }
    const response = execute()
    persistence.idempotency.record(agentId, route, key, requestHash, response)
    return response
  })
}

export function createQaApplicationService({ persistence, clock = systemClock }: QaApplicationServiceDeps) {
  function serviceFor(agentId: string): GameService {
    return new GameService(persistence.repoStore.forAgent(agentId), clock)
  }

  return {
    qaPass(input: QaActionInput): QAPassResponse {
      return withIdempotency(persistence, input.agentId, 'qa-pass', input.idempotencyKey, { agentId: input.agentId, auditDate: input.auditDate }, () => {
        const result = serviceFor(input.agentId).qaPass(new Date(`${input.auditDate}T12:00:00`))
        return {
          state: result.state,
          events: result.events,
          newAchievements: result.newAchievements,
          leveledUp: result.leveledUp,
          evolved: result.evolved,
        }
      })
    },

    documentationAlert(input: QaActionInput): DocumentationAlertResponse {
      return withIdempotency(persistence, input.agentId, 'documentation-alert', input.idempotencyKey, { agentId: input.agentId, auditDate: input.auditDate }, () => {
        const result = serviceFor(input.agentId).documentationAlert(new Date(`${input.auditDate}T12:00:00`))
        return { state: result.state, events: result.events }
      })
    },

    correction(input: CorrectionInputDto & { idempotencyKey?: string }): CorrectionResponse {
      return withIdempotency(
        persistence,
        input.agentId,
        'correction',
        input.idempotencyKey,
        { agentId: input.agentId, originalEventId: input.originalEventId, correctedTo: input.correctedTo, reason: input.reason },
        () => {
          let result
          try {
            result = serviceFor(input.agentId).correction({
              originalEventId: input.originalEventId,
              correctedTo: input.correctedTo,
              reason: input.reason,
            })
          } catch (err) {
            // processCorrection throws a plain Error for an unknown/
            // ineligible event id — translate that domain-level failure
            // into a proper HTTP response instead of a raw 500.
            const message = err instanceof Error ? err.message : 'Correction could not be processed.'
            throw ApiError.notFound(message)
          }
          return { correctionEvent: result.correctionEvent, events: result.events, state: result.state }
        },
      )
    },
  }
}

export type QaApplicationService = ReturnType<typeof createQaApplicationService>
