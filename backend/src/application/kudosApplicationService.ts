// Kudos: a quick "thank you" from one agent to another, with a reason
// ("Great note", "Helped me out"…). The teammate's Rocky gets a small lift
// and a few coins, they see it live in the app, and it also reaches them in
// Teams (one card with the day's kudos, inside their shift — it never counts
// against the 3 reminders). A few a day, one per teammate, so it stays
// meaningful. Leaders see their team's kudos in the weekly summary.
import { ApiError } from '../api/errors'
import type { PersistenceContext } from '../infrastructure/persistenceContext'
import type { KudosRecord } from '../infrastructure/accounts/AccountStore'
import { systemClock, todayKey, type Clock } from '../domain/rockyEngine'
import { publicName } from './leaderboardApplicationService'
import { friendKey, type PetApplicationService } from './petApplicationService'
import type { LiveBus } from './liveBus'

export const KUDOS_TAGS: Record<string, { emoji: string; label: string }> = {
  'great-note': { emoji: '📝', label: 'Great note' },
  helped: { emoji: '🤝', label: 'Helped me out' },
  teamwork: { emoji: '💪', label: 'Team player' },
  customer: { emoji: '⭐', label: 'Customer hero' },
  vibes: { emoji: '☀️', label: 'Good vibes' },
}
/** Kudos an agent can give per day (one per teammate). */
export const KUDOS_PER_DAY = 3
const MAX_MESSAGE = 140

export function createKudosApplicationService({
  persistence,
  pet,
  bus,
  clock = systemClock,
}: {
  persistence: PersistenceContext
  pet: PetApplicationService
  bus: LiveBus
  clock?: Clock
}) {
  const accounts = persistence.accounts
  const repo = persistence.repoStore

  const nameOf = (id: string) => {
    try {
      return publicName(id, repo.forAgent(id).getAgent().name)
    } catch {
      return publicName(id, '')
    }
  }
  const directory = () => new Map(repo.listAgentIds().map((id) => [friendKey(id), id]))
  const dayOf = (iso: string) => todayKey(new Date(iso))

  function view(k: KudosRecord, viewerId: string) {
    const tag = KUDOS_TAGS[k.tag] ?? { emoji: '🙌', label: 'Kudos' }
    return {
      id: k.id,
      from: k.fromId === viewerId ? 'You' : nameOf(k.fromId),
      fromKey: friendKey(k.fromId),
      to: k.toId === viewerId ? 'You' : nameOf(k.toId),
      toKey: friendKey(k.toId),
      tag: k.tag,
      emoji: tag.emoji,
      label: tag.label,
      message: k.message,
      at: k.createdAt,
    }
  }

  return {
    tags: () => Object.entries(KUDOS_TAGS).map(([id, t]) => ({ id, ...t })),

    /** What the agent received and gave lately, and how many they can still give today. */
    mine(agentId: string) {
      const today = todayKey(clock.now())
      const given = accounts.listKudos({ fromId: agentId, limit: 50 })
      const givenToday = given.filter((k) => dayOf(k.createdAt) === today)
      return {
        received: accounts.listKudos({ toId: agentId, limit: 30 }).map((k) => view(k, agentId)),
        given: given.slice(0, 15).map((k) => view(k, agentId)),
        left: Math.max(0, KUDOS_PER_DAY - givenToday.length),
        givenTodayTo: givenToday.map((k) => friendKey(k.toId)),
        tags: this.tags(),
      }
    },

    /** The pilot's latest kudos (the wall everyone sees). */
    wall(viewerId: string) {
      return { kudos: accounts.listKudos({ limit: 30 }).map((k) => view(k, viewerId)) }
    },

    give(fromId: string, input: { to: unknown; tag: unknown; message: unknown }) {
      const toId = typeof input.to === 'string' ? directory().get(input.to) : undefined
      if (!toId) throw ApiError.notFound('That teammate could not be found.')
      if (toId === fromId) throw ApiError.validation('Kudos are for teammates — Rocky already knows you’re great. 😉')
      const tag = typeof input.tag === 'string' && KUDOS_TAGS[input.tag] ? input.tag : null
      if (!tag) throw ApiError.validation('Pick why you’re sending kudos.')
      const message = typeof input.message === 'string' ? input.message.trim().replace(/\s+/g, ' ').slice(0, MAX_MESSAGE) || null : null
      const now = clock.now()
      const today = todayKey(now)
      const givenToday = accounts.listKudos({ fromId, since: new Date(now.getTime() - 2 * 86_400_000).toISOString() }).filter((k) => dayOf(k.createdAt) === today)
      if (givenToday.length >= KUDOS_PER_DAY) throw ApiError.validation(`You’ve sent your ${KUDOS_PER_DAY} kudos for today — more tomorrow!`)
      if (givenToday.some((k) => k.toId === toId)) throw ApiError.validation('You already sent this teammate kudos today.')
      const k = accounts.addKudos({ fromId, toId, tag, message, createdAt: now.toISOString() })
      const t = KUDOS_TAGS[tag]!
      try {
        pet.kudosEffect(toId, fromId, `${t.emoji} ${t.label} from ${nameOf(fromId)}`)
      } catch {
        // the teammate's Rocky isn't set up yet — the kudos still counts
      }
      accounts.addAudit({ agentId: toId, actor: fromId, action: 'kudos.give', detail: { tag, id: k.id }, source: 'kudos', createdAt: now.toISOString() })
      bus.publish([toId], { t: 'kudos', kudos: view(k, toId) })
      return view(k, fromId)
    },
  }
}

export type KudosApplicationService = ReturnType<typeof createKudosApplicationService>
