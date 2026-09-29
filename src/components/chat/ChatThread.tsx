import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { chatApi, type ChatMessage } from '../../services/apiClient'
import { live, useLiveEvent } from '../../services/liveClient'
import { chatState } from './chatState'
import styles from './Chat.module.css'
import { NameBadges } from '../TitleBadge'
import { EmojiPicker, Sticker, StickerPicker, stickerOf, stickerText } from './Stickers'
import { ChatMedia, GifPicker, mediaOf, prepareImage, ReactionBar, ReactPicker } from './Media'

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
  const [picker, setPicker] = useState<'emoji' | 'sticker' | 'gif' | null>(null)
  const [reacting, setReacting] = useState<number | null>(null)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
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
      } else if (e.t === 'chat.reaction') {
        const reactions = e.reactions as ChatMessage['reactions']
        setMessages((list) => list?.map((m) => (m.id === e.id ? { ...m, reactions } : m)) ?? list)
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

  async function send(confirm = false, sticker?: string) {
    const body = (sticker ?? text).trim()
    if (!body || sending) return
    setSending(true)
    setError(null)
    try {
      const m = await chatApi.send(channelId, body, confirm)
      stick.current = true
      setMessages((list) => (list && !list.some((x) => x.id === m.id) ? [...list, m] : list))
      if (!sticker) setText('')
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

  async function react(m: ChatMessage, emoji: string) {
    setReacting(null)
    try {
      const r = await chatApi.react(m.id, emoji)
      setMessages((list) => list?.map((x) => (x.id === r.id ? { ...x, reactions: r.reactions } : x)) ?? list)
    } catch (e) {
      const err = e as Error & { code?: string }
      if (err.code === 'RULES_NOT_ACCEPTED') onNeedRules?.()
      else setError(err.message || 'The reaction was not saved — try again.')
    }
  }

  /** Attach a picture or GIF (from the 📎 button, a paste or a drop). */
  async function upload(file: File) {
    if (uploading) return
    setPicker(null)
    setUploading(true)
    setError(null)
    try {
      const blob = await prepareImage(file)
      const m = await chatApi.sendImage(channelId, blob)
      stick.current = true
      setMessages((list) => (list && !list.some((x) => x.id === m.id) ? [...list, m] : list))
    } catch (e) {
      const err = e as Error & { code?: string }
      if (err.code === 'RULES_NOT_ACCEPTED') onNeedRules?.()
      else setError(err.message || 'The picture was not sent — try again.')
    } finally {
      setUploading(false)
    }
  }

  function firstImage(files: FileList | null | undefined): File | null {
    return [...(files ?? [])].find((f) => f.type.startsWith('image/')) ?? null
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
    <div
      className={`${styles.thread} ${compact ? styles.threadCompact : ''} ${dragOver ? styles.dropping : ''}`}
      onDragOver={(e) => {
        if ([...e.dataTransfer.items].some((i) => i.type.startsWith('image/'))) {
          e.preventDefault()
          setDragOver(true)
        }
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        setDragOver(false)
        const f = firstImage(e.dataTransfer.files)
        if (f && !muted) {
          e.preventDefault()
          void upload(f)
        }
      }}
    >
      <div className={styles.messages} data-chat-scroll ref={listRef} onScroll={(e) => (stick.current = e.currentTarget.scrollHeight - e.currentTarget.scrollTop - e.currentTarget.clientHeight < 40)}>
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
              {!grouped && (!m.mine || m.staff || m.title || m.tester) && (
                <span className={styles.author}>
                  {m.mine ? 'You' : m.name} <NameBadges staff={m.staff} title={m.title} tester={m.tester} />
                </span>
              )}
              <div className={styles.bubbleRow}>
                {!m.hidden && mediaOf(m.body) ? (
                  <ChatMedia media={mediaOf(m.body)!} />
                ) : !m.hidden && stickerOf(m.body) ? (
                  <Sticker id={stickerOf(m.body)!.id} />
                ) : (
                  <p className={`${styles.bubble} ${m.hidden ? styles.hidden : ''} ${m.style && !m.hidden ? `chat-bubble-${m.style}` : ''}`}>
                    {m.hidden ? 'Message hidden by the QA team' : m.body}
                  </p>
                )}
                {!m.hidden && (
                  <button
                    type="button"
                    className={styles.report}
                    onClick={() => setReacting((r) => (r === m.id ? null : m.id))}
                    aria-label={`React to message from ${m.mine ? 'you' : m.name}`}
                    aria-expanded={reacting === m.id}
                    title="React"
                  >
                    😊
                  </button>
                )}
                {!m.mine && !m.hidden && (
                  <button type="button" className={styles.report} onClick={() => void report(m)} aria-label={`Report message from ${m.name}`} title="Report">
                    ⚑
                  </button>
                )}
                {reacting === m.id && <ReactPicker align={m.mine ? 'right' : 'left'} onPick={(e) => void react(m, e)} onClose={() => setReacting(null)} />}
              </div>
              {!m.hidden && <ReactionBar reactions={m.reactions ?? []} canAdd onToggle={(e) => void react(m, e)} />}
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
          {picker === 'emoji' && (
            <EmojiPicker
              onPick={(e) => {
                setText((t) => (t + e).slice(0, MAX))
                setPicker(null)
              }}
            />
          )}
          {picker === 'gif' && (
            <GifPicker
              onPick={(id) => {
                setPicker(null)
                void send(false, `[[gif:${id}]]`)
              }}
              onUpload={() => fileRef.current?.click()}
            />
          )}
          {picker === 'sticker' && (
            <StickerPicker
              onPick={(id) => {
                setPicker(null)
                void send(false, stickerText(id))
              }}
            />
          )}
          <button
            type="button"
            className={styles.tool}
            aria-label="Emojis"
            aria-expanded={picker === 'emoji'}
            onClick={() => setPicker((p) => (p === 'emoji' ? null : 'emoji'))}
          >
            😊
          </button>
          <button
            type="button"
            className={styles.tool}
            aria-label="Rocky stickers"
            aria-expanded={picker === 'sticker'}
            onClick={() => setPicker((p) => (p === 'sticker' ? null : 'sticker'))}
          >
            🐂
          </button>
          <button
            type="button"
            className={styles.tool}
            aria-label="GIFs"
            aria-expanded={picker === 'gif'}
            onClick={() => setPicker((p) => (p === 'gif' ? null : 'gif'))}
          >
            <span className={styles.gifIcon}>GIF</span>
          </button>
          <button type="button" className={styles.tool} aria-label="Attach a picture or GIF" disabled={uploading} onClick={() => fileRef.current?.click()}>
            {uploading ? '⏳' : '📎'}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            hidden
            onChange={(e) => {
              const f = firstImage(e.target.files)
              e.target.value = ''
              if (f) void upload(f)
            }}
          />
          <textarea
            value={text}
            maxLength={MAX}
            rows={compact ? 1 : 2}
            placeholder={placeholder}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKey}
            onPaste={(e) => {
              const f = firstImage(e.clipboardData.files)
              if (f) {
                e.preventDefault()
                void upload(f)
              }
            }}
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
