import { useState } from 'react'
import styles from './Pet.module.css'
import { NameBadges, type Title } from '../TitleBadge'

interface NameTagProps {
  name: string
  subtitle: string
  onRename: (name: string) => void
  /** Rocky admins wear the VIP badge. */
  vip?: boolean
  /** QA analyst / team leader badge. */
  title?: Title
}

/**
 * Rocky's name, printed on an RLX shipping tag that hangs off the habitat.
 * Tapping it renames the pet — the name only lives on this device.
 */
export function NameTag({ name, subtitle, onRename, vip = false, title }: NameTagProps) {
  const [draft, setDraft] = useState<string | null>(null)

  if (draft !== null) {
    const save = () => {
      const next = draft.trim()
      if (next) onRename(next)
      setDraft(null)
    }
    return (
      <form
        className={`${styles.tag} ${styles.tagEditing}`}
        onSubmit={(e) => {
          e.preventDefault()
          save()
        }}
      >
        <span className={styles.tagHole} aria-hidden="true" />
        <label className={styles.tagEditLabel} htmlFor="pet-name">
          Name your Rocky
        </label>
        <input
          id="pet-name"
          className={styles.tagInput}
          value={draft}
          maxLength={24}
          autoFocus
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Escape' && setDraft(null)}
        />
        <div className={styles.tagEditActions}>
          <button type="submit" className={styles.tagSave}>
            Save name
          </button>
          <button type="button" className={styles.tagCancel} onClick={() => setDraft(null)}>
            Cancel
          </button>
        </div>
      </form>
    )
  }

  return (
    <button className={styles.tag} onClick={() => setDraft(name)} aria-label={`${name}. Rename your Rocky`}>
      <span className={styles.tagHole} aria-hidden="true" />
      <span className={styles.tagName}>
        {name} <NameBadges staff={vip} title={title} size="md" />
      </span>
      <span className={styles.tagSub}>{subtitle}</span>
      <span className={styles.tagEdit}>Rename</span>
    </button>
  )
}
