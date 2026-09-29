import { useEffect, useMemo, useState } from 'react'
import { CLOSET, type ItemSlot } from '../../game/closet'
import { apiClient, type AdminCatalogItem, type AdminCollection, type AdminEconomy, type AuditRow } from '../../services/apiClient'
import styles from './AdminConsole.module.css'
import { Kpi } from './AdminConsole'
import { auditDetail, auditLabel, fmtDateTime, LEDGER_KIND_ES, SOURCE_ES } from './adminFormat'

const SLOT_ES: Record<ItemSlot, string> = {
  hat: 'Gorros',
  glasses: 'Gafas',
  neck: 'Cuello',
  back: 'Espalda',
  body: 'Camisetas',
  scene: 'Lugares',
  decor: 'Decoración',
  fx: 'Ambientación',
  aura: 'Aura',
  bubble: 'Burbujas de chat',
}
const itemName = (id: string | null) => (id ? (CLOSET.find((i) => i.id === id)?.name ?? id) : '')

function useLoad<T>(load: () => Promise<T>, onError: (m: string) => void): [T | null, () => void] {
  const [data, setData] = useState<T | null>(null)
  const [nonce, setNonce] = useState(0)
  useEffect(() => {
    let alive = true
    load()
      .then((d) => alive && setData(d))
      .catch((err) => onError(err instanceof Error ? err.message : String(err)))
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nonce])
  return [data, () => setNonce((n) => n + 1)]
}

