import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { apiClient, chatApi, type ChatMessage, type ChatPinned } from '../../services/apiClient'
import { getAgentRole } from '../../services/identityService'
import { live, useLiveEvent } from '../../services/liveClient'
import { chatState } from './chatState'
import styles from './Chat.module.css'
import { NameBadges } from '../TitleBadge'
import { EmojiPicker, Sticker, StickerPicker, stickerOf, stickerText } from './Stickers'
import { ChatMedia, GifPicker, mediaOf, prepareImage, ReactionBar, ReactPicker } from './Media'

const MAX = 1000

/** "@Ana Perez" tokens in a message, drawn as mention chips. */
const MENTION_RE = /(@\p{Lu}[\p{L}'-]*(?: \p{Lu}[\p{L}'-]*)?)/u

function MessageText({ body }: { body: string }) {
  if (!body.includes('@')) return <>{body}</>
  return (
    <>
      {body.split(MENTION_RE).map((part, i) =>
        i % 2 === 1 ? (
          <b key={i} className={styles.mentionTag}>
            {part}
          </b>
        ) : (
          part
        ),
      )}
    </>
  )
}

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
  const [pinned, setPinned] = useState<ChatPinned | null>(null)
  // Anyone can tuck an announcement away for themselves (a new pin shows again).
  const readHiddenPin = () => {
    try {
      return Number(window.localStorage.getItem(`rocky.chat.hiddenPin.${channelId}`)) || null
    } catch {
      return null
    }
  }
  const [hiddenPin, setHiddenPin] = useState<number | null>(readHiddenPin)
  useEffect(() => setHiddenPin(readHiddenPin()), [channelId]) // eslint-disable-line react-hooks/exhaustive-deps
  const hidePin = (id: number) => {
    setHiddenPin(id)
    try {
      window.localStorage.setItem(`rocky.chat.hiddenPin.${channelId}`, String(id))
    } catch {
      // private mode: hidden for this visit only
    }
  }
  const [people, setPeople] = useState<string[] | null>(null)
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const textRef = useRef<HTMLTextAreaElement>(null)
  const isAdmin = getAgentRole() === 'ADMIN'
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
        setPinned(r.pinned ?? null)
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
      } else if (e.t === 'chat.pinned') {
        setPinned((e.pinned as ChatPinned | null) ?? null)
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

  // Pictures, GIFs and stickers finish loading after the list renders: stay at the bottom while they do.
  useEffect(() => {
    const el = listRef.current
    if (!el) return
    const onLoad = () => {
      if (stick.current) el.scrollTop = el.scrollHeight
    }
    el.addEventListener('load', onLoad, true)
    return () => el.removeEventListener('load', onLoad, true)
  }, [])

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

  // ---- @mentions: typing "@" suggests teammates ----
  function onText(value: string) {
    setText(value)
    const caret = textRef.current?.selectionStart ?? value.length
    const m = /(?:^|\s)@([\p{L}' -]{0,24})$/u.exec(value.slice(0, caret))
    setMentionQuery(m ? m[1]!.toLowerCase() : null)
    if (m && people === null) {
      setPeople([])
      apiClient
        .listFriends()
        .then((r) => setPeople(r.friends.map((f) => f.name)))
        .catch(() => setPeople([]))
    }
  }

  function pickMention(name: string) {
    const el = textRef.current
    const caret = el?.selectionStart ?? text.length
    const before = text.slice(0, caret).replace(/@[\p{L}' -]{0,24}$/u, `@${name} `)
    const next = (before + text.slice(caret)).slice(0, MAX)
    setText(next)
    setMentionQuery(null)
    requestAnimationFrame(() => {
      el?.focus()
      el?.setSelectionRange(before.length, before.length)
    })
  }

  const suggestions =
    mentionQuery === null ? [] : (people ?? []).filter((n) => n.toLowerCase().startsWith(mentionQuery) || n.toLowerCase().includes(` ${mentionQuery}`)).slice(0, 6)

  // ---- Rocky admins moderate right here ----
  async function adminAct(m: ChatMessage, action: 'pin' | 'unpin' | 'hide' | 'pause') {
    try {
      if (action === 'pin' || action === 'unpin') {
        const r = await chatApi.adminPin(m.id, action === 'pin')
        setPinned(r.pinned)
      } else if (action === 'hide') {
        if (!window.confirm(`Hide this message from ${m.name} for everyone?`)) return
        await chatApi.adminHide(m.id)
        setMessages((list) => list?.map((x) => (x.id === m.id ? { ...x, hidden: true, body: '' } : x)) ?? list)
      } else if (m.email) {
        const reason = window.prompt(`Pause ${m.name}'s chat for 24 hours? Reason (they will see the pause, not the reason):`, '')
        if (reason === null) return
        await chatApi.adminMute(m.email, 24, reason)
        setNotice(`${m.name}'s chat is paused for 24 hours.`)
        window.setTimeout(() => setNotice(null), 3500)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That did not work — try again.')
    }
  }

  function onKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (suggestions.length > 0 && (e.key === 'Tab' || (e.key === 'Enter' && !e.shiftKey))) {
      e.preventDefault()
      pickMention(suggestions[0]!)
      return
    }
    if (e.key === 'Escape' && mentionQuery !== null) {
      setMentionQuery(null)
      return
    }
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
      {pinned && hiddenPin !== pinned.id && (
        <div className={styles.pinned} role="note" aria-label="Pinned announcement">
          <span aria-hidden="true">📌</span>
          <button
            type="button"
            className={styles.pinnedText}
            title="Show the message"
            onClick={() => {
              const el = listRef.current?.querySelector(`[data-msg-id="${pinned.id}"]`)
              if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' })
                el.classList.add(styles.flash!)
                window.setTimeout(() => el.classList.remove(styles.flash!), 1600)
              }
            }}
          >
            <b>{pinned.name}:</b> {mediaOf(pinned.body) ? '📷 Picture' : stickerOf(pinned.body) ? `🐂 ${stickerOf(pinned.body)!.label}` : pinned.body}
          </button>
          {isAdmin ? (
            <button type="button" className={styles.unpin} onClick={() => void chatApi.adminPin(pinned.id, false).then((r) => setPinned(r.pinned))}>
              Unpin
            </button>
          ) : (
            <button type="button" className={styles.unpin} onClick={() => hidePin(pinned.id)} aria-label="Hide this announcement for me">
              Hide
            </button>
          )}
        </div>
      )}
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
            <div key={m.id} data-msg-id={m.id} className={`${styles.msg} ${m.mine ? styles.mine : ''} ${grouped ? styles.grouped : ''} ${m.staff && !m.hidden ? styles.vip : ''} ${m.mentionsMe ? styles.mentioned : ''}`}>
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
                    {m.hidden ? 'Message hidden by the QA team' : <MessageText body={m.body} />}
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
                {isAdmin && !m.hidden && (
                  <span className={styles.modTools}>
                    <button type="button" className={styles.report} onClick={() => void adminAct(m, pinned?.id === m.id ? 'unpin' : 'pin')} title={pinned?.id === m.id ? 'Unpin' : 'Pin as announcement'} aria-label="Pin as announcement">
                      📌
                    </button>
                    <button type="button" className={styles.report} onClick={() => void adminAct(m, 'hide')} title="Hide message" aria-label="Hide message">
                      🙈
                    </button>
                    {!m.mine && m.email && (
                      <button type="button" className={styles.report} onClick={() => void adminAct(m, 'pause')} title="Pause their chat for 24 h" aria-label="Pause their chat">
                        ⏸
                      </button>
                    )}
                  </span>
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
          {suggestions.length > 0 && (
            <ul className={styles.mentions} role="listbox" aria-label="Mention a teammate">
              {suggestions.map((n, i) => (
                <li key={n}>
                  <button type="button" role="option" aria-selected={i === 0} onMouseDown={(e) => (e.preventDefault(), pickMention(n))}>
                    @{n}
                  </button>
                </li>
              ))}
            </ul>
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
            ref={textRef}
            onChange={(e) => onText(e.target.value)}
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
