import { useEffect, useState } from 'react'
import { extrasApi, isRemoteModeEnabled, type Challenge } from '../../services/apiClient'
import styles from './Extras.module.css'

const daysLeft = (endDay: string) => {
  const end = new Date(`${endDay}T23:59:59`)
  return Math.max(0, Math.ceil((end.getTime() - Date.now()) / 86_400_000))
}

const rewardText = (c: Challenge) => [c.reward.item?.name, c.reward.coins ? `${c.reward.coins} coins` : null].filter(Boolean).join(' + ')

/**
 * The team challenge on the home screen: a chip with the live progress that
 * opens into the goal, the days left and the reward.
 */
export function ChallengeChip() {
  const [list, setList] = useState<Challenge[]>([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!isRemoteModeEnabled()) return
    const load = () =>
      extrasApi
        .challenges()
        .then((r) => setList(r.challenges.filter((c) => c.status !== 'cancelled')))
        .catch(() => {})
    void load()
    const t = window.setInterval(load, 5 * 60_000)
    return () => window.clearInterval(t)
  }, [])

  const active = list.find((c) => c.status === 'active') ?? list.find((c) => c.status === 'upcoming') ?? list[0]
  if (!active) return null
  const pct = Math.min(100, Math.round((active.score / active.target) * 100))
  const done = active.status === 'won' || active.status === 'missed'
  return (
    <div className={styles.challenge}>
      <button type="button" className={styles.challengeChip} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span aria-hidden="true">{active.status === 'won' ? '🏆' : active.status === 'missed' ? '🎯' : '🏁'}</span>
        <span className={styles.challengeTitle}>{active.title}</span>
        <span className={styles.challengeBar} aria-hidden="true">
          <i style={{ width: `${pct}%` }} />
        </span>
        <b>
          {active.score}% / {active.target}%
        </b>
      </button>
      {open && (
        <div className={styles.challengeCard} role="dialog" aria-label="Team challenge">
          <strong>{active.title}</strong>
          <p>
            {active.team ? `${active.team}’s team` : 'Everyone in the pilot'} ·{' '}
            {active.metric === 'checkins' ? 'check-in rate (weekdays)' : 'QA pass rate'} of {active.target}% ·{' '}
            {active.status === 'upcoming'
              ? `starts ${active.startDay}`
              : done
                ? active.status === 'won'
                  ? 'Won! Rewards are in the closet 🎉'
                  : 'Missed this time — next one!'
                : `${daysLeft(active.endDay)} day(s) left`}
          </p>
          <p className={styles.challengeReward}>🎁 {rewardText(active)}</p>
          {list.length > 1 && (
            <ul>
              {list
                .filter((c) => c.id !== active.id)
                .map((c) => (
                  <li key={c.id}>
                    {c.status === 'won' ? '🏆' : c.status === 'missed' ? '🎯' : '🏁'} {c.title} — {c.score}% / {c.target}%
                  </li>
                ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
