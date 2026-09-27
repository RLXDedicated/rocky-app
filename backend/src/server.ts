import { createApp } from './app'
import { config } from './config/env'
import { createPersistenceContext } from './infrastructure/persistenceContext'

const persistence = createPersistenceContext(config)
const app = createApp({ persistence })

const server = app.listen(config.port, () => {
  console.log(`[rocky-backend] listening on port ${config.port} (${config.nodeEnv})`)
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

function shutdown(): void {
  console.log('[rocky-backend] shutting down...')
  server.close(() => {
    persistence.close()
    process.exit(0)
  })
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
