import { afterEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import { fixedClock } from '../../src/engine/clock'
import { createApp } from '../src/app'
import { AGENT_HEADER, ROLE_HEADER, buildSqlitePersistence, tempSqlitePath } from './testApp'

const CLOCK = fixedClock('2026-09-08T12:00:00.000Z')
const QA_HEADERS = { [AGENT_HEADER]: 'qa-reviewer', [ROLE_HEADER]: 'QA' } as const

describe('Durability — SQLite survives restart (Phase 13 §B/§17)', () => {
  let cleanup: () => void

  afterEach(() => {
    cleanup?.()
  })

  it('a Check-in persists across closing and reopening the database (simulated restart)', async () => {
    const temp = tempSqlitePath()
    cleanup = temp.cleanup

    // "Before restart": open the durable store, check in, close it.
    const before = buildSqlitePersistence(temp.path)
    const appBefore = createApp({ clock: CLOCK, persistence: before })
    const checkIn = await request(appBefore).post('/api/events/check-in').set(AGENT_HEADER, 'agent-durable').send({})
    expect(checkIn.status).toBe(200)
    expect(checkIn.body.state.xp).toBe(35)
    before.close()

    // "After restart": brand-new persistence object, same file path, no
    // in-process state carried over — this IS recreating the Repository
    // object and Application Services from scratch, per Phase 13's DoD.
    const after = buildSqlitePersistence(temp.path)
    const appAfter = createApp({ clock: CLOCK, persistence: after })
    const state = await request(appAfter).get('/api/game-state').set(AGENT_HEADER, 'agent-durable')

    expect(state.status).toBe(200)
    expect(state.body).toEqual(checkIn.body.state)
    expect(state.body.xp).toBe(35)
    after.close()
  })

  it('events, achievements, and reminders all survive restart, not just the GameState cache', async () => {
    const temp = tempSqlitePath()
    cleanup = temp.cleanup

    const before = buildSqlitePersistence(temp.path)
    const appBefore = createApp({ clock: CLOCK, persistence: before })
    await request(appBefore).post('/api/events/check-in').set(AGENT_HEADER, 'agent-full').send({})
    before.close()

    const after = buildSqlitePersistence(temp.path)
    const appAfter = createApp({ clock: CLOCK, persistence: after })
    const achievements = await request(appAfter).get('/api/achievements').set(AGENT_HEADER, 'agent-full')
    const gameState = await request(appAfter).get('/api/game-state').set(AGENT_HEADER, 'agent-full')

    expect(achievements.body.unlocked).toHaveLength(1)
    expect(achievements.body.unlocked[0].id).toBe('first_step')
    expect(gameState.body.currentStreak).toBe(1)
    after.close()
  })

  it('a durable Idempotency-Key survives restart — a retried QA Pass after reopening does not double-grant', async () => {
    const temp = tempSqlitePath()
    cleanup = temp.cleanup

    const before = buildSqlitePersistence(temp.path)
    const appBefore = createApp({ clock: CLOCK, persistence: before })
    const first = await request(appBefore)
      .post('/api/events/qa-pass')
      .set(QA_HEADERS)
      .set('Idempotency-Key', 'durable-audit-1')
      .send({ agentId: 'agent-idem-restart', auditDate: '2026-09-08' })
    expect(first.body.state.xp).toBe(50)
    before.close()

    const after = buildSqlitePersistence(temp.path)
    const appAfter = createApp({ clock: CLOCK, persistence: after })
    const retried = await request(appAfter)
      .post('/api/events/qa-pass')
      .set(QA_HEADERS)
      .set('Idempotency-Key', 'durable-audit-1')
      .send({ agentId: 'agent-idem-restart', auditDate: '2026-09-08' })

    expect(retried.status).toBe(200)
    expect(retried.body).toEqual(first.body) // exact cached response, not re-executed
    expect(retried.body.state.xp).toBe(50) // NOT 75 — proves it wasn't re-run

    const finalState = await request(appAfter).get('/api/game-state').set(AGENT_HEADER, 'agent-idem-restart')
    expect(finalState.body.xp).toBe(50)
    after.close()
  })

  it('a Correction remains consistent across restart', async () => {
    const temp = tempSqlitePath()
    cleanup = temp.cleanup

    const before = buildSqlitePersistence(temp.path)
    const appBefore = createApp({ clock: CLOCK, persistence: before })
    const qaPass = await request(appBefore)
      .post('/api/events/qa-pass')
      .set(QA_HEADERS)
      .send({ agentId: 'agent-correction-restart', auditDate: '2026-09-08' })
    const originalEventId = qaPass.body.events.find((e: { type: string }) => e.type === 'QA_PASS').id

    const corrected = await request(appBefore)
      .post('/api/events/correction')
      .set(QA_HEADERS)
      .send({ agentId: 'agent-correction-restart', originalEventId, correctedTo: 'ALERT' })
    expect(corrected.status).toBe(200)
    before.close()

    const after = buildSqlitePersistence(temp.path)
    const appAfter = createApp({ clock: CLOCK, persistence: after })
    const state = await request(appAfter).get('/api/game-state').set(AGENT_HEADER, 'agent-correction-restart')

    expect(state.body).toEqual(corrected.body.state)
    expect(state.body.currentStreak).toBe(0) // the (corrected-to-)Alert's effect, still in place after restart
    after.close()
  })

  it('the database file itself persists on disk between opens (sanity check on the mechanism, not just the API)', async () => {
    const temp = tempSqlitePath()
    cleanup = temp.cleanup
    const { existsSync } = await import('node:fs')

    expect(existsSync(temp.path)).toBe(false)
    const store = buildSqlitePersistence(temp.path)
    expect(existsSync(temp.path)).toBe(true)
    store.close()
    expect(existsSync(temp.path)).toBe(true) // still there after close
  })
})
