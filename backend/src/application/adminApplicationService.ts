// Application Service for the QA/ADMIN console. Reads (roster, per-agent
// detail, pilot-wide analytics, system info) plus a small set of
// ADMINISTRATIVE writes (rename, reset progress, delete a test agent).
//
// It never computes or sets XP/Energy/Level/Mood/Streak/Evolution itself:
// gameplay changes still go only through qaApplicationService (QA Pass /
// Documentation Alert / Correction) and the Game Engine (ADR-0002). Reset
// and delete wipe an agent's records outright — they do not fabricate a
// state.
import { ApiError } from '../api/errors'
import type { AppConfig } from '../config/env'
import type { PersistenceContext } from '../infrastructure/persistenceContext'
import {
  buildCorrectionMap,
  countCheckIns,
  countEffectiveAlerts,
  countEffectiveQaPasses,
  daysBetweenKeys,
  systemClock,
  todayKey,
  type Clock,
  type GameEvent,
  type GameState,
} from '../domain/rockyEngine'
import type {
  AdminAgentDetailResponse,
  AdminAgentMetrics,
  AdminAgentSummary,
  AdminAgentsResponse,
  AdminEventRow,
  AdminOverviewResponse,
  AdminSystemResponse,
} from '../types/dto'

export interface AdminApplicationServiceDeps {
  persistence: PersistenceContext
  config: AppConfig
  clock?: Clock
}

/** An agent is "at risk" when Energy is low, they have repeated recent alerts, or they haven't checked in for this many days. */
const AT_RISK_DAYS_WITHOUT_CHECKIN = 3
const AT_RISK_ENERGY = 40
const AT_RISK_RECENT_ALERTS = 2
const RECENT_ALERT_WINDOW_DAYS = 7
const SERIES_DAYS = 30
const RECENT_ACTIVITY_LIMIT = 60

const startedAt = new Date()

function shiftDay(key: string, days: number): string {
  const d = new Date(`${key}T12:00:00`)
  d.setDate(d.getDate() + days)
  return todayKey(d)
}

function metricsFor(agentId: string, state: GameState, events: GameEvent[], achievementCount: number, today: string): AdminAgentMetrics {
  const daysSinceCheckIn = state.lastCheckInDate ? daysBetweenKeys(state.lastCheckInDate, today) : null
  // Operational signals only. Mood is deliberately NOT one: the engine
  // resolves a 1-2 day streak to 'Worried' by design, so it would flag
  // nearly every new agent.
  const riskReasons: string[] = []
  const correctionMap = buildCorrectionMap(events)
  const weekAgo = shiftDay(today, -(RECENT_ALERT_WINDOW_DAYS - 1))
  const recentAlerts = events.filter(
    (e) =>
      e.date >= weekAgo &&
      ((e.type === 'DOCUMENTATION_ALERT' && (correctionMap.get(e.id) ?? 'ALERT') === 'ALERT') || (e.type === 'QA_PASS' && correctionMap.get(e.id) === 'ALERT')),
  ).length
  if (state.energy < AT_RISK_ENERGY) riskReasons.push(`Energía < ${AT_RISK_ENERGY}`)
  if (recentAlerts >= AT_RISK_RECENT_ALERTS) riskReasons.push(`${recentAlerts} alertas en ${RECENT_ALERT_WINDOW_DAYS} días`)
  if (daysSinceCheckIn === null) riskReasons.push('Nunca ha hecho check-in')
  else if (daysSinceCheckIn >= AT_RISK_DAYS_WITHOUT_CHECKIN) riskReasons.push(`${daysSinceCheckIn} días sin check-in`)

  return {
    checkIns: countCheckIns(events, agentId),
    qaPasses: countEffectiveQaPasses(events, agentId),
    alerts: countEffectiveAlerts(events, agentId),
    corrections: events.filter((e) => e.type === 'CORRECTION').length,
    achievements: achievementCount,
    totalEvents: events.length,
    checkedInToday: state.lastCheckInDate === today,
    daysSinceCheckIn,
    firstSeenAt: events.length > 0 ? events.reduce((min, e) => (e.timestamp < min ? e.timestamp : min), events[0]!.timestamp) : null,
    atRisk: riskReasons.length > 0,
    riskReasons,
  }
}

function toEventRow(event: GameEvent, agentId: string, correctionMap: Map<string, 'PASS' | 'ALERT'>): AdminEventRow {
  return {
    id: event.id,
    agentId,
    type: event.type,
    date: event.date,
    timestamp: event.timestamp,
    payload: event.payload ?? null,
    correctsEventId: event.correctsEventId ?? null,
    correctedTo: correctionMap.get(event.id) ?? null,
  }
}

