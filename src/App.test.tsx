import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import App from './App'
import { completeOnboarding } from './services/onboardingService'

describe('App — Agent Mode vs QA Mode navigation (Phase 8 §23-24)', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('shows the onboarding intro on a brand-new browser instead of the nav', () => {
    render(<App />)
    expect(screen.getByText('Meet Rocky.')).toBeInTheDocument()
    expect(screen.queryByText('Home')).not.toBeInTheDocument()
  })

  it('shows the everyday Agent nav (no QA Simulator) once onboarding is complete', () => {
    completeOnboarding()
    render(<App />)

    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.getByText('Achievements')).toBeInTheDocument()
    expect(screen.getByText('Leaderboard')).toBeInTheDocument()
    expect(screen.getByText('Team')).toBeInTheDocument()
    expect(screen.queryByText('QA Simulator')).not.toBeInTheDocument()
  })

  it('reveals QA Simulator only after turning QA Mode on', () => {
    completeOnboarding()
    render(<App />)

    expect(screen.queryByText('QA Simulator')).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('QA Tools'))
    expect(screen.getByText('QA Simulator')).toBeInTheDocument()
  })
})
