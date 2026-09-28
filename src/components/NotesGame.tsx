import { useMemo, useState } from 'react'
import { calculateMood } from '../engine/gameEngine'
import { todayKey } from '../engine/dateUtils'
import { NOTE_CHECKLIST, QUIZ_REWARD, dailyQuestions } from '../game/notesQuiz'
import { fetchPet, loadPetCache, performPetAction, type PetCache } from '../game/petClient'
import { buildProgressFacts } from '../game/progressFacts'
import { play as playSfx } from '../game/sfx'
import { gameService } from '../services/gameService'
import { Coin } from './world/Coin'
import { RockyAvatar } from './RockyAvatar'
import styles from './NotesGame.module.css'

type Phase = 'intro' | 'question' | 'done'

/**
 * Note Check: five quick questions a day about great account notes, with
 * Rocky's tip after each one. The first round of the day earns coins; after
 * that it's practice. This is Rocky's core message — leave a clear note,
 * every time — turned into something agents want to play.
 */
export function NotesGame() {
  const snapshot = useMemo(() => gameService.getSnapshot(), [])
  const facts = useMemo(() => buildProgressFacts(snapshot.gameState), [snapshot])
  const mood = calculateMood(snapshot.gameState)
  const round = useMemo(() => dailyQuestions(), [])
  const [pet, setPet] = useState<PetCache>(() => loadPetCache())
  const [phase, setPhase] = useState<Phase>('intro')
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [picked, setPicked] = useState<number | null>(null)
  const [result, setResult] = useState<{ correct: number; reward: number } | null>(null)

  const rewardedToday = pet.state.quiz.date === todayKey() && pet.state.quiz.rewarded
  const maxReward = round.length * QUIZ_REWARD.perCorrect + QUIZ_REWARD.perfectBonus
  const q = round[index]!

  function start() {
    setAnswers({})
    setIndex(0)
    setPicked(null)
    setResult(null)
    setPhase('question')
    playSfx('tap')
    void fetchPet().then((fresh) => fresh && setPet(fresh))
  }

  function choose(option: number) {
    if (picked !== null) return
    setPicked(option)
    setAnswers((a) => ({ ...a, [q.id]: option }))
    playSfx(option === q.answer ? 'chime' : 'nope')
  }

  function next() {
    if (index < round.length - 1) {
      setIndex(index + 1)
      setPicked(null)
      return
    }
    const all = { ...answers }
    const outcome = performPetAction(pet, { type: 'quiz', answers: all }, facts, (server) => {
      setPet(server)
      setResult({ correct: server.state.quiz.lastScore, reward: server.state.quiz.lastReward })
    })
    if (outcome.ok) {
      setPet((p) => ({ ...p, state: outcome.state }))
      setResult({ correct: outcome.state.quiz.lastScore, reward: outcome.state.quiz.lastReward })
      playSfx(outcome.state.quiz.lastScore === round.length ? 'fanfare' : 'coin')
    }
    setPhase('done')
  }

  return (
    <div className={styles.page}>
      <div className={styles.layout}>
        <section className={styles.game} aria-labelledby="notes-title">
          {phase === 'intro' && (
            <div className={styles.intro}>
              <RockyAvatar mood="Happy" evolutionStage={snapshot.gameState.evolutionStage} size={170} bare />
              <div>
                <h1 id="notes-title">Note Check</h1>
                <p className={styles.lede}>
                  Five quick questions about great account notes. A clear note after every interaction is what keeps customers from calling twice —
                  and what QA looks for.
                </p>
                <p className={styles.reward}>
                  {rewardedToday ? (
                    <>You’ve earned today’s coins. Play again to practise — a new round comes tomorrow.</>
                  ) : (
                    <>
                      Today’s first round earns up to <Coin /> <b>{maxReward}</b> and a treat for a perfect score.
                    </>
                  )}
                </p>
                <button type="button" className={styles.primary} onClick={start}>
                  {pet.state.quiz.played > 0 ? 'Play today’s round' : 'Start'}
                </button>
                {pet.state.quiz.played > 0 && (
                  <p className={styles.meta}>
                    Rounds played: {pet.state.quiz.played} · perfect rounds: {pet.state.quiz.perfectRounds}
                  </p>
                )}
              </div>
            </div>
          )}

          {phase === 'question' && (
            <div className={styles.question}>
              <div className={styles.progress} aria-label={`Question ${index + 1} of ${round.length}`}>
                {round.map((r, i) => (
                  <span
                    key={r.id}
                    className={i < index ? (answers[r.id] === r.answer ? styles.pipGood : styles.pipBad) : i === index ? styles.pipNow : ''}
                  />
                ))}
              </div>
              <h2>{q.prompt}</h2>
              <ol className={styles.options}>
                {q.options.map((opt, i) => {
                  const state = picked === null ? '' : i === q.answer ? styles.optRight : i === picked ? styles.optWrong : styles.optDim
                  return (
                    <li key={i}>
                      <button
                        type="button"
                        className={`${styles.option} ${state}`}
                        onClick={() => choose(i)}
                        disabled={picked !== null}
                        aria-pressed={picked === i}
                      >
                        <span className={styles.letter} aria-hidden="true">
                          {String.fromCharCode(65 + i)}
                        </span>
                        {opt}
                      </button>
                    </li>
                  )
                })}
              </ol>
              {picked !== null && (
                <div className={styles.tip} role="status">
                  <RockyAvatar mood={picked === q.answer ? 'Happy' : 'Motivated'} evolutionStage={snapshot.gameState.evolutionStage} size={72} bare />
                  <p>
                    <b>{picked === q.answer ? 'Right!' : 'Not quite.'}</b> {q.tip}
                  </p>
                  <button type="button" className={styles.primary} onClick={next} autoFocus>
                    {index < round.length - 1 ? 'Next' : 'See my score'}
                  </button>
                </div>
              )}
            </div>
          )}

          {phase === 'done' && result && (
            <div className={styles.intro}>
              <RockyAvatar
                mood={result.correct === round.length ? 'Happy' : mood}
                evolutionStage={snapshot.gameState.evolutionStage}
                reaction={result.correct === round.length ? 'level-up' : null}
                size={170}
                bare
              />
              <div>
                <h1>
                  {result.correct} of {round.length}
                </h1>
                <p className={styles.lede}>
                  {result.correct === round.length
                    ? 'Perfect! Rocky would read your notes all day.'
                    : result.correct >= 3
                      ? 'Nice work. One more habit to polish — check the tips on the right.'
                      : 'Good practice. The checklist on the right is your cheat sheet.'}
                </p>
                <p className={styles.reward}>
                  {result.reward > 0 ? (
                    <>
                      You earned <Coin /> <b>{result.reward} coins</b>
                      {result.correct === round.length ? 'and a treat for Rocky' : ''}
                    </>
                  ) : (
                    <>Practice round — today’s coins were already earned.</>
                  )}
                </p>
                <button type="button" className={styles.primary} onClick={start}>
                  Play again
                </button>
              </div>
            </div>
          )}
        </section>

        <aside className={styles.checklist} aria-labelledby="checklist-title">
          <h2 id="checklist-title">A great note has</h2>
          <ul>
            {NOTE_CHECKLIST.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className={styles.meta}>Leave one after every call, email and chat — even the quick ones.</p>
        </aside>
      </div>
    </div>
  )
}
