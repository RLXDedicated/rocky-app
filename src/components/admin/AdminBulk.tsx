import { useMemo, useState } from 'react'
import { CLOSET } from '../../game/closet'
import { FOODS, SOAPS } from '../../game/pantry'
import { apiClient, type AdminAgentSummary, type BulkOp } from '../../services/apiClient'
import styles from './AdminConsole.module.css'

type Kind = BulkOp['kind']

const KINDS: { id: Kind; label: string; hint: string }[] = [
  { id: 'coins', label: 'Coins', hint: 'Otorga (o descuenta) coins. Queda en el ledger de cada agente.' },
  { id: 'xp', label: 'Experiencia (XP)', hint: 'XP extra como evento XP_GRANT: sube niveles y evoluciones.' },
  { id: 'item', label: 'Regalar accesorio', hint: 'Cualquier accesorio, fondo, objeto o efecto — gratis y sin requisitos.' },
  { id: 'inventory', label: 'Comida / jabón', hint: 'Pone comida (o un jabón) en la bolsa de cada Rocky.' },
  { id: 'treats', label: 'Premios', hint: 'Premios básicos extra (los que se ganan con check-ins).' },
  { id: 'message', label: 'Mensaje', hint: 'Rocky se lo dice al agente al abrir la app; queda en su buzón.' },
  { id: 'needs', label: 'Restaurar necesidades', hint: 'Vida, felicidad y limpieza al 100%.' },
  { id: 'litter', label: 'Limpiar basura', hint: 'Quita la basura del mundo de cada Rocky.' },
  { id: 'games', label: 'Reiniciar topes de juegos', hint: 'Permite volver a ganar coins/XP en minijuegos hoy.' },
]

/** One-click seasonal events: several operations for everyone selected. */
const PRESETS: { label: string; ops: BulkOp[] }[] = [
  {
    label: '🎃 Kit de Halloween',
    ops: [
      { kind: 'item', itemId: 'decor-jack' },
      { kind: 'inventory', itemId: 'food-candy-corn', qty: 3 },
      { kind: 'message', text: 'Happy Spooky season! 🎃 A jack-o’-lantern and some candy corn for Rocky — keep those notes spotless!' },
    ],
  },
  {
    label: '🎄 Kit navideño',
    ops: [
      { kind: 'item', itemId: 'decor-gifts' },
      { kind: 'inventory', itemId: 'food-cocoa', qty: 2 },
      { kind: 'message', text: 'Happy holidays from the QA team! 🎄 A gift pile and hot cocoa for Rocky. Thanks for great notes all year!' },
    ],
  },
  {
    label: '🌟 Semana perfecta',
    ops: [
      { kind: 'coins', delta: 100, note: 'Perfect notes week' },
      { kind: 'needs' },
      { kind: 'message', text: 'Perfect notes week! 🌟 100 bonus coins for Rocky. Keep it up!' },
    ],
  },
]

interface Props {
  agents: AdminAgentSummary[] | null
  onChanged: (message: string) => void
  onError: (message: string) => void
}

