import type { CSSProperties } from 'react'
import { getPoseAsset, type RockyPose } from '../rockyVisuals'
import { RetryImg } from '../assetRecovery'
import styles from './Stickers.module.css'

/**
 * Animated Rocky stickers — Rocky chat's answer to GIFs, drawn from Rocky's
 * official poses (no outside GIF service, nothing to moderate). A sticker is sent as
 * the text "[[sticker:<id>]]" and drawn by every client.
 */
export const STICKERS: { id: string; label: string; art: RockyPose; motion: string; extra: string }[] = [
  { id: 'hi', label: 'Hi!', art: 'hello', motion: 'wave', extra: '👋' },
  { id: 'yay', label: 'Yay!', art: 'jumping-joy', motion: 'jump', extra: '🎉' },
  { id: 'love', label: 'Love it', art: 'love', motion: 'beat', extra: '😍' },
  { id: 'nice', label: 'Nice notes!', art: 'thumbs-up-sparkle', motion: 'shine', extra: '📝' },
  { id: 'lol', label: 'LOL', art: 'laughing', motion: 'shake', extra: '😂' },
  { id: 'hmm', label: 'Hmm…', art: 'confused', motion: 'tilt', extra: '🤔' },
  { id: 'levelup', label: 'Level up!', art: 'celebrating', motion: 'jump', extra: '⬆️' },
  { id: 'tired', label: 'Coffee time', art: 'yawning', motion: 'sway', extra: '☕' },
  { id: 'fire', label: 'On fire!', art: 'determined', motion: 'shine', extra: '🔥' },
  { id: 'oops', label: 'Oops', art: 'nervous', motion: 'shake', extra: '😅' },
  { id: 'thanks', label: 'Thank you!', art: 'thumbs-up-both', motion: 'bow', extra: '🙏' },
  { id: 'gm', label: 'Good morning', art: 'waving', motion: 'rise', extra: '☀️' },
  { id: 'gn', label: 'Good night', art: 'sleeping', motion: 'sway', extra: '🌙' },
  { id: 'lunch', label: 'Lunch?', art: 'pointing-up', motion: 'jump', extra: '🍕' },
  { id: 'omg', label: 'OMG', art: 'panic', motion: 'zoom', extra: '😱' },
  { id: 'boss', label: 'Like a boss', art: 'cool', motion: 'shine', extra: '😎' },
  { id: 'party', label: 'Party!', art: 'celebrating', motion: 'spin', extra: '🥳' },
  { id: 'gotit', label: 'Got it!', art: 'ok-wink', motion: 'bow', extra: '👍' },
  { id: 'help', label: 'Help!', art: 'panic', motion: 'shake', extra: '🆘' },
  { id: 'brb', label: 'BRB', art: 'hand-truck', motion: 'tilt', extra: '🏃' },
  { id: 'congrats', label: 'Congrats!', art: 'trophy', motion: 'spin', extra: '🎉' },
  { id: 'hug', label: 'Hug', art: 'love', motion: 'beat', extra: '🤗' },
  { id: 'friday', label: 'Friday!', art: 'fist-pump', motion: 'wave', extra: '🎊' },
  { id: 'monday', label: 'Monday…', art: 'arms-crossed', motion: 'sway', extra: '😩' },
  { id: 'focus', label: 'Focus mode', art: 'sitting-laptop', motion: 'zoom', extra: '🎧' },
  { id: 'rescue', label: 'On my way', art: 'hand-truck', motion: 'rise', extra: '🚚' },
  { id: 'onit', label: 'On it!', art: 'hand-truck', motion: 'jump', extra: '📦' },
  { id: 'tip', label: 'Quick tip', art: 'idea', motion: 'bow', extra: '📌' },
  { id: 'cool', label: 'Too cool', art: 'cool', motion: 'shine', extra: '👌' },
  { id: 'pumped', label: 'Let’s go!', art: 'determined', motion: 'shake', extra: '💪' },
  { id: 'wait', label: 'Wait!', art: 'warning', motion: 'shake', extra: '✋' },
  { id: 'proud', label: 'Proud of you!', art: 'proud', motion: 'shine', extra: '🌟' },
  { id: 'winner', label: 'Winner!', art: 'trophy', motion: 'jump', extra: '🥇' },
  { id: 'notes', label: 'Notes first!', art: 'laptop', motion: 'shine', extra: '📝' },
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
    <span className={styles.sticker} style={{ width: size, height: size, '--s': size, '--k': s.label.length > 10 ? 0.8 : 1 } as CSSProperties} role="img" aria-label={`Sticker: ${s.label}`}>
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
