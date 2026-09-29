// People around the pilot: titles (QA analyst badge, team leaders) and
// teams (which leader each agent reports to).
//
// A leader sees her own team (check-ins, streaks, QA results, who is at
// risk) and her Rocky reflects how the team is doing: its mood follows the
// team's spirit score. Titles grant no permissions — ADMIN still comes only
// from ROCKY_ADMIN_EMAILS — and leaders never get access to chats.
import { ApiError } from '../api/errors'
import type { PersistenceContext } from '../infrastructure/persistenceContext'
import type { AgentTitle } from '../infrastructure/accounts/AccountStore'
import { systemClock, todayKey, type Clock } from '../domain/rockyEngine'
import type { Mood } from '../../../src/types/domain'
import { metricsFor } from './adminApplicationService'
import { publicName } from './leaderboardApplicationService'
import { friendKey, type PetApplicationService } from './petApplicationService'

export interface PeopleDeps {
  persistence: PersistenceContext
  pet: PetApplicationService
  isStaff: (agentId: string) => boolean
  isOnline?: (agentId: string) => boolean
  clock?: Clock
}

export interface TeamSpirit {
  /** 0–100. */
  score: number
  mood: Mood
  checkedIn: number
  total: number
  /** Share of QA reviews that passed, 0–100 (null before any review). */
  qaRate: number | null
  atRisk: number
}

/** How the team's spirit maps to the leader's Rocky. */
export function moodForScore(score: number): Mood {
  if (score >= 75) return 'Happy'
  if (score >= 55) return 'Motivated'
  if (score >= 35) return 'Worried'
  return 'Recovery'
}

export function createPeopleApplicationService({ persistence, pet, isStaff, isOnline = () => false, clock = systemClock }: PeopleDeps) {
  const accounts = persistence.accounts
  const repo = persistence.repoStore

  const titleOf = (agentId: string): AgentTitle | null => accounts.getTitles()[agentId] ?? null
  const membersOf = (leaderId: string) =>
    Object.entries(accounts.getTeams())
      .filter(([member, leader]) => leader === leaderId && member !== leaderId && repo.hasAgent(member))
      .map(([member]) => member)

  function memberMetrics(agentId: string) {
    const r = repo.forAgent(agentId)
    const state = r.getGameState()
    return { state, metrics: metricsFor(agentId, state, r.getEvents(), r.getAchievements().length, todayKey(clock.now())) }
  }

  function spirit(leaderId: string): TeamSpirit | null {
    const members = membersOf(leaderId)
    if (members.length === 0) return null
    const all = members.map(memberMetrics)
    const checkedIn = all.filter((m) => m.metrics.checkedInToday).length
    const passes = all.reduce((n, m) => n + m.metrics.qaPasses, 0)
    const alerts = all.reduce((n, m) => n + m.metrics.alerts, 0)
    const atRisk = all.filter((m) => m.metrics.atRisk).length
    const qa = passes + alerts > 0 ? passes / (passes + alerts) : null
    const score = Math.round(100 * (0.4 * (checkedIn / all.length) + 0.35 * (qa ?? 0.75) + 0.25 * (1 - atRisk / all.length)))
    return {
      score,
      mood: moodForScore(score),
      checkedIn,
      total: all.length,
      qaRate: qa === null ? null : Math.round(qa * 100),
      atRisk,
    }
  }

  function nameOf(agentId: string) {
    return repo.hasAgent(agentId) ? publicName(agentId, repo.forAgent(agentId).getAgent().name) : publicName(agentId, '')
  }

  return {
    titleOf,

    /** A leader's Rocky mirrors the team; everyone else's is their own. */
    teamMood(agentId: string): Mood | null {
      if (titleOf(agentId) !== 'leader') return null
      return spirit(agentId)?.mood ?? null
    },

    /** Who I am in the pilot (for my own badges and, for leaders, the team summary). */
    me(agentId: string) {
      const title = titleOf(agentId)
      const leader = accounts.getTeams()[agentId] ?? null
      return {
        title,
        admin: isStaff(agentId),
        team: title === 'leader' ? spirit(agentId) : null,
        leader: leader ? { id: friendKey(leader), name: nameOf(leader) } : null,
      }
    },

    /** The leader's view of her team. */
    teamReport(leaderId: string) {
      if (titleOf(leaderId) !== 'leader') throw ApiError.forbidden('Only team leaders have a team view.')
      const members = membersOf(leaderId).map((id) => {
        const { state, metrics } = memberMetrics(id)
        const p = pet.publicProfile(id)
        return {
          id: p.id,
          name: p.name,
          rockyName: p.rockyName,
          stage: p.stage,
          mood: p.mood,
          outfit: p.outfit,
          level: state.level,
          xp: state.xp,
          streak: state.currentStreak,
          bestStreak: state.bestStreak,
          energy: state.energy,
          online: isOnline(id),
          checkedInToday: metrics.checkedInToday,
          daysSinceCheckIn: metrics.daysSinceCheckIn,
          checkIns: metrics.checkIns,
          qaPasses: metrics.qaPasses,
          alerts: metrics.alerts,
          atRisk: metrics.atRisk,
          riskReasons: metrics.riskReasons,
          lastCheckInDate: state.lastCheckInDate,
        }
      })
      return { spirit: spirit(leaderId), members: members.sort((a, b) => Number(b.atRisk) - Number(a.atRisk) || a.name.localeCompare(b.name)) }
    },

    // ------------------------------------------------------------ admins
    adminPeople() {
      const titles = accounts.getTitles()
      const teams = accounts.getTeams()
      const ids = new Set([...repo.listAgentIds(), ...Object.keys(titles)])
      return [...ids]
        .map((id) => ({
          email: id,
          name: nameOf(id),
          title: titles[id] ?? null,
          leader: teams[id] ?? null,
          signedUp: repo.hasAgent(id),
        }))
        .sort((a, b) => a.name.localeCompare(b.name))
    },

    adminSetPerson(email: string, change: { title?: AgentTitle | null; leader?: string | null }, actor: { id: string; via?: string }) {
      const at = clock.now().toISOString()
      if (change.title !== undefined) {
        accounts.setTitle(email, change.title, actor.id, at)
        // Someone who stops being a leader leaves an empty team behind.
        if (change.title !== 'leader')
          for (const [member, leader] of Object.entries(accounts.getTeams())) if (leader === email) accounts.setLeader(member, null, actor.id, at)
      }
      if (change.leader !== undefined) {
        if (change.leader && titleOf(change.leader) !== 'leader') throw ApiError.validation('That person is not a team leader yet.')
        if (change.leader === email) throw ApiError.validation('A leader cannot be in her own team.')
        accounts.setLeader(email, change.leader, actor.id, at)
      }
      accounts.addAudit({ agentId: email, actor: actor.id, action: 'admin.people', detail: change, source: actor.via ?? null, createdAt: at })
      return this.adminPeople().find((p) => p.email === email) ?? null
    },
  }
}

export type PeopleApplicationService = ReturnType<typeof createPeopleApplicationService>
