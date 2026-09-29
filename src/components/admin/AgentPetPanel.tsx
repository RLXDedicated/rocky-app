import { useCallback, useEffect, useState } from 'react'
import { adminUnlocked, CLOSET, resolveCatalog, SHOP_UNLOCK, sectionUnlock, type ItemSlot } from '../../game/closet'
import { ShopPanel } from '../world/ShopPanel'
import { FOODS, SOAPS, findFood, findSoap, GAME_CAPS } from '../../game/pantry'
import { apiClient, type AdminPetDetail } from '../../services/apiClient'
import styles from './AdminConsole.module.css'
import { auditDetail, auditLabel, fmtDateTime, LEDGER_KIND_ES, shortDevice, SOURCE_ES } from './adminFormat'

export type PetTab = 'pet' | 'audit' | 'access'

interface Props {
  agentId: string
  tab: PetTab
  onChanged: (message: string) => void
  onError: (message: string) => void
}

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

function Meter({ label, value, invert = false }: { label: string; value: number; invert?: boolean }) {
  const shown = Math.round(invert ? 100 - value : value)
  return (
    <div className={styles.barRow}>
      <span>{label}</span>
      <span className={styles.barTrack}>
        <span className={styles.barFill} style={{ width: `${shown}%`, background: shown >= 60 ? '#008c45' : shown >= 30 ? '#e0a21a' : '#e2574c' }} />
      </span>
      <span className={styles.barValue}>{shown}</span>
    </div>
  )
}

