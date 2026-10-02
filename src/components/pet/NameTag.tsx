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
  tester?: boolean
  honors?: { arcade: string[]; rotw: boolean }
}

/**
 * Rocky's name, printed on an RLX shipping tag that hangs off the habitat.
 * Tapping it renames the pet — the name only lives on this device.
 */
export function NameTag({ name, subtitle, onRename, vip = false, title, tester, honors }: NameTagProps) {
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
        {name} <NameBadges staff={vip} title={title} tester={tester} honors={honors} size="md" />
      </span>
      <span className={styles.tagSub}>{subtitle}</span>
      <span className={styles.tagEdit} title="Rename" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 20h4L19 9l-4-4L4 16v4Z" />
          <path d="M13.5 6.5l4 4" />
        </svg>
      </span>
    </button>
  )
}
