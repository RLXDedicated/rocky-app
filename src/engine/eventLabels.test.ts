import { describe, expect, it } from 'vitest'
import type { GameEvent } from '../types/domain'
import { labelForEvent } from './eventLabels'

function event(overrides: Partial<GameEvent>): GameEvent {
  return {
    id: 'e1',
    type: 'CHECK_IN',
    agentId: 'a',
    date: '2026-01-01',
    timestamp: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('labelForEvent — reads reward amounts from the event payload (Phase 10 regression)', () => {
  // Bug found in Phase 10: CHECK_IN/QA_PASS labels were hardcoded strings
  // ("+10 XP, +5 Energy") instead of reading the event's own payload, which
  // already carries the real granted amounts. A hardcoded label silently
  // drifts out of sync with GAME_CONFIG (or a corrected event) without any
  // test ever catching it — this test locks in reading from payload.

  it('CHECK_IN reflects the event payload, not a hardcoded number', () => {
    const e = event({ type: 'CHECK_IN', payload: { xpGained: 10, energyGained: 5, streak: 1 } })
    expect(labelForEvent(e)).toBe('Checked in with Rocky · +10 XP, +5 Energy')
  })

  it('CHECK_IN with an unusual payload still reports that exact amount, not the default', () => {
    const e = event({ type: 'CHECK_IN', payload: { xpGained: 999, energyGained: 42, streak: 1 } })
    expect(labelForEvent(e)).toBe('Checked in with Rocky · +999 XP, +42 Energy')
  })

  it('QA_PASS reflects the event payload, not a hardcoded number', () => {
    const e = event({ type: 'QA_PASS', payload: { xpGained: 25, energyGained: 10 } })
    expect(labelForEvent(e)).toBe('QA Pass · +25 XP, +10 Energy')
  })

  it('falls back to 0 gracefully if payload is missing entirely (never shows "undefined")', () => {
    const e = event({ type: 'CHECK_IN', payload: undefined })
    expect(labelForEvent(e)).toBe('Checked in with Rocky · +0 XP, +0 Energy')
    expect(labelForEvent(e)).not.toContain('undefined')
    expect(labelForEvent(e)).not.toContain('NaN')
  })
})
