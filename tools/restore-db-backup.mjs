// Turns a game backup (rocky-YYYY-MM-DD.db.gz.enc from the volume or the
// bucket) back into a SQLite database file.
//
//   ROCKY_CHAT_BACKUP_KEY=... node tools/restore-db-backup.mjs rocky-2026-09-30.db.gz.enc rocky.db
//
// To restore production: stop the service, put the file on the volume as
// ROCKY_DB_PATH (keep the old one aside), start it again.
import { createDecipheriv, createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'

const [input, output = 'rocky-restored.db'] = process.argv.slice(2)
if (!input) {
  console.error('usage: node tools/restore-db-backup.mjs <backup file> [output.db]')
  process.exit(1)
}
const buf = readFileSync(input)
const magic = buf.subarray(0, 6).toString()
let gz
if (magic === 'RKYDB0') gz = buf.subarray(6)
else if (magic === 'RKYDB1') {
  const key = process.env.ROCKY_CHAT_BACKUP_KEY
  if (!key) {
    console.error('Set ROCKY_CHAT_BACKUP_KEY (the same value as in Railway) to decrypt this backup.')
    process.exit(1)
  }
  const d = createDecipheriv('aes-256-gcm', createHash('sha256').update(key).digest(), buf.subarray(6, 18))
  d.setAuthTag(buf.subarray(18, 34))
  gz = Buffer.concat([d.update(buf.subarray(34)), d.final()])
} else {
  console.error('This is not a Rocky game backup.')
  process.exit(1)
}
writeFileSync(output, gunzipSync(gz))
console.log(`Restored ${output}`)
