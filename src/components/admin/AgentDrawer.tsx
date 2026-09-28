import { useCallback, useEffect, useState } from 'react'
import { apiClient, type AdminAgentDetail } from '../../services/apiClient'
import type { EvolutionStage, Mood } from '../../types/domain'
import { RockyAvatar } from '../RockyAvatar'
import { AgentPetPanel } from './AgentPetPanel'
import styles from './AdminConsole.module.css'
import { EVENT_TYPE_ES, MOOD_ES, displayName, eventDetail, fmtDateTime, relativeDays, todayIso } from './adminFormat'

type Tab = 'timeline' | 'achievements' | 'reminders' | 'pet' | 'audit' | 'access'

interface Props {
  agentId: string
  selfEmail: string | null
  onClose: () => void
  /** Called after any write so the roster/overview can refresh. */
  onChanged: (message: string) => void
  onError: (message: string) => void
}

export function AgentDrawer({ agentId, selfEmail, onClose, onChanged, onError }: Props) {
  const [detail, setDetail] = useState<AdminAgentDetail | null>(null)
  const [tab, setTab] = useState<Tab>('timeline')
  const [busy, setBusy] = useState(false)
  const [auditDate, setAuditDate] = useState(todayIso)
  const [editingName, setEditingName] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [xpAmount, setXpAmount] = useState('')
  const [xpReason, setXpReason] = useState('')
  const [targetLevel, setTargetLevel] = useState('')

  const load = useCallback(async () => {
    try {
      setDetail(await apiClient.getAdminAgent(agentId))
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err))
      onClose()
    }
  }, [agentId, onClose, onError])

  useEffect(() => {
    setDetail(null)
    void load()
  }, [load])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function run(action: () => Promise<unknown>, success: string, reload = true): Promise<boolean> {
    setBusy(true)
    try {
      await action()
      onChanged(success)
      if (reload) await load()
      return true
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err))
      return false
    } finally {
      setBusy(false)
    }
  }

  if (!detail) {
    return (
      <div className={styles.drawerBackdrop} onClick={onClose}>
        <aside className={styles.drawer} onClick={(e) => e.stopPropagation()}>
          <p className={styles.muted}>Cargando {agentId}…</p>
        </aside>
      </div>
    )
  }

  const { agent, events, achievements, reminders } = detail
  const s = agent.state
  const m = agent.metrics
  const isSelf = selfEmail === agent.id
  const eventTypes = ['ALL', ...Array.from(new Set(events.map((e) => e.type)))]
  const visibleEvents = typeFilter === 'ALL' ? events : events.filter((e) => e.type === typeFilter)

  return (
    <div className={styles.drawerBackdrop} onClick={onClose}>
      <aside className={styles.drawer} onClick={(e) => e.stopPropagation()} aria-label={`Detalle de ${agent.id}`}>
        <header className={styles.drawerHeader}>
          <RockyAvatar mood={s.mood as Mood} evolutionStage={s.evolutionStage as EvolutionStage} size={84} />
          <div className={styles.drawerTitle}>
            {editingName !== null ? (
              <form
                className={styles.inlineForm}
                onSubmit={(e) => {
                  e.preventDefault()
                  const name = editingName.trim()
                  if (!name) return
                  void run(() => apiClient.renameAgent(agent.id, name), `Nombre actualizado para ${agent.id}.`).then(
                    (ok) => ok && setEditingName(null),
                  )
                }}
              >
                <input autoFocus value={editingName} maxLength={80} onChange={(e) => setEditingName(e.target.value)} />
                <button className={styles.btnPrimary} disabled={busy}>
                  Guardar
                </button>
                <button type="button" className={styles.btnGhost} onClick={() => setEditingName(null)}>
                  Cancelar
                </button>
              </form>
            ) : (
              <h2>
                {displayName(agent)}{' '}
                <button className={styles.linkBtn} onClick={() => setEditingName(agent.name === 'Agent' ? '' : agent.name)}>
                  editar nombre
                </button>
              </h2>
            )}
            <p className={styles.muted}>
              {agent.id} {isSelf && <span className={styles.chip}>tú</span>} · Rocky “{agent.rockyName}”
            </p>
            {m.atRisk ? <p className={styles.riskLine}>⚠ En riesgo: {m.riskReasons.join(' · ')}</p> : <p className={styles.okLine}>✓ Al día</p>}
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </header>

        <div className={styles.miniStats}>
          <div>
            <span>Nivel</span>
            <b>{s.level}</b>
          </div>
          <div>
            <span>XP</span>
            <b>{s.xp}</b>
          </div>
          <div>
            <span>Energía</span>
            <b>{s.energy}</b>
          </div>
          <div>
            <span>Ánimo</span>
            <b>{MOOD_ES[s.mood] ?? s.mood}</b>
          </div>
          <div>
            <span>Etapa</span>
            <b>{s.evolutionStage}</b>
          </div>
          <div>
            <span>Racha</span>
            <b>
              {s.currentStreak} <small>(mejor {s.bestStreak})</small>
            </b>
          </div>
          <div>
            <span>Último check-in</span>
            <b>{relativeDays(m.daysSinceCheckIn)}</b>
          </div>
          <div>
            <span>Check-ins</span>
            <b>{m.checkIns}</b>
          </div>
          <div>
            <span>QA Pass</span>
            <b>{m.qaPasses}</b>
          </div>
          <div>
            <span>Alertas</span>
            <b>{m.alerts}</b>
          </div>
          <div>
            <span>Correcciones</span>
            <b>{m.corrections}</b>
          </div>
          <div>
            <span>Logros</span>
            <b>{m.achievements}</b>
          </div>
        </div>

        <section className={styles.drawerSection}>
          <h3>Progreso</h3>
          <p className={styles.muted}>
            El XP solo sube (nunca se quita) y queda en el historial del agente. La evolución sigue al nivel: Young en el 5, Advanced en el 10, Elite
            en el 20. El agente lo ve en su pantalla al volver a abrir Rocky.
          </p>
          <form
            className={styles.inlineForm}
            onSubmit={(e) => {
              e.preventDefault()
              const xp = Number(xpAmount)
              if (!Number.isInteger(xp) || xp <= 0 || !xpReason.trim()) return
              void run(() => apiClient.grantXp(agent.id, xp, xpReason.trim()), `+${xp} XP para ${agent.id}.`).then((ok) => {
                if (ok) {
                  setXpAmount('')
                  setXpReason('')
                }
              })
            }}
          >
            <input
              type="number"
              min={1}
              placeholder="XP"
              value={xpAmount}
              onChange={(e) => setXpAmount(e.target.value)}
              aria-label="XP a otorgar"
              style={{ width: 90 }}
            />
            <input
              placeholder="Motivo (queda en el historial)"
              value={xpReason}
              maxLength={200}
              onChange={(e) => setXpReason(e.target.value)}
              aria-label="Motivo del XP"
            />
            <button className={styles.btnPrimary} disabled={busy || !(Number(xpAmount) > 0) || !xpReason.trim()}>
              Otorgar XP
            </button>
          </form>
          <div className={styles.actionRow}>
            <select className={styles.select} value={targetLevel} onChange={(e) => setTargetLevel(e.target.value)} aria-label="Subir al nivel">
              <option value="">Subir al nivel…</option>
              {Array.from({ length: 20 - s.level }, (_, i) => s.level + 1 + i).map((l) => (
                <option key={l} value={l}>
                  Nivel {l}
                </option>
              ))}
            </select>
            <button
              className={styles.btnGhost}
              disabled={busy || !targetLevel}
              onClick={() =>
                void run(() => apiClient.raiseLevel(agent.id, Number(targetLevel)), `${agent.id} subió al nivel ${targetLevel}.`).then(() =>
                  setTargetLevel(''),
                )
              }
            >
              Subir nivel
            </button>
            {(['Young', 'Advanced', 'Elite'] as const).map((stage) => {
              const reached =
                ['Baby', 'Young', 'Advanced', 'Elite'].indexOf(s.evolutionStage) >= ['Baby', 'Young', 'Advanced', 'Elite'].indexOf(stage)
              return (
                <button
                  key={stage}
                  className={styles.btnGhost}
                  disabled={busy || reached}
                  title={reached ? 'Ya alcanzada' : `Sube al nivel ${{ Young: 5, Advanced: 10, Elite: 20 }[stage]}`}
                  onClick={() => {
                    if (!window.confirm(`¿Activar ${stage} Rocky para ${agent.id}? Se otorga el XP que falta para ese nivel.`)) return
                    void run(() => apiClient.unlockEvolution(agent.id, stage), `${agent.id} evolucionó a ${stage} Rocky.`)
                  }}
                >
                  {reached ? `✓ ${stage}` : `Activar ${stage}`}
                </button>
              )
            })}
          </div>
        </section>

        <section className={styles.drawerSection}>
          <h3>Registrar auditoría</h3>
          <div className={styles.actionRow}>
            <label className={styles.field}>
              <span>Fecha</span>
              <input type="date" value={auditDate} max={todayIso()} onChange={(e) => setAuditDate(e.target.value)} />
            </label>
            <button
              className={styles.btnPass}
              disabled={busy}
              onClick={() =>
                window.confirm(`¿Registrar QA Pass para ${agent.id} (${auditDate})?`) &&
                void run(() => apiClient.qaPass(agent.id, auditDate), `QA Pass registrado para ${agent.id}.`)
              }
            >
              QA Pass
            </button>
            <button
              className={styles.btnAlert}
              disabled={busy}
              onClick={() =>
                window.confirm(`¿Registrar Alerta de Documentación para ${agent.id} (${auditDate})?`) &&
                void run(() => apiClient.documentationAlert(agent.id, auditDate), `Alerta registrada para ${agent.id}.`)
              }
            >
              Alerta
            </button>
          </div>
        </section>

        <div className={styles.subTabs}>
          {(
            [
              ['timeline', `Historial (${events.length})`],
              ['pet', 'Mascota y coins'],
              ['audit', 'Trazabilidad'],
              ['access', 'Acceso'],
              ['achievements', `Logros (${achievements.length})`],
              ['reminders', `Recordatorios (${reminders.length})`],
            ] as const
          ).map(([key, label]) => (
            <button key={key} className={`${styles.subTab} ${tab === key ? styles.subTabActive : ''}`} onClick={() => setTab(key)}>
              {label}
            </button>
          ))}
        </div>

        {tab === 'timeline' && (
          <section className={styles.drawerSection}>
            <select className={styles.select} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              {eventTypes.map((t) => (
                <option key={t} value={t}>
                  {t === 'ALL' ? 'Todos los eventos' : (EVENT_TYPE_ES[t] ?? t)}
                </option>
              ))}
            </select>
            {visibleEvents.length === 0 && <p className={styles.muted}>Sin eventos.</p>}
            <ol className={styles.timeline}>
              {visibleEvents.map((e) => {
                const auditable = e.type === 'QA_PASS' || e.type === 'DOCUMENTATION_ALERT'
                const effective = e.correctedTo ?? (e.type === 'QA_PASS' ? 'PASS' : 'ALERT')
                const flipTo = effective === 'PASS' ? 'ALERT' : 'PASS'
                return (
                  <li key={e.id} className={styles.timelineItem} data-type={e.type}>
                    <span className={styles.timelineDot} data-type={e.type} />
                    <div className={styles.timelineBody}>
                      <div>
                        <b>{EVENT_TYPE_ES[e.type] ?? e.type}</b> <span className={styles.muted}>{eventDetail(e)}</span>
                        {e.correctedTo && <span className={styles.chip}>corregido → {e.correctedTo === 'PASS' ? 'QA Pass' : 'Alerta'}</span>}
                      </div>
                      <small className={styles.muted}>
                        {fmtDateTime(e.timestamp)} · día {e.date}
                      </small>
                    </div>
                    {auditable && (
                      <button
                        className={styles.btnGhost}
                        disabled={busy}
                        title="Registra un evento de corrección; el motor recalcula el efecto"
                        onClick={() => {
                          const reason = window.prompt(
                            `Corregir este ${EVENT_TYPE_ES[e.type]} a ${flipTo === 'PASS' ? 'QA Pass' : 'Alerta'}.\nMotivo (opcional):`,
                            '',
                          )
                          if (reason === null) return
                          void run(() => apiClient.correction(agent.id, e.id, flipTo, reason || undefined), `Corrección registrada para ${agent.id}.`)
                        }}
                      >
                        Corregir a {flipTo === 'PASS' ? 'Pass' : 'Alerta'}
                      </button>
                    )}
                  </li>
                )
              })}
            </ol>
          </section>
        )}

        {tab === 'achievements' && (
          <section className={styles.drawerSection}>
            {achievements.length === 0 && <p className={styles.muted}>Sin logros todavía.</p>}
            <ul className={styles.plainList}>
              {achievements.map((a) => (
                <li key={a.id}>
                  <b>🏆 {a.name}</b> <span className={styles.muted}>— {a.description}</span>
                  <br />
                  <small className={styles.muted}>{fmtDateTime(a.unlockedAt)}</small>
                </li>
              ))}
            </ul>
          </section>
        )}

        {tab === 'reminders' && (
          <section className={styles.drawerSection}>
            {reminders.length === 0 && <p className={styles.muted}>Sin recordatorios registrados en el backend.</p>}
            <ul className={styles.plainList}>
              {reminders.map((r) => (
                <li key={r.id}>
                  <span className={styles.chip}>{r.category}</span> {r.message}
                  <br />
                  <small className={styles.muted}>
                    {fmtDateTime(r.timestamp)} · estado: {r.status}
                  </small>
                </li>
              ))}
            </ul>
          </section>
        )}

        {(tab === 'pet' || tab === 'audit' || tab === 'access') && (
          <AgentPetPanel agentId={agent.id} tab={tab} onChanged={onChanged} onError={onError} />
        )}

        <section className={`${styles.drawerSection} ${styles.dangerZone}`}>
          <h3>Zona de riesgo</h3>
          <p className={styles.muted}>Estas acciones no se pueden deshacer.</p>
          <div className={styles.actionRow}>
            <button
              className={styles.btnDangerOutline}
              disabled={busy}
              onClick={() => {
                const ok = window.prompt(
                  `Esto borra TODO el progreso de ${agent.id} (XP, eventos, logros, racha) y le deja un Rocky nuevo.\nEscribe RESETEAR para confirmar:`,
                )
                if (ok?.trim().toUpperCase() !== 'RESETEAR') return
                void run(() => apiClient.resetAgent(agent.id), `Progreso de ${agent.id} reseteado.`)
              }}
            >
              Resetear progreso
            </button>
            <button
              className={styles.btnDanger}
              disabled={busy}
              onClick={() => {
                const ok = window.prompt(
                  `Esto ELIMINA a ${agent.id} del pilot con todo su historial.${isSelf ? '\n⚠ Es tu propio perfil.' : ''}\nSi vuelve a abrir su link, empezará de cero.\nEscribe ELIMINAR para confirmar:`,
                )
                if (ok?.trim().toUpperCase() !== 'ELIMINAR') return
                void run(() => apiClient.deleteAgent(agent.id), `${agent.id} eliminado.`, false).then((ok) => ok && onClose())
              }}
            >
              Eliminar agente
            </button>
          </div>
        </section>
      </aside>
    </div>
  )
}
