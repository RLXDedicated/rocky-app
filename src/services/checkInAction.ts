// The one write path that needs to be remote-aware. Deliberately NOT a
// method on GameService (src/services/gameService.ts) — that class and its
// full test suite stay untouched and fully synchronous, which is exactly
// right for the local/offline experience this MVP has always had. This
// wrapper is the only thing that decides "does this check-in belong to the
// backend, or only to this browser" and is the only thing UI components
// should call to check in (Home.tsx, ReminderHost.tsx).
import type { CheckInResult } from '../engine/gameEngine'
import { gameService } from './gameService'
import { apiClient, isRemoteModeEnabled } from './apiClient'
import { repository } from '../repository/localStorageRepository'

export async function performCheckIn(): Promise<CheckInResult> {
  if (!isRemoteModeEnabled()) {
    return gameService.checkIn()
  }

  // Remote mode: the backend is the source of truth (durable, per real
  // agent, feeds a real Leaderboard eventually) — it computes the result,
  // we only mirror it into the local repository so every other screen's
  // synchronous reads (Achievements, Leaderboard, DevControls) immediately
  // agree with what the server just persisted, without re-running the
  // engine's own logic a second time locally (that would risk the two
  // copies drifting apart).
  const result = await apiClient.checkIn()
  if (!result.alreadyCheckedInToday) {
    repository.saveGameState(result.state)
    for (const event of result.events) repository.saveEvent(event)
    for (const achievement of result.newAchievements) repository.saveAchievement(achievement)
  }
  return result
}
