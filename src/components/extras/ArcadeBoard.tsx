import { useEffect, useState } from 'react'
import { ARCADE_MAX_SCORE, type ArcadeGame } from '../../game/pantry'
import { extrasApi, isRemoteModeEnabled, type ArcadeBoard as Board } from '../../services/apiClient'
import styles from './Extras.module.css'

/** Bronze / silver / gold for a best score: a quarter, half and 80% of the game's top score (Memory: 1–3 stars). */
export function medalFor(game: ArcadeGame, best: number): '🥉' | '🥈' | '🥇' | null {
  const max = ARCADE_MAX_SCORE[game]
  if (game === 'memory' || game === 'slide') return best >= 3 ? '🥇' : best >= 2 ? '🥈' : best >= 1 ? '🥉' : null
  if (best >= max * 0.8) return '🥇'
  if (best >= max * 0.5) return '🥈'
  if (best >= max * 0.25) return '🥉'
  return null
}

/** This week's Arcade ranking (top 5 per game) and last week's champions. */
export function ArcadeBoard({ games, names, refreshKey }: { games: ArcadeGame[]; names: Record<string, string>; refreshKey: number }) {
  const [board, setBoard] = useState<Board | null>(null)
  const [last, setLast] = useState<Board | null>(null)
  const [game, setGame] = useState<ArcadeGame>(games[0] ?? 'catch')

  useEffect(() => {
    if (!isRemoteModeEnabled()) return
    extrasApi.arcadeBoard().then(setBoard).catch(() => {})
    extrasApi.arcadeBoard(true).then(setLast).catch(() => {})
  }, [refreshKey])

  if (!isRemoteModeEnabled() || !board) return null
  const g = board.games[game]
  const champions = last ? games.map((id) => ({ id, top: last.games[id]?.top[0] })).filter((x) => x.top) : []
  return (
    <section className={styles.board} aria-label="This week's Arcade ranking">
      <header>
        <h2>🏆 This week’s top players</h2>
        <p>Each game’s #1 on Sunday night wins the Arcade trophy for their home and 50 coins.</p>
      </header>
      <div className={styles.boardTabs} role="tablist">
        {games.map((id) => (
          <button key={id} type="button" role="tab" aria-selected={game === id} className={game === id ? styles.boardTabOn : ''} onClick={() => setGame(id)}>
            {names[id] ?? id}
          </button>
        ))}
      </div>
      {!g || g.top.length === 0 ? (
        <p className={styles.boardEmpty}>Nobody has played {names[game]} this week — be the first!</p>
      ) : (
        <ol className={styles.boardList}>
          {g.top.map((row) => (
            <li key={row.id} className={row.me ? styles.boardMe : ''}>
              <span className={styles.boardRank}>{['🥇', '🥈', '🥉'][row.rank - 1] ?? `#${row.rank}`}</span>
              <span className={styles.boardName}>{row.me ? 'You' : row.name}</span>
              <b>{game === 'memory' ? '★'.repeat(row.score) : row.score}</b>
            </li>
          ))}
        </ol>
      )}
      {g && g.myRank && g.myRank > 5 && (
        <p className={styles.boardEmpty}>
          You’re #{g.myRank} of {g.players} with {g.myScore}.
        </p>
      )}
      {champions.length > 0 && (
        <p className={styles.champions}>
          Last week’s champions: {champions.map((c) => `${names[c.id]} — ${c.top!.me ? 'you' : c.top!.name}`).join(' · ')}
        </p>
      )}
    </section>
  )
}