/** Admin control of one agent's Rocky: coins, treats, needs, items, ledger, audit trail and sign-in. */
export function AgentPetPanel({ agentId, tab, onChanged, onError }: Props) {
  const [detail, setDetail] = useState<AdminPetDetail | null>(null)
  const [busy, setBusy] = useState(false)
  const [delta, setDelta] = useState('')
  const [note, setNote] = useState('')
  const [slot, setSlot] = useState<ItemSlot>('hat')
  const [giveId, setGiveId] = useState(FOODS[0]!.id)
  const [giveQty, setGiveQty] = useState('3')
  const [message, setMessage] = useState('')

  const load = useCallback(async () => {
    try {
      setDetail(await apiClient.getAdminPet(agentId))
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err))
    }
  }, [agentId, onError])

  useEffect(() => {
    void load()
  }, [load])

  const [preview, setPreview] = useState(false)

  async function run(action: () => Promise<unknown>, success: string) {
    setBusy(true)
    try {
      await action()
      onChanged(success)
      await load()
      return true
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err))
      return false
    } finally {
      setBusy(false)
    }
  }

  if (!detail) return <p className={styles.muted}>Cargando mascota…</p>
  const { pet, ledger, audit, sessions, hasPin } = detail
  const st = pet.state

  if (tab === 'audit') {
    return (
      <section className={styles.drawerSection}>
        <h3>Trazabilidad ({audit.length})</h3>
        <p className={styles.muted}>Todo lo que pasó con este agente y quién lo hizo: ingresos, cuidados, compras, auditorías y cambios de admin.</p>
        {audit.length === 0 ? (
          <p className={styles.empty}>Sin movimientos todavía.</p>
        ) : (
          <ul className={styles.timeline}>
            {audit.map((a) => (
              <li key={a.id} className={styles.timelineItem}>
                <span className={styles.timelineDot} aria-hidden="true" />
                <div className={styles.timelineBody}>
                  <b style={{ display: 'block' }}>{auditLabel(a.action)}</b>
                  {auditDetail(a.detail) && <span style={{ display: 'block' }}>{auditDetail(a.detail)}</span>}
                  <span className={styles.muted} style={{ display: 'block', fontSize: '0.8rem' }}>
                    {fmtDateTime(a.createdAt)} · {a.actor === agentId ? 'el agente' : a.actor}
                    {a.source ? ` · ${SOURCE_ES[a.source] ?? a.source}` : ''}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    )
  }

  if (tab === 'access') {
    const active = sessions.filter((s) => s.active)
    return (
      <section className={styles.drawerSection}>
        <h3>Acceso</h3>
        <p className={styles.muted}>
          {hasPin ? 'Tiene PIN creado.' : 'Todavía no ha creado su PIN (lo crea en su primer ingreso).'} {active.length} sesiones activas.
        </p>
        <div className={styles.actionRow}>
          <button
            className={styles.btnGhost}
            disabled={busy || !hasPin}
            onClick={() => {
              if (!window.confirm(`¿Resetear el PIN de ${agentId}? Cerrará todas sus sesiones y creará un PIN nuevo en su próximo ingreso.`)) return
              void run(() => apiClient.resetPin(agentId), `PIN de ${agentId} reseteado.`)
            }}
          >
            Resetear PIN
          </button>
          <button
            className={styles.btnGhost}
            disabled={busy || active.length === 0}
            onClick={() => void run(() => apiClient.revokeSessions(agentId), `Sesiones de ${agentId} cerradas.`)}
          >
            Cerrar todas las sesiones
          </button>
        </div>
        {sessions.length > 0 && (
          <div className={styles.tableCard}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Dispositivo</th>
                  <th>Inicio</th>
                  <th>Última actividad</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s, i) => (
                  <tr key={i}>
                    <td>{shortDevice(s.userAgent)}</td>
                    <td>{fmtDateTime(s.createdAt)}</td>
                    <td>{fmtDateTime(s.lastSeenAt)}</td>
                    <td>
                      <span className={s.active ? styles.statusOk : styles.statusWarn}>
                        {s.active ? 'Activa' : s.revokedAt ? 'Cerrada' : 'Vencida'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    )
  }

  // Staff items are managed by the server (admins always hold them), so they aren't listed.
  const items = CLOSET.filter((i) => i.slot === slot && !i.staff)
  const unlocks = st.unlocks ?? []
  const sectionKey = sectionUnlock(slot)
  const sectionOpen = unlocks.includes(sectionKey)
  const shopOpen = unlocks.includes(SHOP_UNLOCK)
  const parsedDelta = Number(delta)
  const validDelta = Number.isInteger(parsedDelta) && parsedDelta !== 0 && Math.abs(parsedDelta) <= 100000

  return (
    <>
      <section className={styles.drawerSection}>
        <h3>Coins</h3>
        <div className={styles.miniStats}>
          <div>
            <span>Saldo</span>
            <b>{pet.coins}</b>
          </div>
          <div>
            <span>Ganados por trabajo</span>
            <b>{pet.earned.total}</b>
          </div>
          <div>
            <span>Note Check</span>
            <b>{st.gameCoins}</b>
          </div>
          <div>
            <span>Gastados</span>
            <b>{st.coinsSpent}</b>
          </div>
          <div>
            <span>Ajustes admin</span>
            <b>{st.coinsAdjust > 0 ? `+${st.coinsAdjust}` : st.coinsAdjust}</b>
          </div>
          <div>
            <span>Premios</span>
            <b>{pet.treats}</b>
          </div>
        </div>
        <p className={styles.muted}>
          Ganados: {pet.earned.checkIns} por check-ins · {pet.earned.qaPasses} por QA · {pet.earned.badges} por logros · {pet.earned.levels} por
          niveles · {pet.earned.streakWeeks} por rachas. Note Check: {st.quiz.played} rondas, {st.quiz.perfectRounds} perfectas.
        </p>
        <form
          className={styles.inlineForm}
          onSubmit={(e) => {
            e.preventDefault()
            if (!validDelta || !note.trim()) return
            void run(
              () => apiClient.adjustCoins(agentId, parsedDelta, note.trim()),
              `${parsedDelta > 0 ? 'Otorgados' : 'Descontados'} ${Math.abs(parsedDelta)} coins.`,
            ).then((ok) => {
              if (ok) {
                setDelta('')
                setNote('')
              }
            })
          }}
        >
          <input
            type="number"
            placeholder="+100 o −50"
            value={delta}
            onChange={(e) => setDelta(e.target.value)}
            aria-label="Cantidad de coins"
            style={{ width: 120 }}
          />
          <input
            placeholder="Motivo (queda en el registro)"
            value={note}
            maxLength={200}
            onChange={(e) => setNote(e.target.value)}
            aria-label="Motivo"
          />
          <button className={styles.btnPrimary} disabled={busy || !validDelta || !note.trim()}>
            Aplicar
          </button>
        </form>
        <div className={styles.actionRow}>
          <button
            className={styles.btnGhost}
            disabled={busy}
            onClick={() => void run(() => apiClient.adjustTreats(agentId, 3), 'Se agregaron 3 premios.')}
          >
            +3 premios
          </button>
          <button
            className={styles.btnGhost}
            disabled={busy || st.bonusTreats === 0}
            onClick={() => void run(() => apiClient.adjustTreats(agentId, -Math.min(3, st.bonusTreats)), 'Se quitaron premios extra.')}
          >
            Quitar premios extra
          </button>
        </div>
      </section>

      <section className={styles.drawerSection}>
        <h3>Necesidades</h3>
        <div className={styles.barList}>
          <Meter label="Vida" value={st.needs.health} />
          <Meter label="Felicidad" value={st.needs.happiness} />
          <Meter label="Limpieza" value={st.needs.dirt} invert />
        </div>
        <p className={styles.muted}>
          Hoy: {st.day.pets} caricias · {st.day.plays} juegos · {st.day.baths} baños.{' '}
          {st.onboardedAt ? `Bienvenida completada ${fmtDateTime(st.onboardedAt)}.` : 'No ha completado la bienvenida.'}
        </p>
        <div className={styles.actionRow}>
          <button
            className={styles.btnGhost}
            disabled={busy}
            onClick={() => void run(() => apiClient.restoreNeeds(agentId), 'Necesidades restauradas.')}
          >
            Restaurar necesidades
          </button>
          <button
            className={styles.btnDangerOutline}
            disabled={busy}
            onClick={() => {
              if (!window.confirm(`¿Reiniciar la mascota de ${agentId}? Pierde compras, look y necesidades (el XP no cambia). Queda en el registro.`))
                return
              void run(() => apiClient.resetPet(agentId), 'Mascota reiniciada.')
            }}
          >
            Reiniciar mascota
          </button>
        </div>
      </section>

      <section className={styles.drawerSection}>
        <h3>Despensa, juegos y mensajes</h3>
        <div className={styles.miniStats}>
          <div>
            <span>Mejor racha pelota</span>
            <b>{st.games.bestKeepy}</b>
          </div>
          <div>
            <span>Basura recogida</span>
            <b>{st.games.litterCleaned}</b>
          </div>
          <div>
            <span>Hoy en juegos</span>
            <b>
              {st.games.coins}/{GAME_CAPS.coins} c · {st.games.xp}/{GAME_CAPS.xp} XP
            </b>
          </div>
          <div>
            <span>Basura en su mundo</span>
            <b>{st.litter.items.length}</b>
          </div>
        </div>
        <p className={styles.muted}>
          Bolsa:{' '}
          {Object.entries(st.inventory)
            .map(([id, n]) => `${findFood(id)?.name ?? findSoap(id)?.name ?? id}${findFood(id) ? ` ×${n}` : ''}`)
            .join(' · ') || 'vacía'}
        </p>
        <form
          className={styles.inlineForm}
          onSubmit={(e) => {
            e.preventDefault()
            const qty = Number(giveQty)
            if (!Number.isInteger(qty) || qty === 0) return
            const name = findFood(giveId)?.name ?? findSoap(giveId)?.name ?? giveId
            void run(
              () => apiClient.giveInventory(agentId, giveId, qty),
              `${qty > 0 ? 'Regalado' : 'Quitado'}: ${name}${findFood(giveId) ? ` ×${Math.abs(qty)}` : ''}.`,
            )
          }}
        >
          <select value={giveId} onChange={(e) => setGiveId(e.target.value)} aria-label="Comida o jabón">
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
          <input type="number" value={giveQty} onChange={(e) => setGiveQty(e.target.value)} aria-label="Cantidad" style={{ width: 80 }} />
          <button className={styles.btnPrimary} disabled={busy}>
            Dar
          </button>
        </form>
        <form
          className={styles.inlineForm}
          onSubmit={(e) => {
            e.preventDefault()
            if (!message.trim()) return
            void run(() => apiClient.sendMessage(agentId, message.trim()), 'Mensaje enviado: Rocky se lo dirá al agente.').then(
              (ok) => ok && setMessage(''),
            )
          }}
        >
          <input
            placeholder="Mensaje para el agente (Rocky lo dice en su pantalla)"
            value={message}
            maxLength={280}
            onChange={(e) => setMessage(e.target.value)}
            aria-label="Mensaje"
          />
          <button className={styles.btnPrimary} disabled={busy || !message.trim()}>
            Enviar
          </button>
        </form>
        <div className={styles.actionRow}>
          <button className={styles.btnGhost} disabled={busy} onClick={() => void run(() => apiClient.clearLitter(agentId), 'Basura limpiada.')}>
            Limpiar basura
          </button>
          <button
            className={styles.btnGhost}
            disabled={busy}
            onClick={() => void run(() => apiClient.resetGameCaps(agentId), 'Topes de juegos reiniciados por hoy.')}
          >
            Reiniciar topes de juegos
          </button>
        </div>
        {st.inbox.length > 0 && (
          <p className={styles.muted}>
            Buzón:{' '}
            {st.inbox
              .slice(0, 4)
              .map((m) => m.text)
              .join(' · ')}
          </p>
        )}
      </section>

      <section className={styles.drawerSection}>
        <h3>Accesorios</h3>
        <button className={styles.btnGhost} onClick={() => setPreview(true)}>
          👁 Ver la tienda como la ve este agente
        </button>
        {preview && (
          <>
            <div className={styles.previewBanner} role="status">
              Vista previa de la tienda de <b>{agentId}</b> — solo lectura: nada se compra ni se cambia.
              <button className={styles.btnGhost} onClick={() => setPreview(false)}>
                Cerrar vista previa
              </button>
            </div>
            <ShopPanel
              open
              onClose={() => setPreview(false)}
              outfit={st.outfit}
              facts={pet.facts}
              owned={st.owned}
              granted={st.granted}
              unlocks={st.unlocks}
              catalog={resolveCatalog(pet.catalog)}
              coins={pet.coins}
              treats={pet.treats}
              onChange={() => {}}
              onBuy={() => false}
              onBuyTreats={() => {}}
              inventory={st.inventory}
              pantryOverrides={pet.catalog}
            />
          </>
        )}
        <div className={styles.subTabs}>
          {(Object.keys(SLOT_ES) as ItemSlot[]).map((k) => (
            <button key={k} className={`${styles.subTab} ${slot === k ? styles.subTabActive : ''}`} onClick={() => setSlot(k)}>
              {SLOT_ES[k]}
            </button>
          ))}
        </div>
        <p className={styles.muted}>
          <b>Regalar</b> = gratis al instante. <b>Desbloquear</b> = se salta el requisito de progreso, pero el agente lo compra con sus coins.
        </p>
        <div className={styles.actionRow}>
          <button
            className={styles.btnGhost}
            disabled={busy}
            onClick={() =>
              window.confirm(`¿Regalar TODOS los artículos de “${SLOT_ES[slot]}” a ${agentId}?`) &&
              void run(() => apiClient.setItem(agentId, sectionKey, 'grant'), `${SLOT_ES[slot]}: todo regalado.`)
            }
          >
            🎁 Regalar toda la sección
          </button>
          <button
            className={styles.btnGhost}
            disabled={busy}
            onClick={() =>
              void run(
                () => apiClient.setItem(agentId, sectionKey, sectionOpen ? 'relock' : 'unlock'),
                sectionOpen ? `${SLOT_ES[slot]}: vuelve a sus requisitos.` : `${SLOT_ES[slot]}: desbloqueada para comprar.`,
              )
            }
          >
            {sectionOpen ? '🔒 Volver a bloquear la sección' : '🔓 Desbloquear sección para comprar'}
          </button>
          <button
            className={styles.btnGhost}
            disabled={busy}
            onClick={() =>
              void run(
                () => apiClient.setItem(agentId, SHOP_UNLOCK, shopOpen ? 'relock' : 'unlock'),
                shopOpen ? 'La tienda vuelve a sus requisitos.' : 'Tienda completa desbloqueada para comprar.',
              )
            }
          >
            {shopOpen ? '🔒 Volver a bloquear la tienda' : '🔓 Desbloquear toda la tienda'}
          </button>
        </div>
        <div className={styles.tableCard}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Accesorio</th>
                <th>Estado</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const gifted = st.granted.includes(item.id)
                const bought = st.owned.includes(item.id)
                const byQa = adminUnlocked(item, unlocks)
                const unlocked = item.isUnlocked(pet.facts) || byQa
                const itemUnlock = unlocks.includes(item.id)
                const inUse = [
                  st.outfit.hat,
                  st.outfit.glasses,
                  st.outfit.neck,
                  st.outfit.back,
                  st.outfit.body,
                  st.outfit.aura,
                  st.outfit.bubble,
                  st.outfit.scene,
                  st.outfit.fx,
                  ...st.outfit.decor,
                ].includes(item.id)
                const status = gifted
                  ? 'Regalo'
                  : bought
                    ? 'Comprado'
                    : item.gift
                      ? 'Solo por regalo'
                      : item.price === 0 && unlocked
                        ? 'Gratis'
                        : unlocked
                          ? `${byQa && !item.isUnlocked(pet.facts) ? 'Desbloqueado por QA' : 'Desbloqueado'} · ${item.price} coins`
                          : `Bloqueado · ${item.requirement}`
                return (
                  <tr key={item.id}>
                    <td>
                      <b>{item.name}</b> {inUse && <span className={styles.chip}>en uso</span>}
                    </td>
                    <td className={styles.muted}>{status}</td>
                    <td>
                      {gifted || bought ? (
                        <button
                          className={styles.linkBtn}
                          disabled={busy}
                          onClick={() => void run(() => apiClient.setItem(agentId, item.id, 'revoke'), `${item.name} retirado.`)}
                        >
                          Quitar
                        </button>
                      ) : item.price === 0 && unlocked ? null : (
                        <span className={styles.actionRow}>
                          <button
                            className={styles.linkBtn}
                            disabled={busy}
                            onClick={() => void run(() => apiClient.setItem(agentId, item.id, 'grant'), `${item.name} regalado.`)}
                          >
                            Regalar
                          </button>
                          {!item.gift && (itemUnlock || !unlocked) && (
                            <button
                              className={styles.linkBtn}
                              disabled={busy}
                              onClick={() =>
                                void run(
                                  () => apiClient.setItem(agentId, item.id, itemUnlock ? 'relock' : 'unlock'),
                                  itemUnlock ? `${item.name}: vuelve a su requisito.` : `${item.name}: desbloqueado para comprar.`,
                                )
                              }
                            >
                              {itemUnlock ? 'Bloquear' : 'Desbloquear'}
                            </button>
                          )}
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.drawerSection}>
        <h3>Movimientos de coins ({ledger.length})</h3>
        {ledger.length === 0 ? (
          <p className={styles.empty}>Sin compras ni ajustes todavía. Los coins ganados por trabajo se calculan del progreso.</p>
        ) : (
          <div className={styles.tableCard}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Movimiento</th>
                  <th>Coins</th>
                  <th>Saldo</th>
                  <th>Por</th>
                </tr>
              </thead>
              <tbody>
                {ledger.map((l) => (
                  <tr key={l.id}>
                    <td>{fmtDateTime(l.createdAt)}</td>
                    <td>
                      {LEDGER_KIND_ES[l.kind] ?? l.kind}
                      {l.itemId ? ` · ${CLOSET.find((i) => i.id === l.itemId)?.name ?? l.itemId}` : ''}
                      {l.note ? <span className={styles.muted}> · {l.note}</span> : null}
                    </td>
                    <td style={{ color: l.delta >= 0 ? '#008c45' : '#c0392b', fontWeight: 700 }}>{l.delta > 0 ? `+${l.delta}` : l.delta}</td>
                    <td>{l.balanceAfter}</td>
                    <td className={styles.muted}>{l.actor === agentId ? 'agente' : l.actor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  )
}
