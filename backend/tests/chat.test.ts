import { describe, expect, it } from 'vitest'
import request from 'supertest'
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createDecipheriv, createHash } from 'node:crypto'
import { createApp, type LiveContext } from '../src/app'
import { loadConfig } from '../src/config/env'
import { fixedClock, type Clock } from '../../src/engine/clock'
import { buildMemoryPersistence } from './testApp'
import { RULES_VERSION, sensitiveKinds } from '../src/application/chatApplicationService'
import type { BackupTarget } from '../src/infrastructure/chat/chatBackup'

const ANA = 'ana.perez@rlx.us'
const LUIS = 'luis.gomez@rlx.us'
const BEA = 'bea.ruiz@rlx.us'
const ADMIN = 'qa.lead@rlx.us'
const as = (email: string) => ({ 'X-Agent-Email': email })

function build(opts: { clock?: Clock; backupTarget?: BackupTarget } = {}) {
  const config = loadConfig({
    NODE_ENV: 'production',
    ROCKY_PERSISTENCE_DRIVER: 'sqlite',
    ROCKY_DB_PATH: '/tmp/rocky-chat-test.db',
    ROCKY_AUTH_MODE: 'pilot-header',
    ROCKY_ADMIN_EMAILS: ADMIN,
  })
  const app = createApp({
    config,
    persistence: buildMemoryPersistence(),
    clock: opts.clock ?? fixedClock('2026-09-08T12:00:00.000Z'),
    backupTarget: opts.backupTarget ?? { dir: null, key: null, s3: null },
  })
  return { app, live: app.locals.live as LiveContext }
}

async function enroll(app: ReturnType<typeof build>['app'], ...emails: string[]) {
  for (const e of emails) {
    await request(app).get('/api/agent/me').set(as(e))
    await request(app).post('/api/chat/rules').set(as(e)).send({ version: RULES_VERSION })
  }
}

async function keyOf(app: ReturnType<typeof build>['app'], viewer: string, name: string) {
  const list = await request(app).get('/api/friends').set(as(viewer))
  return list.body.friends.find((f: { name: string }) => f.name === name).id as string
}

describe('chat rules', () => {
  it('requires accepting the current house rules before posting', async () => {
    const { app } = build()
    await request(app).get('/api/agent/me').set(as(ANA))
    const rules = await request(app).get('/api/chat/rules').set(as(ANA))
    expect(rules.body).toMatchObject({ version: RULES_VERSION, accepted: false, retentionDays: 90 })
    const blocked = await request(app).post('/api/chat/channels/general/messages').set(as(ANA)).send({ text: 'Hola equipo' })
    expect(blocked.status).toBe(403)
    expect(blocked.body.error.code).toBe('RULES_NOT_ACCEPTED')
    expect((await request(app).post('/api/chat/rules').set(as(ANA)).send({ version: 'old' })).status).toBe(422)
    const ok = await request(app).post('/api/chat/rules').set(as(ANA)).send({ version: RULES_VERSION })
    expect(ok.body.accepted).toBe(true)
    const sent = await request(app).post('/api/chat/channels/general/messages').set(as(ANA)).send({ text: 'Hola equipo' })
    expect(sent.status).toBe(201)
  })
})

