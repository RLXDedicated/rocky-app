import { afterEach, describe, expect, it } from 'vitest'
import { SqliteRepositoryStore } from '../src/infrastructure/persistence/sqliteRepository'
import { RepositoryConflictError } from '../src/infrastructure/repositories/conflictGuard'
import { getAppliedMigrations, MIGRATIONS } from '../src/infrastructure/persistence/migrations'
import type { GameEvent } from '../../src/types/domain'
import { tempSqlitePath } from './testApp'

describe('SqliteRepositoryStore — direct repository-level tests (Phase 13 §17.A)', () => {
  let cleanup: () => void
  afterEach(() => cleanup?.())

  it('save/read agent', () => {
    const temp = tempSqlitePath()
    cleanup = temp.cleanup
    const store = new SqliteRepositoryStore(temp.path)
    const repo = store.forAgent('agent-1')

    repo.saveAgent({ id: 'agent-1', name: 'Alice', rockyName: "Alice's Rocky" })
    expect(repo.getAgent()).toEqual({ id: 'agent-1', name: 'Alice', rockyName: "Alice's Rocky" })
    store.close()
  })

  it('save/read game state, including all documented fields', () => {
    const temp = tempSqlitePath()
    cleanup = temp.cleanup
    const store = new SqliteRepositoryStore(temp.path)
    const repo = store.forAgent('agent-1')

    const state = {
      xp: 100,
      level: 2,
      energy: 80,
      mood: 'Happy' as const,
      evolutionStage: 'Baby' as const,
      currentStreak: 3,
      bestStreak: 5,
      lastCheckInDate: '2026-09-08',
      lastAlertAt: null,
      lastPositiveActionAt: '2026-09-08T12:00:00.000Z',
      lastActivityLabel: 'Checked in',
      lastActivityAt: '2026-09-08T12:00:00.000Z',
    }
    repo.saveGameState(state)
    expect(repo.getGameState()).toEqual(state)
    store.close()
  })

  it('save/read events, including payload round-tripping', () => {
    const temp = tempSqlitePath()
    cleanup = temp.cleanup
    const store = new SqliteRepositoryStore(temp.path)
    const repo = store.forAgent('agent-1')

    const event: GameEvent = {
      id: 'evt_1',
      type: 'CHECK_IN',
      agentId: 'agent-1',
      date: '2026-09-08',
      timestamp: '2026-09-08T12:00:00.000Z',
      payload: { xpGained: 10, energyGained: 5, streak: 1 },
    }
    repo.saveEvent(event)
    expect(repo.getEvents()).toEqual([event])
    store.close()
  })

  it('save/read achievements', () => {
    const temp = tempSqlitePath()
    cleanup = temp.cleanup
    const store = new SqliteRepositoryStore(temp.path)
    const repo = store.forAgent('agent-1')

    const achievement = { id: 'first_step', name: 'First Step', description: 'desc', unlockedAt: '2026-09-08T12:00:00.000Z' }
    repo.saveAchievement(achievement)
    expect(repo.getAchievements()).toEqual([achievement])
    store.close()
  })

  it('save/read reminders, including status lifecycle and terminal-status protection', () => {
    const temp = tempSqlitePath()
    cleanup = temp.cleanup
    const store = new SqliteRepositoryStore(temp.path)
    const repo = store.forAgent('agent-1')

    repo.saveReminder({ id: 'rem_1', category: 'Streak', message: 'msg', timestamp: '2026-09-08T12:00:00.000Z', status: 'sent', actionable: true })
    repo.updateReminderStatus('rem_1', 'dismissed')
    expect(repo.getReminders()[0]?.status).toBe('dismissed')

    repo.updateReminderStatus('rem_1', 'opened') // terminal status must not be downgraded
    expect(repo.getReminders()[0]?.status).toBe('dismissed')
    store.close()
  })

  it('a duplicate event id with IDENTICAL content is a silent idempotent no-op', () => {
    const temp = tempSqlitePath()
    cleanup = temp.cleanup
    const store = new SqliteRepositoryStore(temp.path)
    const repo = store.forAgent('agent-1')

    const event: GameEvent = { id: 'evt_dup', type: 'CHECK_IN', agentId: 'agent-1', date: '2026-09-08', timestamp: '2026-09-08T12:00:00.000Z' }
    repo.saveEvent(event)
    expect(() => repo.saveEvent({ ...event })).not.toThrow()
    expect(repo.getEvents()).toHaveLength(1)
    store.close()
  })

  it('a duplicate event id with DIFFERENT content throws RepositoryConflictError, never silently overwrites', () => {
    const temp = tempSqlitePath()
    cleanup = temp.cleanup
    const store = new SqliteRepositoryStore(temp.path)
    const repo = store.forAgent('agent-1')

    const event: GameEvent = { id: 'evt_conflict', type: 'CHECK_IN', agentId: 'agent-1', date: '2026-09-08', timestamp: '2026-09-08T12:00:00.000Z' }
    repo.saveEvent(event)

    expect(() => repo.saveEvent({ ...event, date: '2026-09-09' })).toThrow(RepositoryConflictError)
    expect(repo.getEvents()[0]?.date).toBe('2026-09-08') // original untouched
    store.close()
  })

  it('multi-agent isolation at the repository level', () => {
    const temp = tempSqlitePath()
    cleanup = temp.cleanup
    const store = new SqliteRepositoryStore(temp.path)

    store.forAgent('agent-a').saveEvent({ id: 'evt_a', type: 'CHECK_IN', agentId: 'agent-a', date: '2026-09-08', timestamp: '2026-09-08T12:00:00.000Z' })

    expect(store.forAgent('agent-a').getEvents()).toHaveLength(1)
    expect(store.forAgent('agent-b').getEvents()).toHaveLength(0)
    store.close()
  })

  it('resetAll wipes exactly one agent, leaving others untouched', () => {
    const temp = tempSqlitePath()
    cleanup = temp.cleanup
    const store = new SqliteRepositoryStore(temp.path)
    store.forAgent('agent-a').saveEvent({ id: 'evt_a', type: 'CHECK_IN', agentId: 'agent-a', date: '2026-09-08', timestamp: '2026-09-08T12:00:00.000Z' })
    store.forAgent('agent-b').saveEvent({ id: 'evt_b', type: 'CHECK_IN', agentId: 'agent-b', date: '2026-09-08', timestamp: '2026-09-08T12:00:00.000Z' })

    store.forAgent('agent-a').resetAll()

    expect(store.forAgent('agent-a').getEvents()).toHaveLength(0)
    expect(store.forAgent('agent-b').getEvents()).toHaveLength(1)
    store.close()
  })

  it('withTransaction rolls back ALL writes when the callback throws (atomicity)', () => {
    const temp = tempSqlitePath()
    cleanup = temp.cleanup
    const store = new SqliteRepositoryStore(temp.path)

    expect(() =>
      store.withTransaction(() => {
        const repo = store.forAgent('agent-atomic')
        repo.saveEvent({ id: 'evt_atomic_1', type: 'CHECK_IN', agentId: 'agent-atomic', date: '2026-09-08', timestamp: '2026-09-08T12:00:00.000Z' })
        repo.saveGameState({ ...repo.getGameState(), xp: 999 })
        throw new Error('simulated failure mid-transaction')
      }),
    ).toThrow('simulated failure mid-transaction')

    // Neither the event nor the state change should have survived the rollback.
    const repo = store.forAgent('agent-atomic')
    expect(repo.getEvents()).toHaveLength(0)
    expect(repo.getGameState().xp).toBe(0)
    store.close()
  })

  it('withTransaction commits ALL writes together on success', () => {
    const temp = tempSqlitePath()
    cleanup = temp.cleanup
    const store = new SqliteRepositoryStore(temp.path)

    store.withTransaction(() => {
      const repo = store.forAgent('agent-commit')
      repo.saveEvent({ id: 'evt_commit_1', type: 'CHECK_IN', agentId: 'agent-commit', date: '2026-09-08', timestamp: '2026-09-08T12:00:00.000Z' })
      repo.saveGameState({ ...repo.getGameState(), xp: 42 })
    })

    const repo = store.forAgent('agent-commit')
    expect(repo.getEvents()).toHaveLength(1)
    expect(repo.getGameState().xp).toBe(42)
    store.close()
  })

  it('replay consistency: persisted GameState matches recalculateStateFromEvents(persisted events)', async () => {
    const { GameService } = await import('../src/domain/rockyEngine')
    const { recalculateStateFromEvents: replay } = await import('../src/domain/rockyEngine')
    const { fixedClock } = await import('../../src/engine/clock')

    const temp = tempSqlitePath()
    cleanup = temp.cleanup
    const store = new SqliteRepositoryStore(temp.path)
    const clock = fixedClock('2026-09-08T12:00:00.000Z')
    const svc = new GameService(store.forAgent('agent-replay'), clock)
    svc.checkIn()
    svc.qaPass()

    const persisted = store.forAgent('agent-replay').getGameState()
    const events = store.forAgent('agent-replay').getEvents()
    const replayed = replay(events, 'agent-replay')

    expect(replayed).toEqual(persisted)
    store.close()
  })

  it('migrations: a fresh database ends up with all MIGRATIONS applied and recorded', () => {
    const temp = tempSqlitePath()
    cleanup = temp.cleanup
    const store = new SqliteRepositoryStore(temp.path)

    const applied = getAppliedMigrations(store.connection)
    expect(applied.map((m) => m.version)).toEqual(MIGRATIONS.map((m) => m.version))
    store.close()
  })

  it('migrations: reopening an already-migrated database does not re-apply migrations (no error, no duplicate rows)', () => {
    const temp = tempSqlitePath()
    cleanup = temp.cleanup
    const store1 = new SqliteRepositoryStore(temp.path)
    store1.close()

    const store2 = new SqliteRepositoryStore(temp.path) // re-open — should not error or double-apply
    const applied = getAppliedMigrations(store2.connection)
    expect(applied).toHaveLength(MIGRATIONS.length)
    store2.close()
  })
})
