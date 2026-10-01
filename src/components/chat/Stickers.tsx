import { getPoseAsset, type RockyPose } from '../rockyVisuals'
import { RetryImg } from '../assetRecovery'
import styles from './Stickers.module.css'

/**
 * Animated Rocky stickers — Rocky chat's answer to GIFs, drawn from Rocky's
 * official poses (no outside GIF service, nothing to moderate). A sticker is sent as
 * the text "[[sticker:<id>]]" and drawn by every client.
 */
export const STICKERS: { id: string; label: string; art: RockyPose; motion: string; extra: string }[] = [
  { id: 'hi', label: 'Hi!', art: 'waving', motion: 'wave', extra: '👋' },
  { id: 'yay', label: 'Yay!', art: 'thumbs-up-both', motion: 'jump', extra: '🎉' },
  { id: 'love', label: 'Love it', art: 'thumbs-up-both', motion: 'beat', extra: '❤️' },
  { id: 'nice', label: 'Nice notes!', art: 'thumbs-up', motion: 'shine', extra: '⭐' },
  { id: 'lol', label: 'LOL', art: 'thumbs-up-both', motion: 'shake', extra: '😂' },
  { id: 'hmm', label: 'Hmm…', art: 'arms-crossed', motion: 'tilt', extra: '❓' },
  { id: 'levelup', label: 'Level up!', art: 'thumbs-up-both', motion: 'jump', extra: '⬆️' },
  { id: 'tired', label: 'Coffee time', art: 'arms-crossed', motion: 'sway', extra: '☕' },
  { id: 'fire', label: 'On fire!', art: 'thumbs-up', motion: 'shine', extra: '🔥' },
  { id: 'oops', label: 'Oops', art: 'pointing-up', motion: 'shake', extra: '😅' },
  { id: 'thanks', label: 'Thank you!', art: 'thumbs-up', motion: 'bow', extra: '🙏' },
  { id: 'gm', label: 'Good morning', art: 'waving', motion: 'rise', extra: '☀️' },
  { id: 'gn', label: 'Good night', art: 'waving', motion: 'sway', extra: '🌙' },
  { id: 'lunch', label: 'Lunch?', art: 'pointing-up', motion: 'jump', extra: '🍕' },
  { id: 'omg', label: 'OMG', art: 'pointing-up', motion: 'zoom', extra: '😱' },
  { id: 'boss', label: 'Like a boss', art: 'arms-crossed', motion: 'shine', extra: '😎' },
  { id: 'party', label: 'Party!', art: 'thumbs-up-both', motion: 'spin', extra: '🥳' },
  { id: 'gotit', label: 'Got it!', art: 'thumbs-up', motion: 'bow', extra: '👍' },
  { id: 'help', label: 'Help!', art: 'pointing-up', motion: 'shake', extra: '🆘' },
  { id: 'brb', label: 'BRB', art: 'hand-truck', motion: 'tilt', extra: '🏃' },
  { id: 'congrats', label: 'Congrats!', art: 'thumbs-up-both', motion: 'spin', extra: '🏆' },
  { id: 'hug', label: 'Hug', art: 'waving', motion: 'beat', extra: '🤗' },
  { id: 'friday', label: 'Friday!', art: 'thumbs-up-both', motion: 'wave', extra: '🎊' },
  { id: 'monday', label: 'Monday…', art: 'arms-crossed', motion: 'sway', extra: '😩' },
  { id: 'focus', label: 'Focus mode', art: 'arms-crossed', motion: 'zoom', extra: '🎧' },
  { id: 'rescue', label: 'On my way', art: 'hand-truck', motion: 'rise', extra: '🚚' },
  { id: 'onit', label: 'On it!', art: 'hand-truck', motion: 'jump', extra: '📦' },
  { id: 'tip', label: 'Quick tip', art: 'pointing-up', motion: 'bow', extra: '💡' },
  { id: 'notes', label: 'Notes first!', art: 'pointing-up', motion: 'shine', extra: '📝' },
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
  const src = getPoseAsset(s.art)
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

/** The emoji everyone can use in messages and as reactions. */
export const EMOJI: { label: string; list: string[] }[] = [
  { label: 'Smileys', list: ['😀', '😄', '😁', '😂', '🤣', '😊', '😍', '🥰', '😘', '😎', '🤩', '😅', '😉', '🙃', '😜', '🤪', '🤔', '🤨', '😐', '🙄', '😮', '😱', '😢', '😭', '😤', '😡', '🥺', '😴', '🥳', '😇', '🤗', '🤭', '🫡', '🤯', '🥲', '😬', '🤤', '🤓', '😏', '🫠'] },
  { label: 'Gestures', list: ['👍', '👎', '👋', '🙏', '💪', '✌️', '🤞', '👌', '🫶', '🤝', '👏', '🙌', '👀', '🧠', '✅', '❌', '💯', '🔥', '⭐', '✨', '🎉', '🎊', '🏆', '🥇', '💥', '💤', '💬', '❓', '❗', '⚡'] },
  { label: 'Hearts', list: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💖', '💔'] },
  { label: 'Animals & fun', list: ['🐂', '🐶', '🐱', '🦊', '🐻', '🐼', '🐸', '🐵', '🦄', '🐝', '🦈', '🐢', '🌈', '🌟', '🌙', '☀️', '🌮', '🍕', '🍔', '🍟', '🍩', '🍪', '🎂', '🍎', '☕', '🧋', '🎮', '🎧', '⚽', '🏀'] },
  { label: 'Work', list: ['📝', '📦', '🚚', '🏠', '⏰', '📞', '💻', '📊', '📌', '📅', '🗂️', '🔍', '🧾', '📣', '🛠️', '🚀'] },
]

/** One tap reactions (the full set is one more tap away). */
export const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '🎉', '🙏', '🔥', '💯']

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
