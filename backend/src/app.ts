// Express app factory. `createApp()` builds a fresh app wired to a
// `PersistenceContext` (Phase 13) — by default one derived from `config`
// (so a real run uses whatever `ROCKY_PERSISTENCE_DRIVER`/`ROCKY_DB_PATH`
// say), or an injected one for tests, which can be in-memory (fast,
// isolated) or a real SQLite file (to exercise durability/restart
// behavior). See server.ts for the actual `listen()` call, kept separate
// so tests can exercise the app via supertest without binding a port.
import cors from 'cors'
import express, { type Express } from 'express'
import { installBrowserGlobalsShim } from './infrastructure/browserGlobalsShim'
import { createPersistenceContext, type PersistenceContext } from './infrastructure/persistenceContext'
import { config as defaultConfig, type AppConfig } from './config/env'
import { requestId } from './middleware/requestId'
import { devIdentity } from './middleware/devIdentity'
import { createPilotIdentity } from './middleware/pilotIdentity'
import { errorHandler, notFoundHandler } from './middleware/errorHandler'
import { createApiRouter } from './api/routes'
import { createGameApplicationService } from './application/gameApplicationService'
import { createQaApplicationService } from './application/qaApplicationService'
import { createReminderApplicationService } from './application/reminderApplicationService'
import { createLeaderboardApplicationService } from './application/leaderboardApplicationService'
import { createTeamApplicationService } from './application/teamApplicationService'
import { createAdminApplicationService } from './application/adminApplicationService'
import { createPetApplicationService } from './application/petApplicationService'
import { createAuthApplicationService } from './application/authApplicationService'
import { createSessionIdentity } from './middleware/sessionIdentity'
import { parseJsonBody } from './api/validation'
import { createChatRouter } from './api/chatRoutes'
import { createChatApplicationService, type ChatApplicationService } from './application/chatApplicationService'
import { createChatJobs, type ChatJobs } from './application/chatJobs'
import { createLiveBus, type LiveBus } from './application/liveBus'
import { createPeopleApplicationService, type PeopleApplicationService } from './application/peopleApplicationService'
import { createPeopleRouter } from './api/peopleRoutes'
import { createExtrasRouter } from './api/extrasRoutes'
import { createChallengeApplicationService, type ChallengeApplicationService } from './application/challengeApplicationService'
import { createTeamsApplicationService, type TeamsApplicationService, type TeamsConfig } from './application/teamsApplicationService'
import { createTeamsAdminRouter, createTeamsLinkRouter } from './api/teamsRoutes'
import { createHash, randomBytes } from 'node:crypto'
import { backupTargetFromEnv, type BackupTarget } from './infrastructure/chat/chatBackup'
import type { PetApplicationService } from './application/petApplicationService'
import type { AuthApplicationService } from './application/authApplicationService'
import { todayKey, type Clock } from './domain/rockyEngine'

// Reusing teamService/leaderboardService/reminderService UNCHANGED (see
// ../infrastructure/browserGlobalsShim.ts) requires window.localStorage to
// exist before those modules' functions are first CALLED — installing it
// at module load time here (before any request can arrive) is sufficient;
// see that file's header for why import order doesn't otherwise matter.
installBrowserGlobalsShim()

export interface CreateAppOptions {
  clock?: Clock
  /** Test-only: inject a persistence context (e.g. a SQLite-file-backed one, to test durability, or one that throws, to test error handling). Defaults to one built from `config`. */
  persistence?: PersistenceContext
  /** Test-only: inject a config (e.g. to exercise authMode: 'pilot-header'). Defaults to the process's own `config`. */
  config?: AppConfig
  /** Test-only: where chat backups go (defaults to the volume next to the database, plus the bucket if configured). */
  backupTarget?: BackupTarget
  /** Test-only: the Teams webhook settings and a fake fetch. */
  teams?: Partial<TeamsConfig> & { fetchFn?: typeof fetch }
}

/** Teams settings from the environment (see docs/TEAMS_INTEGRATION.md). */
function teamsConfigFromEnv(env: NodeJS.ProcessEnv): TeamsConfig {
  const trim = (v: string | undefined) => v?.trim().replace(/\/+$/, '') || null
  let linkSecret = env.ROCKY_LINK_SECRET?.trim() || null
  if (!linkSecret && env.ROCKY_CHAT_BACKUP_KEY) linkSecret = createHash('sha256').update(`rocky-links:${env.ROCKY_CHAT_BACKUP_KEY}`).digest('hex')
  if (!linkSecret) {
    linkSecret = randomBytes(32).toString('hex')
    if (env.ROCKY_TEAMS_WEBHOOK_URL) console.warn('[rocky-backend] ROCKY_LINK_SECRET is not set: Teams card links stop working after a restart.')
  }
  return {
    webhookUrl: env.ROCKY_TEAMS_WEBHOOK_URL?.trim() || null,
    webUrl: trim(env.ROCKY_PUBLIC_WEB_URL) ?? 'https://rocky-dist.vercel.app',
    apiUrl: trim(env.ROCKY_PUBLIC_API_URL) ?? 'https://rocky-backend-production-6208.up.railway.app',
    linkSecret,
  }
}

