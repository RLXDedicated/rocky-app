import { describe, expect, it } from 'vitest'
import request from 'supertest'
import { createApp } from '../src/app'
import { loadConfig } from '../src/config/env'
import { fixedClock } from '../../src/engine/clock'
import { buildMemoryPersistence, buildSqlitePersistence, tempSqlitePath } from './testApp'
import { getAppliedMigrations } from '../src/infrastructure/persistence/migrations'
import { RULES_VERSION } from '../src/application/chatApplicationService'
import { moodForScore } from '../src/application/peopleApplicationService'

const ADMIN = 'qa.lead@rlx.us'
const LEADER = 'mcantillo@rlx.us'
const QA = 'madiaz@rlx.us'
const A = 'ana.perez@rlx.us'
const B = 'luis.gomez@rlx.us'
const as = (email: string) => ({ 'X-Agent-Email': email })

function build() {
  const config = loadConfig({
    NODE_ENV: 'production',
    ROCKY_PERSISTENCE_DRIVER: 'sqlite',
    ROCKY_DB_PATH: '/tmp/rocky-people-test.db',
    ROCKY_AUTH_MODE: 'pilot-header',
    ROCKY_ADMIN_EMAILS: ADMIN,
  })
  return createApp({ config, persistence: buildMemoryPersistence(), clock: fixedClock('2026-09-08T12:00:00.000Z'), backupTarget: { dir: null, key: null, s3: null } })
}

describe('titles', () => {
  it('seeds the pilot leader and QA analysts in the database', () => {
    const tmp = tempSqlitePath()
    try {
      const p = buildSqlitePersistence(tmp.path)
      expect(p.accounts.getTitles()).toMatchObject({ [LEADER]: 'leader', [QA]: 'qa', 'kcolina@rlx.us': 'qa', 'apereira@rlx.us': 'qa' })
      p.close()
    } finally {
      tmp.cleanup()
    }
  })

  it('shows titles next to names but grants no admin access', async () => {
    const app = build()
    for (const e of [QA, A]) await request(app).get('/api/agent/me').set(as(e))
    const friends = await request(app).get('/api/friends').set(as(A))
    expect(friends.body.friends.find((f: { name: string }) => f.name === 'Madiaz')).toMatchObject({ title: 'qa' })
    expect((await request(app).get('/api/me/role').set(as(QA))).body).toMatchObject({ title: 'qa', admin: false, team: null })
    expect((await request(app).get('/api/admin/agents').set(as(QA))).status).toBe(403)
    expect((await request(app).get('/api/admin/chat/channels').set(as(QA))).status).toBe(403)
    await request(app).post('/api/chat/rules').set(as(QA)).send({ version: RULES_VERSION })
    const msg = await request(app).post('/api/chat/channels/general/messages').set(as(QA)).send({ text: 'hola' })
    expect(msg.body.title).toBe('qa')
  })
})

describe('teams', () => {
  it('admins build a team; the leader sees it and her Rocky follows the team spirit', async () => {
    const app = build()
    for (const e of [LEADER, A, B, ADMIN]) await request(app).get('/api/agent/me').set(as(e))
    // Only admins manage people.
    expect((await request(app).put(`/api/admin/people/${A}`).set(as(LEADER)).send({ leader: LEADER })).status).toBe(403)
    await request(app).put(`/api/admin/people/${A}`).set(as(ADMIN)).send({ leader: LEADER })
    await request(app).put(`/api/admin/people/${B}`).set(as(ADMIN)).send({ leader: LEADER })
    expect((await request(app).put(`/api/admin/people/${B}`).set(as(ADMIN)).send({ leader: A })).status).toBe(422)

    // Nobody checked in yet: low spirit.
    let team = await request(app).get('/api/my-team').set(as(LEADER))
    expect(team.body.members).toHaveLength(2)
    expect(team.body.spirit).toMatchObject({ checkedIn: 0, total: 2 })
    const low = team.body.spirit.score as number

    await request(app).post('/api/events/check-in').set(as(A)).send({})
    await request(app).post('/api/events/check-in').set(as(B)).send({})
    team = await request(app).get('/api/my-team').set(as(LEADER))
    expect(team.body.spirit.checkedIn).toBe(2)
    expect(team.body.spirit.score).toBeGreaterThan(low)
    expect(team.body.members[0]).toMatchObject({ checkedInToday: true })
    expect(JSON.stringify(team.body)).not.toContain('@')

    const me = await request(app).get('/api/me/role').set(as(LEADER))
    expect(me.body).toMatchObject({ title: 'leader', team: { total: 2, checkedIn: 2 } })
    // Friends see the leader's Rocky in the team's mood.
    const friends = await request(app).get('/api/friends').set(as(A))
    expect(friends.body.friends.find((f: { title: string | null }) => f.title === 'leader').mood).toBe(moodForScore(team.body.spirit.score))

    // Agents have no team view; members see who their leader is.
    expect((await request(app).get('/api/my-team').set(as(A))).status).toBe(403)
    expect((await request(app).get('/api/me/role').set(as(A))).body.leader).toMatchObject({ name: 'Mcantillo' })
  })

  it('maps spirit to mood', () => {
    expect([90, 60, 40, 10].map(moodForScore)).toEqual(['Happy', 'Motivated', 'Worried', 'Recovery'])
  })
})

describe('migrations', () => {
  it('applies the people migration', () => {
    const tmp = tempSqlitePath()
    try {
      const p = buildSqlitePersistence(tmp.path)
      expect(getAppliedMigrations((p.repoStore as unknown as { connection: import('node:sqlite').DatabaseSync }).connection).map((m) => m.version)).toContain(6)
      p.close()
    } finally {
      tmp.cleanup()
    }
  })
})
