import { useEffect, useRef, useState, type ReactElement } from 'react'
import {
  collectionOpen,
  isUsable,
  itemsFor,
  MAX_DECOR,
  SINGLE_SLOTS,
  type ClosetItem,
  type ItemSlot,
  type Outfit,
  type ProgressFacts,
} from '../../game/closet'
import { WEAR_ART, WEAR_VIEWBOX, type WearSlot } from './wearables'
import { TREAT_BAG } from '../../game/economy'
import { FOODS, SOAPS, STARTER_SOAP, type Season } from '../../game/pantry'
import { DECOR_ART, FX_ART, HAT_ART, SceneArt } from './art'
import { FOOD_ART, SOAP_ART } from './items'
import { fxPreview } from './FxLayer'
import { Coin } from './Coin'
import styles from './Shop.module.css'

type Tab = Exclude<ItemSlot, 'body' | 'aura'> | 'style' | 'treats' | 'food' | 'soap' | 'spooky' | 'holiday'
export type ShopTab = Tab

type Section = 'rocky' | 'world' | 'chat' | 'pantry' | 'seasonal'

/** Five shops in one, each split by kind so everything is easy to find. */
const SECTIONS: { id: Section; label: string; hint: string; tabs: { id: Tab; label: string }[] }[] = [
  {
    id: 'rocky',
    label: 'Rocky',
    hint: 'Everything Rocky wears, from head to wings.',
    tabs: [
      { id: 'hat', label: '🎩 Hats' },
      { id: 'glasses', label: '🕶️ Glasses' },
      { id: 'neck', label: '🎀 Neck' },
      { id: 'back', label: '🪽 Wings & backs' },
      { id: 'style', label: '✨ Style' },
    ],
  },
  {
    id: 'world',
    label: 'Home',
    hint: 'Backgrounds, things that live with Rocky, and ambience effects.',
    tabs: [
      { id: 'scene', label: '🏞️ Backgrounds' },
      { id: 'decor', label: '🪴 Items' },
      { id: 'fx', label: '❄️ Effects' },
    ],
  },
  {
    id: 'chat',
    label: 'Chat',
    hint: 'How your messages look to everyone in Rocky chat.',
    tabs: [{ id: 'bubble', label: '💬 Chat bubbles' }],
  },
  {
    id: 'pantry',
    label: 'Pantry',
    hint: 'Snacks to drag onto Rocky, and soaps to scrub him with.',
    tabs: [
      { id: 'food', label: '🍎 Food' },
      { id: 'soap', label: '🧼 Soaps' },
      { id: 'treats', label: '🎁 Treat bags' },
    ],
  },
  {
    id: 'seasonal',
    label: 'Seasonal',
    hint: 'Limited specials for Spooky season and the holidays.',
    tabs: [
      { id: 'spooky', label: '🎃 Spooky' },
      { id: 'holiday', label: '🎄 Holidays' },
    ],
  },
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
  /** Foods (counts) and soaps the agent has. */
  inventory?: Record<string, number>
  /** Admin price/availability edits for pantry items. */
  pantryOverrides?: Record<string, { price?: number; enabled?: boolean }>
  onBuyFood?: (id: string) => void
  onBuySoap?: (id: string) => void
}

