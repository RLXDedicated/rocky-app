import { useEffect, useState } from 'react'
import { apiClient, type AdminGame } from '../../services/apiClient'
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

  useEffect(() => {
    apiClient
      .getGames()
      .then((r) => setGames(r.games))
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

  if (!games) return <p className={styles.muted}>Cargando…</p>
  const on = games.filter((g) => g.enabled).length
  return (
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
  )
}
