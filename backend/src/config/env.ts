// Environment-aware configuration. No secrets, ports, or environment-
// specific values are hard-coded elsewhere in this backend — everything
// reads through this module. See ../../.env.example for the full list of
// variables a real deployment would set.
import { resolve } from 'node:path'

export type NodeEnv = 'development' | 'test' | 'production'
export type PersistenceDriver = 'memory' | 'sqlite'
export type AuthMode = 'dev' | 'pilot-header'

export interface AppConfig {
  nodeEnv: NodeEnv
  port: number
  /**
   * Whether the X-Dev-Agent-Id development identity mechanism (see
   * ../middleware/devIdentity.ts) is allowed to satisfy authentication.
   * MUST be false whenever nodeEnv === 'production' — enforced below, not
   * left to the caller to remember. There is no real authentication in
   * this phase (Entra ID is explicitly out of scope, Phase 11/12), so
   * production simply has no working identity path yet: every request is
   * rejected with 401 rather than silently trusting a header.
   */
  devIdentityEnabled: boolean
  /**
   * Which identity middleware handles requests (§AuthMode):
   *  - 'dev'          — X-Dev-Agent-Id/X-Dev-Role (see devIdentityEnabled
   *                     above). The only mode a default deployment runs in.
   *  - 'pilot-header' — X-Agent-Email (see ../middleware/pilotIdentity.ts).
   *                     Trusts an email address handed to it by the caller,
   *                     with NO password and NO cryptographic verification.
   *                     This is deliberately opt-in (never the default,
   *                     even in production — must be set explicitly via
   *                     ROCKY_AUTH_MODE) because it is only appropriate
   *                     for the closed Teams-reminder pilot: the only way
   *                     to reach the frontend with an identity attached is
   *                     a link Power Automate hands to a known agent from
   *                     the SharePoint pilot roster, never a public form.
   *                     It is a stopgap for the pilot, not authentication —
   *                     replace it with real Entra ID/SSO before this ever
   *                     reaches agents outside that closed pilot list.
   */
  authMode: AuthMode
  /**
   * Which Repository implementation backs this process (Phase 13 §2/§16).
   * 'memory' is dev/test convenience only — data is lost on restart.
   * 'sqlite' is the durable local implementation. MUST be 'sqlite'
   * whenever nodeEnv === 'production' — enforced below (§ProductionSafety),
   * same hard-fail-fast pattern as devIdentityEnabled.
   */
  persistenceDriver: PersistenceDriver
  /** Filesystem path to the SQLite database file (ignored when persistenceDriver === 'memory'). */
  dbPath: string
  /**
   * Origins allowed to call this API cross-origin (the deployed frontend's
   * URL(s), e.g. https://rocky-dist.vercel.app). Empty by default — CORS
   * stays off until a deployment explicitly names its frontend's origin,
   * same "safe unless configured otherwise" pattern as everything else
   * here. Comma-separated in ROCKY_ALLOWED_ORIGINS.
   */
  allowedOrigins: string[]
}

function readNodeEnv(env: NodeJS.ProcessEnv): NodeEnv {
  const raw = env.NODE_ENV
  if (raw === 'production' || raw === 'test') return raw
  return 'development'
}

function readPersistenceDriver(env: NodeJS.ProcessEnv, nodeEnv: NodeEnv): PersistenceDriver {
  const raw = env.ROCKY_PERSISTENCE_DRIVER
  if (raw === 'memory' || raw === 'sqlite') return raw
  // Sensible defaults, not silent surprises: tests default to fast,
  // isolated in-memory storage unless a test explicitly asks for sqlite
  // (durability tests do); development/production default to the durable
  // store, since "run the backend locally" should demonstrate the thing
  // this phase built.
  return nodeEnv === 'test' ? 'memory' : 'sqlite'
}

function readDbPath(env: NodeJS.ProcessEnv): string {
  const raw = env.ROCKY_DB_PATH ?? 'data/rocky.local.db'
  return raw === ':memory:' ? raw : resolve(process.cwd(), raw)
}

function readAuthMode(env: NodeJS.ProcessEnv): AuthMode {
  return env.ROCKY_AUTH_MODE === 'pilot-header' ? 'pilot-header' : 'dev'
}

function readAllowedOrigins(env: NodeJS.ProcessEnv): string[] {
  const raw = env.ROCKY_ALLOWED_ORIGINS
  if (!raw) return []
  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0)
}

/**
 * Fail-fast guards against configurations that would silently create a
 * production system with no real durability or no real identity check —
 * both are worse than refusing to start (Phase 13 §15): a production
 * deployment that quietly ran on in-memory storage would look like it
 * works right up until its first restart erases every agent's progress.
 */
function assertProductionSafety(cfg: Pick<AppConfig, 'nodeEnv' | 'persistenceDriver' | 'dbPath' | 'devIdentityEnabled'>): void {
  if (cfg.nodeEnv !== 'production') return

  if (cfg.persistenceDriver !== 'sqlite') {
    throw new Error(
      `Refusing to start: NODE_ENV=production requires ROCKY_PERSISTENCE_DRIVER=sqlite (got "${cfg.persistenceDriver}"). ` +
        'Production must never run on the in-memory repository — it silently loses all data on restart.',
    )
  }
  if (cfg.dbPath === ':memory:') {
    throw new Error('Refusing to start: NODE_ENV=production cannot use ROCKY_DB_PATH=":memory:" — that is not durable storage.')
  }
  if (cfg.devIdentityEnabled) {
    // Unreachable today (devIdentityEnabled is always computed false for
    // production below), kept as an explicit assertion so this guard
    // still catches a future refactor that accidentally reintroduces the
    // possibility, rather than relying solely on the computation being
    // right.
    throw new Error('Refusing to start: development identity must never be enabled when NODE_ENV=production.')
  }
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const nodeEnv = readNodeEnv(env)
  const port = Number(env.PORT ?? 4000)

  const config: AppConfig = {
    nodeEnv,
    port: Number.isFinite(port) && port > 0 ? port : 4000,
    // Hard rule, not a preference: dev identity can NEVER be enabled in
    // production, regardless of what any other env var is set to.
    devIdentityEnabled: nodeEnv !== 'production',
    authMode: readAuthMode(env),
    persistenceDriver: readPersistenceDriver(env, nodeEnv),
    dbPath: readDbPath(env),
    allowedOrigins: readAllowedOrigins(env),
  }

  assertProductionSafety(config)
  return config
}

export const config = loadConfig()
