import type { AchievementMetrics } from '../engine/achievements'
import { systemClock, type Clock } from '../engine/clock'
import {
  countCheckIns,
  countEffectiveQaPasses,
  processCheckIn,
  processCorrection,
  processDevXpGrant,
  processXpGrant,
  GAME_XP_SOURCE,
  processDocumentationAlert,
  processQAPass,
  type CheckInResult,
  type CorrectionInput,
  type CorrectionResult,
  type DevXpGrantResult,
  type DocumentationAlertResult,
  type QAPassResult,
} from '../engine/gameEngine'
import { LEVEL_THRESHOLDS, MAX_DEFINED_LEVEL } from '../engine/levels'
import { repository } from '../repository/localStorageRepository'
import type { Repository } from '../repository/repository'
import { DEFAULT_AGENT_ID, type Achievement, type Agent, type GameEvent, type GameState } from '../types/domain'

export interface Snapshot {
  agent: Agent
  gameState: GameState
  events: GameEvent[]
}

export interface AchievementProgress {
  unlocked: Achievement[]
  metrics: AchievementMetrics
}

export class GameService {
  private repo: Repository
  private clock: Clock

  constructor(repo: Repository = repository, clock: Clock = systemClock) {
    this.repo = repo
    this.clock = clock
  }

  getSnapshot(): Snapshot {
    return {
      agent: this.repo.getAgent(),
      gameState: this.repo.getGameState(),
      events: this.repo.getEvents(),
    }
  }

  checkIn(now: Date = this.clock.now(), workingDays?: readonly number[]): CheckInResult {
    const state = this.repo.getGameState()
    const events = this.repo.getEvents()
    const result = processCheckIn(state, events, now, this.repo.getAgent().id ?? DEFAULT_AGENT_ID, workingDays)
    if (!result.alreadyCheckedInToday) {
      this.repo.saveGameState(result.state)
      for (const event of result.events) {
        this.repo.saveEvent(event)
      }
      for (const achievement of result.newAchievements) {
        this.repo.saveAchievement(achievement)
      }
    }
    return result
  }

  qaPass(now: Date = this.clock.now()): QAPassResult {
    const state = this.repo.getGameState()
    const events = this.repo.getEvents()
    const result = processQAPass(state, events, now, this.repo.getAgent().id ?? DEFAULT_AGENT_ID)
    this.repo.saveGameState(result.state)
    for (const event of result.events) {
      this.repo.saveEvent(event)
    }
    for (const achievement of result.newAchievements) {
      this.repo.saveAchievement(achievement)
    }
    return result
  }

  documentationAlert(now: Date = this.clock.now()): DocumentationAlertResult {
    const state = this.repo.getGameState()
    const events = this.repo.getEvents()
    const agentId = this.repo.getAgent().id ?? DEFAULT_AGENT_ID
    const result = processDocumentationAlert(state, events, now, agentId)
    this.repo.saveGameState(result.state)
    for (const event of result.events) {
      this.repo.saveEvent(event)
    }
    return result
  }

  correction(input: CorrectionInput, now: Date = this.clock.now()): CorrectionResult {
    const events = this.repo.getEvents()
    const agentId = this.repo.getAgent().id ?? DEFAULT_AGENT_ID
    const result = processCorrection(events, input, now, agentId)
    this.repo.saveEvent(result.correctionEvent)
    this.repo.saveGameState(result.state)
    return result
  }

  getRecentEvents(limit = 5): GameEvent[] {
    const events = this.repo.getEvents()
    return events.slice(-limit).reverse()
  }

  /**
   * Developer-only: jump straight to the given Level's XP threshold. Never
   * decreases XP, never touches Streak/Energy/Achievements. Used exclusively
   * by Developer Controls to test Level Up / Evolution visuals without
   * grinding real Check-ins.
   */
  devTriggerLevel(targetLevel: number, now: Date = this.clock.now()): DevXpGrantResult {
    const level = Math.max(1, Math.min(MAX_DEFINED_LEVEL, targetLevel))
    const state = this.repo.getGameState()
    const agentId = this.repo.getAgent().id ?? DEFAULT_AGENT_ID
    const result = processDevXpGrant(state, LEVEL_THRESHOLDS[level], now, agentId)
    this.repo.saveGameState(result.state)
    for (const event of result.events) {
      this.repo.saveEvent(event)
    }
    return result
  }

  /**
   * XP won in Rocky's mini-games (capped per day in pet.ts). Recorded as an
   * XP_GRANT event from "rocky-games" so it replays and shows in the diary.
   * In remote mode the server records its own copy and replaces this one.
   */
  grantGameXp(xp: number, reason: string, now: Date = this.clock.now()) {
    const state = this.repo.getGameState()
    const agentId = this.repo.getAgent().id ?? DEFAULT_AGENT_ID
    const result = processXpGrant(state, xp, now, agentId, { reason, grantedBy: GAME_XP_SOURCE })
    this.repo.saveGameState(result.state)
    for (const event of result.events) this.repo.saveEvent(event)
    return result
  }

  /** Developer-only: jump to the first Level of the next Evolution stage. */
  devTriggerNextEvolution(now: Date = this.clock.now()): DevXpGrantResult {
    const state = this.repo.getGameState()
    const nextStageStartLevel =
      state.evolutionStage === 'Baby' ? 5 : state.evolutionStage === 'Young' ? 10 : state.evolutionStage === 'Advanced' ? 20 : null
    if (nextStageStartLevel === null) {
      // Already Elite — nothing further to trigger.
      return { state, events: [], leveledUp: false, evolved: false }
    }
    return this.devTriggerLevel(nextStageStartLevel, now)
  }

  /**
   * Wipes XP/Level/Energy/Streak/events/achievements back to a fresh start.
   * `preserveIdentity: true` (used by "Reset Demo") keeps the agent's chosen
   * name so replaying the demo doesn't force re-onboarding; `false` (used by
   * "Reset All Data") wipes the agent too, back to the default "Rocky".
   */
  resetProgress(preserveIdentity: boolean): void {
    const agent = this.repo.getAgent()
    this.repo.resetAll()
    if (preserveIdentity) {
      this.repo.saveAgent(agent)
    }
  }

  getAchievementProgress(): AchievementProgress {
    const events = this.repo.getEvents()
    const state = this.repo.getGameState()
    const agentId = this.repo.getAgent().id ?? DEFAULT_AGENT_ID
    return {
      unlocked: this.repo.getAchievements(),
      metrics: {
        checkins: countCheckIns(events, agentId),
        qaPasses: countEffectiveQaPasses(events, agentId),
        streak: state.currentStreak,
      },
    }
  }
}

export const gameService = new GameService()
