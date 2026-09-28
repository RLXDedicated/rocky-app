import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiClient, type AdminAgentSummary, type AdminOverview, type AdminSystem } from '../../services/apiClient'
import { getAgentEmail } from '../../services/identityService'
import styles from './AdminConsole.module.css'
import { BarList, ColumnChart, SERIES_ALERT, SERIES_GREEN } from './AdminCharts'
import { AgentDrawer } from './AgentDrawer'
import { AuditTab, EconomyTab, ShopTab } from './AdminEconomy'
import { BulkTab } from './AdminBulk'
import { ChatsTab } from './AdminChats'
import {
  EVENT_TYPE_ES,
  MOOD_ES,
  WEEKDAY_ES,
  agentsToCsv,
  displayName,
  downloadText,
  eventDetail,
  fmtDateTime,
  fmtDayKey,
  relativeDays,
  todayIso,
} from './adminFormat'

// Rocky's QA/ADMIN console. Everything shown here comes from the backend's
// role-protected /api/admin/* routes; every gameplay change goes through the
// same QA event endpoints an audit integration would use (never a direct
// XP/Energy edit). See backend/src/application/adminApplicationService.ts.

type Tab = 'overview' | 'agents' | 'bulk' | 'economy' | 'shop' | 'chats' | 'audit' | 'activity' | 'system'
type SortKey = 'id' | 'level' | 'xp' | 'energy' | 'streak' | 'lastCheckIn' | 'checkIns' | 'qaPasses' | 'alerts'
type Filter = 'all' | 'atRisk' | 'checkedIn' | 'notCheckedIn'

const LOOKS_LIKE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface Toast {
  kind: 'ok' | 'error'
  text: string
}