export function createAdminApplicationService({ persistence, config, clock = systemClock }: AdminApplicationServiceDeps) {
  const store = persistence.repoStore

  function requireKnownAgent(agentId: string): void {
    // Never call forAgent() first — it would silently CREATE the agent.
    if (!store.hasAgent(agentId)) throw ApiError.notFound(`Agent "${agentId}" does not exist.`)
  }

  function loadAll() {
    const today = todayKey(clock.now())
    return {
      today,
      agents: store.listAgentIds().map((agentId) => {
        const repo = store.forAgent(agentId)
        const agent = repo.getAgent()
        const state = repo.getGameState()
        const events = repo.getEvents()
        const achievements = repo.getAchievements()
        return { agentId, agent, state, events, achievements, reminders: repo.getReminders(), metrics: metricsFor(agentId, state, events, achievements.length, today) }
      }),
    }
  }

  function summarize(a: ReturnType<typeof loadAll>['agents'][number]): AdminAgentSummary {
    return { id: a.agentId, name: a.agent.name, rockyName: a.agent.rockyName, state: a.state, metrics: a.metrics }
  }

  return {
    listAgents(): AdminAgentsResponse {
      return { agents: loadAll().agents.map(summarize) }
    },

    getAgentDetail(agentId: string): AdminAgentDetailResponse {
      requireKnownAgent(agentId)
      const all = loadAll()
      const a = all.agents.find((x) => x.agentId === agentId)!
      const correctionMap = buildCorrectionMap(a.events)
      return {
        agent: summarize(a),
        events: [...a.events].sort((x, y) => y.timestamp.localeCompare(x.timestamp)).map((e) => toEventRow(e, agentId, correctionMap)),
        achievements: [...a.achievements].sort((x, y) => y.unlockedAt.localeCompare(x.unlockedAt)),
        reminders: [...a.reminders].sort((x, y) => y.timestamp.localeCompare(x.timestamp)),
      }
    },

    renameAgent(agentId: string, name: string): AdminAgentSummary {
      requireKnownAgent(agentId)
      return persistence.withTransaction(() => {
        const repo = store.forAgent(agentId)
        repo.saveAgent({ ...repo.getAgent(), name })
        const state = repo.getGameState()
        const events = repo.getEvents()
        const achievements = repo.getAchievements()
        return {
          id: agentId,
          name,
          rockyName: repo.getAgent().rockyName,
          state,
          metrics: metricsFor(agentId, state, events, achievements.length, todayKey(clock.now())),
        }
      })
    },

    /** Wipes progress (state, events, achievements, reminders) but keeps the agent on the roster with a fresh Rocky. */
    resetAgent(agentId: string): { id: string; reset: true } {
      requireKnownAgent(agentId)
      persistence.withTransaction(() => {
        const agent = store.forAgent(agentId).getAgent()
        store.forAgent(agentId).resetAll()
        // A fresh view: the in-memory store replaces the record object on reset.
        store.forAgent(agentId).saveAgent(agent)
      })
      return { id: agentId, reset: true }
    },

    deleteAgent(agentId: string): { id: string; deleted: true } {
      requireKnownAgent(agentId)
      persistence.withTransaction(() => store.deleteAgent(agentId))
      return { id: agentId, deleted: true }
    },

    getOverview(): AdminOverviewResponse {
      const { today, agents } = loadAll()
      const n = agents.length
      const avg = (f: (a: (typeof agents)[number]) => number) => (n === 0 ? 0 : Math.round((agents.reduce((s, a) => s + f(a), 0) / n) * 10) / 10)
      const countBy = <K extends string>(keys: readonly K[], f: (a: (typeof agents)[number]) => K) =>
        keys.map((key) => ({ key, count: agents.filter((a) => f(a) === key).length }))

      // Daily series over the last SERIES_DAYS days (inclusive of today).
      const days = Array.from({ length: SERIES_DAYS }, (_, i) => shiftDay(today, i - (SERIES_DAYS - 1)))
      const daily = new Map(days.map((d) => [d, { date: d, checkIns: 0, qaPasses: 0, alerts: 0, activeAgents: new Set<string>() }]))
      const hourly = Array.from({ length: 24 }, (_, hour) => ({ hour, checkIns: 0 }))
      const weekday = Array.from({ length: 7 }, (_, day) => ({ day, checkIns: 0 }))
      const allEvents: AdminEventRow[] = []

      for (const a of agents) {
        const correctionMap = buildCorrectionMap(a.events)
        for (const e of a.events) {
          allEvents.push(toEventRow(e, a.agentId, correctionMap))
          const bucket = daily.get(e.date)
          if (e.type === 'CHECK_IN') {
            const local = new Date(e.timestamp)
            hourly[local.getHours()]!.checkIns++
            weekday[local.getDay()]!.checkIns++
          }
          if (!bucket) continue
          if (e.type === 'CHECK_IN') {
            bucket.checkIns++
            bucket.activeAgents.add(a.agentId)
          } else if (e.type === 'QA_PASS') bucket.qaPasses++
          else if (e.type === 'DOCUMENTATION_ALERT') bucket.alerts++
        }
      }

      const checkedInToday = agents.filter((a) => a.metrics.checkedInToday).length
      const active7d = agents.filter((a) => a.metrics.daysSinceCheckIn !== null && a.metrics.daysSinceCheckIn < 7).length
      const totalQaPasses = agents.reduce((s, a) => s + a.metrics.qaPasses, 0)
      const totalAlerts = agents.reduce((s, a) => s + a.metrics.alerts, 0)
      const best = agents.reduce<(typeof agents)[number] | null>((b, a) => (!b || a.state.bestStreak > b.state.bestStreak ? a : b), null)

      return {
        generatedAt: clock.now().toISOString(),
        today,
        timezone: config.timezone,
        kpis: {
          totalAgents: n,
          checkedInToday,
          checkInRateToday: n === 0 ? 0 : Math.round((checkedInToday / n) * 100),
          active7d,
          atRisk: agents.filter((a) => a.metrics.atRisk).length,
          totalCheckIns: agents.reduce((s, a) => s + a.metrics.checkIns, 0),
          totalQaPasses,
          totalAlerts,
          qaPassRate: totalQaPasses + totalAlerts === 0 ? null : Math.round((totalQaPasses / (totalQaPasses + totalAlerts)) * 100),
          totalAchievements: agents.reduce((s, a) => s + a.metrics.achievements, 0),
          avgLevel: avg((a) => a.state.level),
          avgXp: avg((a) => a.state.xp),
          avgEnergy: avg((a) => a.state.energy),
          avgStreak: avg((a) => a.state.currentStreak),
          bestStreak: best ? { agentId: best.agentId, days: best.state.bestStreak } : null,
        },
        moodDistribution: countBy(['Happy', 'Motivated', 'Worried', 'Recovery'] as const, (a) => a.state.mood),
        evolutionDistribution: countBy(['Baby', 'Young', 'Advanced', 'Elite'] as const, (a) => a.state.evolutionStage),
        daily: [...daily.values()].map(({ activeAgents, ...rest }) => ({ ...rest, activeAgents: activeAgents.size })),
        hourlyCheckIns: hourly,
        weekdayCheckIns: weekday,
        topAgents: [...agents]
          .sort((x, y) => y.state.xp - x.state.xp)
          .slice(0, 5)
          .map(summarize),
        atRiskAgents: agents.filter((a) => a.metrics.atRisk).map(summarize),
        recentActivity: allEvents.sort((x, y) => y.timestamp.localeCompare(x.timestamp)).slice(0, RECENT_ACTIVITY_LIMIT),
      }
    },

    getSystem(): AdminSystemResponse {
      const now = clock.now()
      const env = process.env
      return {
        serverTime: now.toISOString(),
        serverLocalTime: now.toString(),
        today: todayKey(now),
        timezone: config.timezone,
        processTz: env.TZ ?? null,
        nodeEnv: config.nodeEnv,
        nodeVersion: process.version,
        authMode: config.authMode,
        adminEmails: config.adminEmails,
        allowedOrigins: config.allowedOrigins,
        persistenceDriver: config.persistenceDriver,
        uptimeSeconds: Math.round((Date.now() - startedAt.getTime()) / 1000),
        deployment: {
          commitSha: env.RAILWAY_GIT_COMMIT_SHA ?? null,
          commitMessage: env.RAILWAY_GIT_COMMIT_MESSAGE ?? null,
          branch: env.RAILWAY_GIT_BRANCH ?? null,
          environment: env.RAILWAY_ENVIRONMENT_NAME ?? null,
          deploymentId: env.RAILWAY_DEPLOYMENT_ID ?? null,
        },
        agentCount: store.listAgentIds().length,
      }
    },
  }
}

export type AdminApplicationService = ReturnType<typeof createAdminApplicationService>
