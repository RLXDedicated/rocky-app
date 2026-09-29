import { fireEvent, render, screen, within } from '@testing-library/react'
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

  it('reveals QA Simulator only after turning QA Mode on', () => {
    completeOnboarding()
    render(<App />)

    // Internal tools live in their own pinned "Admin tools" menu, never in the agents' main menu.
    expect(screen.queryByRole('button', { name: 'QA sim' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('QA Tools'))
    const tools = within(screen.getByRole('navigation', { name: 'Admin tools' }))
    expect(tools.getByRole('button', { name: 'QA sim' })).toBeInTheDocument()
    expect(within(screen.getByRole('navigation', { name: 'Main' })).queryByRole('button', { name: 'QA sim' })).not.toBeInTheDocument()
  })
})
