import { useEffect, useRef, useState } from 'react'
import { getCurrentUserTeamId, getTeamLeaderboard } from '../services/teamService'
import type { TeamRankEntry } from '../types/team'
import styles from './TeamLeaderboard.module.css'
import { LoadingRocky } from './LoadingRocky'
import { RockyAvatar } from './RockyAvatar'

export function TeamLeaderboard() {
  const [entries, setEntries] = useState<TeamRankEntry[] | null>(null)
  // getTeamLeaderboard reads AND records each team's "last score" (for Team
  // Mood's Recovery signal) in the same call. Guard against React 18
  // StrictMode's dev-only double effect invocation masking that signal —
  // same rationale as Leaderboard.tsx / TeamPage.tsx.
  const hasFetchedRef = useRef(false)

  useEffect(() => {
    if (hasFetchedRef.current) return
    hasFetchedRef.current = true
    setEntries(getTeamLeaderboard())
  }, [])

  if (!entries) return <LoadingRocky />

  const currentTeamId = getCurrentUserTeamId()

  return (
    <div className={styles.page}>
      <div className={styles.layout}>
        <div>
          <h1 className={styles.title}>Team Leaderboard</h1>
          <p className={styles.subtitle}>
            Ranked by Team Score — participation, average streak, QA pass performance, improvement, and
            engagement. Never by team size or individual failures.
          </p>
        </div>

        <section className={styles.list}>
          {entries.map((team) => (
            <div key={team.id} className={`${styles.row} ${team.id === currentTeamId ? styles.rowCurrentTeam : ''}`}>
              <span className={`${styles.rank} ${team.rank === 1 ? styles.rankTop : ''}`}>#{team.rank}</span>
              <RockyAvatar mood={team.mood} evolutionStage={team.evolutionStage} size={56} />
              <div className={styles.rowInfo}>
                <p className={styles.rowName}>
                  {team.name}
                  {team.id === currentTeamId ? ' (Your Team)' : ''}
                </p>
                <span className={styles.rowStage}>
                  {team.evolutionStage} Team Rocky · {team.memberCount} member{team.memberCount === 1 ? '' : 's'}
                </span>
              </div>
              <div className={styles.rowMetrics}>
                <span>Participation {Math.round(team.metrics.participation)}%</span>
                <span>Avg Streak {team.metrics.averageStreak.toFixed(1)}d</span>
              </div>
              <div className={styles.rowScore}>
                <div className={styles.scoreValue}>{team.score}</div>
                <div className={styles.scoreLabel}>Team Score</div>
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  )
}
