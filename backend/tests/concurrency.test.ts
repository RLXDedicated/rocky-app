import { describe, expect, it } from 'vitest'
import request from 'supertest'
import { AGENT_HEADER, ROLE_HEADER, buildSqlitePersistence, tempSqlitePath } from './testApp'
import { createApp } from '../src/app'
import { fixedClock } from '../../src/engine/clock'

const QA_HEADERS = { [AGENT_HEADER]: 'qa-reviewer', [ROLE_HEADER]: 'QA' } as const
const CLOCK = fixedClock('2026-09-08T12:00:00.000Z')

// These tests exercise "concurrent" HTTP requests via Promise.all against
// the real SQLite-backed app. The guarantee they confirm, and its scope,
// is documented in docs/PERSISTENCE_FOUNDATION.md §Concurrency: this
// backend's route handlers are fully synchronous (no `await` between
// reading and writing state), and Node's single-threaded event loop never
// interleaves two synchronous callbacks — so two "concurrent" requests
// from a test's point of view are still processed one-at-a-time by the
// server, in whatever order the runtime happens to schedule their
// callbacks. That serialization is what makes the outcomes below
// deterministic locally; a real multi-process/multi-instance production
// deployment would need its own concurrency story (see that doc).
describe('Concurrency (Phase 13 §11)', () => {
  it('two concurrent Check-ins for the same agent never double-grant (same-day guard)', async () => {
    const temp = tempSqlitePath()
    const persistence = buildSqlitePersistence(temp.path)
    const app = createApp({ clock: CLOCK, persistence })

    const [a, b] = await Promise.all([
      request(app).post('/api/events/check-in').set(AGENT_HEADER, 'agent-concurrent-checkin').send({}),
      request(app).post('/api/events/check-in').set(AGENT_HEADER, 'agent-concurrent-checkin').send({}),
    ])

    const results = [a.body, b.body]
    const executed = results.filter((r) => r.alreadyCheckedInToday === false)
    const noOps = results.filter((r) => r.alreadyCheckedInToday === true)
    expect(executed).toHaveLength(1) // exactly one of the two actually ran
    expect(noOps).toHaveLength(1)

    const finalState = await request(app).get('/api/game-state').set(AGENT_HEADER, 'agent-concurrent-checkin')
    expect(finalState.body.xp).toBe(35) // reward granted exactly once
    expect(finalState.body.currentStreak).toBe(1) // streak incremented exactly once

    persistence.close()
    temp.cleanup()
  })

  it('two concurrent QA Passes with the SAME Idempotency-Key never double-grant', async () => {
    const temp = tempSqlitePath()
    const persistence = buildSqlitePersistence(temp.path)
    const app = createApp({ clock: CLOCK, persistence })

    const body = { agentId: 'agent-concurrent-qa', auditDate: '2026-09-08' }
    const [a, b] = await Promise.all([
      request(app).post('/api/events/qa-pass').set(QA_HEADERS).set('Idempotency-Key', 'concurrent-audit').send(body),
      request(app).post('/api/events/qa-pass').set(QA_HEADERS).set('Idempotency-Key', 'concurrent-audit').send(body),
    ])

    expect(a.body).toEqual(b.body) // identical response either way

    const finalState = await request(app).get('/api/game-state').set(AGENT_HEADER, 'agent-concurrent-qa')
    expect(finalState.body.xp).toBe(50) // NOT 100 — granted exactly once
    expect(finalState.body.energy).toBe(80) // NOT 90

    persistence.close()
    temp.cleanup()
  })

  it('concurrent Documentation Alerts still respect the daily Energy-loss cap', async () => {
    const temp = tempSqlitePath()
    const persistence = buildSqlitePersistence(temp.path)
    const app = createApp({ clock: CLOCK, persistence })
    const agentId = 'agent-concurrent-alert'

    // Three concurrent Alerts, no idempotency key (three genuinely
    // distinct audits) — the daily cap (GAME_CONFIG.energy.dailyAlertCap =
    // 40) must still hold regardless of submission order, exactly as it
    // already does for sequential calls (DOMAIN_RULES.md §Energy).
    await Promise.all(
      [1, 2, 3].map(() =>
        request(app).post('/api/events/documentation-alert').set(QA_HEADERS).send({ agentId, auditDate: '2026-09-08' }),
      ),
    )

    const finalState = await request(app).get('/api/game-state').set(AGENT_HEADER, agentId)
    // 70 (initial) - 40 (daily cap) = 30, never lower no matter how many
    // Alerts landed the same day or in what order.
    expect(finalState.body.energy).toBe(30)

    persistence.close()
    temp.cleanup()
  })

  it('concurrent requests for two DIFFERENT agents never interfere with each other', async () => {
    const temp = tempSqlitePath()
    const persistence = buildSqlitePersistence(temp.path)
    const app = createApp({ clock: CLOCK, persistence })

    await Promise.all([
      request(app).post('/api/events/check-in').set(AGENT_HEADER, 'agent-concurrent-a').send({}),
      request(app).post('/api/events/check-in').set(AGENT_HEADER, 'agent-concurrent-b').send({}),
    ])

    const stateA = await request(app).get('/api/game-state').set(AGENT_HEADER, 'agent-concurrent-a')
    const stateB = await request(app).get('/api/game-state').set(AGENT_HEADER, 'agent-concurrent-b')
    expect(stateA.body.xp).toBe(35)
    expect(stateB.body.xp).toBe(35)

    persistence.close()
    temp.cleanup()
  })
})
