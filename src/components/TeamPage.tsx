import { useEffect, useRef, useState } from 'react'
import { teamMoodMessage, teamRockyReaction } from '../engine/teamMessages'
import { getCurrentUserTeamId, getTeamDetail, getTeamRankChange, type TeamDetail } from '../services/teamService'
import type { TeamRankChange } from '../types/team'
import styles from './TeamPage.module.css'
import { LoadingRocky } from './LoadingRocky'
import { RockyAvatar } from './RockyAvatar'

function metricRow(label: string, value: number, displayValue?: string) {
  return (
    <div className={styles.metricRow} key={label}>
      <span className={styles.metricLabel}>{label}</span>
      <div className={styles.metricBarTrack}>
        <div className={styles.metricBarFill} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
      </div>
      <span className={styles.metricValue}>{displayValue ?? `${Math.round(value)}%`}</span>
    </div>
  )
}

function buildTeamActivity(detail: TeamDetail): string[] {
  // Purely derived from current aggregate state — informational, positive,
  // never singles out an individual's failures (Phase 6 §10).
  const lines: string[] = []
  const topMember = [...detail.members].sort((a, b) => b.level - a.level)[0]
  if (topMember) lines.push(`${topMember.name} reached Level ${topMember.level}.`)
  if (detail.metrics.averageStreak >= 5) {
    lines.push(`Team maintained a strong average streak — ${detail.metrics.averageStreak.toFixed(1)} days.`)
  }
  if (detail.metrics.participation >= 50) {
    lines.push('Team improved participation.')
  }
  lines.push(`${detail.name} is currently ${detail.evolutionStage} Team Rocky.`)
  return lines
}

export function TeamPage() {
  const [detail, setDetail] = useState<TeamDetail | null>(null)
  const [rankChange, setRankChange] = useState<TeamRankChange>('first-time')
  // getTeamDetail/getTeamRankChange both read AND record a "last seen"
  // value (last score, last rank) as part of computing their result —
  // correct for one real read, but React 18 StrictMode runs effects twice
  // in development, and the second call would immediately see the first
  // call's just-written value (masking Recovery / rank-change signals with
  // "no change"). Guard the whole fetch so it only really runs once per
  // mount — see the identical rationale in Leaderboard.tsx.
  const hasFetchedRef = useRef(false)

  useEffect(() => {
    if (hasFetchedRef.current) return
    hasFetchedRef.current = true
    const teamId = getCurrentUserTeamId()
    setDetail(getTeamDetail(teamId) ?? null)
    setRankChange(getTeamRankChange(teamId))
  }, [])

  if (!detail) return <LoadingRocky />

  const activity = buildTeamActivity(detail)

  return (
    <div className={styles.page}>
      <div className={styles.layout}>
        <section className={styles.heroCard}>
          <RockyAvatar mood={detail.mood} evolutionStage={detail.evolutionStage} size={160} bare />
          <div className={styles.heroInfo}>
            <span className={styles.yourTeamBadge}>Your team</span>
            <h1 className={styles.teamName}>{detail.name}</h1>
            <p className={styles.teamStage}>
              {detail.evolutionStage} Team Rocky, rank #{detail.rank}, score {detail.score}
            </p>
            <p className={styles.teamMoodLine}>{teamMoodMessage(detail.mood)}</p>
            <p className={styles.teamMoodLine}>{teamRockyReaction(rankChange, detail.mood)}</p>
          </div>
        </section>

        <section className={styles.statsGrid}>
          <div className={styles.metricsCard} style={{ gridColumn: '1 / -1' }}>
            <h2 className={styles.sectionTitle}>Team health</h2>
            <div className={styles.metricsGrid}>
              {metricRow('Participation', detail.metrics.participation)}
              {metricRow('Average Streak', detail.metrics.averageStreakScore, `${detail.metrics.averageStreak.toFixed(1)} days`)}
              {metricRow('QA Pass Performance', detail.metrics.qaPassRate)}
              {metricRow('Improvement', detail.metrics.improvement)}
              {metricRow('Engagement', detail.metrics.engagement)}
            </div>
          </div>
        </section>

        <section className={styles.membersCard}>
          <h2 className={styles.sectionTitle}>Members</h2>
          <div className={styles.memberList}>
            {detail.members.map((member) => (
              <div key={member.agentId} className={styles.memberRow}>
                <span className={styles.memberName}>{member.name}</span>
                <span className={styles.memberStats}>
                  <b>{member.level}</b> level <b>{member.currentStreak}</b> 🔥
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.activityCard}>
          <h2 className={styles.sectionTitle}>Team news</h2>
          <ul className={styles.activityList}>
            {activity.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
