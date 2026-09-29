import { useEffect, useMemo, useState } from 'react'
import { peopleApi, type AdminPerson } from '../../services/apiClient'
import { TitleBadge } from '../TitleBadge'
import styles from './AdminConsole.module.css'

/**
 * Roles y equipos: QA analyst / team leader titles (a badge, no permissions)
 * and which leader each agent reports to. A leader sees only her own team,
 * and her Rocky mirrors how that team is doing.
 */
export function PeopleTab({ onChanged, onError }: { onChanged: (m: string) => void; onError: (m: string) => void }) {
  const [people, setPeople] = useState<AdminPerson[] | null>(null)
  const [query, setQuery] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newTitle, setNewTitle] = useState<'qa' | 'leader'>('qa')

  const load = () =>
    peopleApi
      .adminPeople()
      .then((r) => setPeople(r.people))
      .catch((e) => onError(e instanceof Error ? e.message : String(e)))
  useEffect(() => {
    void load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const leaders = useMemo(() => (people ?? []).filter((p) => p.title === 'leader'), [people])

  async function save(email: string, change: { title?: 'qa' | 'leader' | null; leader?: string | null }, msg: string) {
    try {
      await peopleApi.adminSetPerson(email, change)
      onChanged(msg)
      void load()
    } catch (e) {
      onError(e instanceof Error ? e.message : String(e))
    }
  }

  if (!people) return <p className={styles.muted}>Cargando…</p>
  const q = query.trim().toLowerCase()
  const shown = people.filter((p) => !q || `${p.name} ${p.email}`.toLowerCase().includes(q))
  return (
    <div className={styles.stack}>
      <p className={styles.muted}>
        Los títulos solo muestran una insignia junto al nombre (QA azul, LEAD verde azulado): no dan permisos. Cada líder ve únicamente a su equipo en “My team” y
        su Rocky refleja el espíritu del equipo. Los líderes no tienen acceso a los chats.
      </p>

      <div className={styles.grid}>
        {leaders.map((l) => {
          const team = people.filter((p) => p.leader === l.email)
          return (
            <div key={l.email} className={styles.card}>
              <h3>
                {l.name} <TitleBadge title="leader" />
              </h3>
              <p className={styles.muted}>
                {team.length} persona{team.length === 1 ? '' : 's'} en su equipo{team.length ? `: ${team.map((t) => t.name).join(', ')}` : ''}
              </p>
            </div>
          )
        })}
        <div className={styles.card}>
          <h3>Dar un título por correo</h3>
          <p className={styles.muted}>Sirve también para personas que aún no han entrado a Rocky.</p>
          <div className={styles.inlineForm}>
            <input className={styles.field} placeholder="correo@rlx.us" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
            <select className={styles.select} value={newTitle} onChange={(e) => setNewTitle(e.target.value as 'qa' | 'leader')}>
              <option value="qa">QA</option>
              <option value="leader">Líder</option>
            </select>
            <button
              className={styles.btnPrimary}
              onClick={() => {
                if (newEmail.trim()) void save(newEmail.trim().toLowerCase(), { title: newTitle }, 'Título asignado.').then(() => setNewEmail(''))
              }}
            >
              Asignar
            </button>
          </div>
        </div>
      </div>

      <div className={styles.tableCard}>
        <div className={styles.toolbar}>
          <input className={styles.search} placeholder="Buscar agente…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Agente</th>
              <th>Título</th>
              <th>Equipo (líder)</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((p) => (
              <tr key={p.email}>
                <td>
                  <strong>{p.name}</strong> <TitleBadge title={p.title} />
                  <br />
                  <small className={styles.muted}>
                    {p.email}
                    {p.signedUp ? '' : ' · aún no ha entrado'}
                  </small>
                </td>
                <td>
                  <select
                    className={styles.select}
                    value={p.title ?? ''}
                    onChange={(e) => {
                      const title = (e.target.value || null) as 'qa' | 'leader' | null
                      if (p.title === 'leader' && title !== 'leader' && !window.confirm(`${p.name} dejará de ser líder y su equipo quedará sin líder. ¿Continuar?`)) return
                      void save(p.email, { title }, 'Título actualizado.')
                    }}
                  >
                    <option value="">—</option>
                    <option value="qa">QA</option>
                    <option value="leader">Líder</option>
                  </select>
                </td>
                <td>
                  {p.title === 'leader' ? (
                    <span className={styles.muted}>Es líder</span>
                  ) : (
                    <select className={styles.select} value={p.leader ?? ''} onChange={(e) => void save(p.email, { leader: e.target.value || null }, 'Equipo actualizado.')}>
                      <option value="">Sin equipo</option>
                      {leaders.map((l) => (
                        <option key={l.email} value={l.email}>
                          {l.name}
                        </option>
                      ))}
                    </select>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
