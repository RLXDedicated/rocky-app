import { useEffect, useState } from 'react'
import styles from './App.module.css'
import { Achievements } from './components/Achievements'
import { DevControls } from './components/DevControls'
import { Home } from './components/Home'
import { Leaderboard } from './components/Leaderboard'
import { Onboarding } from './components/Onboarding'
import { QASimulator } from './components/QASimulator'
import { ReminderHost } from './components/ReminderHost'
import { TeamLeaderboard } from './components/TeamLeaderboard'
import { TeamPage } from './components/TeamPage'
import { isQaModeEnabled, setQaModeEnabled } from './services/appModeService'
import { hasCompletedOnboarding } from './services/onboardingService'

type View = 'home' | 'qa-simulator' | 'achievements' | 'leaderboard' | 'team' | 'team-leaderboard' | 'dev-controls'

// Agent Mode (the everyday experience) vs QA Mode (Phase 8 §23-24): QA
// Simulator is an internal testing tool, not part of what an agent normally
// sees, so it's opt-in and clearly labeled rather than sitting in the main
// nav by default. Developer Controls stay additionally gated to dev builds
// regardless of this toggle.
function App() {
  const [view, setView] = useState<View>('home')
  const [onboarded, setOnboarded] = useState(() => hasCompletedOnboarding())
  const [qaMode, setQaMode] = useState(() => isQaModeEnabled())

  useEffect(() => {
    if (!qaMode && view === 'qa-simulator') setView('home')
  }, [qaMode, view])

  if (!onboarded) {
    return <Onboarding onComplete={() => setOnboarded(true)} />
  }

  function toggleQaMode() {
    const next = !qaMode
    setQaModeEnabled(next)
    setQaMode(next)
  }

  return (
    <div>
      <nav className={styles.nav}>
        <button
          className={`${styles.navButton} ${view === 'home' ? styles.navButtonActive : ''}`}
          onClick={() => setView('home')}
        >
          Home
        </button>
        <button
          className={`${styles.navButton} ${view === 'achievements' ? styles.navButtonActive : ''}`}
          onClick={() => setView('achievements')}
        >
          Achievements
        </button>
        <button
          className={`${styles.navButton} ${view === 'leaderboard' ? styles.navButtonActive : ''}`}
          onClick={() => setView('leaderboard')}
        >
          Leaderboard
        </button>
        <button
          className={`${styles.navButton} ${view === 'team' ? styles.navButtonActive : ''}`}
          onClick={() => setView('team')}
        >
          Team
        </button>
        <button
          className={`${styles.navButton} ${view === 'team-leaderboard' ? styles.navButtonActive : ''}`}
          onClick={() => setView('team-leaderboard')}
        >
          Team Leaderboard
        </button>
        {qaMode && (
          <button
            className={`${styles.navButton} ${styles.navButtonQa} ${view === 'qa-simulator' ? styles.navButtonActive : ''}`}
            onClick={() => setView('qa-simulator')}
          >
            QA Simulator
          </button>
        )}
        {import.meta.env.DEV && (
          <button
            className={`${styles.navButton} ${styles.navButtonQa} ${view === 'dev-controls' ? styles.navButtonActive : ''}`}
            onClick={() => setView('dev-controls')}
          >
            Dev Controls
          </button>
        )}
      </nav>

      {view === 'home' && <Home />}
      {view === 'qa-simulator' && qaMode && <QASimulator />}
      {view === 'achievements' && <Achievements />}
      {view === 'leaderboard' && <Leaderboard />}
      {view === 'team' && <TeamPage />}
      {view === 'team-leaderboard' && <TeamLeaderboard />}
      {view === 'dev-controls' && import.meta.env.DEV && <DevControls />}

      <ReminderHost />

      {/* Unobtrusive corner toggle — not part of the agent's normal
          attention path, but always reachable for testers. */}
      <button className={styles.qaModeToggle} onClick={toggleQaMode}>
        {qaMode ? '✓ QA Tools On' : 'QA Tools'}
      </button>
    </div>
  )
}

export default App
