import { useEffect, useRef, useState } from 'react'
import { isUsable, itemsFor, MAX_DECOR, SINGLE_SLOTS, type ClosetItem, type ItemSlot, type Outfit, type ProgressFacts } from '../../game/closet'
import { WEAR_ART, WEAR_VIEWBOX, type WearSlot } from './wearables'
import { TREAT_BAG } from '../../game/economy'
import { DECOR_ART, FX_ART, HAT_ART, SceneArt } from './art'
import { Coin } from './Coin'
import styles from './Shop.module.css'

type Tab = Exclude<ItemSlot, 'neck' | 'back'> | 'clothes' | 'treats'

type Section = 'rocky' | 'world' | 'treats'

/** Two shops in one: things Rocky wears, and things that make up his world. */
const SECTIONS: { id: Section; label: string; hint: string; tabs: { id: Tab; label: string }[] }[] = [
  {
    id: 'rocky',
    label: 'Rocky',
    hint: 'Hats, glasses and clothes Rocky wears.',
    tabs: [
      { id: 'hat', label: 'Hats' },
      { id: 'glasses', label: 'Glasses' },
      { id: 'clothes', label: 'Clothes' },
    ],
  },
  {
    id: 'world',
    label: 'World',
    hint: 'Backgrounds, things that live with Rocky, and ambience.',
    tabs: [
      { id: 'scene', label: 'Backgrounds' },
      { id: 'decor', label: 'Items' },
      { id: 'fx', label: 'Ambience' },
    ],
  },
  { id: 'treats', label: 'Treats', hint: 'Snacks for Rocky.', tabs: [{ id: 'treats', label: 'Treats' }] },
]
const sectionOf = (tab: Tab): Section => SECTIONS.find((s) => s.tabs.some((t) => t.id === tab))!.id

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
  /** Closes the shop and lets the agent drag Rocky's things around the scene. */
  onArrange?: () => void
  /** Which part of the shop opens first. */
  initialTab?: Tab
}

export type ShopTab = Tab

/**
 * Rocky's shop: looks, places, decor and ambience for Rocky's world. Items
 * unlock through real progress (level, streaks, badges) and are bought with
 * coins earned by the same work. Rocky stays visible while shopping so every
 * item can be tried on.
 */
export function ShopPanel({
  open,
  onClose,
  outfit,
  facts,
  owned,
  granted,
  catalog,
  coins,
  treats,
  onChange,
  onBuy,
  onBuyTreats,
  onArrange,
  initialTab = 'hat',
}: Props) {
  const [tab, setTab] = useState<Tab>(initialTab)
  useEffect(() => {
    if (open) setTab(initialTab)
  }, [open, initialTab])
  const section = SECTIONS.find((s) => s.id === sectionOf(tab))!
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const isSingle = (slot: ItemSlot): slot is (typeof SINGLE_SLOTS)[number] => (SINGLE_SLOTS as readonly string[]).includes(slot)

  function isEquipped(slot: ItemSlot, id: string) {
    if (slot === 'scene') return outfit.scene === id
    if (isSingle(slot)) return outfit[slot] === id
    return outfit.decor.includes(id)
  }

  function equip(slot: ItemSlot, id: string) {
    if (slot === 'scene') onChange({ ...outfit, scene: id })
    else if (isSingle(slot)) onChange({ ...outfit, [slot]: outfit[slot] === id ? null : id })
    else {
      const has = outfit.decor.includes(id)
      const decor = has ? outfit.decor.filter((d) => d !== id) : [...outfit.decor, id].slice(-MAX_DECOR)
      onChange({ ...outfit, decor })
    }
  }

  // Items taken out of the shop by an admin stay visible only to agents who already have them.
  const tabItems = tab === 'treats' ? [] : tab === 'clothes' ? [...itemsFor('neck', catalog), ...itemsFor('back', catalog)] : itemsFor(tab, catalog)
  const items = tabItems.filter((i) => i.enabled !== false || isUsable(i, facts, owned, granted))

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

        <div className={styles.tabs} role="tablist" aria-label="Shop sections">
          {SECTIONS.map((sec) => (
            <button
              key={sec.id}
              role="tab"
              aria-selected={section.id === sec.id}
              className={`${styles.tab} ${section.id === sec.id ? styles.tabOn : ''}`}
              onClick={() => setTab(sec.tabs[0]!.id)}
            >
              {sec.label}
            </button>
          ))}
        </div>
        {section.tabs.length > 1 && (
          <div className={styles.subTabs} role="tablist" aria-label={`${section.label} categories`}>
            {section.tabs.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                className={`${styles.subTab} ${tab === t.id ? styles.subTabOn : ''}`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}
        <p className={styles.sectionHint}>{section.hint}</p>
        {section.id === 'world' && onArrange && (
          <button type="button" className={styles.arrange} onClick={onArrange}>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M12 3v18M3 12h18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3" />
            </svg>
            Arrange my world
            <small>Drag Rocky's things around the scene</small>
          </button>
        )}

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
              {tab === 'decor' ? ` · ${outfit.decor.length}/${MAX_DECOR} placed · tap them in the world and Rocky plays with them` : ''}
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
                else
                  state = on
                    ? ['hat', 'glasses', 'neck', 'back'].includes(item.slot)
                      ? 'Wearing'
                      : 'In use'
                    : granted.includes(item.id)
                      ? 'Gift · tap to use'
                      : 'Tap to use'
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
                        {(item.slot === 'glasses' || item.slot === 'neck' || item.slot === 'back') && WEAR_ART[item.slot as WearSlot][item.id] && (
                          <svg viewBox={WEAR_VIEWBOX[item.slot as WearSlot]} aria-hidden="true">
                            {WEAR_ART[item.slot as WearSlot][item.id]}
                          </svg>
                        )}
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
