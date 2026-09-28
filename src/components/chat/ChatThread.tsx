import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { chatApi, type ChatMessage } from '../../services/apiClient'
import { live, useLiveEvent } from '../../services/liveClient'
import { chatState } from './chatState'
import styles from './Chat.module.css'
import { VipBadge } from '../VipBadge'

const MAX = 1000

function time(at: string): string {
  const d = new Date(at)
  const today = new Date()
  const hm = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  return d.toDateString() === today.toDateString() ? hm : `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${hm}`
}

/**
 * One conversation: history (with "load older"), live new messages,
 * "typing…", reporting, and the composer with the customer-data check.
 */
export function ChatThread({
  channelId,
  compact = false,
  placeholder = 'Write a message…',
  onNeedRules,
  mutedUntil,
}: {
  channelId: string
  compact?: boolean
  placeholder?: string
  onNeedRules?: () => void
  mutedUntil?: string | null
}) {
  const [messages, setMessages] = useState<ChatMessage[] | null>(null)
  const [more, setMore] = useState(false)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [warning, setWarning] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [typing, setTyping] = useState<{ name: string; until: number } | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const lastTyping = useRef(0)
  const stick = useRef(true)

  useEffect(() => {
    let cancelled = false
    setMessages(null)
    setWarning(null)
    setError(null)
    chatState.setOpen(channelId)
    chatApi
      .messages(channelId)
      .then((r) => {
        if (cancelled) return
        setMessages(r.messages)
        setMore(r.more)
        stick.current = true
        const last = r.messages.at(-1)
        if (last) void chatApi.markRead(channelId, last.id).then(() => chatState.refresh())
      })
      .catch(() => !cancelled && setError('This conversation could not be loaded.'))
    return () => {
      cancelled = true
      chatState.setOpen(null)
    }
  }, [channelId])

  useLiveEvent(
    (e) => {
      if (e.channel !== channelId) return
      if (e.t === 'chat.message') {
        const m = e.message as ChatMessage
        setMessages((list) => (list && !list.some((x) => x.id === m.id) ? [...list, m] : list))
        setTyping(null)
        if (!m.mine) void chatApi.markRead(channelId, m.id)
      } else if (e.t === 'chat.hidden') {
        setMessages((list) => list?.map((m) => (m.id === e.id ? { ...m, hidden: true, body: '' } : m)) ?? list)
      } else if (e.t === 'chat.typing') {
        setTyping({ name: e.name as string, until: Date.now() + 4000 })
      }
    },
    [channelId],
  )

  useEffect(() => {
    if (!typing) return
    const t = window.setTimeout(() => setTyping((x) => (x && x.until <= Date.now() ? null : x)), 4100)
    return () => window.clearTimeout(t)
  }, [typing])

  useEffect(() => {
    const el = listRef.current
    if (el && stick.current) el.scrollTop = el.scrollHeight
  }, [messages, typing])

  async function loadOlder() {
    if (!messages?.length) return
    const el = listRef.current
    const before = el?.scrollHeight ?? 0
    const r = await chatApi.messages(channelId, { before: messages[0]!.id })
    stick.current = false
    setMessages((list) => [...r.messages, ...(list ?? [])])
    setMore(r.more)
    requestAnimationFrame(() => {
      if (el) el.scrollTop = el.scrollHeight - before
    })
  }

  async function send(confirm = false) {
    const body = text.trim()
    if (!body || sending) return
    setSending(true)
    setError(null)
    try {
      const m = await chatApi.send(channelId, body, confirm)
      stick.current = true
      setMessages((list) => (list && !list.some((x) => x.id === m.id) ? [...list, m] : list))
      setText('')
      setWarning(null)
    } catch (e) {
      const err = e as Error & { code?: string }
      if (err.code === 'SENSITIVE_DATA') setWarning(err.message)
      else if (err.code === 'RULES_NOT_ACCEPTED') onNeedRules?.()
      else setError(err.message || 'The message was not sent — try again.')
    } finally {
      setSending(false)
    }
  }

  function onKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void send()
      return
    }
    const now = Date.now()
    if (now - lastTyping.current > 3000) {
      lastTyping.current = now
      live.send({ t: 'typing', channel: channelId })
    }
  }

  async function report(m: ChatMessage) {
    const reason = window.prompt(`Report this message from ${m.name} to the QA team? Tell us briefly why (optional).`, '')
    if (reason === null) return
    try {
      await chatApi.report(m.id, reason)
      setNotice('Thanks — the QA team will review it.')
    } catch {
      setNotice('The report could not be sent — try again.')
    }
    window.setTimeout(() => setNotice(null), 3500)
  }

  const muted = mutedUntil && Date.parse(mutedUntil) > Date.now()
  return (
    <div className={`${styles.thread} ${compact ? styles.threadCompact : ''}`}>
      <div className={styles.messages} ref={listRef} onScroll={(e) => (stick.current = e.currentTarget.scrollHeight - e.currentTarget.scrollTop - e.currentTarget.clientHeight < 40)}>
        {more && (
          <button type="button" className={styles.older} onClick={() => void loadOlder()}>
            Load older messages
          </button>
        )}
        {messages === null && !error && <p className={styles.empty}>Loading…</p>}
        {messages?.length === 0 && <p className={styles.empty}>No messages yet — say hi! 👋</p>}
        {messages?.map((m, i) => {
          const prev = messages[i - 1]
          const grouped = prev && prev.from === m.from && Date.parse(m.at) - Date.parse(prev.at) < 5 * 60_000
          return (
            <div key={m.id} className={`${styles.msg} ${m.mine ? styles.mine : ''} ${grouped ? styles.grouped : ''} ${m.staff && !m.hidden ? styles.vip : ''}`}>
              {!grouped && (!m.mine || m.staff) && (
                <span className={styles.author}>
                  {m.mine ? 'You' : m.name} {m.staff && <VipBadge size="sm" />}
                </span>
              )}
              <div className={styles.bubbleRow}>
                <p className={`${styles.bubble} ${m.hidden ? styles.hidden : ''}`}>{m.hidden ? 'Message hidden by the QA team' : m.body}</p>
                {!m.mine && !m.hidden && (
                  <button type="button" className={styles.report} onClick={() => void report(m)} aria-label={`Report message from ${m.name}`} title="Report">
                    ⚑
                  </button>
                )}
              </div>
              {!grouped && <time className={styles.time}>{time(m.at)}</time>}
            </div>
          )
        })}
        {typing && <p className={styles.typing}>{typing.name} is typing…</p>}
      </div>
      {notice && <p className={styles.notice}>{notice}</p>}
      {warning && (
        <div className={styles.warning} role="alert">
          <p>⚠️ {warning}</p>
          <div>
            <button type="button" onClick={() => setWarning(null)} className={styles.primary}>
              Edit message
            </button>
            <button type="button" onClick={() => void send(true)} className={styles.ghost}>
              It’s not customer data — send
            </button>
          </div>
        </div>
      )}
      {error && <p className={styles.error}>{error}</p>}
      {muted ? (
        <p className={styles.muted}>Your chat is paused until {new Date(mutedUntil!).toLocaleString()}. Contact the QA team if you think this is a mistake.</p>
      ) : (
        <div className={styles.composer}>
          <textarea
            value={text}
            maxLength={MAX}
            rows={compact ? 1 : 2}
            placeholder={placeholder}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKey}
            aria-label="Message"
          />
          <button type="button" className={styles.send} disabled={!text.trim() || sending} onClick={() => void send()} aria-label="Send">
            ➤
          </button>
        </div>
      )}
    </div>
  )
}
