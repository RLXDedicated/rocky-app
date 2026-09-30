import { useEffect, useState } from 'react'
import { AuthRequiredError, isRemoteModeEnabled, qaDeskApi } from '../../services/apiClient'
import { endSession, getAgentEmail } from '../../services/identityService'
import { Login } from '../Login'
import { QaDesk } from './QaDesk'
import styles from './QaApp.module.css'

type Gate = 'loading' | 'login' | 'forbidden' | 'offline' | 'ok'

/** The /qa/ page: sign in if needed, then only the QA desk. */
export function QaApp() {
  const [gate, setGate] = useState<Gate>('loading')
  const check = () => {
    if (!isRemoteModeEnabled()) return setGate('offline')
    setGate('loading')
    qaDeskApi
      .desk()
      .then(() => setGate('ok'))
      .catch((e) => setGate(e instanceof AuthRequiredError || !getAgentEmail() ? 'login' : (e as { status?: number }).status === 403 ? 'forbidden' : 'offline'))
  }
  useEffect(check, [])

  return (
    <div className={styles.page}>
      <header className={styles.bar}>
        <b>🐂 Rocky QA</b>
        <span>Auditorías</span>
        <span className={styles.spacer} />
        {getAgentEmail() && gate === 'ok' && <small>{getAgentEmail()}</small>}
        <a href="/">Abrir Rocky</a>
        {gate === 'ok' && (
          <button
            type="button"
            onClick={() => {
              endSession()
              setGate('login')
            }}
          >
            Salir
          </button>
        )}
      </header>
      <main className={styles.main}>
        {gate === 'loading' && <p className={styles.note}>Cargando…</p>}
        {gate === 'login' && <Login initialEmail={getAgentEmail() ?? ''} notice="Entra con tu correo RLX y tu PIN de Rocky." onSignedIn={check} />}
        {gate === 'forbidden' && <p className={styles.note}>Esta página es para analistas QA y administradores. Si eres QA, pide a un admin que te asigne el título QA.</p>}
        {gate === 'offline' && (
          <p className={styles.note}>
            No pude conectar con Rocky. <button onClick={check}>Reintentar</button>
          </p>
        )}
        {gate === 'ok' && <QaDesk standalone />}
      </main>
    </div>
  )
}
