import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { chatApi, type ChatReaction, type GifResult } from '../../services/apiClient'
import { EMOJI, QUICK_REACTIONS } from './Stickers'
import styles from './Media.module.css'

// Pictures, GIFs and reactions in Rocky chat.
//   [[img:<id>]] — a picture or GIF someone attached (stored by Rocky, only
//                  people in the conversation — and the admins — can load it)
//   [[gif:<id>]] — a GIF picked from the GIF search (GIPHY)

const IMG_RE = /^\[\[img:([a-f0-9]{24})\]\]$/
const GIF_RE = /^\[\[gif:([A-Za-z0-9]{5,40})\]\]$/

export type Media = { kind: 'img'; id: string } | { kind: 'gif'; id: string }

export function mediaOf(body: string): Media | null {
  const img = IMG_RE.exec(body.trim())
  if (img) return { kind: 'img', id: img[1]! }
  const gif = GIF_RE.exec(body.trim())
  return gif ? { kind: 'gif', id: gif[1]! } : null
}

/** How a picture/GIF reads in a conversation list preview. */
export function mediaPreview(body: string): string | null {
  if (body.startsWith('[[poll:')) return '📊 Poll'
  const m = mediaOf(body)
  return m ? (m.kind === 'img' ? '📷 Picture' : '🎞️ GIF') : null
}

export const gifUrl = (id: string) => `https://media.giphy.com/media/${id}/giphy.gif`

// Loaded pictures are kept for the session so scrolling back doesn't refetch them.
const cache = new Map<string, Promise<string>>()
function loadAttachment(id: string): Promise<string> {
  let p = cache.get(id)
  if (!p) {
    p = chatApi.attachment(id).then((blob) => URL.createObjectURL(blob))
    p.catch(() => cache.delete(id))
    cache.set(id, p)
  }
  return p
}

export function ChatMedia({ media }: { media: Media }) {
  const [src, setSrc] = useState<string | null>(media.kind === 'gif' ? gifUrl(media.id) : null)
  const [failed, setFailed] = useState(false)
  const [zoom, setZoom] = useState(false)

  useEffect(() => {
    if (media.kind !== 'img') return
    let alive = true
    loadAttachment(media.id)
      .then((url) => alive && setSrc(url))
      .catch(() => alive && setFailed(true))
    return () => {
      alive = false
    }
  }, [media])

  if (failed) return <p className={styles.missing}>Picture unavailable</p>
  if (!src) return <span className={styles.loading} aria-label="Loading picture" />
  return (
    <>
      <button type="button" className={styles.media} onClick={() => setZoom(true)} aria-label="Open picture">
        <img src={src} alt={media.kind === 'gif' ? 'GIF' : 'Shared picture'} loading="lazy" onError={() => setFailed(true)} />
        {media.kind === 'gif' && <span className={styles.gifTag}>GIF</span>}
      </button>
      {zoom && (
        <div className={styles.lightbox} role="dialog" aria-label="Picture" onClick={() => setZoom(false)}>
          <img src={src} alt="" />
          <button type="button" className={styles.close} aria-label="Close" onClick={() => setZoom(false)}>
            ✕
          </button>
        </div>
      )}
    </>
  )
}

/** Reactions under a message: tap one to add or take back yours; + opens the emoji set. */
export function ReactionBar({ reactions, onToggle, canAdd }: { reactions: ChatReaction[]; onToggle: (emoji: string) => void; canAdd: boolean }) {
  if (reactions.length === 0) return null
  return (
    <div className={styles.reactions}>
      {reactions.map((r) => (
        <button
          key={r.emoji}
          type="button"
          className={`${styles.reaction} ${r.mine ? styles.reactionMine : ''}`}
          onClick={() => canAdd && onToggle(r.emoji)}
          title={r.names.join(', ') + (r.count > r.names.length ? ` +${r.count - r.names.length}` : '')}
          aria-label={`${r.emoji} ${r.count}${r.mine ? ', including you' : ''}`}
          aria-pressed={r.mine}
        >
          <span>{r.emoji}</span> {r.count}
        </button>
      ))}
    </div>
  )
}

