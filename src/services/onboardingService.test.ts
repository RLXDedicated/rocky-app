import { beforeEach, describe, expect, it } from 'vitest'
import { completeOnboarding, hasCompletedOnboarding, resetOnboarding } from './onboardingService'

describe('onboardingService', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('reports not completed for a brand-new browser', () => {
    expect(hasCompletedOnboarding()).toBe(false)
  })

  it('reports completed after completeOnboarding()', () => {
    completeOnboarding()
    expect(hasCompletedOnboarding()).toBe(true)
  })

  it('persists across a fresh read (simulating reload)', () => {
    completeOnboarding()
    // Nothing in-memory to reset — hasCompletedOnboarding always reads fresh from localStorage.
    expect(hasCompletedOnboarding()).toBe(true)
  })

  it('resetOnboarding() reverts to not-completed', () => {
    completeOnboarding()
    resetOnboarding()
    expect(hasCompletedOnboarding()).toBe(false)
  })
})
