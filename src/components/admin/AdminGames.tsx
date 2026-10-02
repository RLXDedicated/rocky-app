import { useEffect, useState } from 'react'
import { apiClient, type AdminGame } from '../../services/apiClient'
import { FocusControl, useFocus } from '../extras/Focus'
import styles from './AdminConsole.module.css'

const ICON: Record<string, string> = {
  catch: '🍎',
  run: '🏃',
  whack: '💩',
  bubbles: '🫧',
  stack: '📦',
  simon: '🎵',
  memory: '🃏',
  typo: '🔎',
  notes: '📝',
}

/**
 * Minijuegos: switch each game on or off for everyone. A game that is off
 * disappears from the Arcade (and Note Check from the menu) and the server
 * stops paying for it. Daily coin caps still apply to the games that are on.
 */
export function GamesTab({ onChanged, onError }: { onChanged: (m: string) => void; onError: (m: string) => void }) {
  const [games, setGames] = useState<AdminGame[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [limit, setLimit] = useState<number | null>(null)
  const [limitDraft, setLimitDraft] = useState('')
  const focus = useFocus()

  useEffect(() => {
    apiClient
      .getGames()
      .then((r) => {
        setGames(r.games)
        setLimit(r.dailyLimit)
        setLimitDraft(String(r.dailyLimit))
      })
      .catch((e) => onError(e instanceof Error ? e.message : String(e)))
  }, [onError])

  async function toggle(g: AdminGame) {
    setBusy(true)
    try {
      const r = await apiClient.setGame(g.id, !g.enabled)
      setGames(r.games)
      onChanged(`${g.name}: ${g.enabled ? 'desactivado' : 'activado'} para todos.`)
    } catch (e) {
      onError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  async function saveLimit() {
    const n = Number(limitDraft)
    if (!Number.isInteger(n) || n < 0 || n > 100) return onError('El límite debe ser un número entero de 0 a 100 (0 = sin límite).')
    setBusy(true)
    try {
      const r = await apiClient.setArcadeLimit(n)
      setLimit(r.dailyLimit)
      onChanged(n === 0 ? 'Arcade sin límite diario.' : `Arcade: máximo ${n} partidas por agente al día.`)
    } catch (e) {
      onError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  if (!games) return <p className={styles.muted}>Cargando…</p>
  const on = games.filter((g) => g.enabled).length
  return (
    <>
    <section className={styles.card}>
      <h3>Rocky como pausa, no distracción</h3>
      <p className={styles.muted}>
        Partidas de Arcade por agente al día (0 = sin límite). Al llegar al límite, los juegos se bloquean hasta mañana; check-in y Note Check siguen disponibles.
      </p>
      <p>
        <input
          type="number"
          min={0}
          max={100}
          value={limitDraft}
          onChange={(e) => setLimitDraft(e.target.value)}
          aria-label="Partidas de Arcade por día"
          style={{ width: 90 }}
        />{' '}
        <button className={styles.btnPrimary} disabled={busy || String(limit) === limitDraft} onClick={() => void saveLimit()}>
          Guardar
        </button>{' '}
        <small className={styles.muted}>Actual: {limit === 0 ? 'sin límite' : `${limit} por día`}</small>
      </p>
      <FocusControl
        focus={focus}
        team="all"
        label="Modo enfoque para TODO el piloto: pausa Arcade y chat (picos, días críticos). Cada líder también puede activarlo para su equipo desde “My team”."
      />
    </section>
    <section className={styles.card}>
      <h3>Minijuegos ({on} de {games.length} activos)</h3>
      <p className={styles.muted}>Un juego apagado desaparece del Arcade para todos y deja de pagar coins.</p>
      <div className={styles.tableCard}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Juego</th>
              <th>Tipo</th>
              <th>Estado</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {games.map((g) => (
              <tr key={g.id}>
                <td>
                  {ICON[g.id] ?? '🎮'} <b>{g.name}</b>
                </td>
                <td className={styles.muted}>{g.kind}</td>
                <td>
                  <span className={styles.chip}>{g.enabled ? '● Activo' : '○ Apagado'}</span>
                  {g.enabled !== g.defaultOn && <small className={styles.muted}> (cambiado)</small>}
                </td>
                <td>
                  <button className={g.enabled ? styles.btnGhost : styles.btnPrimary} disabled={busy} onClick={() => void toggle(g)}>
                    {g.enabled ? 'Desactivar' : 'Activar'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
    </>
  )
}
