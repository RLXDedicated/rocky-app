import type { ReactElement } from 'react'
import styles from './World.module.css'

export type TrayTab = 'food' | 'soap'

export interface TrayItem {
  id: string
  name: string
  /** How many are left (foods); null for tools (soaps). */
  count: number | null
  art: ReactElement
  /** Short effect line, e.g. "+12 health". */
  hint: string
}

interface Props {
  tab: TrayTab
  onTab: (tab: TrayTab) => void
  onClose: () => void
  foods: TrayItem[]
  soaps: TrayItem[]
  /** Pointer went down on an item: the world takes over the drag. */
  onGrab: (item: TrayItem, tab: TrayTab, e: React.PointerEvent<HTMLButtonElement>) => void
  /** Keyboard/click use without dragging. */
  onUse: (item: TrayItem, tab: TrayTab) => void
  onShop: () => void
}

/**
 * Rocky's bag: foods to drag onto him, and soaps to scrub him with. Every
 * item can also be used with a tap or the keyboard (Enter/Space).
 */
export function InventoryTray({ tab, onTab, onClose, foods, soaps, onGrab, onUse, onShop }: Props) {
  const items = tab === 'food' ? foods : soaps
  return (
    <div className={styles.tray} role="dialog" aria-label="Rocky's bag">
      <div className={styles.trayHead}>
        <div className={styles.trayTabs} role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'food'}
            className={tab === 'food' ? styles.trayTabOn : ''}
            onClick={() => onTab('food')}
          >
            Food
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'soap'}
            className={tab === 'soap' ? styles.trayTabOn : ''}
            onClick={() => onTab('soap')}
          >
            Bath
          </button>
        </div>
        <p className={styles.trayHint}>{tab === 'food' ? 'Drag a snack onto Rocky' : 'Drag the soap onto Rocky and scrub!'}</p>
        <button type="button" className={styles.trayClose} onClick={onClose} aria-label="Close the bag">
          ✕
        </button>
      </div>
      <ul className={styles.trayItems}>
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              className={styles.trayItem}
              disabled={item.count === 0}
              onPointerDown={(e) => {
                if (e.button !== 0 || item.count === 0) return
                onGrab(item, tab, e)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onUse(item, tab)
                }
              }}
              aria-label={`${item.name}${item.count !== null ? `, ${item.count} left` : ''}. ${item.hint}`}
              title={`${item.name} · ${item.hint}`}
            >
              <svg viewBox="0 0 40 40" aria-hidden="true">
                {item.art}
              </svg>
              {item.count !== null && <b>{item.count}</b>}
              <span>{item.name}</span>
            </button>
          </li>
        ))}
        <li>
          <button type="button" className={`${styles.trayItem} ${styles.trayMore}`} onClick={onShop}>
            <span aria-hidden="true">＋</span>
            <span>{tab === 'food' ? 'More food' : 'More soaps'}</span>
          </button>
        </li>
      </ul>
    </div>
  )
}
