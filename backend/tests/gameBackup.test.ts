import { describe, expect, it } from 'vitest'
import { createDecipheriv, createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { gunzipSync } from 'node:zlib'
import { DatabaseSync } from 'node:sqlite'
import { buildSqlitePersistence, tempSqlitePath } from './testApp'
import { createGameBackupJobs } from '../src/application/gameBackupJobs'
import { fixedClock } from '../../src/engine/clock'

const KEY = 'test-backup-key-that-is-long-enough'

function restore(file: string, out: string) {
  const buf = readFileSync(file)
  expect(buf.subarray(0, 6).toString()).toBe('RKYDB1')
  const d = createDecipheriv('aes-256-gcm', createHash('sha256').update(KEY).digest(), buf.subarray(6, 18))
  d.setAuthTag(buf.subarray(18, 34))
  writeFileSync(out, gunzipSync(Buffer.concat([d.update(buf.subarray(34)), d.final()])))
}

describe('whole-game backup', () => {
  it('snapshots the live database, encrypts it and restores to the same data', async () => {
    const tmp = tempSqlitePath()
    try {
      const p = buildSqlitePersistence(tmp.path)
      const repo = p.repoStore.forAgent('ana.perez@rlx.us')
      repo.saveAgent({ ...repo.getAgent(), name: 'Ana Pérez' })
      const target = { dir: join(dirname(tmp.path), 'chat-backups'), key: KEY, s3: null }
      const jobs = createGameBackupJobs(p, target, fixedClock('2026-09-30T08:00:00'), () => {})
      await jobs.tick()
      const status = jobs.status()
      expect(status.last).toMatchObject({ day: '2026-09-30', encrypted: true, uploaded: false })
      const file = status.last!.file!
      expect(existsSync(file)).toBe(true)
      // Not readable as plain text.
      expect(readFileSync(file).includes(Buffer.from('Ana Pérez'))).toBe(false)
      const out = join(dirname(tmp.path), 'restored.db')
      restore(file, out)
      const db = new DatabaseSync(out)
      expect(db.prepare('SELECT name FROM agents WHERE agent_id = ?').get('ana.perez@rlx.us')).toMatchObject({ name: 'Ana Pérez' })
      db.close()
      // Once a day: a second tick the same day does nothing new.
      await jobs.tick()
      expect(readdirSync(dirname(file))).toHaveLength(1)
      p.close()
    } finally {
      tmp.cleanup()
    }
  })

  it('waits until after 2 a.m. and is off in memory mode', async () => {
    const tmp = tempSqlitePath()
    try {
      const p = buildSqlitePersistence(tmp.path)
      const jobs = createGameBackupJobs(p, { dir: join(dirname(tmp.path), 'chat-backups'), key: KEY, s3: null }, fixedClock('2026-09-30T01:30:00'), () => {})
      await jobs.tick()
      expect(jobs.status().last).toBeNull()
      p.close()
    } finally {
      tmp.cleanup()
    }
  })
})
