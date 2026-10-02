import { useState } from 'react'
import { finishOnboarding } from '../services/agentProfile'
import styles from './Onboarding.module.css'
import { RockyAvatar } from './RockyAvatar'

interface OnboardingProps {
  onComplete: () => void
}

type Step = 'meet' | 'name'

// Two screens, under 30 seconds (Phase 8 §1): "Meet Rocky" then "choose a
// name" (default already filled in — accepting it is a single tap). Rocky is
// shown Happy/Baby here regardless of any real state, since there is no
// GameState yet for a brand-new agent.
export function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState<Step>('meet')
  const [name, setName] = useState('Rocky')

  function handleConfirmName() {
    finishOnboarding(name.trim() || 'Rocky')
    onComplete()
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <span className={styles.brandMark} aria-hidden="true">
            R
          </span>
          Rocky <span className={styles.brandBy}>by RLX</span>
        </div>
        <div className={styles.avatarRow}>
          <RockyAvatar mood="Happy" evolutionStage="Baby" size={200} bare />
        </div>

        {step === 'meet' ? (
          <>
            <h1 className={styles.title}>
              Meet Rocky<span className={styles.dot}>.</span>
            </h1>
            <p className={styles.tagline}>
              Your documentation buddy. Check in every day and Rocky gains XP, levels up and keeps a streak of great notes.
            </p>
            <ul className={styles.howList}>
              <li>
                <b>Check in daily</b> to earn XP and keep the streak alive
              </li>
              <li>
                <b>Clean QA audits</b> give Rocky extra energy
              </li>
              <li>
                <b>Collect badges</b> and climb the team ranking
              </li>
              <li>
                <b>3–5 minutes a day</b> is all Rocky needs — a quick break, then back to great notes
              </li>
            </ul>
            <button className={styles.primaryButton} onClick={() => setStep('name')}>
              Meet Rocky
            </button>
          </>
        ) : (
          <>
            <h1 className={styles.title}>
              Name your Rocky<span className={styles.dot}>.</span>
            </h1>
            <p className={styles.tagline}>Keep the classic name or give your buddy one of their own.</p>
            <label className={styles.nameTag} htmlFor="rocky-name">
              <span className={styles.nameTagHole} aria-hidden="true" />
              <span className={styles.nameLabel}>Rocky's name</span>
              <input
                id="rocky-name"
                className={styles.nameInput}
                value={name}
                maxLength={24}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleConfirmName()}
                autoFocus
              />
            </label>
            <button className={styles.primaryButton} onClick={handleConfirmName}>
              Let's go
            </button>
            <p className={styles.skipHint}>You can rename Rocky any time from the home screen.</p>
          </>
        )}
      </div>
    </div>
  )
}
