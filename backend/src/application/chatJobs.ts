// Nightly chat housekeeping: delete messages past the 90-day retention and
// back up the previous day's conversations (infrastructure/chat/chatBackup).
// Checked every 30 minutes; each day's work runs once. On start-up it also
// catches up on yesterday's backup if the server was down at night.
import { backupExists, writeBackup, type BackupResult, type BackupTarget } from '../infrastructure/chat/chatBackup'
import { systemClock, type Clock } from '../domain/rockyEngine'
import type { ChatApplicationService } from './chatApplicationService'

const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export interface ChatJobs {
  /** Runs the day's purge and yesterday's backup if not done yet. */
  tick(): Promise<void>
  /** Backs up one local day now (admin "back up now", tests). */
  backupDay(day: string): Promise<BackupResult>
  status(): { target: { local: boolean; bucket: boolean; encrypted: boolean }; last: (BackupResult & { day: string; at: string }) | null; lastPurge: { at: string; removed: number } | null }
  stop(): void
}

export function createChatJobs(chat: ChatApplicationService, target: BackupTarget, clock: Clock = systemClock, log: (msg: string) => void = console.log): ChatJobs {
  let doneFor: string | null = null
  let last: (BackupResult & { day: string; at: string }) | null = null
  let lastPurge: { at: string; removed: number } | null = null

  async function backupDay(day: string): Promise<BackupResult> {
    const [y, m, d] = day.split('-').map(Number) as [number, number, number]
    const from = new Date(y, m - 1, d)
    const to = new Date(y, m - 1, d + 1)
    const messages = chat.exportRange(from.toISOString(), to.toISOString())
    const result = await writeBackup(target, day, { messages })
    last = { ...result, day, at: clock.now().toISOString() }
    log(
      `[rocky-backend] chat backup ${day}: ${result.count} messages${result.file ? `, file ${result.file}` : ''}${result.uploaded ? ', uploaded to bucket' : ''}${result.error ? `, bucket error: ${result.error}` : ''}`,
    )
    return result
  }

  async function tick() {
    const now = clock.now()
    const today = dayKey(now)
    if (doneFor === today) return
    doneFor = today
    try {
      const removed = chat.purge()
      lastPurge = { at: now.toISOString(), removed }
      const yesterday = dayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1))
      if (!backupExists(target, yesterday) || target.s3) await backupDay(yesterday)
    } catch (err) {
      doneFor = null
      log(`[rocky-backend] chat housekeeping failed: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return {
    tick,
    backupDay,
    status: () => ({
      target: { local: !!target.dir, bucket: !!target.s3, encrypted: !!target.key },
      last,
      lastPurge,
    }),
    stop() {},
  }
}

/** Starts the half-hourly check (server only; tests call tick() directly). */
export function startChatJobs(jobs: ChatJobs): void {
  void jobs.tick()
  const timer = setInterval(() => void jobs.tick(), 30 * 60_000)
  timer.unref?.()
  const stop = jobs.stop
  jobs.stop = () => {
    clearInterval(timer)
    stop()
  }
}