describe('chat channels', () => {
  it('general reaches everyone; 1-to-1 stays between the two agents and never shows emails', async () => {
    const { app } = build()
    await enroll(app, ANA, LUIS, BEA)
    await request(app).post('/api/chat/channels/general/messages').set(as(ANA)).send({ text: '¡Buenos días!' })
    const general = await request(app).get('/api/chat/channels/general/messages').set(as(BEA))
    expect(general.body.messages.map((m: { body: string }) => m.body)).toEqual(['¡Buenos días!'])
    expect(general.body.messages[0].name).toBe('Ana Perez')

    const luisKey = await keyOf(app, ANA, 'Luis Gomez')
    const dm = await request(app).post('/api/chat/direct').set(as(ANA)).send({ friend: luisKey })
    expect(dm.body.kind).toBe('dm')
    expect(dm.body.title).toBe('Luis Gomez')
    await request(app).post(`/api/chat/channels/${dm.body.id}/messages`).set(as(ANA)).send({ text: '¿Almorzamos?' })

    const luisList = await request(app).get('/api/chat/channels').set(as(LUIS))
    const luisDm = luisList.body.channels.find((c: { kind: string }) => c.kind === 'dm')
    expect(luisDm.unread).toBe(1)
    expect(luisDm.title).toBe('Ana Perez')
    expect(JSON.stringify(luisList.body)).not.toContain('@')

    // Bea is not part of it (and neither are supervisors).
    expect((await request(app).get(`/api/chat/channels/${dm.body.id}/messages`).set(as(BEA))).status).toBe(404)
    expect((await request(app).post(`/api/chat/channels/${dm.body.id}/messages`).set(as(BEA)).send({ text: 'hi' })).status).toBe(404)
    expect((await request(app).get('/api/admin/chat/channels').set(as(BEA))).status).toBe(403)

    const read = await request(app).get(`/api/chat/channels/${dm.body.id}/messages`).set(as(LUIS))
    await request(app).post(`/api/chat/channels/${dm.body.id}/read`).set(as(LUIS)).send({ id: read.body.messages[0].id })
    const after = await request(app).get('/api/chat/channels').set(as(LUIS))
    expect(after.body.channels.find((c: { kind: string }) => c.kind === 'dm').unread).toBe(0)
  })

  it('home chat: only the host and agents visiting live can post', async () => {
    const { app, live } = build()
    await enroll(app, ANA, LUIS)
    const anaKey = await keyOf(app, LUIS, 'Ana Perez')
    expect((await request(app).post('/api/chat/visit').set(as(LUIS)).send({ host: anaKey })).status).toBe(403)
    live.bus.setRoomLookup((agent, host) => agent === LUIS && host === ANA)
    const room = await request(app).post('/api/chat/visit').set(as(LUIS)).send({ host: anaKey })
    expect(room.body.kind).toBe('visit')
    await request(app).post(`/api/chat/channels/${room.body.id}/messages`).set(as(LUIS)).send({ text: '¡Qué lindo tu Rocky!' })
    const host = await request(app).get('/api/chat/channels').set(as(ANA))
    expect(host.body.channels.find((c: { kind: string }) => c.kind === 'visit')).toMatchObject({ title: 'Visitors at my home', unread: 1 })
    live.bus.setRoomLookup(() => false)
    expect((await request(app).post(`/api/chat/channels/${room.body.id}/messages`).set(as(LUIS)).send({ text: 'bye' })).status).toBe(403)
  })

  it('pushes new messages to the live hub for every member', async () => {
    const { app, live } = build()
    await enroll(app, ANA, LUIS)
    const got: Array<{ to: string[]; t: string }> = []
    live.bus.subscribe((to, e) => got.push({ to, t: e.t }))
    const dm = await request(app).post('/api/chat/direct').set(as(ANA)).send({ friend: await keyOf(app, ANA, 'Luis Gomez') })
    await request(app).post(`/api/chat/channels/${dm.body.id}/messages`).set(as(ANA)).send({ text: 'ping' })
    expect(got.filter((g) => g.t === 'chat.message').flatMap((g) => g.to).sort()).toEqual([ANA, LUIS].sort())
  })
})

describe('chat safety', () => {
  it('spots customer data', () => {
    expect(sensitiveKinds('mi correo es juan@gmail.com')).toEqual(['email'])
    expect(sensitiveKinds('call 305-555-0142 please')).toEqual(['phone'])
    expect(sensitiveKinds('order #88231577 was late')).toContain('order number')
    expect(sensitiveKinds('ship to 1200 Main Street')).toEqual(['address'])
    expect(sensitiveKinds('Calle 72 # 45-10')).toContain('address')
    expect(sensitiveKinds('Great notes today, 3 of 4 done by 10:30!')).toEqual([])
  })

  it('holds back customer data until confirmed, then flags it for admins', async () => {
    const { app } = build()
    await enroll(app, ANA, ADMIN)
    const held = await request(app).post('/api/chat/channels/general/messages').set(as(ANA)).send({ text: 'Customer phone 3055550142' })
    expect(held.status).toBe(422)
    expect(held.body.error.code).toBe('SENSITIVE_DATA')
    const sent = await request(app).post('/api/chat/channels/general/messages').set(as(ANA)).send({ text: 'Customer phone 3055550142', confirm: true })
    expect(sent.status).toBe(201)
    const copy = await request(app).get('/api/admin/chat/channels/general').set(as(ADMIN))
    expect(copy.body.messages[0]).toMatchObject({ email: ANA, flagged: true })
  })

  it('rate-limits, reports, hides and pauses', async () => {
    const { app } = build()
    await enroll(app, ANA, LUIS, ADMIN)
    for (let i = 0; i < 20; i++) await request(app).post('/api/chat/channels/general/messages').set(as(ANA)).send({ text: `msg ${i}` })
    const fast = await request(app).post('/api/chat/channels/general/messages').set(as(ANA)).send({ text: 'one more' })
    expect(fast.status).toBe(429)

    const bad = await request(app).post('/api/chat/channels/general/messages').set(as(LUIS)).send({ text: 'something rude' })
    await request(app).post(`/api/chat/messages/${bad.body.id}/report`).set(as(ANA)).send({ reason: 'rude' })
    const reports = await request(app).get('/api/admin/chat/reports').set(as(ADMIN))
    expect(reports.body.reports[0]).toMatchObject({ reason: 'rude', message: { email: LUIS, body: 'something rude' } })
    await request(app).post(`/api/admin/chat/reports/${reports.body.reports[0].id}`).set(as(ADMIN)).send({ action: 'hide' })
    const general = await request(app).get('/api/chat/channels/general/messages').set(as(ANA))
    expect(general.body.messages.at(-1)).toMatchObject({ hidden: true, body: '' })
    expect((await request(app).get('/api/admin/chat/reports').set(as(ADMIN))).body.reports).toHaveLength(0)

    await request(app).post('/api/admin/chat/mute').set(as(ADMIN)).send({ email: LUIS, hours: 24, reason: 'rules' })
    const muted = await request(app).post('/api/chat/channels/general/messages').set(as(LUIS)).send({ text: 'hello?' })
    expect(muted.status).toBe(403)
    expect(muted.body.error.code).toBe('MUTED')
    await request(app).post('/api/admin/chat/mute').set(as(ADMIN)).send({ email: LUIS, hours: 0 })
    expect((await request(app).post('/api/chat/channels/general/messages').set(as(LUIS)).send({ text: 'back' })).status).toBe(201)
  })
})