/**
 * Rocky's shop. Looks and world items unlock through real progress (level,
 * streaks, badges) and are bought with coins earned by the same work;
 * seasonal specials and the pantry are open to everyone. Rocky stays
 * visible while shopping so every item can be tried on.
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
  inventory = {},
  pantryOverrides = {},
  onBuyFood,
  onBuySoap,
}: Props) {
  const [tab, setTab] = useState<Tab>(initialTab)
  const closeRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (open) setTab(initialTab)
  }, [open, initialTab])

  useEffect(() => {
    if (!open) return
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  const section = SECTIONS.find((s) => s.id === sectionOf(tab))!

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
  const visible = (i: ClosetItem) => (i.staff ? granted.includes(i.id) : i.enabled !== false || isUsable(i, facts, owned, granted))
  const closetFor = (t: Tab): ClosetItem[] => {
    if (t === 'style') return [...itemsFor('body', catalog, granted), ...itemsFor('aura', catalog, granted)]
    if (t === 'spooky' || t === 'holiday') return catalog.filter((i) => i.season === t)
    if (t === 'hat' || t === 'glasses' || t === 'neck' || t === 'back' || t === 'scene' || t === 'decor' || t === 'fx' || t === 'bubble')
      return itemsFor(t, catalog, granted)
    return []
  }
  const items = closetFor(tab).filter(visible)
  const season: Season | null = tab === 'spooky' || tab === 'holiday' ? tab : null
  const pantryPrice = (id: string, base: number) => {
    const p = pantryOverrides[id]?.price
    return typeof p === 'number' ? p : base
  }
  // Seasonal specials are exclusive: on sale only while QA has their season open.
  const onSale = (x: { id: string; season?: Season }) =>
    pantryOverrides[x.id]?.enabled !== false && (!x.season || collectionOpen(pantryOverrides, x.season))
  const seasonOpen = season !== null && collectionOpen(pantryOverrides, season)
  const foods = FOODS.filter((f) => onSale(f) && (tab === 'food' ? true : season !== null && f.season === season))
  const soaps = SOAPS.filter((s) => s.price > 0 && onSale(s) && (tab === 'soap' ? true : season !== null && s.season === season))

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
              className={`${styles.tab} ${section.id === sec.id ? styles.tabOn : ''} ${sec.id === 'seasonal' ? styles.tabSeasonal : ''}`}
              onClick={() => setTab(sec.tabs[0]!.id)}
            >
              {sec.label}
            </button>
          ))}
        </div>
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

        {season && !seasonOpen && (
          <p className={styles.closedSeason}>
            {season === 'spooky' ? '🎃 Spooky season' : '🎄 The holiday season'} isn’t open right now — these are exclusives that QA releases for a
            limited time. Anything you already got stays yours.
          </p>
        )}

        {tab === 'treats' && (
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
        )}

        {(foods.length > 0 || soaps.length > 0) && (tab === 'food' || tab === 'soap' || season) && (
          <>
            {season && <h3 className={styles.groupTitle}>Pantry specials</h3>}
            <ul className={styles.grid}>
              {foods.map((f) => (
                <PantryCard
                  key={f.id}
                  name={f.name}
                  art={FOOD_ART[f.id]}
                  price={pantryPrice(f.id, f.price)}
                  coins={coins}
                  status={inventory[f.id] ? `You have ${inventory[f.id]}` : `+${f.health} health · +${f.happiness} happy`}
                  onBuy={() => onBuyFood?.(f.id)}
                />
              ))}
              {soaps.map((s) => (
                <PantryCard
                  key={s.id}
                  name={s.name}
                  art={SOAP_ART[s.id] ?? SOAP_ART[STARTER_SOAP]}
                  price={pantryPrice(s.id, s.price)}
                  coins={coins}
                  owned={Boolean(inventory[s.id])}
                  status={inventory[s.id] ? 'In your bag' : `Bath +${s.happiness} happiness`}
                  onBuy={() => onBuySoap?.(s.id)}
                />
              ))}
            </ul>
            {tab === 'food' && <p className={styles.count}>Food goes into Rocky's bag — open it with the Food button and drag a snack onto him.</p>}
            {tab === 'soap' && <p className={styles.count}>Soaps are yours for good. Open the bag with the Bath button and scrub away!</p>}
          </>
        )}

        {items.length > 0 && (
          <>
            {season && <h3 className={styles.groupTitle}>Looks and world</h3>}
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
                    ? ['hat', 'glasses', 'neck', 'back', 'body'].includes(item.slot)
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
                        <ItemPreview item={item} />
                        {item.season && (
                          <span className={styles.seasonTag} aria-hidden="true">
                            {item.season === 'spooky' ? '🎃' : '🎄'}
                          </span>
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

function ItemPreview({ item }: { item: ClosetItem }) {
  if (item.slot === 'hat' && HAT_ART[item.id])
    return (
      <svg viewBox="-4 -4 108 68" aria-hidden="true">
        {HAT_ART[item.id]!.svg}
      </svg>
    )
  if (item.slot === 'decor' && DECOR_ART[item.id])
    return (
      <svg viewBox={DECOR_ART[item.id]!.viewBox} aria-hidden="true">
        {DECOR_ART[item.id]!.svg}
      </svg>
    )
  if (item.slot === 'scene') return <SceneArt id={item.id} />
  if ((item.slot === 'glasses' || item.slot === 'neck' || item.slot === 'back' || item.slot === 'body') && WEAR_ART[item.slot as WearSlot][item.id])
    return (
      <svg viewBox={WEAR_VIEWBOX[item.slot as WearSlot]} aria-hidden="true">
        {WEAR_ART[item.slot as WearSlot][item.id]}
      </svg>
    )
  if (item.slot === 'fx' && (FX_ART[item.id] || fxPreview(item.id)))
    return (
      <svg viewBox="0 0 100 75" aria-hidden="true">
        {FX_ART[item.id] ?? fxPreview(item.id)}
      </svg>
    )
  if (item.slot === 'bubble')
    return (
      <span className={`${styles.bubblePreview} chat-bubble-${item.id}`} aria-hidden="true">
        Hi team! 👋
      </span>
    )
  if (item.slot === 'aura')
    return (
      <svg viewBox="0 0 100 75" aria-hidden="true">
        <defs>
          <radialGradient id="aura-prev" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#fff3b0" />
            <stop offset="0.45" stopColor="#f5b82e" stopOpacity="0.8" />
            <stop offset="0.75" stopColor="#a78bfa" stopOpacity="0.35" />
            <stop offset="1" stopColor="#a78bfa" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="50" cy="37" r="36" fill="url(#aura-prev)" />
        {Array.from({ length: 12 }, (_, i) => (
          <path key={i} d="M50 37 L48 4 L52 4 Z" fill="#fff6c2" opacity="0.7" transform={`rotate(${i * 30} 50 37)`} />
        ))}
        <ellipse cx="50" cy="66" rx="30" ry="6" fill="none" stroke="#ffd24a" strokeWidth="2" />
        <circle cx="50" cy="37" r="9" fill="#ffffff" />
      </svg>
    )
  return null
}

function PantryCard({
  name,
  art,
  price,
  coins,
  status,
  owned = false,
  onBuy,
}: {
  name: string
  art: ReactElement | undefined
  price: number
  coins: number
  status: string
  owned?: boolean
  onBuy: () => void
}) {
  return (
    <li>
      <button
        className={`${styles.item} ${owned ? styles.itemOn : ''}`}
        disabled={owned || coins < price}
        onClick={onBuy}
        aria-label={`Buy ${name} for ${price} coins`}
      >
        <span className={styles.preview} data-slot="pantry">
          {art && (
            <svg viewBox="0 0 40 40" aria-hidden="true">
              {art}
            </svg>
          )}
          {!owned && (
            <span className={styles.price}>
              <Coin /> {price}
            </span>
          )}
        </span>
        <span className={styles.name}>{name}</span>
        <span className={styles.state}>{owned ? 'Owned' : coins < price ? `${price - coins} more coins` : status}</span>
      </button>
    </li>
  )
}
