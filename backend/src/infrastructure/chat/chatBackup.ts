// Daily backup of the chat for the admins' quality-control copy.
//
// Each night the previous day's messages (hidden and flagged ones included)
// are written as one encrypted file:
//   1. next to the database on the volume (<db dir>/chat-backups/), and
//   2. when configured, to an S3-compatible bucket (a Railway Storage
//      Bucket), so the copy does not depend on a single disk.
// Encryption is AES-256-GCM with ROCKY_CHAT_BACKUP_KEY (any long secret;
// it is hashed to a 256-bit key). tools/decrypt-chat-backup.mjs reads it.
import { createCipheriv, createHash, createHmac, randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

export interface BackupTarget {
  /** Directory on the volume; null disables local files (in-memory runs). */
  dir: string | null
  key: string | null
  s3: S3Config | null
}

export interface S3Config {
  endpoint: string
  bucket: string
  region: string
  accessKeyId: string
  secretAccessKey: string
  pathStyle: boolean
}

export function backupTargetFromEnv(env: NodeJS.ProcessEnv, dbPath: string | null): BackupTarget {
  const s3 =
    env.ROCKY_BACKUP_S3_ENDPOINT && env.ROCKY_BACKUP_S3_BUCKET && env.ROCKY_BACKUP_S3_ACCESS_KEY_ID && env.ROCKY_BACKUP_S3_SECRET_ACCESS_KEY
      ? {
          endpoint: env.ROCKY_BACKUP_S3_ENDPOINT.replace(/\/+$/, ''),
          bucket: env.ROCKY_BACKUP_S3_BUCKET,
          region: env.ROCKY_BACKUP_S3_REGION || 'auto',
          accessKeyId: env.ROCKY_BACKUP_S3_ACCESS_KEY_ID,
          secretAccessKey: env.ROCKY_BACKUP_S3_SECRET_ACCESS_KEY,
          pathStyle: env.ROCKY_BACKUP_S3_PATH_STYLE === 'true',
        }
      : null
  return {
    dir: dbPath && dbPath !== ':memory:' ? join(dirname(dbPath), 'chat-backups') : null,
    key: env.ROCKY_CHAT_BACKUP_KEY || null,
    s3,
  }
}

/** Encrypts a JSON payload; without a key the file is written as plain JSON (it lives next to the database anyway). */
export function sealBackup(payload: unknown, key: string | null): { body: string; encrypted: boolean } {
  const plain = JSON.stringify(payload)
  if (!key) return { body: plain, encrypted: false }
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', createHash('sha256').update(key).digest(), iv)
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  return {
    body: JSON.stringify({
      v: 1,
      alg: 'aes-256-gcm',
      iv: iv.toString('base64'),
      tag: cipher.getAuthTag().toString('base64'),
      data: data.toString('base64'),
    }),
    encrypted: true,
  }
}

export interface BackupResult {
  file: string | null
  uploaded: boolean
  encrypted: boolean
  count: number
  error?: string
}

export async function writeBackup(target: BackupTarget, day: string, payload: { messages: unknown[] }): Promise<BackupResult> {
  const { body, encrypted } = sealBackup(payload, target.key)
  const name = `chat-${day}.${encrypted ? 'enc.json' : 'json'}`
  const result: BackupResult = { file: null, uploaded: false, encrypted, count: payload.messages.length }
  if (target.dir) {
    mkdirSync(target.dir, { recursive: true })
    result.file = join(target.dir, name)
    writeFileSync(result.file, body)
  }
  if (target.s3) {
    try {
      await putObject(target.s3, `chat-backups/${name}`, body)
      result.uploaded = true
    } catch (err) {
      result.error = err instanceof Error ? err.message : String(err)
    }
  }
  return result
}

export function backupExists(target: BackupTarget, day: string): boolean {
  if (!target.dir) return false
  return existsSync(join(target.dir, `chat-${day}.enc.json`)) || existsSync(join(target.dir, `chat-${day}.json`))
}

// --- Minimal AWS Signature V4 PUT (no SDK dependency for one call). ---
const sha256 = (data: string | Buffer) => createHash('sha256').update(data).digest('hex')
const hmac = (key: Buffer | string, data: string) => createHmac('sha256', key).update(data).digest()

export async function putObject(s3: S3Config, key: string, body: string): Promise<void> {
  const endpoint = new URL(s3.endpoint)
  const host = s3.pathStyle ? endpoint.host : `${s3.bucket}.${endpoint.host}`
  const path = `${s3.pathStyle ? `/${s3.bucket}` : ''}/${key.split('/').map(encodeURIComponent).join('/')}`
  const now = new Date()
  const amzDate = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const dateStamp = amzDate.slice(0, 8)
  const payloadHash = sha256(body)
  const headers: Record<string, string> = {
    host,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate,
    'content-type': 'application/json',
  }
  const signedHeaders = Object.keys(headers).sort().join(';')
  const canonical = [
    'PUT',
    path,
    '',
    ...Object.keys(headers)
      .sort()
      .map((h) => `${h}:${headers[h]}`),
    '',
    signedHeaders,
    payloadHash,
  ].join('\n')
  const scope = `${dateStamp}/${s3.region}/s3/aws4_request`
  const toSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256(canonical)].join('\n')
  const kDate = hmac(`AWS4${s3.secretAccessKey}`, dateStamp)
  const kSigning = hmac(hmac(hmac(kDate, s3.region), 's3'), 'aws4_request')
  const signature = createHmac('sha256', kSigning).update(toSign).digest('hex')
  const res = await fetch(`${endpoint.protocol}//${host}${path}`, {
    method: 'PUT',
    headers: {
      ...headers,
      authorization: `AWS4-HMAC-SHA256 Credential=${s3.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    },
    body,
  })
  if (!res.ok) throw new Error(`Bucket upload failed: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`)
}