describe('admin copy, retention and backups', () => {
  it('admins read every conversation; each read and export is audited', async () => {
    const { app, live } = build()
    await enroll(app, ANA, LUIS, ADMIN)
    const dm = await request(app).post('/api/chat/direct').set(as(ANA)).send({ friend: await keyOf(app, ANA, 'Luis Gomez') })
    await request(app).post(`/api/chat/channels/${dm.body.id}/messages`).set(as(ANA)).send({ text: 'private-ish' })
    const channels = await request(app).get('/api/admin/chat/channels').set(as(ADMIN))
    const c = channels.body.channels.find((x: { kind: string }) => x.kind === 'dm')
    expect(c.members.map((m: { email: string }) => m.email).sort()).toEqual([ANA, LUIS].sort())
    const read = await request(app).get(`/api/admin/chat/channels/${c.id}`).set(as(ADMIN))
    expect(read.body.messages[0]).toMatchObject({ email: ANA, body: 'private-ish' })
    const exp = await request(app).get('/api/admin/chat/export?from=2026-09-08&to=2026-09-08').set(as(ADMIN))
    expect(exp.body.messages).toHaveLength(1)
    const actions = live.persistence.accounts.listAudit(null, 50).map((a) => a.action)
    expect(actions).toEqual(expect.arrayContaining(['chat.admin.read', 'chat.admin.export', 'chat.rules.accepted']))
  })

  it('deletes messages after 90 days', async () => {
    let now = new Date('2026-09-08T12:00:00.000Z')
    const clock: Clock = { now: () => now } as Clock
    const { app, live } = build({ clock })
    await enroll(app, ANA)
    await request(app).post('/api/chat/channels/general/messages').set(as(ANA)).send({ text: 'old news' })
    now = new Date('2026-12-06T12:00:00.000Z') // 89 days later
    expect(live.chat.purge()).toBe(0)
    now = new Date('2026-12-08T12:00:00.000Z') // 91 days later
    expect(live.chat.purge()).toBe(1)
    expect((await request(app).get('/api/chat/channels/general/messages').set(as(ANA))).body.messages).toHaveLength(0)
  })

  it('writes an encrypted daily backup that the key can open', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'rocky-chat-backup-'))
    try {
      const { app, live } = build({ backupTarget: { dir, key: 'test-secret-key', s3: null } })
      await enroll(app, ANA)
      await request(app).post('/api/chat/channels/general/messages').set(as(ANA)).send({ text: 'backed up' })
      const day = new Date('2026-09-08T12:00:00.000Z')
      const dayKey = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`
      const res = await live.jobs.backupDay(dayKey)
      expect(res).toMatchObject({ count: 1, encrypted: true })
      const file = readdirSync(dir)[0]!
      expect(file).toBe(`chat-${dayKey}.enc.json`)
      const sealed = JSON.parse(readFileSync(join(dir, file), 'utf8'))
      expect(JSON.stringify(sealed)).not.toContain('backed up')
      const decipher = createDecipheriv('aes-256-gcm', createHash('sha256').update('test-secret-key').digest(), Buffer.from(sealed.iv, 'base64'))
      decipher.setAuthTag(Buffer.from(sealed.tag, 'base64'))
      const plain = Buffer.concat([decipher.update(Buffer.from(sealed.data, 'base64')), decipher.final()]).toString('utf8')
      expect(JSON.parse(plain).messages[0]).toMatchObject({ email: ANA, body: 'backed up' })
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