/** Pilot-wide coins: totals, each agent's wallet and pet health, the latest movements. */
export function EconomyTab({ onOpen, onError }: { onOpen: (id: string) => void; onError: (m: string) => void }) {
  const [data] = useLoad<AdminEconomy>(apiClient.getEconomy, onError)
  if (!data) return <p className={styles.muted}>Cargando…</p>
  const t = data.totals
  return (
    <div className={styles.stack}>
      <div className={styles.kpiGrid}>
        <Kpi label="Coins ganados" value={t.earned.toLocaleString('es-CO')} hint="por check-ins, QA, logros, niveles, rachas y Note Check" />
        <Kpi label="Coins gastados" value={t.spent.toLocaleString('es-CO')} hint="en la tienda" />
        <Kpi label="Ajustes admin" value={t.adjustments > 0 ? `+${t.adjustments}` : t.adjustments} />
        <Kpi label="En circulación" value={t.balance.toLocaleString('es-CO')} hint="saldo total de los agentes" />
        <Kpi label="Vida promedio" value={data.needs.health} tone={data.needs.health < 50 ? 'warn' : 'good'} />
        <Kpi label="Felicidad promedio" value={data.needs.happiness} tone={data.needs.happiness < 40 ? 'warn' : undefined} />
        <Kpi label="Limpieza promedio" value={100 - data.needs.dirt} tone={data.needs.dirt > 60 ? 'warn' : undefined} />
      </div>

      <section className={styles.card}>
        <h3>Billeteras</h3>
        <p className={styles.cardSub}>Toca un agente para ajustar sus coins, regalar accesorios o revisar su historial.</p>
        <div className={styles.tableCard}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Agente</th>
                <th>Saldo</th>
                <th>Ganados</th>
                <th>Gastados</th>
                <th>Ajustes</th>
                <th>Accesorios</th>
                <th>Vida</th>
                <th>Felicidad</th>
                <th>Limpieza</th>
              </tr>
            </thead>
            <tbody>
              {data.agents.map((a) => (
                <tr key={a.agentId} className={styles.clickRow} onClick={() => onOpen(a.agentId)}>
                  <td>{a.agentId}</td>
                  <td>
                    <b>{a.balance}</b>
                  </td>
                  <td>{a.earned}</td>
                  <td>{a.spent}</td>
                  <td>{a.adjust}</td>
                  <td>{a.items}</td>
                  <td>{Math.round(a.needs.health)}</td>
                  <td>{Math.round(a.needs.happiness)}</td>
                  <td>{Math.round(100 - a.needs.dirt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.card}>
        <h3>Últimos movimientos</h3>
        {data.ledger.length === 0 ? (
          <p className={styles.empty}>Todavía no hay compras ni ajustes.</p>
        ) : (
          <div className={styles.tableCard}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Agente</th>
                  <th>Movimiento</th>
                  <th>Coins</th>
                  <th>Por</th>
                </tr>
              </thead>
              <tbody>
                {data.ledger.map((l) => (
                  <tr key={l.id} className={styles.clickRow} onClick={() => onOpen(l.agentId)}>
                    <td>{fmtDateTime(l.createdAt)}</td>
                    <td>{l.agentId}</td>
                    <td>
                      {LEDGER_KIND_ES[l.kind] ?? l.kind}
                      {l.itemId ? ` · ${itemName(l.itemId)}` : ''}
                      {l.note ? <span className={styles.muted}> · {l.note}</span> : null}
                    </td>
                    <td style={{ color: l.delta >= 0 ? '#008c45' : '#c0392b', fontWeight: 700 }}>{l.delta > 0 ? `+${l.delta}` : l.delta}</td>
                    <td className={styles.muted}>{l.actor === l.agentId ? 'agente' : l.actor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

/** The shop catalogue: change prices, take items out of the shop, restore defaults. */
export function ShopTab({ onChanged, onError }: { onChanged: (m: string) => void; onError: (m: string) => void }) {
  const [data, reload] = useLoad(apiClient.getCatalog, onError)
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const bySlot = useMemo(() => {
    const groups: Partial<Record<ItemSlot, AdminCatalogItem[]>> = {}
    for (const item of data?.items ?? []) (groups[item.slot as ItemSlot] ??= []).push(item)
    return groups
  }, [data])

  async function save(item: AdminCatalogItem, value: { price?: number | null; enabled?: boolean | null }, message: string) {
    setBusy(true)
    try {
      await apiClient.setCatalogItem(item.id, value)
      onChanged(message)
      setDrafts((d) => {
        const next = { ...d }
        delete next[item.id]
        return next
      })
      reload()
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  if (!data) return <p className={styles.muted}>Cargando…</p>
  return (
    <div className={styles.stack}>
      <Collections collections={data.collections ?? []} items={data.items} onChanged={(m) => (onChanged(m), reload())} onError={onError} />
      <p className={styles.muted}>
        Los cambios aplican a todos los agentes de inmediato y quedan en la auditoría. Un accesorio retirado de la tienda sigue funcionando para quien
        ya lo tiene. Para dárselo a alguien sin que lo compre, usa “Regalar” en la ficha del agente.
      </p>
      {([...(Object.keys(SLOT_ES) as ItemSlot[]), 'food', 'soap'] as ItemSlot[]).map((slot) => (
        <section key={slot} className={styles.card}>
          <h3>{SLOT_ES[slot] ?? (String(slot) === 'food' ? 'Comida' : 'Jabones')}</h3>
          <div className={styles.tableCard}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Accesorio</th>
                  <th>Se desbloquea</th>
                  <th>Precio</th>
                  <th>En la tienda</th>
                </tr>
              </thead>
              <tbody>
                {(bySlot[slot] ?? []).map((item) => {
                  const draft = drafts[item.id]
                  const parsed = Number(draft)
                  const canSave = draft !== undefined && Number.isInteger(parsed) && parsed >= 0 && parsed !== item.price
                  return (
                    <tr key={item.id}>
                      <td>
                        <b>{item.name}</b>
                        {item.collection && (
                          <span className={styles.muted}> {item.collection === 'spooky' ? '🎃 Temporada Spooky' : '🎄 Temporada Holidays'}</span>
                        )}
                      </td>
                      <td className={styles.muted}>{item.requirement}</td>
                      <td>
                        <form
                          className={styles.inlineForm}
                          onSubmit={(e) => {
                            e.preventDefault()
                            if (canSave) void save(item, { price: parsed }, `Precio de ${item.name}: ${parsed} coins.`)
                          }}
                        >
                          <input
                            type="number"
                            min={0}
                            value={draft ?? item.price}
                            onChange={(e) => setDrafts((d) => ({ ...d, [item.id]: e.target.value }))}
                            aria-label={`Precio de ${item.name}`}
                            style={{ width: 90 }}
                          />
                          {canSave && (
                            <button className={styles.btnPrimary} disabled={busy}>
                              Guardar
                            </button>
                          )}
                          {item.price !== item.basePrice && !canSave && (
                            <button
                              type="button"
                              className={styles.linkBtn}
                              disabled={busy}
                              onClick={() => void save(item, { price: null }, `Precio de ${item.name} restaurado.`)}
                            >
                              original ({item.basePrice})
                            </button>
                          )}
                        </form>
                      </td>
                      <td>
                        <label className={styles.inlineForm}>
                          <input
                            type="checkbox"
                            checked={item.enabled}
                            disabled={busy}
                            onChange={(e) =>
                              void save(
                                item,
                                { enabled: e.target.checked },
                                `${item.name} ${e.target.checked ? 'vuelve a la tienda' : 'retirado de la tienda'}.`,
                              )
                            }
                          />
                          {item.enabled ? 'Disponible' : 'Retirado'}
                        </label>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  )
}

/** Every recorded action across the pilot, newest first, filterable. */
export function AuditTab({ onOpen, onError }: { onOpen: (id: string) => void; onError: (m: string) => void }) {
  const [data] = useLoad<{ entries: AuditRow[] }>(apiClient.getAudit, onError)
  const [filter, setFilter] = useState<'all' | 'auth' | 'pet' | 'qa' | 'admin'>('all')
  const [query, setQuery] = useState('')
  if (!data) return <p className={styles.muted}>Cargando…</p>
  const q = query.trim().toLowerCase()
  const rows = data.entries.filter(
    (e) =>
      (filter === 'all' || e.action.startsWith(`${filter}.`) || (filter === 'auth' && e.action.startsWith('agent.'))) &&
      (!q || (e.agentId ?? '').includes(q) || e.actor.includes(q)),
  )
  return (
    <div className={styles.stack}>
      <div className={styles.toolbar}>
        <input className={styles.search} placeholder="Buscar por correo" value={query} onChange={(e) => setQuery(e.target.value)} />
        <select className={styles.select} value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)}>
          <option value="all">Todo</option>
          <option value="auth">Ingresos y perfil</option>
          <option value="pet">Cuidados y compras</option>
          <option value="qa">Auditorías QA</option>
          <option value="admin">Cambios de admin</option>
        </select>
      </div>
      <div className={styles.tableCard}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Agente</th>
              <th>Acción</th>
              <th>Detalle</th>
              <th>Por</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((e) => (
              <tr key={e.id} className={e.agentId ? styles.clickRow : undefined} onClick={() => e.agentId && onOpen(e.agentId)}>
                <td>{fmtDateTime(e.createdAt)}</td>
                <td>{e.agentId ?? '—'}</td>
                <td>{auditLabel(e.action)}</td>
                <td className={styles.muted}>{auditDetail(e.detail)}</td>
                <td className={styles.muted}>
                  {e.actor === e.agentId ? 'agente' : e.actor}
                  {e.source ? ` · ${SOURCE_ES[e.source] ?? e.source}` : ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className={styles.empty}>Sin registros con ese filtro.</p>}
      </div>
    </div>
  )
}

/** Seasonal collections: closed by default (exclusive); the admin opens each one, optionally for a date window. */
function Collections({
  collections,
  items,
  onChanged,
  onError,
}: {
  collections: AdminCollection[]
  items: AdminCatalogItem[]
  onChanged: (m: string) => void
  onError: (m: string) => void
}) {
  const [drafts, setDrafts] = useState<Record<string, { from: string; until: string }>>({})
  const [busy, setBusy] = useState(false)

  async function save(c: AdminCollection, enabled: boolean) {
    const d = drafts[c.id] ?? { from: c.from ?? '', until: c.until ?? '' }
    setBusy(true)
    try {
      await apiClient.setCollection(c.id, { enabled, from: d.from || null, until: d.until || null })
      onChanged(
        enabled
          ? `${c.emoji} ${c.name} ${d.from || d.until ? `programada ${d.from || '…'} → ${d.until || '…'}` : 'abierta'}.`
          : `${c.emoji} ${c.name} cerrada.`,
      )
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className={styles.card}>
      <h3>Temporadas exclusivas</h3>
      <p className={styles.muted}>
        Los objetos de temporada solo se pueden comprar mientras su temporada está abierta. Ábrela ya o prográmala con fechas (se abre y se cierra
        sola). Quien ya los compró los conserva cuando la temporada cierra.
      </p>
      <div className={styles.collections}>
        {collections.map((c) => {
          const d = drafts[c.id] ?? { from: c.from ?? '', until: c.until ?? '' }
          const count = items.filter((i) => i.collection === c.id).length
          const status = c.open ? 'Abierta' : c.enabled ? 'Programada' : 'Cerrada'
          return (
            <div key={c.id} className={styles.collection} data-open={c.open}>
              <div className={styles.collectionHead}>
                <b>
                  {c.emoji} {c.name}
                </b>
                <span className={c.open ? styles.statusOk : styles.statusWarn}>{status}</span>
              </div>
              <p className={styles.muted}>
                {c.blurb} {count} objetos.
                {c.enabled && (c.from || c.until) ? ` Ventana: ${c.from ?? 'ya'} → ${c.until ?? 'sin fin'}.` : ''}
              </p>
              <div className={styles.inlineForm}>
                <label>
                  Desde
                  <input type="date" value={d.from} onChange={(e) => setDrafts((x) => ({ ...x, [c.id]: { ...d, from: e.target.value } }))} />
                </label>
                <label>
                  Hasta
                  <input type="date" value={d.until} onChange={(e) => setDrafts((x) => ({ ...x, [c.id]: { ...d, until: e.target.value } }))} />
                </label>
              </div>
              <div className={styles.actionRow}>
                <button className={styles.btnPrimary} disabled={busy} onClick={() => void save(c, true)}>
                  {d.from || d.until ? 'Programar / abrir' : 'Abrir ahora'}
                </button>
                <button className={styles.btnDangerOutline} disabled={busy || !c.enabled} onClick={() => void save(c, false)}>
                  Cerrar
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