/** Admin superpowers: run one operation (or a seasonal kit) for many Rockys at once. */
export function BulkTab({ agents, onChanged, onError }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState('')
  const [kind, setKind] = useState<Kind>('coins')
  const [amount, setAmount] = useState('50')
  const [text, setText] = useState('')
  const [itemId, setItemId] = useState(CLOSET.find((i) => i.price > 0)!.id)
  const [pantryId, setPantryId] = useState(FOODS[0]!.id)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  const shown = useMemo(
    () => (agents ?? []).filter((a) => `${a.id} ${a.name} ${a.rockyName}`.toLowerCase().includes(filter.trim().toLowerCase())),
    [agents, filter],
  )
  const all = agents?.length ?? 0
  const target: string[] | 'all' = selected.size === all && all > 0 ? 'all' : [...selected]
  const count = selected.size

  function toggle(id: string) {
    setSelected((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function buildOp(): BulkOp | null {
    const n = Number(amount)
    switch (kind) {
      case 'coins':
        return Number.isInteger(n) && n !== 0 && text.trim() ? { kind, delta: n, note: text.trim() } : null
      case 'xp':
        return Number.isInteger(n) && n > 0 && text.trim() ? { kind, xp: n, reason: text.trim() } : null
      case 'treats':
        return Number.isInteger(n) && n !== 0 ? { kind, delta: n } : null
      case 'item':
        return { kind, itemId }
      case 'inventory':
        return Number.isInteger(n) && n !== 0 ? { kind, itemId: pantryId, qty: n } : null
      case 'message':
        return text.trim() ? { kind, text: text.trim().slice(0, 280) } : null
      default:
        return { kind } as BulkOp
    }
  }

  async function runOps(ops: BulkOp[], label: string) {
    if (count === 0) return
    if (
      !window.confirm(
        `¿Aplicar "${label}" a ${count === all ? `todos los agentes (${all})` : `${count} agente(s)`}? Queda en la auditoría de cada uno.`,
      )
    )
      return
    setBusy(true)
    setResult(null)
    try {
      let done = 0
      const failed: string[] = []
      for (const op of ops) {
        const r = await apiClient.bulk(target, op)
        done = Math.max(done, r.done)
        failed.push(...r.failed.map((f) => `${f.agentId}: ${f.error ?? 'error'}`))
      }
      const msg = `${label}: listo para ${done} agente(s).${failed.length ? ` Fallos: ${failed.slice(0, 3).join('; ')}` : ''}`
      setResult(msg)
      onChanged(msg)
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  const op = buildOp()
  const info = KINDS.find((k) => k.id === kind)!
  const needsAmount = kind === 'coins' || kind === 'xp' || kind === 'treats' || kind === 'inventory'
  const needsText = kind === 'coins' || kind === 'xp' || kind === 'message'

  return (
    <div className={styles.bulk}>
      <section className={styles.card}>
        <h3>1 · Elige a quién</h3>
        <div className={styles.inlineForm}>
          <input
            placeholder="Filtrar por correo, nombre o Rocky…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            aria-label="Filtrar agentes"
          />
          <button type="button" className={styles.btnGhost} onClick={() => setSelected(new Set((agents ?? []).map((a) => a.id)))}>
            Todos ({all})
          </button>
          <button type="button" className={styles.btnGhost} onClick={() => setSelected((s) => new Set([...s, ...shown.map((a) => a.id)]))}>
            + Filtrados ({shown.length})
          </button>
          <button type="button" className={styles.btnGhost} onClick={() => setSelected(new Set())}>
            Ninguno
          </button>
        </div>
        <p className={styles.muted}>
          {count === 0 ? 'Nadie seleccionado.' : count === all ? `Todos los agentes (${all}).` : `${count} seleccionado(s).`}
        </p>
        <ul className={styles.bulkList}>
          {shown.map((a) => (
            <li key={a.id}>
              <label>
                <input type="checkbox" checked={selected.has(a.id)} onChange={() => toggle(a.id)} />
                <span>
                  <b>{a.name && a.name !== 'Agent' ? a.name : a.id.split('@')[0]}</b> · {a.rockyName} · nivel {a.state.level}
                  <small>{a.id}</small>
                </span>
              </label>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.card}>
        <h3>2 · Elige qué hacer</h3>
        <div className={styles.subTabs}>
          {KINDS.map((k) => (
            <button key={k.id} type="button" className={`${styles.subTab} ${kind === k.id ? styles.subTabActive : ''}`} onClick={() => setKind(k.id)}>
              {k.label}
            </button>
          ))}
        </div>
        <p className={styles.muted}>{info.hint}</p>
        <div className={styles.inlineForm}>
          {kind === 'item' && (
            <select value={itemId} onChange={(e) => setItemId(e.target.value)} aria-label="Accesorio">
              {CLOSET.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.season === 'spooky' ? '🎃 ' : i.season === 'holiday' ? '🎄 ' : ''}
                  {i.name} ({i.slot})
                </option>
              ))}
            </select>
          )}
          {kind === 'inventory' && (
            <select value={pantryId} onChange={(e) => setPantryId(e.target.value)} aria-label="Comida o jabón">
              <optgroup label="Comida">
                {FOODS.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.emoji} {f.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Jabones">
                {SOAPS.map((x) => (
                  <option key={x.id} value={x.id}>
                    🧼 {x.name}
                  </option>
                ))}
              </optgroup>
            </select>
          )}
          {needsAmount && (
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} aria-label="Cantidad" style={{ width: 110 }} />
          )}
          {needsText && (
            <input
              placeholder={kind === 'message' ? 'Mensaje (máx. 280)' : 'Motivo (queda en el registro)'}
              value={text}
              maxLength={kind === 'message' ? 280 : 200}
              onChange={(e) => setText(e.target.value)}
              aria-label={kind === 'message' ? 'Mensaje' : 'Motivo'}
            />
          )}
          <button
            type="button"
            className={styles.btnPrimary}
            disabled={busy || !op || count === 0}
            onClick={() => op && void runOps([op], info.label)}
          >
            {busy ? 'Aplicando…' : `Aplicar a ${count || '…'}`}
          </button>
        </div>
        <h3>Eventos en un clic</h3>
        <div className={styles.actionRow}>
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              className={styles.btnGhost}
              disabled={busy || count === 0}
              onClick={() => void runOps(p.ops, p.label)}
            >
              {p.label}
            </button>
          ))}
        </div>
        {result && <p className={styles.muted}>{result}</p>}
      </section>
    </div>
  )
}
