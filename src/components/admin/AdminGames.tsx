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

/** Quick picks for the daily Arcade limit (0 = no limit). */
const PRESETS = [0, 3, 5, 10]

/**
 * Juegos y tiempo: everything that limits how much agents play, in the order
 * an admin reaches for it. 1) How many Arcade games per agent per day.
 * 2) Pause games (and chat) for everyone right now. 3) Which games exist at all.
 * A game that is off disappears from the Arcade (and Note Check from the menu)
 * and the server stops paying for it.
 */
export function GamesTab({ onChanged, onError }: { onChanged: (m: string) => void; onError: (m: string) => void }) {
  const [games, setGames] = useState<AdminGame[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [limit, setLimit] = useState<number | null>(null)
  const [custom, setCustom] = useState('')
  const focus = useFocus()

  useEffect(() => {
    apiClient
      .getGames()
      .then((r) => {
        setGames(r.games)
        setLimit(r.dailyLimit)
      })
      .catch((e) => onError(e instanceof Error ? e.message : String(e)))
  }, [onError])

  async function act<T>(fn: () => Promise<T>, done: (r: T) => void) {
    setBusy(true)
    try {
      done(await fn())
    } catch (e) {
      onError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  function saveLimit(n: number) {
    if (!Number.isInteger(n) || n < 0 || n > 100) return onError('El límite debe ser un número entero de 0 a 100 (0 = sin límite).')
    void act(
      () => apiClient.setArcadeLimit(n),
      (r) => {
        setLimit(r.dailyLimit)
        setCustom('')
        onChanged(n === 0 ? 'Arcade sin límite diario.' : `Arcade: máximo ${n} partidas por agente al día.`)
      },
    )
  }

  function toggle(g: AdminGame) {
    void act(
      () => apiClient.setGame(g.id, !g.enabled),
      (r) => {
        setGames(r.games)
        onChanged(`${g.name}: ${g.enabled ? 'apagado' : 'activado'} para todos.`)
      },
    )
  }

  function setAll(on: boolean) {
    const targets = (games ?? []).filter((g) => g.enabled !== on)
    if (!targets.length) return
    void act(
      async () => {
        let last: { games: AdminGame[] } | null = null
        for (const g of targets) last = await apiClient.setGame(g.id, on)
        return last!
      },
      (r) => {
        setGames(r.games)
        onChanged(on ? 'Todos los juegos activados.' : 'Todos los juegos apagados.')
      },
    )
  }

  if (!games || limit === null) return <p className={styles.muted}>Cargando…</p>
  const on = games.filter((g) => g.enabled).length
  const customValue = Number(custom)
  const customOk = custom.trim() !== '' && Number.isInteger(customValue) && customValue >= 0 && customValue <= 100 && customValue !== limit

  return (
    <div className={styles.stack}>
      <section className={styles.card}>
        <div className={styles.sectionHead}>
          <div>
            <h3>⏱️ Límite diario de partidas</h3>
            <p className={styles.muted}>Cuántas partidas de Arcade puede jugar cada agente por día.</p>
          </div>
          <div className={styles.bigStatus}>
            <span>Ahora</span>
            <b>{limit === 0 ? 'Sin límite' : `${limit} por día`}</b>
          </div>
        </div>
        <div className={styles.presetRow} role="group" aria-label="Partidas por día">
          {PRESETS.map((n) => (
            <button
              key={n}
              className={`${styles.preset} ${limit === n ? styles.presetActive : ''}`}
              aria-pressed={limit === n}
              disabled={busy || limit === n}
              onClick={() => saveLimit(n)}
            >
              {n === 0 ? 'Sin límite' : `${n} partidas`}
            </button>
          ))}
          <span className={styles.customLimit}>
            <input
              type="number"
              min={0}
              max={100}
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              placeholder="Otro"
              aria-label="Otro límite de partidas por día"
            />
            <button className={styles.btnPrimary} disabled={busy || !customOk} onClick={() => saveLimit(customValue)}>
              Aplicar
            </button>
          </span>
        </div>
        <p className={styles.muted}>Al llegar al límite, el Arcade se bloquea hasta el día siguiente. El check-in y Note Check siguen disponibles.</p>
      </section>

      <section className={styles.card}>
        <h3>🎧 Pausar juegos ahora (modo enfoque)</h3>
        <p className={styles.muted}>
          Bloquea el Arcade y el chat para todos durante el tiempo que elijas: picos de trabajo o días críticos. Los líderes también pueden activarlo solo para su
          equipo desde “My team”.
        </p>
        <FocusControl focus={focus} team="all" label="Aplica a todo el piloto." />
      </section>

      <section className={styles.card}>
        <div className={styles.sectionHead}>
          <div>
            <h3>
              🕹️ Juegos disponibles <small className={styles.muted}>({on} de {games.length} activos)</small>
            </h3>
            <p className={styles.muted}>Un juego apagado desaparece del Arcade para todos y deja de dar coins.</p>
          </div>
          <div className={styles.formActions} style={{ gridColumn: 'auto' }}>
            <button className={styles.btnGhost} disabled={busy || on === games.length} onClick={() => setAll(true)}>
              Activar todos
            </button>
            <button className={styles.btnGhost} disabled={busy || on === 0} onClick={() => setAll(false)}>
              Apagar todos
            </button>
          </div>
        </div>
        <ul className={styles.gameList}>
          {games.map((g) => (
            <li key={g.id}>
              <label className={styles.switchRow}>
                <input type="checkbox" role="switch" className={styles.switch} checked={g.enabled} disabled={busy} onChange={() => toggle(g)} />
                <span>
                  {ICON[g.id] ?? '🎮'} {g.name}
                </span>
              </label>
              <small className={styles.muted}>
                {g.kind}
                {g.enabled !== g.defaultOn && ' · cambiado'}
              </small>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
