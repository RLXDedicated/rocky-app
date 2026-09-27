import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiClient, type AdminAgentSummary } from '../services/apiClient'
import styles from './AdminPanel.module.css'

// QA coordinator view over every pilot agent (backend: GET /api/admin/agents,
// QA/ADMIN only). Unlike QASimulator — which only touches THIS browser's
// local engine — every action here is a real, durable event recorded on the
// backend for the chosen agent, through the same role-protected QA endpoints
// an audit integration would use. The panel never sets XP/Energy/etc.
// directly; it only records QA Pass / Documentation Alert events.

const LOOKS_LIKE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function todayIso(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

type Action = 'qa-pass' | 'alert'

export function AdminPanel() {
  const [agents, setAgents] = useState<AdminAgentSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [filter, setFilter] = useState('')
  const [auditDate, setAuditDate] = useState(todayIso)
  const [manualEmail, setManualEmail] = useState('')

  const load = useCallback(async () => {
    try {
      const res = await apiClient.listAdminAgents()
      setAgents(res.agents)
      setError(null)
    } catch (err) {
      setError(`No se pudo cargar la lista de agentes (${err instanceof Error ? err.message : String(err)}).`)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function record(agentId: string, action: Action) {
    const label = action === 'qa-pass' ? 'QA Pass' : 'Alerta de Documentación'
    if (!window.confirm(`¿Registrar ${label} para ${agentId} con fecha de auditoría ${auditDate}?`)) return
    setBusyId(agentId)
    setNotice(null)
    try {
      if (action === 'qa-pass') await apiClient.qaPass(agentId, auditDate)
      else await apiClient.documentationAlert(agentId, auditDate)
      setNotice(`${label} registrado para ${agentId}.`)
      await load()
    } catch (err) {
      setError(`No se pudo registrar ${label} para ${agentId} (${err instanceof Error ? err.message : String(err)}).`)
    } finally {
      setBusyId(null)
    }
  }

  const manual = manualEmail.trim().toLowerCase()
  const manualValid = LOOKS_LIKE_EMAIL.test(manual)

  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase()
    return (agents ?? []).filter((a) => !q || a.id.includes(q) || a.name.toLowerCase().includes(q))
  }, [agents, filter])

  return (
    <div className={styles.page}>
      <div className={styles.layout}>
        <header>
          <h1 className={styles.title}>Admin · Agentes del pilot</h1>
          <p className={styles.subtitle}>
            Eventos reales en el backend. Un agente aparece aquí cuando abre Rocky desde su link de Teams por
            primera vez, o cuando le registras un evento abajo.
          </p>
        </header>

        <div className={styles.controls}>
          <label className={styles.field}>
            <span>Fecha de auditoría</span>
            <input type="date" value={auditDate} max={todayIso()} onChange={(e) => setAuditDate(e.target.value)} />
          </label>
          <label className={`${styles.field} ${styles.grow}`}>
            <span>Buscar</span>
            <input type="search" placeholder="correo o nombre" value={filter} onChange={(e) => setFilter(e.target.value)} />
          </label>
          <button className={styles.secondary} onClick={() => void load()}>
            Actualizar
          </button>
        </div>

        <div className={styles.manual}>
          <label className={`${styles.field} ${styles.grow}`}>
            <span>Agente que aún no aparece (correo del pilot)</span>
            <input
              type="email"
              placeholder="nombre.apellido@empresa.com"
              value={manualEmail}
              onChange={(e) => setManualEmail(e.target.value)}
            />
          </label>
          <button className={styles.pass} disabled={!manualValid || busyId !== null} onClick={() => void record(manual, 'qa-pass')}>
            QA Pass
          </button>
          <button className={styles.alert} disabled={!manualValid || busyId !== null} onClick={() => void record(manual, 'alert')}>
            Alerta
          </button>
        </div>

        {error && <p className={styles.error}>{error}</p>}
        {notice && <p className={styles.notice}>{notice}</p>}

        {agents === null && !error && <p className={styles.subtitle}>Cargando…</p>}

        {agents !== null && (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Agente</th>
                  <th>Nivel</th>
                  <th>XP</th>
                  <th>Energía</th>
                  <th>Ánimo</th>
                  <th>Etapa</th>
                  <th>Racha</th>
                  <th>Último check-in</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {visible.map((a) => (
                  <tr key={a.id}>
                    <td className={styles.agentCell}>{a.id}</td>
                    <td>{a.state.level}</td>
                    <td>{a.state.xp}</td>
                    <td>{a.state.energy}</td>
                    <td>{a.state.mood}</td>
                    <td>{a.state.evolutionStage}</td>
                    <td>{a.state.currentStreak}</td>
                    <td>{a.state.lastCheckInDate ?? '—'}</td>
                    <td className={styles.actions}>
                      <button className={styles.pass} disabled={busyId !== null} onClick={() => void record(a.id, 'qa-pass')}>
                        QA Pass
                      </button>
                      <button className={styles.alert} disabled={busyId !== null} onClick={() => void record(a.id, 'alert')}>
                        Alerta
                      </button>
                    </td>
                  </tr>
                ))}
                {visible.length === 0 && (
                  <tr>
                    <td colSpan={9} className={styles.empty}>
                      {agents.length === 0 ? 'Todavía no hay agentes registrados.' : 'Ningún agente coincide con la búsqueda.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        {agents !== null && <p className={styles.subtitle}>{agents.length} agente(s) registrados.</p>}
      </div>
    </div>
  )
}
