import { useState, type FormEvent } from 'react'
import { apiClient } from '../services/apiClient'
import { startSession } from '../services/identityService'
import welcomeRocky from '../assets/rocky/official/welcome-wave.webp'
import styles from './Login.module.css'

interface Props {
  /** Pre-filled address (e.g. the session just expired). */
  initialEmail?: string
  notice?: string
  onSignedIn: () => void
}

type Step = 'email' | 'pin'

/**
 * Sign-in with work email + PIN. The first time an address signs in, the
 * PIN it chooses becomes its PIN; after that it's required on every new
 * device. Rocky, coins and progress then load from the server wherever the
 * agent signs in.
 */
export function Login({ initialEmail = '', notice, onSignedIn }: Props) {
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState(initialEmail)
  const [hasPin, setHasPin] = useState(true)
  const [pin, setPin] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submitEmail(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const status = await apiClient.authStatus(email)
      setEmail(status.email)
      setHasPin(status.hasPin)
      setStep('pin')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reach Rocky. Try again in a moment.')
    } finally {
      setBusy(false)
    }
  }

  async function submitPin(e: FormEvent) {
    e.preventDefault()
    if (!/^\d{4,8}$/.test(pin)) {
      setError('Your PIN is 4 to 8 digits.')
      return
    }
    if (!hasPin && pin !== confirm) {
      setError('The two PINs don’t match.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const res = await apiClient.login(email, pin)
      startSession(res.agent.id, res.token)
      onSignedIn()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in. Try again.')
      setPin('')
      setConfirm('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={styles.page}>
      {/* Official Rocky artwork (approved by Marketing): shown exactly as delivered — never cropped, recoloured or deformed. */}
      <figure className={styles.hero}>
        <img src={welcomeRocky} alt="Rocky, the RLX mascot, waving hello" width={1136} height={1385} />
      </figure>
      <div className={styles.card}>
        <div className={styles.brand}>
          <span className={styles.brandMark} aria-hidden="true">
            R
          </span>
          Rocky <span className={styles.brandBy}>by RLX</span>
        </div>

        {step === 'email' ? (
          <form className={styles.form} onSubmit={submitEmail}>
            <h1 className={styles.title}>Welcome back</h1>
            <p className={styles.lede}>Sign in with your work email. Rocky, your coins and your progress come with you to any device.</p>
            {notice && <p className={styles.notice}>{notice}</p>}
            <label className={styles.field}>
              <span>Work email</span>
              <input
                type="email"
                autoComplete="email"
                inputMode="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
              />
            </label>
            {error && (
              <p className={styles.error} role="alert">
                {error}
              </p>
            )}
            <button className={styles.primary} disabled={busy || !email.trim()}>
              {busy ? 'Checking…' : 'Continue'}
            </button>
          </form>
        ) : (
          <form className={styles.form} onSubmit={submitPin}>
            <h1 className={styles.title}>{hasPin ? 'Enter your PIN' : 'Create your PIN'}</h1>
            <p className={styles.lede}>
              {hasPin ? (
                <>
                  Signing in as <b>{email}</b>
                </>
              ) : (
                <>
                  First time here as <b>{email}</b>. Choose a 4–8 digit PIN — you’ll use it on any PC or phone.
                </>
              )}
            </p>
            <label className={styles.field}>
              <span>PIN</span>
              <input
                className={styles.pin}
                type="password"
                inputMode="numeric"
                autoComplete={hasPin ? 'current-password' : 'new-password'}
                pattern="\d*"
                maxLength={8}
                required
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                autoFocus
              />
            </label>
            {!hasPin && (
              <label className={styles.field}>
                <span>Repeat the PIN</span>
                <input
                  className={styles.pin}
                  type="password"
                  inputMode="numeric"
                  autoComplete="new-password"
                  pattern="\d*"
                  maxLength={8}
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value.replace(/\D/g, ''))}
                />
              </label>
            )}
            {error && (
              <p className={styles.error} role="alert">
                {error}
              </p>
            )}
            <button className={styles.primary} disabled={busy}>
              {busy ? 'Signing in…' : hasPin ? 'Sign in' : 'Create PIN and sign in'}
            </button>
            <button
              type="button"
              className={styles.link}
              onClick={() => {
                setStep('email')
                setPin('')
                setConfirm('')
                setError(null)
              }}
            >
              Use a different email
            </button>
            {hasPin && <p className={styles.hint}>Forgot your PIN? Ask your QA coordinator to reset it.</p>}
          </form>
        )}
      </div>
    </div>
  )
}
