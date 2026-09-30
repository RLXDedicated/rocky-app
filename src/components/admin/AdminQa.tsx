import { useEffect, useMemo, useState } from 'react'
import { qaDeskApi, type QaAudit } from '../../services/apiClient'
import styles from './AdminConsole.module.css'
import { Kpi } from './AdminConsole'
import { downloadText } from './adminFormat'

const daysAgo = (n: number) => {
  const d = new Date(Date.now() - n * 86_400_000)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const cell = (v: string | null) => (v && /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : (v ?? ''))

/** Every audit logged from the QA desk: who, when, result and why — filterable and exportable. */
export function QaLogTab({ onOpen, onError }: { onOpen: (id: string) => void; onError: (m: string) => void }) {
  const [range, setRange] = useState(30)
  const [list, setList] = useState<QaAudit[] | null>(null)
  const [q, setQ] = useState('')
  const [result, setResult] = useState<'all' | 'pass' | 'fail'>('all')
  const [auditor, setAuditor] = useState('all')

  useEffect(() => {
    setList(null)
    qaDeskApi
      .log(daysAgo(range))
      .then((r) => setList(r.audits))
      .catch((e) => onError(e instanceof Error ? e.message : String(e)))
  }, [range]) // eslint-disable-line react-hooks/exhaustive-deps

  const auditors = useMemo(() => [...new Map((list ?? []).map((a) => [a.auditor, a.auditorName])).entries()], [list])
  const shown = (list ?? []).filter(
    (a) => (result === 'all' || a.result === result) && (auditor === 'all' || a.auditor === auditor) && (!q || `${a.name} ${a.agentId} ${a.ticket ?? ''}`.toLowerCase().includes(q.toLowerCase())),
  )
  const pass = shown.filter((a) => a.result === 'pass').length
  const reasons = Object.entries(
    shown.filter((a) => a.result === 'fail').reduce<Record<string, number>>((m, a) => ((m[a.reason ?? 'Sin motivo'] = (m[a.reason ?? 'Sin motivo'] ?? 0) + 1), m), {}),
  ).sort((a, b) => b[1] - a[1])

  function exportCsv() {
    const header = ['Fecha auditada', 'Agente', 'Correo', 'Resultado', 'Motivo', 'Ticket', 'Comentario', 'Registró', 'Registrada', 'Corregida']
    const rows = shown.map((a) => [a.auditDate, a.name, a.agentId, a.result === 'pass' ? 'Pass' : 'Fail', a.reason, a.ticket, a.note, a.auditorName, a.createdAt, a.correctedAt])
    downloadText(`rocky-auditorias-qa-${daysAgo(0)}.csv`, [header, ...rows].map((r) => r.map(cell).join(',')).join('\n'))
  }

  return (
    <div className={styles.stack}>
      <div className={styles.toolbar}>
        <input className={styles.search} placeholder="Buscar agente o ticket" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className={styles.select} value={range} onChange={(e) => setRange(Number(e.target.value))} aria-label="Periodo">
          <option value={7}>Últimos 7 días</option>
          <option value={30}>Últimos 30 días</option>
          <option value={90}>Últimos 90 días</option>
        </select>
        <select className={styles.select} value={result} onChange={(e) => setResult(e.target.value as typeof result)} aria-label="Resultado">
          <option value="all">Pass y Fail</option>
          <option value="pass">Solo Pass</option>
          <option value="fail">Solo Fail</option>
        </select>
        <select className={styles.select} value={auditor} onChange={(e) => setAuditor(e.target.value)} aria-label="Analista">
          <option value="all">Todos los analistas</option>
          {auditors.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
        <button className={styles.btnGhost} disabled={!shown.length} onClick={exportCsv}>
          ⬇ Exportar CSV
        </button>
      </div>

      <div className={styles.kpiGrid}>
        <Kpi label="Auditorías" value={shown.length} />
        <Kpi label="Pass rate" value={shown.length ? `${Math.round((100 * pass) / shown.length)}%` : '—'} tone={shown.length && pass / shown.length < 0.8 ? 'warn' : 'good'} />
        <Kpi label="Fails" value={shown.length - pass} />
        <Kpi label="Motivo más común" value={reasons[0] ? reasons[0][1] : '—'} hint={reasons[0] ? reasons[0][0] : 'Sin fails'} />
      </div>

      <div className={styles.tableCard}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Agente</th>
              <th>Resultado</th>
              <th>Ticket</th>
              <th>Comentario</th>
              <th>Registró</th>
            </tr>
          </thead>
          <tbody>
            {list === null && (
              <tr>
                <td colSpan={6} className={styles.muted}>
                  Cargando…
                </td>
              </tr>
            )}
            {list !== null && shown.length === 0 && (
              <tr>
                <td colSpan={6} className={styles.empty}>
                  No hay auditorías con estos filtros. Los analistas QA las registran desde “QA desk”.
                </td>
              </tr>
            )}
            {shown.map((a) => (
              <tr key={a.id} className={styles.clickRow} onClick={() => onOpen(a.agentId)}>
                <td>{a.auditDate}</td>
                <td>
                  <b>{a.name}</b>
                  <br />
                  <small className={styles.muted}>{a.agentId}</small>
                </td>
                <td>
                  <span className={a.result === 'pass' ? styles.statusOk : styles.statusWarn}>{a.result === 'pass' ? 'Pass' : `Fail${a.reason ? ` · ${a.reason}` : ''}`}</span>
                  {a.correctedAt && <small className={styles.muted}> corregida</small>}
                </td>
                <td className={styles.muted}>{a.ticket ?? '—'}</td>
                <td className={styles.muted}>{a.note ?? '—'}</td>
                <td className={styles.muted}>{a.auditorName}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
