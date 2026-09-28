import { useState } from 'react'
import { chatApi, type ChatRules as Rules } from '../../services/apiClient'
import styles from './Chat.module.css'

/** The house rules approved by RLX (docs/REALTIME_CHAT_PLAN.md). Keep in sync with RULES_VERSION on the backend. */
export function RulesText({ retentionDays = 90 }: { retentionDays?: number }) {
  return (
    <>
      <p>Rocky chat is for friendly conversation between RLX agents.</p>
      <ul>
        <li>Be kind and respectful. No harassment, discrimination, threats or offensive content.</li>
        <li>
          <strong>Never share customer information</strong>: names, phone numbers, emails, addresses, order numbers or account details. Use the approved
          work systems for that.
        </li>
        <li>Don’t share passwords, PINs or any login details, not even with a teammate.</li>
        <li>Keep it work-appropriate. No spam, chain messages or selling.</li>
        <li>
          Your supervisors can’t read your chats. <strong>Rocky admins keep a copy of every conversation for quality control and safety</strong>, and may
          review it when needed. Messages are kept for {retentionDays} days.
        </li>
        <li>Anyone can report a message. Admins may hide messages or pause chat for someone who breaks these rules.</li>
      </ul>
    </>
  )
}

/** Shown once before the first message (and again if the rules change). */
export function RulesGate({ rules, onAccepted }: { rules: Rules; onAccepted: (r: Rules) => void }) {
  const [agree, setAgree] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function accept() {
    setBusy(true)
    try {
      onAccepted(await chatApi.acceptRules(rules.version))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save that — try again.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className={styles.rules} aria-labelledby="chat-rules-title">
      <h2 id="chat-rules-title">Rocky chat — house rules</h2>
      <RulesText retentionDays={rules.retentionDays} />
      <label className={styles.agree}>
        <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} /> I have read the rules
      </label>
      {error && <p className={styles.error}>{error}</p>}
      <button type="button" className={styles.primary} disabled={!agree || busy} onClick={() => void accept()}>
        I understand and agree
      </button>
    </section>
  )
}
