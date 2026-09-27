import { useEffect, useRef, useState } from 'react'
import { calculateMood } from '../engine/gameEngine'
import { achievementReaction, documentationAlertReaction, evolutionReaction, qaPassReaction } from '../engine/moodMessages'
import { gameService } from '../services/gameService'
import type { Achievement, Agent, GameState } from '../types/domain'
import styles from './QASimulator.module.css'
import { RockyAvatar } from './RockyAvatar'
import type { RockyReactionKey } from './rockyVisuals'

type ActionKind = 'QA_PASS' | 'DOCUMENTATION_ALERT'

interface SimResult {
  action: ActionKind
  before: GameState
  after: GameState
  reaction: string
  newAchievements: Achievement[]
  evolved: boolean
}

function diffRow(label: string, before: number | string, after: number | string) {
  let delta: string | null = null
  let deltaClass = styles.deltaNeutral
  if (typeof before === 'number' && typeof after === 'number') {
    const d = after - before
    if (d > 0) {
      delta = `+${d}`
      deltaClass = styles.deltaPositive
    } else if (d < 0) {
      delta = `${d}`
      deltaClass = styles.deltaNegative
    } else {
      delta = '±0'
    }
  } else if (before !== after) {
    delta = `${before} → ${after}`
  }

  return (
    <div className={styles.diffRow} key={label}>
      <span className={styles.diffLabel}>{label}</span>
      <span className={styles.diffValue}>{after}</span>
      {delta && <span className={`${styles.diffDelta} ${deltaClass}`}>{delta}</span>}
    </div>
  )
}

export function QASimulator() {
  const [agent, setAgent] = useState<Agent | null>(null)
  const [state, setState] = useState<GameState | null>(null)
  const [result, setResult] = useState<SimResult | null>(null)
  const [rockyReaction, setRockyReaction] = useState<RockyReactionKey | null>(null)
  const reactionTokenRef = useRef(0)

  useEffect(() => {
    const snapshot = gameService.getSnapshot()
    setAgent(snapshot.agent)
    setState(snapshot.gameState)
  }, [])

  if (!agent || !state) return null

  // Shows a transient reaction illustration, then reverts Rocky to his
  // correct persistent (evolutionStage + mood) state — the diff panel below
  // stays visible for inspection, but the reaction itself is momentary.
  function triggerReaction(key: RockyReactionKey, durationMs: number) {
    const token = ++reactionTokenRef.current
    setRockyReaction(key)
    window.setTimeout(() => {
      if (reactionTokenRef.current === token) setRockyReaction(null)
    }, durationMs)
  }

  function runQaPass() {
    const before = gameService.getSnapshot().gameState
    const { state: after, newAchievements, evolved, leveledUp } = gameService.qaPass()
    setState(after)
    const reaction = evolved
      ? evolutionReaction(before.evolutionStage, after.evolutionStage)
      : newAchievements.length > 0
        ? achievementReaction(newAchievements[0].name)
        : qaPassReaction()
    setResult({ action: 'QA_PASS', before, after, reaction, newAchievements, evolved })

    // Same reaction priority as Home's check-in flow: Evolution > Level Up >
    // a Worried-to-Recovery comeback > the everyday QA Pass reaction.
    const moodBecameRecovery = calculateMood(before) === 'Worried' && calculateMood(after) === 'Recovery'
    const reactionKey: RockyReactionKey = evolved ? 'evolution' : leveledUp ? 'level-up' : moodBecameRecovery ? 'recovery' : 'qa-pass'
    triggerReaction(reactionKey, evolved ? 4200 : 2400)
  }

  function runDocumentationAlert() {
    const before = gameService.getSnapshot().gameState
    const { state: after } = gameService.documentationAlert()
    setState(after)
    setResult({
      action: 'DOCUMENTATION_ALERT',
      before,
      after,
      reaction: documentationAlertReaction(),
      newAchievements: [],
      evolved: false,
    })
    triggerReaction('alert', 2400)
  }

  const liveMood = calculateMood(state)

  return (
    <div className={styles.page}>
      <div className={styles.layout}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>QA Simulator</h1>
            <span className={styles.internalBadge}>Internal QA/dev tool — not part of the agent experience</span>
          </div>
          {/* Single fictitious agent for this local prototype — the roster
              picker will grow into a real multi-agent list in Team Rocky. */}
          <select className={styles.agentSelect} value={agent.id} disabled>
            <option value={agent.id}>{agent.name}</option>
          </select>
        </div>

        <section className={styles.actionsCard}>
          <RockyAvatar mood={liveMood} evolutionStage={state.evolutionStage} size={120} reaction={rockyReaction} />
          <div style={{ flex: 1, minWidth: 220 }}>
            <div className={styles.buttonRow}>
              <button className={styles.passButton} onClick={runQaPass}>
                Simulate QA Pass
              </button>
              <button className={styles.alertButton} onClick={runDocumentationAlert}>
                Simulate Documentation Alert
              </button>
            </div>
            <p className={styles.reactionText}>{result?.reaction ?? 'Run a simulated audit to see Rocky react.'}</p>
          </div>
        </section>

        <section className={styles.resultCard}>
          {!result ? (
            <p className={styles.empty}>No simulation run yet.</p>
          ) : (
            <>
              <span className={`${styles.resultBadge} ${result.action === 'QA_PASS' ? styles.badgePass : styles.badgeAlert}`}>
                {result.action === 'QA_PASS' ? 'QA Pass executed' : 'Documentation Alert executed'}
              </span>
              <div className={styles.diffGrid}>
                {diffRow('XP', result.before.xp, result.after.xp)}
                {diffRow('Level', result.before.level, result.after.level)}
                {diffRow('Evolution Stage', result.before.evolutionStage, result.after.evolutionStage)}
                {diffRow('Energy', result.before.energy, result.after.energy)}
                {diffRow('Current Streak', result.before.currentStreak, result.after.currentStreak)}
                {diffRow('Best Streak', result.before.bestStreak, result.after.bestStreak)}
                {diffRow('Mood', calculateMood(result.before), calculateMood(result.after))}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  )
}