/** What the live WebSocket hub (server.ts) needs from the app. */
export interface LiveContext {
  auth: AuthApplicationService
  pet: PetApplicationService
  chat: ChatApplicationService
  bus: LiveBus
  jobs: ChatJobs
  persistence: PersistenceContext
  challenges: ChallengeApplicationService
  teams: TeamsApplicationService
}

export function createApp(options: CreateAppOptions = {}): Express {
  const config = options.config ?? defaultConfig
  const persistence = options.persistence ?? createPersistenceContext(config)

  const app = express()
  app.disable('x-powered-by')
  if (config.allowedOrigins.length > 0) {
    app.use(cors({ origin: config.allowedOrigins }))
  }
  app.use(express.json())
  app.use(requestId)

  const api = express.Router()
  const auth = createAuthApplicationService({ persistence, config, clock: options.clock })
  // Late-bound: Teams needs pet, which is built after identity.
  let teams: TeamsApplicationService | null = null

  // Teams card buttons: public, the signed link is the identity.
  api.use(createTeamsLinkRouter(() => teams!))

  // Sign-in routes come before identity: they are how an identity is obtained.
  api.post('/auth/status', (req, res) => {
    res.json(auth.status(parseJsonBody(req.body).email))
  })
  api.post('/auth/login', (req, res) => {
    const body = parseJsonBody(req.body)
    const result = auth.login({ email: body.email, pin: body.pin, userAgent: req.header('User-Agent') })
    if ('error' in result) {
      res.status(401).json({ error: { code: 'WRONG_PIN', message: result.error, requestId: req.requestId } })
      return
    }
    res.json(result)
  })

  // See config/env.ts's AuthMode: 'pilot-header' is an explicit opt-in for
  // the Teams-reminder pilot only — every other configuration (including
  // an unconfigured production deployment) keeps the fail-closed devIdentity
  // behavior, which 401s every request when devIdentityEnabled is false.
  // A PIN sign-in session (Authorization: Bearer) always takes precedence.
  api.use(createSessionIdentity(auth, config.authMode === 'pilot-header' ? createPilotIdentity(config) : devIdentity, config.requireLogin))
  const bus = createLiveBus()
  const admins = new Set(config.adminEmails)
  const isStaff = (agentId: string) => admins.has(agentId.toLowerCase())
  const titleOf = (agentId: string) => persistence.accounts.getTitles()[agentId] ?? null
  const testerOf = (agentId: string) => persistence.accounts.getTesters().includes(agentId)
  // Late-bound: people needs pet (profiles) and pet needs people (a leader's team mood).
  let people: PeopleApplicationService | null = null
  const pet = createPetApplicationService({ persistence, clock: options.clock, isStaff, titleOf, testerOf, teamMood: (id) => people?.teamMood(id) ?? null })
  const chat = createChatApplicationService({ persistence, bus, clock: options.clock, isStaff, titleOf, testerOf, bubbleOf: (id) => pet.bubbleOf(id), giphyKey: process.env.ROCKY_GIPHY_API_KEY?.trim() || null })
  people = createPeopleApplicationService({ persistence, pet, isStaff, isOnline: (id) => bus.isOnline(id), clock: options.clock })
  const jobs = createChatJobs(chat, options.backupTarget ?? backupTargetFromEnv(process.env, config.persistenceDriver === 'sqlite' ? config.dbPath : null), options.clock)
  const challenges = createChallengeApplicationService({ persistence, pet, clock: options.clock })
  const { fetchFn, ...teamsOverrides } = options.teams ?? {}
  teams = createTeamsApplicationService({ persistence, pet, config: { ...teamsConfigFromEnv(process.env), ...teamsOverrides }, clock: options.clock, fetchFn })
  const scheduleOf = teams.scheduleOf
  const live: LiveContext = { auth, pet, chat, bus, jobs, persistence, challenges, teams }
  app.locals.live = live
  api.use(createChatRouter(chat, jobs))
  api.use(createPeopleRouter(people))
  api.use(createExtrasRouter({ challenges, pet, persistence, clock: options.clock }))
  api.use(createTeamsAdminRouter(teams))
  api.use(
    createApiRouter({
      game: createGameApplicationService({ persistence, clock: options.clock, scheduleOf, onCheckIn: (id) => teams?.onCheckIn(id) }),
      qa: createQaApplicationService({ persistence, clock: options.clock }),
      reminders: createReminderApplicationService({ persistence, clock: options.clock, scheduleOf }),
      leaderboard: createLeaderboardApplicationService({ persistence }),
      team: createTeamApplicationService({ persistence }),
      admin: createAdminApplicationService({ persistence, config, clock: options.clock }),
      pet,
      auth,
      clock: options.clock,
    }),
  )
  app.use('/api', api)

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timezone: config.timezone, today: todayKey(new Date()) })
  })

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
