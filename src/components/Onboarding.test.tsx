import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { repository } from '../repository/localStorageRepository'
import { hasCompletedOnboarding } from '../services/onboardingService'
import { Onboarding } from './Onboarding'

describe('Onboarding', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('shows the "Meet Rocky" step first, not the name step', () => {
    render(<Onboarding onComplete={() => {}} />)
    expect(screen.getByText('Meet Rocky.')).toBeInTheDocument()
    expect(screen.queryByLabelText("Rocky's name")).not.toBeInTheDocument()
  })

  it('advances to the name step and defaults to "Rocky"', () => {
    render(<Onboarding onComplete={() => {}} />)
    fireEvent.click(screen.getByText('MEET ROCKY'))
    expect(screen.getByLabelText("Rocky's name")).toHaveValue('Rocky')
  })

  it('accepting the default name completes onboarding and persists it', () => {
    const onComplete = vi.fn()
    render(<Onboarding onComplete={onComplete} />)
    fireEvent.click(screen.getByText('MEET ROCKY'))
    fireEvent.click(screen.getByText("LET'S GO"))

    expect(onComplete).toHaveBeenCalledOnce()
    expect(hasCompletedOnboarding()).toBe(true)
    expect(repository.getAgent().rockyName).toBe('Rocky')
  })

  it('a custom name is persisted as the single source of truth (the Agent record)', () => {
    const onComplete = vi.fn()
    render(<Onboarding onComplete={onComplete} />)
    fireEvent.click(screen.getByText('MEET ROCKY'))
    fireEvent.change(screen.getByLabelText("Rocky's name"), { target: { value: 'Bruiser' } })
    fireEvent.click(screen.getByText("LET'S GO"))

    expect(repository.getAgent().rockyName).toBe('Bruiser')
  })

  it('falls back to "Rocky" if the name is submitted blank', () => {
    render(<Onboarding onComplete={() => {}} />)
    fireEvent.click(screen.getByText('MEET ROCKY'))
    fireEvent.change(screen.getByLabelText("Rocky's name"), { target: { value: '   ' } })
    fireEvent.click(screen.getByText("LET'S GO"))

    expect(repository.getAgent().rockyName).toBe('Rocky')
  })
})
