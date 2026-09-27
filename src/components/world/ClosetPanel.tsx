import { useState } from 'react'
import { itemsFor, type ItemSlot, type Outfit, type ProgressFacts } from '../../game/closet'
import { DECOR_ART, HAT_ART, SceneArt } from './art'
import styles from './Closet.module.css'

const TABS: { slot: ItemSlot; label: string }[] = [
  { slot: 'hat', label: 'Hats' },
  { slot: 'scene', label: 'Places' },
  { slot: 'decor', label: 'Decor' },
]

const MAX_DECOR = 3

interface Props {
  outfit: Outfit
  facts: ProgressFacts
  onChange: (outfit: Outfit) => void
}

/** Rocky's closet. Items unlock through real progress — level, streaks and badges. */
export function ClosetPanel({ outfit, facts, onChange }: Props) {
  const [tab, setTab] = useState<ItemSlot>('hat')
  const items = itemsFor(tab)
  const unlockedCount = items.filter((i) => i.isUnlocked(facts)).length

  function isEquipped(id: string) {
    return tab === 'hat' ? outfit.hat === id : tab === 'scene' ? outfit.scene === id : outfit.decor.includes(id)
  }

  function toggle(id: string) {
    if (tab === 'hat') onChange({ ...outfit, hat: outfit.hat === id ? null : id })
    else if (tab === 'scene') onChange({ ...outfit, scene: id })
    else {
      const has = outfit.decor.includes(id)
      const decor = has ? outfit.decor.filter((d) => d !== id) : [...outfit.decor, id].slice(-MAX_DECOR)
      onChange({ ...outfit, decor })
    }
  }

  return (
    <section className={styles.closet} id="closet" aria-labelledby="closet-title">
      <header className={styles.head}>
        <div>
          <h2 id="closet-title" className="dot">
            Rocky's closet
          </h2>
          <p className={styles.sub}>Unlock new looks by checking in, keeping streaks and passing QA.</p>
        </div>
        <div className={styles.tabs} role="tablist">
          {TABS.map((t) => (
            <button key={t.slot} role="tab" aria-selected={tab === t.slot} className={`${styles.tab} ${tab === t.slot ? styles.tabOn : ''}`} onClick={() => setTab(t.slot)}>
              {t.label}
            </button>
          ))}
        </div>
      </header>
      <p className={styles.count}>
        {unlockedCount} of {items.length} unlocked{tab === 'decor' ? ` · place up to ${MAX_DECOR}` : ''}
      </p>
      <ul className={styles.grid}>
        {items.map((item) => {
          const unlocked = item.isUnlocked(facts)
          const on = isEquipped(item.id)
          return (
            <li key={item.id}>
              <button
                className={`${styles.item} ${on ? styles.itemOn : ''} ${unlocked ? '' : styles.itemLocked}`}
                disabled={!unlocked}
                aria-pressed={on}
                onClick={() => toggle(item.id)}
              >
                <span className={styles.preview} data-slot={item.slot}>
                  {item.slot === 'hat' && HAT_ART[item.id] && (
                    <svg viewBox="-4 -4 108 68" aria-hidden="true">
                      {HAT_ART[item.id]!.svg}
                    </svg>
                  )}
                  {item.slot === 'decor' && DECOR_ART[item.id] && (
                    <svg viewBox={DECOR_ART[item.id]!.viewBox} aria-hidden="true">
                      {DECOR_ART[item.id]!.svg}
                    </svg>
                  )}
                  {item.slot === 'scene' && <SceneArt id={item.id} />}
                  {!unlocked && (
                    <span className={styles.lock} aria-hidden="true">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                        <rect x="5" y="11" width="14" height="10" rx="2" />
                        <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                      </svg>
                    </span>
                  )}
                </span>
                <span className={styles.name}>{item.name}</span>
                <span className={styles.state}>{unlocked ? (on ? 'Wearing' : 'Tap to use') : item.requirement}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
