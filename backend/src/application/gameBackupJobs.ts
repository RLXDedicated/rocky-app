// Runs the whole-game backup once a day (after 2 a.m. server time, or on the
// first check after that if the server was down), plus on demand from Admin.
import type { BackupTarget } from '../infrastructure/chat/chatBackup'
import { gameBackupExists, writeGameBackup, type GameBackupResult } from '../infrastructure/backup/gameBackup'
import type { PersistenceContext } from '../infrastructure/persistenceContext'
import { systemClock, todayKey, type Clock } from '../domain/rockyEngine'

const RUN_AFTER_HOUR = 2

export function createGameBackupJobs(persistence: PersistenceContext, target: BackupTarget, clock: Clock = systemClock, log: (m: string) => void = console.log) {
  let last: (GameBackupResult & { at: string }) | null = null
  let doneFor: string | null = null
  let running: Promise<GameBackupResult> | null = null

  async function run(): Promise<GameBackupResult> {
    if (!persistence.snapshot) throw new Error('Backups need the SQLite database (not available in memory mode).')
    if (running) return running
    const day = todayKey(clock.now())
    running = writeGameBackup(persistence.snapshot, target, day)
    try {
      const r = await running
      last = { ...r, at: clock.now().toISOString() }
      log(`[rocky-backend] game backup ${day}: ${Math.round(r.bytes / 1024)} KB${r.file ? ' on the volume' : ''}${r.uploaded ? ' + bucket' : ''}${r.error ? ` (bucket error: ${r.error})` : ''}`)
      return r
    } finally {
      running = null
    }
  }

  return {
    run,
    async tick() {
      const now = clock.now()
      const day = todayKey(now)
      if (!persistence.snapshot || doneFor === day || now.getHours() < RUN_AFTER_HOUR) return
      doneFor = day
      if (gameBackupExists(target, day) && !target.s3) return
      try {
        await run()
      } catch (err) {
        doneFor = null
        log(`[rocky-backend] game backup failed: ${err instanceof Error ? err.message : String(err)}`)
      }
    },
    status: () => ({
      enabled: Boolean(persistence.snapshot),
      target: { local: !!target.dir, bucket: !!target.s3, encrypted: !!target.key },
      last,
    }),
  }
}

export type GameBackupJobs = ReturnType<typeof createGameBackupJobs>
