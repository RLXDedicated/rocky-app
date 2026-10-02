import { useEffect, useState } from 'react'
import { usageApi, type UsageReport } from '../../services/apiClient'
import styles from './AdminConsole.module.css'

/**
 * Uso de Rocky (para Operaciones): minutos al día por agente, cuántos dentro
 * del turno, sesiones y su tasa de QA en el mismo periodo. La meta es que
 * Rocky sea una pausa de 3–5 minutos al día, no una distracción.
 */
export function UsageTab({ onOpen, onError }: { onOpen: (id: string) => void; onError: (m: string) => void }) {
  const [days, setDays] = useState(7)
  const [data, setData] = useState<UsageReport | null>(null)

  useEffect(() => {
    setData(null)
    usageApi
      .report(days)
      .then(setData)
      .catch((e) => onError(e instanceof Error ? e.message : String(e)))
  }, [days, onError])

  if (!data) return <p className={styles.muted}>Cargando…</p>
  const { summary, goal } = data
  const maxDay = Math.max(1, ...data.byDay.map((d) => d.minutes / Math.max(1, d.agents)))
  return (
    <>
      <section className={styles.card}>
        <h3>Uso de Rocky · últimos {data.days} días</h3>
        <p className={styles.muted}>
          Se cuenta un minuto por cada minuto que Rocky está abierto y en primer plano. Meta: {goal.min}–{goal.max} min al día por agente.
        </p>
        <p>
          {[7, 14, 30].map((d) => (
            <button key={d} className={d === days ? styles.btnPrimary : styles.btnGhost} onClick={() => setDays(d)} style={{ marginRight: 6 }}>
              {d} días
            </button>
          ))}
        </p>
        <div className={styles.tableCard}>
          <table className={styles.table}>
            <tbody>
              <tr>
                <td>Agentes que abrieron Rocky</td>
                <td>
                  <b>{summary.agents}</b>
                </td>
              </tr>
              <tr>
                <td>Promedio por agente al día</td>
                <td>
                  <b>{summary.avgPerDay} min</b> {summary.avgPerDay <= goal.max ? '✅ dentro de la meta' : '⚠️ por encima de la meta'}
                </td>
              </tr>
              <tr>
                <td>Tiempo dentro del turno</td>
                <td>
                  <b>{summary.shiftShare}%</b> <small className={styles.muted}>(el resto fue en descansos o fuera de turno)</small>
                </td>
              </tr>
              <tr>
                <td>Agentes por encima de {goal.max} min/día</td>
                <td>
                  <b>{summary.overGoal}</b>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {data.byDay.length > 0 && (
        <section className={styles.card}>
          <h3>Minutos promedio por agente, por día</h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 120 }}>
            {data.byDay.map((d) => {
              const avg = d.minutes / Math.max(1, d.agents)
              return (
                <div key={d.day} title={`${d.day}: ${avg.toFixed(1)} min/agente · ${d.agents} agentes`} style={{ flex: 1, maxWidth: 56, textAlign: 'center' }}>
                  <div
                    style={{
                      height: `${(avg / maxDay) * 100}px`,
                      borderRadius: 6,
                      background: avg > goal.max ? '#e2a33a' : '#1fbf68',
                    }}
                  />
                  <small className={styles.muted}>{d.day.slice(5)}</small>
                </div>
              )
            })}
          </div>
        </section>
      )}

      <section className={styles.card}>
        <h3>Por agente</h3>
        {data.agents.length === 0 ? (
          <p className={styles.muted}>Todavía no hay datos de uso en este periodo.</p>
        ) : (
          <div className={styles.tableCard}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Agente</th>
                  <th>Líder</th>
                  <th>Min/día</th>
                  <th>En turno</th>
                  <th>Sesiones</th>
                  <th>Días</th>
                  <th>QA pass</th>
                </tr>
              </thead>
              <tbody>
                {data.agents.map((a) => (
                  <tr key={a.agentId}>
                    <td>
                      <button className={styles.linkBtn ?? styles.btnGhost} onClick={() => onOpen(a.agentId)}>
                        {a.name}
                      </button>
                    </td>
                    <td className={styles.muted}>{a.leader ?? '—'}</td>
                    <td>
                      <b>{a.perDay}</b> {a.perDay > goal.max ? '⚠️' : ''}
                    </td>
                    <td>{a.minutes ? Math.round((a.shiftMinutes / a.minutes) * 100) : 0}%</td>
                    <td>{a.sessions}</td>
                    <td>{a.daysActive}</td>
                    <td>{a.qaPassRate === null ? '—' : `${a.qaPassRate}% (${a.audits})`}</td>
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
