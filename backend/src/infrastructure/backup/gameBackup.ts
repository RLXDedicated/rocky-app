// Daily backup of the WHOLE game (every agent's progress, Rocky, coins,
// QA audits, schedules, chat — the entire SQLite database), independent of
// the chat's own daily export.
//
//   1. A consistent snapshot (VACUUM INTO) is taken while the app runs.
//   2. It is gzipped and sealed with AES-256-GCM (ROCKY_CHAT_BACKUP_KEY).
//   3. Written next to the database (<db dir>/db-backups/, newest 14 kept)
//      and, when configured, uploaded to the S3 bucket (db-backups/).
//
// tools/restore-db-backup.mjs turns a file back into a rocky.db.
import { createCipheriv, createHash, randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'
import { putObject, type BackupTarget } from '../chat/chatBackup'

/** File layout: "RKYDB1" | 12-byte IV | 16-byte tag | ciphertext (gzip of the .db). Unencrypted: "RKYDB0" | gzip. */
export const DB_MAGIC_SEALED = Buffer.from('RKYDB1')
export const DB_MAGIC_PLAIN = Buffer.from('RKYDB0')
const KEEP_LOCAL = 14

export interface GameBackupResult {
  day: string
  file: string | null
  bytes: number
  uploaded: boolean
  encrypted: boolean
  error?: string
}

export function sealDb(raw: Buffer, key: string | null): { body: Buffer; encrypted: boolean } {
  const gz = gzipSync(raw, { level: 9 })
  if (!key) return { body: Buffer.concat([DB_MAGIC_PLAIN, gz]), encrypted: false }
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', createHash('sha256').update(key).digest(), iv)
  const data = Buffer.concat([cipher.update(gz), cipher.final()])
  return { body: Buffer.concat([DB_MAGIC_SEALED, iv, cipher.getAuthTag(), data]), encrypted: true }
}

export const gameBackupDir = (target: BackupTarget) => (target.dir ? join(target.dir, '..', 'db-backups') : null)
const fileName = (day: string, encrypted: boolean) => `rocky-${day}.db.gz${encrypted ? '.enc' : ''}`

export function gameBackupExists(target: BackupTarget, day: string): boolean {
  const dir = gameBackupDir(target)
  return !!dir && (existsSync(join(dir, fileName(day, true))) || existsSync(join(dir, fileName(day, false))))
}

export async function writeGameBackup(snapshot: (file: string) => void, target: BackupTarget, day: string): Promise<GameBackupResult> {
  const tmp = join(tmpdir(), `rocky-snapshot-${process.pid}-${Date.now()}.db`)
  try {
    snapshot(tmp)
    const { body, encrypted } = sealDb(readFileSync(tmp), target.key)
    const result: GameBackupResult = { day, file: null, bytes: body.length, uploaded: false, encrypted }
    const dir = gameBackupDir(target)
    if (dir) {
      mkdirSync(dir, { recursive: true })
      result.file = join(dir, fileName(day, encrypted))
      writeFileSync(result.file, body)
      // Keep the newest few on the volume; the bucket keeps the full history.
      const old = readdirSync(dir)
        .filter((f) => f.startsWith('rocky-') && f.includes('.db.gz'))
        .map((f) => ({ f, t: statSync(join(dir, f)).mtimeMs }))
        .sort((a, b) => b.t - a.t)
        .slice(KEEP_LOCAL)
      for (const { f } of old) rmSync(join(dir, f), { force: true })
    }
    if (target.s3) {
      try {
        await putObject(target.s3, `db-backups/${fileName(day, encrypted)}`, body, 'application/octet-stream')
        result.uploaded = true
      } catch (err) {
        result.error = err instanceof Error ? err.message : String(err)
      }
    }
    return result
  } finally {
    rmSync(tmp, { force: true })
  }
}
