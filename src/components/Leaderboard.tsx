import { useEffect, useRef, useState } from 'react'
import { calculateMood } from '../engine/gameEngine'
import { xpGapToNextRank } from '../engine/leaderboard'
import { gameService } from '../services/gameService'
import { getIndividualLeaderboardWithRankChange, type RankChange } from '../services/leaderboardService'
import type { GameState, Mood } from '../types/domain'
import type { LeaderboardEntry } from '../types/leaderboard'
import styles from './Leaderboard.module.css'
import { LoadingRocky } from './LoadingRocky'
import { RockyAvatar } from './RockyAvatar'

// Mock agents don't carry Energy/Alert history, so their Mood can't be
// derived by the real calculateMood formula. This is a deliberately simple,
// display-only approximation for the compact row avatar — never used for
// anything that affects scoring or the real user's own Mood.
function approximateMoodForDisplay(currentStreak: number): Mood {
  if (currentStreak === 0) return 'Worried'
  if (currentStreak >= 7) return 'Happy'
  return 'Motivated'
}

function rockyReactionFor(rankChange: RankChange): string {
  switch (rankChange) {
    case 'up':
      return "🔼 Rocky moved up! Great progress."
    case 'down':
      // Never punitive — a lower rank is framed as "keep going", not "you fell".
      return "Let's keep building."
    case 'same':
      return 'Strong consistency.'
    default:
      return "Rocky's here and ready."
  }
}

function motivationFor(entries: LeaderboardEntry[], current: LeaderboardEntry): string {
  if (current.rank === 1) return "You're #1! Keep leading the way."
  const gap = xpGapToNextRank(entries)
  if (gap !== null && gap > 0) {
    const aboveRank = current.rank - 1
    return `You're ${gap} XP away from #${aboveRank}.`
  }
  return 'Keep your streak going to move up.'
}

export function Leaderboard() {
  const [result, setResult] = useState<ReturnType<typeof getIndividualLeaderboardWithRankChange> | null>(null)
  const [gameState, setGameState] = useState<GameState | null>(null)
  // getIndividualLeaderboardWithRankChange both reads AND records "the rank
  // the user last saw" in one call — correct for a single real read, but
  // React 18 StrictMode intentionally runs effects twice in development,
  // which would otherwise make the second call immediately see the first
  // call's just-written rank and report "same" instead of the real
  // up/down/first-time. This ref makes sure we only actually call it once
  // per real mount (StrictMode's synthetic double-invoke reuses the same
  // ref instance, so it stays guarded).
  const hasReadRankRef = useRef(false)

  useEffect(() => {
    setGameState(gameService.getSnapshot().gameState)
    if (hasReadRankRef.current) return
    hasReadRankRef.current = true
    setResult(getIndividualLeaderboardWithRankChange())
  }, [])

  if (!result || !result.currentUser || !gameState) return <LoadingRocky />

  const { entries, currentUser, rankChange } = result
  // The current user's own row uses their real, full Mood (Energy + Alert
  // history included) — the same source of truth Home shows. This is the
  // one row where the real formula applies; the ranking itself never
  // reflects or affects it.
  const liveMood = calculateMood(gameState)

  const podium = entries.slice(0, 3)
  // Visual order on the podium: 2nd, 1st, 3rd.
  const podiumOrder = [podium[1], podium[0], podium[2]].filter(Boolean) as LeaderboardEntry[]

  return (
    <div className={styles.page}>
      <div className={styles.layout}>
        <header>
          <h1 className={styles.title}>Ranking</h1>
          <p className={styles.subtitle}>Ranked by level, then XP, then current streak.</p>
        </header>

        <section className={styles.podium} aria-label="Top 3">
          {podiumOrder.map((entry) => (
            <div key={entry.agentId} className={`${styles.podiumSpot} ${styles[`place${entry.rank}`] ?? ''} ${entry.isCurrentUser ? styles.podiumYou : ''}`}>
              <RockyAvatar
                mood={entry.isCurrentUser ? liveMood : approximateMoodForDisplay(entry.currentStreak)}
                evolutionStage={entry.evolutionStage}
                size={entry.rank === 1 ? 118 : 92}
                bare
              />
              <span className={styles.podiumName}>{entry.isCurrentUser ? 'You' : entry.name}</span>
              <span className={styles.podiumStats}>
                Level {entry.level} · {entry.xp.toLocaleString()} XP
              </span>
              <div className={styles.podiumBlock}>{entry.rank}</div>
            </div>
          ))}
        </section>

        <section className={styles.youCard}>
          <RockyAvatar mood={liveMood} evolutionStage={currentUser.evolutionStage} size={84} bare />
          <div className={styles.youInfo}>
            <p className={styles.youRank}>
              You're <b>#{currentUser.rank}</b>
            </p>
            <p className={styles.youStats}>
              Level {currentUser.level} · {currentUser.xp.toLocaleString()} XP · {currentUser.currentStreak}-day streak
            </p>
            <p className={styles.motivation}>
              {motivationFor(entries, currentUser)} {rockyReactionFor(rankChange)}
            </p>
          </div>
        </section>

        <ol className={styles.list}>
          {entries.map((entry) => (
            <li key={entry.agentId} className={`${styles.row} ${entry.isCurrentUser ? styles.rowCurrentUser : ''}`}>
              <span className={`${styles.rank} ${entry.rank <= 3 ? styles.rankTop : ''}`}>{entry.rank}</span>
              <RockyAvatar
                mood={entry.isCurrentUser ? liveMood : approximateMoodForDisplay(entry.currentStreak)}
                evolutionStage={entry.evolutionStage}
                size={48}
                bare
              />
              <div className={styles.rowInfo}>
                <p className={styles.rowName}>{entry.isCurrentUser ? `${entry.name} (you)` : entry.name}</p>
                <span className={styles.rowStage}>{entry.evolutionStage} Rocky</span>
              </div>
              <div className={styles.rowStats}>
                <span>
                  <b>{entry.level}</b> level
                </span>
                <span>
                  <b>{entry.xp.toLocaleString()}</b> XP
                </span>
                <span>
                  <b>{entry.currentStreak}</b> 🔥
                </span>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}
