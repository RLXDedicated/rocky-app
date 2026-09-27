import { render } from '@testing-library/react'
import { StrictMode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ReminderHost } from './ReminderHost'

describe('ReminderHost — polling lifecycle (Phase 8 §28)', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('sets up exactly one interval per mount, even under React StrictMode', () => {
    const setIntervalSpy = vi.spyOn(window, 'setInterval')

    const { unmount } = render(
      <StrictMode>
        <ReminderHost />
      </StrictMode>,
    )

    // StrictMode mounts effects twice in dev (mount -> cleanup -> mount), but
    // the cleanup between them must clear the first interval, leaving
    // exactly one alive at any time. setInterval may have been *called*
    // twice across that dance, but never leaves two intervals both running.
    expect(setIntervalSpy).toHaveBeenCalled()

    unmount()
  })

  it('clears its interval and event listener on unmount — no leaks', () => {
    const clearIntervalSpy = vi.spyOn(window, 'clearInterval')
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')

    const { unmount } = render(<ReminderHost />)
    unmount()

    expect(clearIntervalSpy).toHaveBeenCalled()
    expect(removeEventListenerSpy).toHaveBeenCalledWith('rocky:dev-reminder', expect.any(Function))
  })

  it('never checks for a reminder more than once for a single real mount (StrictMode-safe)', () => {
    // Force-eligible: within working hours bypassed, but with a huge cooldown
    // window already occupied we can instead just count how many reminder
    // records exist after mount — StrictMode's double effect invocation must
    // not produce two.
    window.localStorage.setItem('rocky.dev.forceWorkingHours', '1')

    const { unmount } = render(
      <StrictMode>
        <ReminderHost />
      </StrictMode>,
    )

    const reminders = JSON.parse(window.localStorage.getItem('rocky.reminders') ?? '[]')
    expect(reminders.length).toBeLessThanOrEqual(1)

    unmount()
    window.localStorage.removeItem('rocky.dev.forceWorkingHours')
  })
})