/** The small "react" popover: quick picks, and the full emoji set one tap away. */
export function ReactPicker({ onPick, onClose, align }: { onPick: (emoji: string) => void; onClose: () => void; align: 'left' | 'right' }) {
  const [all, setAll] = useState(false)
  const [below, setBelow] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  // Opens upwards unless that would go past the top of the conversation (e.g. the first message).
  useLayoutEffect(() => {
    const el = ref.current
    const box = el?.closest('[data-chat-scroll]')?.getBoundingClientRect()
    if (el && box && el.getBoundingClientRect().top < box.top + 4) setBelow(true)
  }, [all])
  useEffect(() => {
    const away = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('pointerdown', away)
    window.addEventListener('keydown', esc)
    return () => {
      window.removeEventListener('pointerdown', away)
      window.removeEventListener('keydown', esc)
    }
  }, [onClose])
  return (
    <div ref={ref} className={`${styles.reactPicker} ${align === 'right' ? styles.alignRight : ''} ${below ? styles.below : ''}`} role="menu" aria-label="React">
      <div className={styles.quick}>
        {QUICK_REACTIONS.map((e) => (
          <button key={e} type="button" role="menuitem" onClick={() => onPick(e)} aria-label={`React ${e}`}>
            {e}
          </button>
        ))}
        <button type="button" className={styles.more} onClick={() => setAll((x) => !x)} aria-expanded={all} aria-label="More emoji">
          {all ? '−' : '＋'}
        </button>
      </div>
      {all && (
        <div className={styles.allEmoji}>
          {EMOJI.flatMap((g) => g.list).map((e) => (
            <button key={e} type="button" role="menuitem" onClick={() => onPick(e)} aria-label={`React ${e}`}>
              {e}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/** GIF search (when the server has a GIPHY key) plus "upload your own". */
export function GifPicker({ onPick, onUpload }: { onPick: (id: string) => void; onUpload: () => void }) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<GifResult[] | null>(null)
  const [enabled, setEnabled] = useState(true)
  useEffect(() => {
    // Search once they pause typing, and not for a single letter (the pilot shares a small GIPHY quota).
    const term = q.trim().length >= 2 ? q.trim() : ''
    const t = window.setTimeout(() => {
      chatApi
        .gifs(term)
        .then((r) => {
          setEnabled(r.enabled)
          setResults(r.gifs)
        })
        .catch(() => setResults([]))
    }, 700)
    return () => window.clearTimeout(t)
  }, [q])
  return (
    <div className={styles.gifPicker} role="dialog" aria-label="GIFs">
      {enabled ? (
        <>
          <input type="search" autoFocus placeholder="Search GIFs…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search GIFs" />
          <div className={styles.gifGrid}>
            {results === null && <p className={styles.note}>Loading…</p>}
            {results?.length === 0 && <p className={styles.note}>No GIFs found — try another word.</p>}
            {results?.map((g) => (
              <button key={g.id} type="button" onClick={() => onPick(g.id)} title={g.title}>
                <img src={g.preview} alt={g.title || 'GIF'} loading="lazy" />
              </button>
            ))}
          </div>
          <p className={styles.powered}>Powered by GIPHY</p>
        </>
      ) : (
        <p className={styles.note}>GIF search isn’t switched on yet — share your own GIFs, memes and pictures:</p>
      )}
      <button type="button" className={styles.upload} onClick={onUpload}>
        📎 Upload a GIF or picture
      </button>
    </div>
  )
}

/**
 * Makes a photo chat-sized before it's sent (max 1280px, WebP/JPEG), so it
 * uploads fast. GIFs are sent as they are (shrinking would stop the animation).
 */
export async function prepareImage(file: File): Promise<Blob> {
  if (file.type === 'image/gif') return file
  if (!/^image\/(png|jpeg|webp)$/.test(file.type)) throw new Error('Only pictures (PNG, JPEG, WebP) and GIFs can be shared.')
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image()
      i.onload = () => resolve(i)
      i.onerror = () => reject(new Error('That picture could not be read.'))
      i.src = url
    })
    const scale = Math.min(1, 1280 / Math.max(img.naturalWidth, img.naturalHeight))
    if (scale === 1 && file.size < 600_000) return file
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(img.naturalWidth * scale)
    canvas.height = Math.round(img.naturalHeight * scale)
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.82))
    return blob ?? file
  } finally {
    URL.revokeObjectURL(url)
  }
}
