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
import type { Clock } from './domain/rockyEngine'

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
  // See config/env.ts's AuthMode: 'pilot-header' is an explicit opt-in for
  // the Teams-reminder pilot only — every other configuration (including
  // an unconfigured production deployment) keeps the fail-closed devIdentity
  // behavior, which 401s every request when devIdentityEnabled is false.
  api.use(config.authMode === 'pilot-header' ? createPilotIdentity(config) : devIdentity)
  api.use(
    createApiRouter({
      game: createGameApplicationService({ persistence, clock: options.clock }),
      qa: createQaApplicationService({ persistence, clock: options.clock }),
      reminders: createReminderApplicationService({ persistence, clock: options.clock }),
      leaderboard: createLeaderboardApplicationService({ persistence }),
      team: createTeamApplicationService({ persistence }),
      admin: createAdminApplicationService({ persistence }),
      clock: options.clock,
    }),
  )
  app.use('/api', api)

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' })
  })

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
