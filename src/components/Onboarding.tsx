import { useState } from 'react'
import { repository } from '../repository/localStorageRepository'
import { completeOnboarding } from '../services/onboardingService'
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
    const trimmed = name.trim() || 'Rocky'
    const agent = repository.getAgent()
    repository.saveAgent({ ...agent, rockyName: trimmed })
    completeOnboarding()
    onComplete()
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.avatarRow}>
          <RockyAvatar mood="Happy" evolutionStage="Baby" size={140} />
        </div>

        {step === 'meet' ? (
          <>
            <h1 className={styles.title}>Meet Rocky.</h1>
            <p className={styles.tagline}>
              Rocky helps you build a consistent documentation habit — one Check-in at a time.
            </p>
            <button className={styles.primaryButton} onClick={() => setStep('name')}>
              MEET ROCKY
            </button>
          </>
        ) : (
          <>
            <h1 className={styles.title}>Choose Rocky's name.</h1>
            <p className={styles.tagline}>Keep the default, or make it your own.</p>
            <label className={styles.nameLabel} htmlFor="rocky-name">
              Rocky's name
            </label>
            <input
              id="rocky-name"
              className={styles.nameInput}
              value={name}
              maxLength={24}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleConfirmName()}
              autoFocus
            />
            <button className={styles.primaryButton} onClick={handleConfirmName}>
              LET'S GO
            </button>
            <p className={styles.skipHint}>You can't rename Rocky later in this prototype — choose what feels right.</p>
          </>
        )}
      </div>
    </div>
  )
}