export function AdminConsole() {
  const selfEmail = getAgentEmail()
  const [tab, setTab] = useState<Tab>('overview')
  const [overview, setOverview] = useState<AdminOverview | null>(null)
  const [agents, setAgents] = useState<AdminAgentSummary[] | null>(null)
  const [system, setSystem] = useState<AdminSystem | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [toast, setToast] = useState<Toast | null>(null)
  const [loading, setLoading] = useState(false)
  const [lastLoaded, setLastLoaded] = useState<Date | null>(null)

  const notify = useCallback((kind: Toast['kind'], text: string) => setToast({ kind, text }), [])
  const onError = useCallback((text: string) => notify('error', text), [notify])

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), toast.kind === 'error' ? 8000 : 4000)
    return () => window.clearTimeout(t)
  }, [toast])

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [o, a, s] = await Promise.all([apiClient.getAdminOverview(), apiClient.listAdminAgents(), apiClient.getAdminSystem()])
      setOverview(o)
      setAgents(a.agents)
      setSystem(s)
      setLastLoaded(new Date())
    } catch (err) {
      onError(`No se pudo cargar el panel: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setLoading(false)
    }
  }, [onError])

  useEffect(() => {
    void loadAll()
  }, [loadAll])

  const onChanged = useCallback(
    (text: string) => {
      notify('ok', text)
      void loadAll()
    },
    [notify, loadAll],
  )

  const closeDrawer = useCallback(() => setSelected(null), [])

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.topBar}>
          <div>
            <h1 className={styles.title}>Rocky · Consola de administración</h1>
            <p className={styles.muted}>
              Pilot RLX · {overview ? `${overview.kpis.totalAgents} agentes` : '…'}
              {system && ` · zona horaria ${system.timezone} · hoy ${system.today}`}
              {lastLoaded && ` · actualizado ${lastLoaded.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}`}
            </p>
          </div>
          <button className={styles.btnGhost} onClick={() => void loadAll()} disabled={loading}>
            {loading ? 'Actualizando…' : '↻ Actualizar'}
          </button>
        </header>

        <nav className={styles.tabs} role="tablist">
          {(
            [
              ['overview', 'Resumen'],
              ['agents', `Agentes${agents ? ` (${agents.length})` : ''}`],
              ['bulk', '⚡ Acciones masivas'],
              ['economy', 'Economía'],
              ['shop', 'Tienda'],
              ['chats', '💬 Chats'],
              ['audit', 'Auditoría'],
              ['activity', 'Actividad'],
              ['system', 'Sistema'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              role="tab"
              aria-selected={tab === key}
              className={`${styles.tab} ${tab === key ? styles.tabActive : ''}`}
              onClick={() => setTab(key)}
            >
              {label}
            </button>
          ))}
        </nav>

        {toast && (
          <div className={toast.kind === 'ok' ? styles.toastOk : styles.toastError} role="status">
            {toast.text}
            <button className={styles.linkBtn} onClick={() => setToast(null)}>
              cerrar
            </button>
          </div>
        )}

        {tab === 'overview' && (overview ? <OverviewTab overview={overview} onOpen={setSelected} /> : <p className={styles.muted}>Cargando…</p>)}
        {tab === 'agents' &&
          (agents ? (
            <AgentsTab agents={agents} selfEmail={selfEmail} onOpen={setSelected} onChanged={onChanged} onError={onError} />
          ) : (
            <p className={styles.muted}>Cargando…</p>
          ))}
        {tab === 'activity' && (overview ? <ActivityTab overview={overview} onOpen={setSelected} /> : <p className={styles.muted}>Cargando…</p>)}
        {tab === 'system' && (system ? <SystemTab system={system} /> : <p className={styles.muted}>Cargando…</p>)}
        {tab === 'bulk' && <BulkTab agents={agents} onChanged={onChanged} onError={onError} />}
        {tab === 'economy' && <EconomyTab onOpen={setSelected} onError={onError} />}
        {tab === 'shop' && <ShopTab onChanged={onChanged} onError={onError} />}
        {tab === 'chats' && <ChatsTab onChanged={onChanged} onError={onError} />}
        {tab === 'audit' && <AuditTab onOpen={setSelected} onError={onError} />}
      </div>

      {selected && <AgentDrawer agentId={selected} selfEmail={selfEmail} onClose={closeDrawer} onChanged={onChanged} onError={onError} />}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Resumen
// ---------------------------------------------------------------------------
export function Kpi({ label, value, hint, tone }: { label: string; value: string | number; hint?: string; tone?: 'good' | 'warn' }) {
  return (
    <div className={styles.kpi}>
      <span className={styles.kpiLabel}>{label}</span>
      <span className={`${styles.kpiValue} ${tone === 'warn' ? styles.kpiWarn : tone === 'good' ? styles.kpiGood : ''}`}>{value}</span>
      {hint && <span className={styles.kpiHint}>{hint}</span>}
    </div>
  )
}

function AgentChipList({
  agents,
  onOpen,
  empty,
  extra,
}: {
  agents: AdminAgentSummary[]
  onOpen: (id: string) => void
  empty: string
  extra: (a: AdminAgentSummary) => string
}) {
  if (agents.length === 0) return <p className={styles.muted}>{empty}</p>
  return (
    <ul className={styles.agentList}>
      {agents.map((a) => (
        <li key={a.id}>
          <button className={styles.agentListBtn} onClick={() => onOpen(a.id)}>
            <b>{displayName(a)}</b>
            <span className={styles.muted}>{extra(a)}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}

function OverviewTab({ overview, onOpen }: { overview: AdminOverview; onOpen: (id: string) => void }) {
  const k = overview.kpis
  const daily = overview.daily.map((d) => ({
    label: fmtDayKey(d.date),
    title: `${fmtDayKey(d.date)} (${d.date})`,
    values: { checkIns: d.checkIns, activeAgents: d.activeAgents, qaPasses: d.qaPasses, alerts: d.alerts },
  }))
  const hourly = overview.hourlyCheckIns.map((h) => ({
    label: String(h.hour),
    title: `${h.hour}:00 – ${h.hour}:59`,
    values: { checkIns: h.checkIns },
  }))
  // Monday-first for a work week.
  const weekday = [1, 2, 3, 4, 5, 6, 0].map((d) => ({ label: WEEKDAY_ES[d]!, values: { checkIns: overview.weekdayCheckIns[d]?.checkIns ?? 0 } }))

  return (
    <div className={styles.stack}>
      <div className={styles.kpiGrid}>
        <Kpi
          label="Check-in hoy"
          value={`${k.checkedInToday}/${k.totalAgents}`}
          hint={`${k.checkInRateToday}% del pilot`}
          tone={k.checkInRateToday >= 70 ? 'good' : undefined}
        />
        <Kpi label="Activos (7 días)" value={k.active7d} hint={`de ${k.totalAgents} agentes`} />
        <Kpi label="En riesgo" value={k.atRisk} hint="poca energía, alertas repetidas o sin check-in" tone={k.atRisk > 0 ? 'warn' : 'good'} />
        <Kpi
          label="Tasa QA Pass"
          value={k.qaPassRate === null ? '—' : `${k.qaPassRate}%`}
          hint={`${k.totalQaPasses} pass · ${k.totalAlerts} alertas`}
        />
        <Kpi label="Check-ins totales" value={k.totalCheckIns} />
        <Kpi label="Nivel promedio" value={k.avgLevel} hint={`${k.avgXp} XP promedio`} />
        <Kpi label="Energía promedio" value={k.avgEnergy} />
        <Kpi
          label="Racha promedio"
          value={k.avgStreak}
          hint={k.bestStreak ? `mejor: ${k.bestStreak.days} días (${k.bestStreak.agentId.split('@')[0]})` : undefined}
        />
      </div>

      <div className={styles.grid2}>
        <section className={styles.card}>
          <h3>Check-ins por día</h3>
          <p className={styles.cardSub}>Últimos 30 días</p>
          <ColumnChart
            data={daily}
            series={[{ key: 'checkIns', label: 'Check-ins', color: SERIES_GREEN }]}
            labelEvery={5}
            ariaLabel="Check-ins por día, últimos 30 días"
          />
        </section>
        <section className={styles.card}>
          <h3>Resultados de QA por día</h3>
          <p className={styles.cardSub}>Últimos 30 días</p>
          <ColumnChart
            data={daily}
            series={[
              { key: 'qaPasses', label: 'QA Pass', color: SERIES_GREEN },
              { key: 'alerts', label: 'Alertas', color: SERIES_ALERT },
            ]}
            labelEvery={5}
            ariaLabel="QA Pass y alertas por día, últimos 30 días"
          />
        </section>
        <section className={styles.card}>
          <h3>Uso por hora del día</h3>
          <p className={styles.cardSub}>Check-ins históricos, hora {overview.timezone}</p>
          <ColumnChart
            data={hourly}
            series={[{ key: 'checkIns', label: 'Check-ins', color: SERIES_GREEN }]}
            labelEvery={3}
            ariaLabel="Check-ins por hora del día"
          />
        </section>
        <section className={styles.card}>
          <h3>Uso por día de la semana</h3>
          <p className={styles.cardSub}>Check-ins históricos</p>
          <ColumnChart
            data={weekday}
            series={[{ key: 'checkIns', label: 'Check-ins', color: SERIES_GREEN }]}
            ariaLabel="Check-ins por día de la semana"
          />
        </section>
        <section className={styles.card}>
          <h3>Ánimo de los Rockys</h3>
          <BarList items={overview.moodDistribution} render={(k) => MOOD_ES[k] ?? k} />
        </section>
        <section className={styles.card}>
          <h3>Etapa de evolución</h3>
          <BarList items={overview.evolutionDistribution} />
        </section>
        <section className={styles.card}>
          <h3>Top 5 por XP</h3>
          <AgentChipList
            agents={overview.topAgents}
            onOpen={onOpen}
            empty="Sin agentes."
            extra={(a) => `Nivel ${a.state.level} · ${a.state.xp} XP`}
          />
        </section>
        <section className={styles.card}>
          <h3>Agentes en riesgo ({overview.atRiskAgents.length})</h3>
          <AgentChipList
            agents={overview.atRiskAgents.slice(0, 12)}
            onOpen={onOpen}
            empty="Nadie en riesgo. 🎉"
            extra={(a) => a.metrics.riskReasons.join(' · ')}
          />
        </section>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Agentes
// ---------------------------------------------------------------------------
function sortValue(a: AdminAgentSummary, key: SortKey): number | string {
  switch (key) {
    case 'id':
      return a.id
    case 'level':
      return a.state.level
    case 'xp':
      return a.state.xp
    case 'energy':
      return a.state.energy
    case 'streak':
      return a.state.currentStreak
    case 'lastCheckIn':
      return a.metrics.daysSinceCheckIn ?? Number.MAX_SAFE_INTEGER
    case 'checkIns':
      return a.metrics.checkIns
    case 'qaPasses':
      return a.metrics.qaPasses
    case 'alerts':
      return a.metrics.alerts
  }
}

function AgentsTab({
  agents,
  selfEmail,
  onOpen,
  onChanged,
  onError,
}: {
  agents: AdminAgentSummary[]
  selfEmail: string | null
  onOpen: (id: string) => void
  onChanged: (msg: string) => void
  onError: (msg: string) => void
}) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [stage, setStage] = useState('all')
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'xp', dir: -1 })
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [auditDate, setAuditDate] = useState(todayIso)
  const [manualEmail, setManualEmail] = useState('')
  const [busy, setBusy] = useState(false)

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return agents
      .filter((a) => !q || a.id.includes(q) || a.name.toLowerCase().includes(q))
      .filter((a) =>
        filter === 'atRisk'
          ? a.metrics.atRisk
          : filter === 'checkedIn'
            ? a.metrics.checkedInToday
            : filter === 'notCheckedIn'
              ? !a.metrics.checkedInToday
              : true,
      )
      .filter((a) => stage === 'all' || a.state.evolutionStage === stage)
      .sort((x, y) => {
        const a = sortValue(x, sort.key)
        const b = sortValue(y, sort.key)
        return (a < b ? -1 : a > b ? 1 : 0) * sort.dir
      })
  }, [agents, query, filter, stage, sort])

  // Drop selections that no longer exist (e.g. after a delete).
  useEffect(() => {
    setPicked((prev) => new Set([...prev].filter((id) => agents.some((a) => a.id === id))))
  }, [agents])

  const allVisiblePicked = visible.length > 0 && visible.every((a) => picked.has(a.id))

  function toggleSort(key: SortKey) {
    setSort((s) => (s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: key === 'id' ? 1 : -1 }))
  }

  function Th({ k, children }: { k: SortKey; children: string }) {
    return (
      <th
        className={styles.sortable}
        onClick={() => toggleSort(k)}
        aria-sort={sort.key === k ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}
      >
        {children} {sort.key === k ? (sort.dir === 1 ? '▲' : '▼') : ''}
      </th>
    )
  }

  async function bulk(kind: 'qa-pass' | 'alert' | 'delete', ids: string[]) {
    if (ids.length === 0) return
    const label = kind === 'qa-pass' ? 'QA Pass' : kind === 'alert' ? 'Alerta de Documentación' : 'ELIMINAR'
    if (kind === 'delete') {
      const typed = window.prompt(
        `Vas a ELIMINAR ${ids.length} agente(s) con todo su historial:\n${ids.join('\n')}\n\nEscribe ELIMINAR para confirmar:`,
      )
      if (typed?.trim().toUpperCase() !== 'ELIMINAR') return
    } else if (!window.confirm(`¿Registrar ${label} (fecha ${auditDate}) para ${ids.length} agente(s)?\n${ids.join('\n')}`)) {
      return
    }
    setBusy(true)
    const failures: string[] = []
    for (const id of ids) {
      try {
        if (kind === 'qa-pass') await apiClient.qaPass(id, auditDate)
        else if (kind === 'alert') await apiClient.documentationAlert(id, auditDate)
        else await apiClient.deleteAgent(id)
      } catch (err) {
        failures.push(`${id}: ${err instanceof Error ? err.message : String(err)}`)
      }
    }
    setBusy(false)
    setPicked(new Set())
    if (failures.length > 0) onError(`Fallaron ${failures.length} de ${ids.length}: ${failures.join(' · ')}`)
    const done = ids.length - failures.length
    if (done > 0) onChanged(kind === 'delete' ? `${done} agente(s) eliminados.` : `${label} registrado para ${done} agente(s).`)
  }

  const manual = manualEmail.trim().toLowerCase()
  const manualValid = LOOKS_LIKE_EMAIL.test(manual)

  return (
    <div className={styles.stack}>
      <div className={styles.toolbar}>
        <input
          className={styles.search}
          type="search"
          placeholder="Buscar por correo o nombre…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select className={styles.select} value={filter} onChange={(e) => setFilter(e.target.value as Filter)} aria-label="Filtro de estado">
          <option value="all">Todos</option>
          <option value="atRisk">En riesgo</option>
          <option value="checkedIn">Con check-in hoy</option>
          <option value="notCheckedIn">Sin check-in hoy</option>
        </select>
        <select className={styles.select} value={stage} onChange={(e) => setStage(e.target.value)} aria-label="Filtro de etapa">
          <option value="all">Todas las etapas</option>
          {['Baby', 'Young', 'Advanced', 'Elite'].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <label className={styles.field}>
          <span>Fecha de auditoría</span>
          <input type="date" value={auditDate} max={todayIso()} onChange={(e) => setAuditDate(e.target.value)} />
        </label>
        <button className={styles.btnGhost} onClick={() => downloadText(`rocky-agentes-${todayIso()}.csv`, agentsToCsv(visible))}>
          ⬇ Exportar CSV
        </button>
      </div>

      {picked.size > 0 && (
        <div className={styles.bulkBar}>
          <b>{picked.size} seleccionado(s)</b>
          <button className={styles.btnPass} disabled={busy} onClick={() => void bulk('qa-pass', [...picked])}>
            QA Pass
          </button>
          <button className={styles.btnAlert} disabled={busy} onClick={() => void bulk('alert', [...picked])}>
            Alerta
          </button>
          <button className={styles.btnDanger} disabled={busy} onClick={() => void bulk('delete', [...picked])}>
            Eliminar
          </button>
          <button className={styles.linkBtn} onClick={() => setPicked(new Set())}>
            limpiar selección
          </button>
        </div>
      )}

      <div className={styles.tableCard}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  aria-label="Seleccionar todos los visibles"
                  checked={allVisiblePicked}
                  onChange={() => setPicked(allVisiblePicked ? new Set() : new Set(visible.map((a) => a.id)))}
                />
              </th>
              <Th k="id">Agente</Th>
              <Th k="level">Nivel</Th>
              <Th k="xp">XP</Th>
              <Th k="energy">Energía</Th>
              <th>Ánimo</th>
              <th>Etapa</th>
              <Th k="streak">Racha</Th>
              <Th k="lastCheckIn">Últ. check-in</Th>
              <Th k="checkIns">Check-ins</Th>
              <Th k="qaPasses">Pass</Th>
              <Th k="alerts">Alertas</Th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((a) => (
              <tr key={a.id} className={styles.clickRow} onClick={() => onOpen(a.id)}>
                <td onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    aria-label={`Seleccionar ${a.id}`}
                    checked={picked.has(a.id)}
                    onChange={() =>
                      setPicked((prev) => {
                        const next = new Set(prev)
                        if (next.has(a.id)) next.delete(a.id)
                        else next.add(a.id)
                        return next
                      })
                    }
                  />
                </td>
                <td>
                  <div className={styles.agentCell}>
                    <b>{displayName(a)}</b>
                    {selfEmail === a.id && <span className={styles.chip}>tú</span>}
                  </div>
                  <small className={styles.muted}>{a.id}</small>
                </td>
                <td>{a.state.level}</td>
                <td>{a.state.xp}</td>
                <td>
                  <span className={styles.energyBar}>
                    <span style={{ width: `${a.state.energy}%` }} />
                  </span>{' '}
                  {a.state.energy}
                </td>
                <td>{MOOD_ES[a.state.mood] ?? a.state.mood}</td>
                <td>{a.state.evolutionStage}</td>
                <td>{a.state.currentStreak}</td>
                <td>{relativeDays(a.metrics.daysSinceCheckIn)}</td>
                <td>{a.metrics.checkIns}</td>
                <td>{a.metrics.qaPasses}</td>
                <td>{a.metrics.alerts}</td>
                <td>
                  {a.metrics.atRisk ? (
                    <span className={styles.statusWarn} title={a.metrics.riskReasons.join(' · ')}>
                      ⚠ En riesgo
                    </span>
                  ) : (
                    <span className={styles.statusOk}>✓ Al día</span>
                  )}
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={13} className={styles.empty}>
                  {agents.length === 0 ? 'Todavía no hay agentes registrados.' : 'Ningún agente coincide con los filtros.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className={styles.muted}>
        Mostrando {visible.length} de {agents.length}. Clic en una fila para ver el detalle completo, historial, correcciones y acciones.
      </p>

      <section className={styles.card}>
        <h3>Registrar evento para un agente que aún no aparece</h3>
        <p className={styles.cardSub}>Un agente aparece en la lista cuando abre Rocky desde su link de Teams por primera vez.</p>
        <div className={styles.actionRow}>
          <input
            className={styles.search}
            type="email"
            placeholder="nombre.apellido@rlx.us"
            value={manualEmail}
            onChange={(e) => setManualEmail(e.target.value)}
          />
          <button className={styles.btnPass} disabled={!manualValid || busy} onClick={() => void bulk('qa-pass', [manual])}>
            QA Pass
          </button>
          <button className={styles.btnAlert} disabled={!manualValid || busy} onClick={() => void bulk('alert', [manual])}>
            Alerta
          </button>
        </div>
      </section>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Actividad
// ---------------------------------------------------------------------------
function ActivityTab({ overview, onOpen }: { overview: AdminOverview; onOpen: (id: string) => void }) {
  const [type, setType] = useState('ALL')
  const types = ['ALL', ...Array.from(new Set(overview.recentActivity.map((e) => e.type)))]
  const rows = type === 'ALL' ? overview.recentActivity : overview.recentActivity.filter((e) => e.type === type)
  return (
    <div className={styles.stack}>
      <div className={styles.toolbar}>
        <select className={styles.select} value={type} onChange={(e) => setType(e.target.value)} aria-label="Tipo de evento">
          {types.map((t) => (
            <option key={t} value={t}>
              {t === 'ALL' ? 'Todos los eventos' : (EVENT_TYPE_ES[t] ?? t)}
            </option>
          ))}
        </select>
        <span className={styles.muted}>Últimos {overview.recentActivity.length} eventos de todo el pilot</span>
      </div>
      <div className={styles.tableCard}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Fecha y hora</th>
              <th>Agente</th>
              <th>Evento</th>
              <th>Detalle</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((e) => (
              <tr key={e.id} className={styles.clickRow} onClick={() => onOpen(e.agentId)}>
                <td>{fmtDateTime(e.timestamp)}</td>
                <td>{e.agentId}</td>
                <td>
                  <span className={styles.eventTag} data-type={e.type}>
                    {EVENT_TYPE_ES[e.type] ?? e.type}
                  </span>
                  {e.correctedTo && <span className={styles.chip}>corregido</span>}
                </td>
                <td className={styles.muted}>{eventDetail(e)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className={styles.empty}>
                  Sin actividad.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sistema
// ---------------------------------------------------------------------------
function SystemTab({ system }: { system: AdminSystem }) {
  const up = system.uptimeSeconds
  const uptime =
    up > 86400
      ? `${Math.floor(up / 86400)} d ${Math.floor((up % 86400) / 3600)} h`
      : up > 3600
        ? `${Math.floor(up / 3600)} h ${Math.floor((up % 3600) / 60)} min`
        : `${Math.floor(up / 60)} min`
  const rows: [string, React.ReactNode][] = [
    ['Zona horaria del pilot', `${system.timezone} (proceso: ${system.processTz ?? 'sin TZ'})`],
    ['Hora del servidor', system.serverLocalTime],
    ['"Hoy" para el motor', system.today],
    ['Modo de identidad', system.authMode === 'pilot-header' ? 'pilot-header (link de Teams con ?agente=, sin contraseña)' : system.authMode],
    ['Administradores (ROCKY_ADMIN_EMAILS)', system.adminEmails.length ? system.adminEmails.join(', ') : 'ninguno'],
    ['Orígenes permitidos (CORS)', system.allowedOrigins.join(', ') || 'ninguno'],
    ['Persistencia', system.persistenceDriver],
    ['Agentes en la base de datos', system.agentCount],
    ['Entorno', `${system.nodeEnv} · Node ${system.nodeVersion}`],
    [
      'Deploy',
      system.deployment.commitSha
        ? `${system.deployment.commitSha.slice(0, 7)} · ${system.deployment.branch ?? ''} · ${(system.deployment.commitMessage ?? '').split('\n')[0]}`
        : 'desconocido',
    ],
    ['Tiempo en línea', uptime],
    ['Frontend', `${window.location.origin} · build ${import.meta.env.MODE}`],
  ]
  return (
    <div className={styles.stack}>
      <section className={styles.card}>
        <h3>Estado del sistema</h3>
        <dl className={styles.kv}>
          {rows.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section className={styles.card}>
        <h3>Cómo administrar</h3>
        <ul className={styles.plainList}>
          <li>
            <b>Agregar/quitar administradores:</b> en Railway → servicio <code>rocky-backend</code> → Variables → <code>ROCKY_ADMIN_EMAILS</code>{' '}
            (correos separados por coma). Se aplica al redeploy.
          </li>
          <li>
            <b>Cambiar la zona horaria del pilot:</b> variable <code>ROCKY_TIMEZONE</code> (por defecto <code>America/Bogota</code>).
          </li>
          <li>
            <b>Corregir una auditoría:</b> abre el agente → Historial → “Corregir a Pass/Alerta”. El motor recalcula el efecto; nunca se edita el XP a
            mano.
          </li>
          <li>
            <b>Limpiar agentes de prueba:</b> pestaña Agentes → selecciónalos → Eliminar.
          </li>
          <li>
            <b>Seguridad:</b> la identidad es el correo del link de Teams, sin contraseña. Antes de salir del pilot cerrado hay que migrar a SSO
            (Entra ID).
          </li>
        </ul>
      </section>
    </div>
  )
}
