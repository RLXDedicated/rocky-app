import type { GameEvent } from '../types/domain'
import { rankName } from './ranks'

export function labelForEvent(event: GameEvent): string {
  switch (event.type) {
    case 'CHECK_IN':
      // Read from the event's own payload rather than hardcoding the
      // reward — it's already there, and this way the label can never
      // drift out of sync with GAME_CONFIG or a future corrected value.
      return `Checked in with Rocky · +${event.payload?.xpGained ?? 0} XP, +${event.payload?.energyGained ?? 0} Energy`
    case 'QA_PASS':
      return `QA Pass · +${event.payload?.xpGained ?? 0} XP, +${event.payload?.energyGained ?? 0} Energy`
    case 'DOCUMENTATION_ALERT':
      return 'Documentation Alert · Rocky is a little worried'
    case 'STREAK_MILESTONE':
      return `🔥 ${event.payload?.days ?? ''}-day streak milestone · +${event.payload?.xpGained ?? 0} XP`
    case 'LEVEL_UP': {
      const prev = event.payload?.previousLevel
      const next = event.payload?.newLevel ?? event.payload?.level
      return prev != null ? `🎉 Level Up! Level ${prev} → ${next}` : `🎉 Level Up! Now Level ${next ?? ''}`
    }
    case 'EVOLUTION': {
      const prev = event.payload?.previousStage
      const next = event.payload?.newStage ?? event.payload?.stage
      return prev != null ? `🏅 New rank! ${rankName(prev)} → ${rankName(next)}` : `🏅 New rank: ${next ? rankName(next) : 'up'}!`
    }
    case 'ACHIEVEMENT':
      return `Achievement unlocked: ${event.payload?.name ?? ''}`
    case 'XP_GRANT':
      if (event.payload?.grantedBy === 'rocky-games')
        return `+${Number(event.payload?.xp ?? 0)} XP playing with Rocky${typeof event.payload?.reason === 'string' && event.payload.reason ? `: ${event.payload.reason}` : ''}`
      return `+${Number(event.payload?.xp ?? 0)} XP bonus from your QA team${typeof event.payload?.reason === 'string' && event.payload.reason ? `: ${event.payload.reason}` : ''}`
    case 'CORRECTION':
      return 'A correction was recorded'
    default:
      return 'Activity recorded'
  }
}
