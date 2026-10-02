// How much time agents spend in Rocky (for Operations): the browser pings
// once a minute while Rocky is open and in front; each ping is one minute,
// counted inside or outside the agent's shift. Sessions start after 10 quiet
// minutes. Admins see it per agent next to their notes results.
import type { PersistenceContext } from '../infrastructure/persistenceContext'
import { systemClock, todayKey, type Clock } from '../domain/rockyEngine'
import { minutesIntoShift, type AgentSchedule } from '../../../src/game/schedule'
import { publicName } from './leaderboardApplicationService'

const MIN_GAP_MS = 45_000
const SESSION_GAP_MS = 10 * 60_000

export interface UsageDeps {
  persistence: PersistenceContext
  scheduleOf: (agentId: string) => AgentSchedule | null
  clock?: Clock
}

export function createUsageApplicationService({ persistence, scheduleOf, clock = systemClock }: UsageDeps) {
  const accounts = persistence.accounts
  const repo = persistence.repoStore
  const lastPing = new Map<string, number>()

  return {
    /** One minute of Rocky open and visible (extra pings within the minute, e.g. two tabs, don't count). */
    ping(agentId: string) {
      const now = clock.now()
      const last = lastPing.get(agentId)
      if (last !== undefined && now.getTime() - last < MIN_GAP_MS) return { counted: false }
      lastPing.set(agentId, now.getTime())
      const schedule = scheduleOf(agentId)
      const inShift = schedule ? minutesIntoShift(schedule, now) !== null : false
      const newSession = last === undefined || now.getTime() - last > SESSION_GAP_MS
      accounts.addUsageMinute(agentId, todayKey(now), inShift, newSession, now.toISOString())
      return { counted: true }
    },

    /** The last `days` days: per agent and per day, with each agent's QA results in the same window. */
    report(days = 7) {
      const now = clock.now()
      const span = Math.max(1, Math.min(90, Math.floor(days)))
      const since = todayKey(new Date(now.getTime() - (span - 1) * 86_400_000))
      const rows = accounts.listUsage(since)
      const leaders = accounts.getTeams()
      const byAgent = new Map<string, { minutes: number; shiftMinutes: number; sessions: number; days: number }>()
      const byDay = new Map<string, { minutes: number; shiftMinutes: number; agents: number }>()
      for (const r of rows) {
        const a = byAgent.get(r.agentId) ?? { minutes: 0, shiftMinutes: 0, sessions: 0, days: 0 }
        byAgent.set(r.agentId, { minutes: a.minutes + r.minutes, shiftMinutes: a.shiftMinutes + r.shiftMinutes, sessions: a.sessions + r.sessions, days: a.days + 1 })
        const d = byDay.get(r.day) ?? { minutes: 0, shiftMinutes: 0, agents: 0 }
        byDay.set(r.day, { minutes: d.minutes + r.minutes, shiftMinutes: d.shiftMinutes + r.shiftMinutes, agents: d.agents + 1 })
      }
      const nameOf = (id: string) => {
        try {
          return publicName(id, repo.forAgent(id).getAgent().name)
        } catch {
          return publicName(id, '')
        }
      }
      const agents = [...byAgent].map(([agentId, u]) => {
        const audits = accounts.listQaAudits({ agentId, since, limit: 500 })
        const passes = audits.filter((a) => a.result === 'pass').length
        return {
          agentId,
          name: nameOf(agentId),
          leader: leaders[agentId] ? nameOf(leaders[agentId]!) : null,
          minutes: u.minutes,
          shiftMinutes: u.shiftMinutes,
          sessions: u.sessions,
          daysActive: u.days,
          /** Average minutes per day they opened Rocky. */
          perDay: Math.round((u.minutes / u.days) * 10) / 10,
          audits: audits.length,
          qaPassRate: audits.length ? Math.round((passes / audits.length) * 100) : null,
        }
      })
      agents.sort((a, b) => b.perDay - a.perDay)
      const total = agents.reduce((n, a) => n + a.minutes, 0)
      const totalShift = agents.reduce((n, a) => n + a.shiftMinutes, 0)
      return {
        since,
        days: span,
        /** Target: 3–5 minutes a day per agent. */
        goal: { min: 3, max: 5 },
        summary: {
          agents: agents.length,
          avgPerDay: agents.length ? Math.round((agents.reduce((n, a) => n + a.perDay, 0) / agents.length) * 10) / 10 : 0,
          shiftShare: total ? Math.round((totalShift / total) * 100) : 0,
          overGoal: agents.filter((a) => a.perDay > 5).length,
        },
        byDay: [...byDay].map(([day, d]) => ({ day, ...d })).sort((a, b) => a.day.localeCompare(b.day)),
        agents,
      }
    },
  }
}

export type UsageApplicationService = ReturnType<typeof createUsageApplicationService>
