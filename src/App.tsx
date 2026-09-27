import { useEffect, useState } from 'react'
import styles from './App.module.css'
import { Achievements } from './components/Achievements'
import { AdminConsole } from './components/admin/AdminConsole'
import { DevControls } from './components/DevControls'
import { Home } from './components/Home'
import { Leaderboard } from './components/Leaderboard'
import { Onboarding } from './components/Onboarding'
import { QASimulator } from './components/QASimulator'
import { ReminderHost } from './components/ReminderHost'
import { TeamLeaderboard } from './components/TeamLeaderboard'
import { TeamPage } from './components/TeamPage'
import { isRemoteModeEnabled } from './services/apiClient'
import { isQaModeEnabled, setQaModeEnabled } from './services/appModeService'
import { isQaStaff } from './services/identityService'
import { hasCompletedOnboarding } from './services/onboardingService'

type View = 'home' | 'qa-simulator' | 'admin' | 'achievements' | 'leaderboard' | 'team' | 'team-leaderboard' | 'dev-controls'

// Agent Mode (the everyday experience) vs QA Mode (Phase 8 §23-24): QA
// Simulator is an internal testing tool, not part of what an agent normally
// sees, so it's opt-in and clearly labeled rather than sitting in the main
// nav by default. Developer Controls stay additionally gated to dev builds
// regardless of this toggle.
//
// The toggle itself is only offered to QA staff — agents whose address the
// backend lists in ROCKY_ADMIN_EMAILS (see identityService.isQaStaff) — or
// in a dev build. A regular pilot agent never sees QA Tools, even if an old
// browser still has the toggle switched on in localStorage.
function App() {
  const [view, setView] = useState<View>('home')
  const [onboarded, setOnboarded] = useState(() => hasCompletedOnboarding())
  const [staff] = useState(() => isQaStaff())
  const canUseQaTools = staff || import.meta.env.DEV
  const canUseAdmin = staff && isRemoteModeEnabled()
  const [qaModeSetting, setQaMode] = useState(() => isQaModeEnabled())
  const qaMode = qaModeSetting && canUseQaTools

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
        {canUseAdmin && (
          <button
            className={`${styles.navButton} ${styles.navButtonQa} ${view === 'admin' ? styles.navButtonActive : ''}`}
            onClick={() => setView('admin')}
          >
            Admin
          </button>
        )}
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
      {view === 'admin' && canUseAdmin && <AdminConsole />}
      {view === 'achievements' && <Achievements />}
      {view === 'leaderboard' && <Leaderboard />}
      {view === 'team' && <TeamPage />}
      {view === 'team-leaderboard' && <TeamLeaderboard />}
      {view === 'dev-controls' && import.meta.env.DEV && <DevControls />}

      <ReminderHost />

      {/* Unobtrusive corner toggle — not part of the agent's normal
          attention path, but always reachable for testers. */}
      {canUseQaTools && (
        <button className={styles.qaModeToggle} onClick={toggleQaMode}>
          {qaMode ? '✓ QA Tools On' : 'QA Tools'}
        </button>
      )}
    </div>
  )
}

export default App
