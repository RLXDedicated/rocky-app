// This file is a barrel, not a boundary — it re-exports the frontend's
// existing Service layer and Game Engine types unchanged, so every
// Application Service in ../application/ imports "the domain" from one
// place instead of reaching into `../../../src/...` paths all over the
// backend. Nothing is redeclared, wrapped, or reimplemented here; if this
// file starts growing logic of its own, that's a defect — see §23 of the
// Phase 12 brief ("architecture quality check").
//
// GameService already IS the Application Service Phase 12 asked for
// (validation → repository → domain/game engine → persistence → response) —
// it takes a Repository (and Clock) as constructor parameters with no
// internal construction of either, which is exactly what makes it reusable
// here with this backend's InMemoryRepository instead of
// LocalStorageRepository. See docs/BACKEND_FOUNDATION.md §Game Engine
// integration.
export { GameService } from '../../../src/services/gameService'
export type { AchievementProgress, Snapshot } from '../../../src/services/gameService'

export {
  checkForReminder,
  getReminderHistory,
  markReminderActed,
  markReminderDismissed,
  markReminderOpened,
} from '../../../src/services/reminderService'

export { getCurrentUserTeamId, getTeamDetail, getTeamLeaderboard } from '../../../src/services/teamService'
export type { TeamDetail } from '../../../src/services/teamService'

export { getIndividualLeaderboardWithRankChange } from '../../../src/services/leaderboardService'
export type { LeaderboardResult } from '../../../src/services/leaderboardService'

export { systemClock, type Clock } from '../../../src/engine/clock'

export type {
  CheckInResult,
  CorrectionInput,
  CorrectionResult,
  DocumentationAlertResult,
  QAPassResult,
} from '../../../src/engine/gameEngine'

// Phase 13 §9 (replay/reconstruction): re-exported so a test can compare
// persisted GameState against what replaying the persisted event history
// independently produces, using the Game Engine's own, already-tested
// replay function — never a reimplementation of it.
export { recalculateStateFromEvents } from '../../../src/engine/gameEngine'
export { buildCorrectionMap, countCheckIns, countEffectiveAlerts, countEffectiveQaPasses } from '../../../src/engine/gameEngine'
export { daysBetweenKeys, todayKey } from '../../../src/engine/dateUtils'

export type { Achievement, Agent, GameEvent, GameState, QAOutcome } from '../../../src/types/domain'
export type { Repository } from '../../../src/repository/repository'
export type { ReminderRecord } from '../../../src/types/reminder'
