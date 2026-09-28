import { useEffect, useRef, useState } from 'react'
import { isUsable, itemsFor, MAX_DECOR, type ClosetItem, type ItemSlot, type Outfit, type ProgressFacts } from '../../game/closet'
import { TREAT_BAG } from '../../game/economy'
import { DECOR_ART, FX_ART, HAT_ART, SceneArt } from './art'
import { Coin } from './Coin'
import styles from './Shop.module.css'

type Tab = ItemSlot | 'treats'

const TABS: { id: Tab; label: string }[] = [
  { id: 'hat', label: 'Hats' },
  { id: 'scene', label: 'Places' },
  { id: 'decor', label: 'Decor' },
  { id: 'fx', label: 'Ambience' },
  { id: 'treats', label: 'Treats' },
]

interface Props {
  open: boolean
  onClose: () => void
  outfit: Outfit
  facts: ProgressFacts
  owned: readonly string[]
  /** Items an admin gifted (usable regardless of progress). */
  granted: readonly string[]
  /** The shop with any admin price/availability edits. */
  catalog: ClosetItem[]
  coins: number
  treats: number
  onChange: (outfit: Outfit) => void
  /** Buys an item; true when the purchase went through. */
  onBuy: (id: string) => boolean
  onBuyTreats: () => void
}

/**
 * Rocky's shop: looks, places, decor and ambience for Rocky's world. Items
 * unlock through real progress (level, streaks, badges) and are bought with
 * coins earned by the same work. Rocky stays visible while shopping so every
 * item can be tried on.
 */
export function ShopPanel({ open, onClose, outfit, facts, owned, granted, catalog, coins, treats, onChange, onBuy, onBuyTreats }: Props) {
  const [tab, setTab] = useState<Tab>('hat')
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  function isEquipped(slot: ItemSlot, id: string) {
    if (slot === 'hat') return outfit.hat === id
    if (slot === 'scene') return outfit.scene === id
    if (slot === 'fx') return outfit.fx === id
    return outfit.decor.includes(id)
  }

  function equip(slot: ItemSlot, id: string) {
    if (slot === 'hat') onChange({ ...outfit, hat: outfit.hat === id ? null : id })
    else if (slot === 'scene') onChange({ ...outfit, scene: id })
    else if (slot === 'fx') onChange({ ...outfit, fx: outfit.fx === id ? null : id })
    else {
      const has = outfit.decor.includes(id)
      const decor = has ? outfit.decor.filter((d) => d !== id) : [...outfit.decor, id].slice(-MAX_DECOR)
      onChange({ ...outfit, decor })
    }
  }

  // Items taken out of the shop by an admin stay visible only to agents who already have them.
  const items = tab === 'treats' ? [] : itemsFor(tab, catalog).filter((i) => i.enabled !== false || isUsable(i, facts, owned, granted))

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <aside className={styles.shop} role="dialog" aria-modal="true" aria-labelledby="shop-title" onClick={(e) => e.stopPropagation()}>
        <header className={styles.head}>
          <div>
            <h2 id="shop-title">Rocky's shop</h2>
            <p className={styles.sub}>Unlock with progress, buy with coins.</p>
          </div>
          <span className={styles.wallet} aria-label={`${coins} coins`}>
            <Coin /> {coins.toLocaleString()}
          </span>
          <button ref={closeRef} type="button" className={styles.close} onClick={onClose} aria-label="Close shop">
            ✕
          </button>
        </header>

        <div className={styles.tabs} role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              className={`${styles.tab} ${tab === t.id ? styles.tabOn : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'treats' ? (
          <div className={styles.treats}>
            <div className={styles.treatCard}>
              <span className={styles.treatArt} aria-hidden="true">
                🍎🍎🍎
              </span>
              <div>
                <strong>{TREAT_BAG.name}</strong>
                <p>
                  {TREAT_BAG.treats} extra treats for Rocky. You have {treats} {treats === 1 ? 'treat' : 'treats'} now.
                </p>
              </div>
              <button type="button" className={styles.buy} disabled={coins < TREAT_BAG.price} onClick={onBuyTreats}>
                <Coin /> {TREAT_BAG.price}
              </button>
            </div>
            <p className={styles.count}>Every check-in also brings 1 treat, and every clean QA audit 2.</p>
          </div>
        ) : (
          <>
            <p className={styles.count}>
              {items.filter((i) => isUsable(i, facts, owned, granted)).length} of {items.length} owned
              {tab === 'decor' ? ` · place up to ${MAX_DECOR}` : ''}
            </p>
            <ul className={styles.grid}>
              {items.map((item) => {
                const usable = isUsable(item, facts, owned, granted)
                const unlocked = usable || item.isUnlocked(facts)
                const on = usable && isEquipped(item.slot, item.id)
                const short = item.price - coins
                let state: string
                if (!unlocked) state = item.requirement
                else if (!usable) state = short > 0 ? `${short} more coins` : 'Tap to buy'
                else state = on ? (item.slot === 'hat' ? 'Wearing' : 'In use') : granted.includes(item.id) ? 'Gift · tap to use' : 'Tap to use'
                return (
                  <li key={item.id}>
                    <button
                      className={`${styles.item} ${on ? styles.itemOn : ''} ${unlocked ? '' : styles.itemLocked}`}
                      disabled={!unlocked || (!usable && short > 0)}
                      aria-pressed={usable ? on : undefined}
                      onClick={() => {
                        if (usable) equip(item.slot, item.id)
                        else if (onBuy(item.id)) equip(item.slot, item.id)
                      }}
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
                        {item.slot === 'fx' && FX_ART[item.id] && (
                          <svg viewBox="0 0 100 75" aria-hidden="true">
                            {FX_ART[item.id]}
                          </svg>
                        )}
                        {!unlocked && (
                          <span className={styles.lock} aria-hidden="true">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                              <rect x="5" y="11" width="14" height="10" rx="2" />
                              <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                            </svg>
                          </span>
                        )}
                        {unlocked && !usable && (
                          <span className={styles.price}>
                            <Coin /> {item.price}
                          </span>
                        )}
                      </span>
                      <span className={styles.name}>{item.name}</span>
                      <span className={styles.state}>{state}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </aside>
    </div>
  )
}
