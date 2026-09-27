import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { isQaModeEnabled, setQaModeEnabled } from '../services/appModeService'
import { isForcingWorkingHours, setForceWorkingHours } from '../services/reminderService'
import { DevControls } from './DevControls'

// jsdom's window.location.reload isn't configurable enough for vi.spyOn;
// replace the whole property for the duration of these tests instead.
const originalLocation = window.location
function stubReload() {
  const reload = vi.fn()
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...originalLocation, reload },
  })
  return reload
}
function restoreLocation() {
  Object.defineProperty(window, 'location', { configurable: true, value: originalLocation })
}

describe('DevControls — Reset All Data clears dev-only toggles too (Phase 10 regression)', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    restoreLocation()
  })

  it('Reset All Data turns QA Mode and Simulate Working Hours back off — a true first-run state', () => {
    // Arrange: QA Mode and the working-hours override are both on, as a
    // tester exploring the prototype would leave them.
    setQaModeEnabled(true)
    setForceWorkingHours(true)
    expect(isQaModeEnabled()).toBe(true)
    expect(isForcingWorkingHours()).toBe(true)

    vi.spyOn(window, 'confirm').mockReturnValue(true)
    // jsdom doesn't implement navigation; the component reloads the page
    // after resetting, which we don't need to actually happen in a test.
    stubReload()

    render(<DevControls />)
    fireEvent.click(screen.getByText('Reset All Data'))

    expect(isQaModeEnabled()).toBe(false)
    expect(isForcingWorkingHours()).toBe(false)
  })

  it('does nothing if the confirmation is declined', () => {
    setQaModeEnabled(true)
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const reloadSpy = stubReload()

    render(<DevControls />)
    fireEvent.click(screen.getByText('Reset All Data'))

    expect(isQaModeEnabled()).toBe(true) // untouched
    expect(reloadSpy).not.toHaveBeenCalled()
  })
})
