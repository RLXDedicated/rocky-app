import { getReactionAsset, getRockyAsset, type RockyReactionKey } from '../rockyVisuals'
import { RetryImg } from '../assetRecovery'
import styles from './Stickers.module.css'

/**
 * Animated Rocky stickers — Rocky chat's answer to GIFs, drawn from Rocky's
 * own art (no outside GIF service, nothing to moderate). A sticker is sent as
 * the text "[[sticker:<id>]]" and drawn by every client.
 */
export const STICKERS: { id: string; label: string; art: { reaction: RockyReactionKey } | { mood: 'Happy' | 'Motivated' | 'Worried' | 'Recovery' }; motion: string; extra: string }[] = [
  { id: 'hi', label: 'Hi!', art: { mood: 'Happy' }, motion: 'wave', extra: '👋' },
  { id: 'yay', label: 'Yay!', art: { reaction: 'check-in' }, motion: 'jump', extra: '🎉' },
  { id: 'love', label: 'Love it', art: { mood: 'Happy' }, motion: 'beat', extra: '❤️' },
  { id: 'nice', label: 'Nice notes!', art: { reaction: 'qa-pass' }, motion: 'shine', extra: '⭐' },
  { id: 'lol', label: 'LOL', art: { mood: 'Motivated' }, motion: 'shake', extra: '😂' },
  { id: 'hmm', label: 'Hmm…', art: { mood: 'Worried' }, motion: 'tilt', extra: '❓' },
  { id: 'levelup', label: 'Level up!', art: { reaction: 'level-up' }, motion: 'jump', extra: '⬆️' },
  { id: 'tired', label: 'Coffee time', art: { mood: 'Recovery' }, motion: 'sway', extra: '☕' },
  { id: 'fire', label: 'On fire!', art: { reaction: 'evolution' }, motion: 'shine', extra: '🔥' },
  { id: 'oops', label: 'Oops', art: { reaction: 'alert' }, motion: 'shake', extra: '😅' },
]

const STICKER_RE = /^\[\[sticker:([a-z]+)\]\]$/

export const stickerText = (id: string) => `[[sticker:${id}]]`
export const stickerOf = (body: string) => {
  const m = STICKER_RE.exec(body.trim())
  return m ? (STICKERS.find((s) => s.id === m[1]) ?? null) : null
}

export function Sticker({ id, size = 110 }: { id: string; size?: number }) {
  const s = STICKERS.find((x) => x.id === id)
  if (!s) return null
  const src = 'reaction' in s.art ? getReactionAsset(s.art.reaction) : getRockyAsset('Baby', s.art.mood)
  return (
    <span className={styles.sticker} style={{ width: size, height: size }} role="img" aria-label={`Sticker: ${s.label}`}>
      <span className={`${styles.body} ${styles[s.motion] ?? ''}`}>
        <RetryImg src={src} alt="" draggable={false} />
      </span>
      <span className={styles.extra}>{s.extra}</span>
      <span className={styles.label}>{s.label}</span>
    </span>
  )
}

export function StickerPicker({ onPick }: { onPick: (id: string) => void }) {
  return (
    <div className={styles.picker} role="menu" aria-label="Rocky stickers">
      {STICKERS.map((s) => (
        <button key={s.id} type="button" role="menuitem" onClick={() => onPick(s.id)} title={s.label}>
          <Sticker id={s.id} size={64} />
        </button>
      ))}
    </div>
  )
}

const EMOJI: { label: string; list: string[] }[] = [
  { label: 'Smileys', list: ['😀', '😄', '😂', '🤣', '😊', '😍', '🥰', '😎', '🤩', '😅', '😉', '🙃', '🤔', '😮', '😴', '🥳', '😇', '🤗', '🙌', '👏'] },
  { label: 'Gestures', list: ['👍', '👎', '👋', '🙏', '💪', '✌️', '🤞', '👌', '🫶', '🤝', '✅', '❌', '💯', '🔥', '⭐', '✨', '🎉', '🎊', '🏆', '🥇'] },
  { label: 'Hearts & things', list: ['❤️', '💚', '💙', '💛', '💜', '🧡', '☕', '🍕', '🍔', '🍩', '🍎', '🎂', '📝', '📦', '🚚', '🏠', '⏰', '📞', '💻', '🐂'] },
]

export function EmojiPicker({ onPick }: { onPick: (emoji: string) => void }) {
  return (
    <div className={styles.emojiPicker} role="menu" aria-label="Emojis">
      {EMOJI.map((g) => (
        <div key={g.label}>
          <small>{g.label}</small>
          <div className={styles.emojiRow}>
            {g.list.map((e) => (
              <button key={e} type="button" role="menuitem" onClick={() => onPick(e)} aria-label={e}>
                {e}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
