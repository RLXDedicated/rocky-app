import type { Achievement, Agent, GameEvent, GameState } from '../types/domain'
import type { ReminderRecord, ReminderStatus } from '../types/reminder'

// Abstraction boundary: Game Engine talks only to this interface.
// Swapping localStorage for SharePoint/an API/a DB later means implementing
// this interface again, not touching the engine or UI. This is also where a
// real notification provider (Teams/Power Automate/push) would eventually
// plug in — reminderService only ever talks to this interface, never to
// localStorage directly.
export interface Repository {
  getAgent(): Agent
  saveAgent(agent: Agent): void
  getGameState(): GameState
  saveGameState(state: GameState): void
  getEvents(): GameEvent[]
  saveEvent(event: GameEvent): void
  getAchievements(): Achievement[]
  saveAchievement(achievement: Achievement): void
  getReminders(): ReminderRecord[]
  saveReminder(reminder: ReminderRecord): void
  updateReminderStatus(id: string, status: ReminderStatus): void
  resetReminders(): void
  resetAll(): void
}
