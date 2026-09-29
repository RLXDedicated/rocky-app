import { createApp, type LiveContext } from './app'
import { startChatJobs } from './application/chatJobs'
import { attachLiveHub } from './infrastructure/live/liveHub'
import { config } from './config/env'
import { createPersistenceContext } from './infrastructure/persistenceContext'

// Must run before any request computes a "today" — see AppConfig.timezone.
process.env.TZ = config.timezone

const persistence = createPersistenceContext(config)
const app = createApp({ persistence })

const live = app.locals.live as LiveContext

const server = app.listen(config.port, () => {
  console.log(`[rocky-backend] listening on port ${config.port} (${config.nodeEnv})`)
  console.log(`[rocky-backend] timezone: ${config.timezone} (local now: ${new Date().toString()})`)
  console.log(`[rocky-backend] persistence: ${config.persistenceDriver}${config.persistenceDriver === 'sqlite' ? ` (${config.dbPath})` : ''}`)
  if (config.authMode === 'pilot-header') {
    console.log('[rocky-backend] Pilot identity is ENABLED — X-Agent-Email header accepted. This is NOT authentication (Teams-pilot-only stopgap).')
  } else if (config.devIdentityEnabled) {
    console.log('[rocky-backend] Dev identity is ENABLED — X-Dev-Agent-Id/X-Dev-Role headers accepted. This is NOT authentication.')
  } else {
    console.log('[rocky-backend] No identity mechanism is configured — all requests return 401. Set ROCKY_AUTH_MODE=pilot-header to enable the Teams pilot identity.')
  }
  if (config.allowedOrigins.length > 0) {
    console.log(`[rocky-backend] CORS allowed origins: ${config.allowedOrigins.join(', ')}`)
  } else {
    console.log('[rocky-backend] CORS is OFF (no ROCKY_ALLOWED_ORIGINS configured) — only same-origin/non-browser callers can reach this API.')
  }
})

// Live channel (presence, live visits, chat pushes) on the same port.
const hub = attachLiveHub(server, live, {
  allowedOrigins: config.allowedOrigins,
  acceptPilotEmail: config.authMode === 'pilot-header' && !config.requireLogin,
})
// Nightly chat housekeeping: 90-day retention and the daily backup.
startChatJobs(live.jobs)
// Hourly: settle finished team challenges (pay the winners) and crown last week's Arcade champions.
const houseJobs = () => {
  try {
    live.challenges.settle()
    live.pet.awardArcadeChampions()
  } catch (err) {
    console.error('[rocky-backend] house jobs failed:', err)
  }
}
houseJobs()
const houseTimer = setInterval(houseJobs, 60 * 60_000)
houseTimer.unref()
const backup = live.jobs.status().target
console.log(`[rocky-backend] live channel at /api/live; chat backups: volume ${backup.local ? 'on' : 'off'}, bucket ${backup.bucket ? 'on' : 'off'}, ${backup.encrypted ? 'encrypted' : 'NOT encrypted (set ROCKY_CHAT_BACKUP_KEY)'}`)

function shutdown(): void {
  console.log('[rocky-backend] shutting down...')
  hub.close()
  live.jobs.stop()
  server.close(() => {
    persistence.close()
    process.exit(0)
  })
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
