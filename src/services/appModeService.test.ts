import { beforeEach, describe, expect, it } from 'vitest'
import { isQaModeEnabled, setQaModeEnabled } from './appModeService'

describe('appModeService', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('defaults to Agent Mode (QA Mode off) for a brand-new browser', () => {
    expect(isQaModeEnabled()).toBe(false)
  })

  it('turns QA Mode on and persists it', () => {
    setQaModeEnabled(true)
    expect(isQaModeEnabled()).toBe(true)
  })

  it('turns QA Mode back off', () => {
    setQaModeEnabled(true)
    setQaModeEnabled(false)
    expect(isQaModeEnabled()).toBe(false)
  })
})
