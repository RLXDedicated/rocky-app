import { useState } from 'react'
import type { ChatPoll } from '../../services/apiClient'
import styles from './Chat.module.css'

/** A poll in the conversation: tap an option to vote (tap it again to take the vote back). */
export function PollCard({ poll, onVote }: { poll: ChatPoll; onVote: (option: number) => void }) {
  const voted = poll.options.some((o) => o.mine)
  return (
    <div className={styles.poll}>
      <strong>📊 {poll.question}</strong>
      <ul>
        {poll.options.map((o, i) => {
          const pct = poll.total ? Math.round((100 * o.count) / poll.total) : 0
          return (
            <li key={i}>
              <button type="button" aria-pressed={o.mine} onClick={() => onVote(i)} title={o.names.length ? o.names.join(', ') : undefined}>
                <i style={{ width: voted ? `${pct}%` : 0 }} aria-hidden />
                <span>
                  {o.mine ? '✓ ' : ''}
                  {o.text}
                </span>
                {voted && <b>{pct}%</b>}
              </button>
            </li>
          )
        })}
      </ul>
      <small>
        {poll.total} {poll.total === 1 ? 'vote' : 'votes'} · {voted ? 'tap your choice again to take it back' : 'tap to vote'}
      </small>
    </div>
  )
}

/** Write a quick poll: a question and 2–6 options. */
export function PollComposer({ onCreate, onCancel }: { onCreate: (question: string, options: string[]) => Promise<void>; onCancel: () => void }) {
  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState(['', ''])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const filled = options.map((o) => o.trim()).filter(Boolean)
  async function create() {
    setBusy(true)
    setError(null)
    try {
      await onCreate(question.trim(), filled)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setBusy(false)
    }
  }
  return (
    <div className={styles.pollComposer}>
      <strong>📊 New poll</strong>
      <input value={question} maxLength={140} onChange={(e) => setQuestion(e.target.value)} placeholder="Ask something (e.g. Best time for the notes huddle?)" autoFocus aria-label="Question" />
      {options.map((o, i) => (
        <input
          key={i}
          value={o}
          maxLength={60}
          onChange={(e) => setOptions((list) => list.map((x, j) => (j === i ? e.target.value : x)))}
          placeholder={`Option ${i + 1}`}
          aria-label={`Option ${i + 1}`}
        />
      ))}
      {options.length < 6 && (
        <button type="button" className={styles.linkBtn} onClick={() => setOptions((l) => [...l, ''])}>
          + Add option
        </button>
      )}
      {error && <p className={styles.error}>{error}</p>}
      <div className={styles.pickerActions}>
        <button type="button" className={styles.primary} disabled={busy || !question.trim() || filled.length < 2} onClick={() => void create()}>
          Post poll
        </button>
        <button type="button" className={styles.ghost} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  )
}
