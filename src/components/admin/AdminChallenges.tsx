import { useEffect, useState } from 'react'
import { CLOSET } from '../../game/closet'
import { extrasApi, peopleApi, type AdminPerson, type Challenge } from '../../services/apiClient'
import styles from './AdminConsole.module.css'

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
/** This week's Monday and Friday. */
function thisWeek(): [string, string] {
  const d = new Date()
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  const fri = new Date(d)
  fri.setDate(d.getDate() + 4)
  return [iso(d), iso(fri)]
}

const STATUS_ES: Record<Challenge['status'], string> = {
  upcoming: '⏳ Próximo',
  active: '🏁 En curso',
  won: '🏆 Ganado',
  missed: '🎯 No alcanzado',
  cancelled: '✖ Cancelado',
}

const REWARDS = CLOSET.filter((i) => !i.staff)

/** Retos semanales: a goal for a team (or everyone) with a reward paid automatically when the week ends. */
export function ChallengesTab({ onChanged, onError }: { onChanged: (m: string) => void; onError: (m: string) => void }) {
  const [list, setList] = useState<Challenge[] | null>(null)
  const [leaders, setLeaders] = useState<AdminPerson[]>([])
  const [mon, fri] = thisWeek()
  const [form, setForm] = useState({
    title: 'Check-in every day this week',
    leaderId: '',
    metric: 'checkins' as 'checkins' | 'qa',
    target: 90,
    startDay: mon,
    endDay: fri,
    rewardItem: 'scene-space',
    rewardCoins: 50,
  })
  const [busy, setBusy] = useState(false)

  const load = () =>
    extrasApi
      .adminChallenges()
      .then((r) => setList(r.challenges))
      .catch((e) => onError(e instanceof Error ? e.message : String(e)))
  useEffect(() => {
    void load()
    peopleApi
      .adminPeople()
      .then((r) => setLeaders(r.people.filter((p) => p.title === 'leader')))
      .catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function create() {
    setBusy(true)
    try {
      await extrasApi.createChallenge({ ...form, leaderId: form.leaderId || null, rewardItem: form.rewardItem || null })
      onChanged(`Reto creado: ${form.title}`)
      void load()
    } catch (e) {
      onError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  async function cancel(c: Challenge) {
    if (!window.confirm(`¿Cancelar el reto “${c.title}”? Nadie recibirá la recompensa.`)) return
    try {
      await extrasApi.cancelChallenge(c.id)
      onChanged('Reto cancelado.')
      void load()
    } catch (e) {
      onError(e instanceof Error ? e.message : String(e))
    }
  }

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }))
  return (
    <div className={styles.stack}>
      <section className={styles.card}>
        <h3>Nuevo reto</h3>
        <p className={styles.muted}>
          El equipo ve el progreso en vivo en su pantalla principal. Al terminar el periodo, si llegó a la meta, cada miembro recibe la recompensa
          automáticamente (una vez). Los check-ins cuentan solo de lunes a viernes.
        </p>
        <div className={styles.inlineForm}>
          <input className={styles.field} value={form.title} maxLength={80} onChange={(e) => set('title', e.target.value)} aria-label="Título" placeholder="Título del reto" />
          <select className={styles.select} value={form.leaderId} onChange={(e) => set('leaderId', e.target.value)} aria-label="Equipo">
            <option value="">Todo el piloto</option>
            {leaders.map((l) => (
              <option key={l.email} value={l.email}>
                Equipo de {l.name}
              </option>
            ))}
          </select>
          <select className={styles.select} value={form.metric} onChange={(e) => set('metric', e.target.value as 'checkins' | 'qa')} aria-label="Métrica">
            <option value="checkins">% de check-ins</option>
            <option value="qa">% de QA Pass</option>
          </select>
          <label className={styles.field}>
            <span>Meta %</span>
            <input type="number" min={1} max={100} value={form.target} onChange={(e) => set('target', Number(e.target.value))} style={{ width: 80 }} />
          </label>
          <label className={styles.field}>
            <span>Desde</span>
            <input type="date" value={form.startDay} onChange={(e) => set('startDay', e.target.value)} />
          </label>
          <label className={styles.field}>
            <span>Hasta</span>
            <input type="date" value={form.endDay} onChange={(e) => set('endDay', e.target.value)} />
          </label>
          <select className={styles.select} value={form.rewardItem} onChange={(e) => set('rewardItem', e.target.value)} aria-label="Artículo de recompensa">
            <option value="">Sin artículo</option>
            {REWARDS.map((i) => (
              <option key={i.id} value={i.id}>
                {i.gift ? '🎁 ' : ''}
                {i.name} ({i.slot})
              </option>
            ))}
          </select>
          <label className={styles.field}>
            <span>Coins</span>
            <input type="number" min={0} max={5000} value={form.rewardCoins} onChange={(e) => set('rewardCoins', Number(e.target.value))} style={{ width: 90 }} />
          </label>
          <button className={styles.btnPrimary} disabled={busy || !form.title.trim()} onClick={() => void create()}>
            Crear reto
          </button>
        </div>
      </section>

      <div className={styles.tableCard}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Reto</th>
              <th>Equipo</th>
              <th>Progreso</th>
              <th>Periodo</th>
              <th>Recompensa</th>
              <th>Estado</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {list === null && (
              <tr>
                <td colSpan={7} className={styles.muted}>
                  Cargando…
                </td>
              </tr>
            )}
            {list?.length === 0 && (
              <tr>
                <td colSpan={7} className={styles.muted}>
                  Aún no hay retos.
                </td>
              </tr>
            )}
            {list?.map((c) => (
              <tr key={c.id}>
                <td>
                  <b>{c.title}</b>
                  <br />
                  <small className={styles.muted}>{c.metric === 'checkins' ? 'Check-ins' : 'QA Pass'}</small>
                </td>
                <td>{c.team ?? 'Todo el piloto'} ({c.members})</td>
                <td>
                  <b>{c.score}%</b> / {c.target}%
                </td>
                <td className={styles.muted}>
                  {c.startDay} → {c.endDay}
                </td>
                <td>{[c.reward.item?.name, c.reward.coins ? `${c.reward.coins} coins` : null].filter(Boolean).join(' + ')}</td>
                <td>{STATUS_ES[c.status]}</td>
                <td>
                  {(c.status === 'active' || c.status === 'upcoming') && (
                    <button className={styles.linkBtn} onClick={() => void cancel(c)}>
                      Cancelar
                    </button>
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
