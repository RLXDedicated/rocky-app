import { useEffect, useState } from 'react'
import styles from './App.module.css'
import { Achievements } from './components/Achievements'
import { AdminConsole } from './components/admin/AdminConsole'
import { DevControls } from './components/DevControls'
import { Home } from './components/Home'
import { NavIcon, type NavIconName } from './components/NavIcon'
import { Leaderboard } from './components/Leaderboard'
import { Onboarding } from './components/Onboarding'
import { Progress } from './components/Progress'
import { QASimulator } from './components/QASimulator'
import { ReminderHost } from './components/ReminderHost'
import { TeamLeaderboard } from './components/TeamLeaderboard'
import { TeamPage } from './components/TeamPage'
import { isRemoteModeEnabled } from './services/apiClient'
import { isQaModeEnabled, setQaModeEnabled } from './services/appModeService'
import { isQaStaff } from './services/identityService'
import { hasCompletedOnboarding } from './services/onboardingService'

type View = 'home' | 'progress' | 'qa-simulator' | 'admin' | 'achievements' | 'leaderboard' | 'team' | 'team-leaderboard' | 'dev-controls'

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

  const navItems: { view: View; label: string; icon: NavIconName; internal?: boolean }[] = [
    { view: 'home', label: 'Rocky', icon: 'home' },
    { view: 'progress', label: 'Progress', icon: 'chart' },
    { view: 'achievements', label: 'Badges', icon: 'medal' },
    { view: 'leaderboard', label: 'Ranking', icon: 'podium' },
    { view: 'team', label: 'My team', icon: 'team' },
    { view: 'team-leaderboard', label: 'Teams', icon: 'teams' },
    ...(canUseAdmin ? [{ view: 'admin' as View, label: 'Admin', icon: 'admin' as NavIconName, internal: true }] : []),
    ...(qaMode ? [{ view: 'qa-simulator' as View, label: 'QA sim', icon: 'flask' as NavIconName, internal: true }] : []),
    ...(import.meta.env.DEV ? [{ view: 'dev-controls' as View, label: 'Dev', icon: 'wrench' as NavIconName, internal: true }] : []),
  ]

  return (
    <div className={styles.shell}>
      <header className={styles.topBar}>
        <div className={styles.brand}>
          <span className={styles.brandMark} aria-hidden="true">R</span>
          <span className={styles.brandName}>Rocky</span>
          <span className={styles.brandBy}>by RLX</span>
        </div>
        <nav className={styles.nav} aria-label="Main">
          {navItems.map((item) => (
            <button
              key={item.view}
              className={`${styles.navButton} ${item.internal ? styles.navButtonQa : ''} ${view === item.view ? styles.navButtonActive : ''}`}
              aria-current={view === item.view ? 'page' : undefined}
              onClick={() => setView(item.view)}
            >
              <NavIcon name={item.icon} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </header>

      {view === 'home' && <Home onOpenProgress={() => setView('progress')} />}
      {view === 'progress' && <Progress />}
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
