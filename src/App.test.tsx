import { render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import App from './App'
import { completeOnboarding } from './services/onboardingService'

describe('App — Agent Mode vs QA Mode navigation (Phase 8 §23-24)', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('shows the onboarding intro on a brand-new browser instead of the nav', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Meet Rocky.' })).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Main' })).not.toBeInTheDocument()
  })

  it('shows the everyday Agent nav (no QA Simulator) once onboarding is complete', () => {
    completeOnboarding()
    render(<App />)

    const nav = within(screen.getByRole('navigation', { name: 'Main' }))
    expect(nav.getByRole('button', { name: 'Rocky' })).toBeInTheDocument()
    expect(nav.getByRole('button', { name: 'Badges' })).toBeInTheDocument()
    expect(nav.getByRole('button', { name: 'Ranking' })).toBeInTheDocument()
    expect(nav.getByRole('button', { name: 'My team' })).toBeInTheDocument()
    expect(nav.queryByRole('button', { name: 'QA sim' })).not.toBeInTheDocument()
  })

  it('has no QA Tools toggle any more (audits live in the QA desk)', () => {
    completeOnboarding()
    render(<App />)
    expect(screen.queryByText('QA Tools')).not.toBeInTheDocument()
  })
})
