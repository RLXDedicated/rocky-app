import { useEffect, useMemo, useRef, useState } from 'react'
import { QA_REASONS, parseQaSheet } from '../../game/qaImport'
import { matchByName } from '../../game/schedule'
import { qaDeskApi, type QaAudit, type QaDesk as Desk } from '../../services/apiClient'
import styles from './QaDesk.module.css'

const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const errText = (e: unknown) => (e instanceof Error ? e.message : String(e))

/**
 * QA desk: log an audit in a few seconds (agent, ticket, Pass/Fail) or paste
 * the day's sheet from Excel. Each audit changes the agent's Rocky.
 */
export function QaDesk({ standalone = false }: { standalone?: boolean }) {
  const [desk, setDesk] = useState<Desk | null>(null)
  const [tab, setTab] = useState<'quick' | 'paste'>('quick')
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null)
  const load = () =>
    qaDeskApi
      .desk()
      .then(setDesk)
      .catch((e) => setToast({ ok: false, text: errText(e) }))
  useEffect(() => {
    void load()
  }, [])

  return (
    <section className={styles.desk}>
      <header className={styles.head}>
        <div>
          <h2>📋 QA rápido</h2>
          <p>
            Cada auditoría cambia el Rocky del agente: un Pass le da XP y energía; un Fail lo preocupa y le baja la felicidad.
            {!standalone && (
              <>
                {' '}
                <a href="/qa/" target="_blank" rel="noreferrer">
                  Abrir en su propia pestaña ↗
                </a>
              </>
            )}
          </p>
        </div>
        {desk && (
          <div className={styles.today}>
            <span className={styles.pass}>✅ {desk.today.pass}</span>
            <span className={styles.fail}>❌ {desk.today.fail}</span>
            <small>hoy</small>
          </div>
        )}
      </header>

      <div className={styles.tabs} role="tablist">
        <button role="tab" aria-selected={tab === 'quick'} onClick={() => setTab('quick')}>
          ⚡ Una por una
        </button>
        <button role="tab" aria-selected={tab === 'paste'} onClick={() => setTab('paste')}>
          📄 Pegar desde Excel
        </button>
      </div>

      {toast && (
        <div className={toast.ok ? styles.toastOk : styles.toastErr} role="status" onClick={() => setToast(null)}>
          {toast.text}
        </div>
      )}

      {desk && tab === 'quick' && <QuickForm desk={desk} onDone={(t) => (setToast({ ok: true, text: t }), void load())} onError={(t) => setToast({ ok: false, text: t })} />}
      {desk && tab === 'paste' && <PasteForm desk={desk} onDone={(t) => (setToast({ ok: true, text: t }), void load())} onError={(t) => setToast({ ok: false, text: t })} />}

      {desk && <Recent list={desk.recent} onChanged={(t) => (setToast({ ok: true, text: t }), void load())} onError={(t) => setToast({ ok: false, text: t })} />}
    </section>
  )
}

const norm = (t: string) =>
  t
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

/** Top matches for what's typed: every word must appear in the name or email. */
function suggest(query: string, people: Desk['people']) {
  const words = norm(query).split(/\s+/).filter(Boolean)
  if (!words.length) return []
  return people.filter((p) => words.every((w) => norm(`${p.name} ${p.email}`).includes(w))).slice(0, 8)
}

const DATE_KEY = 'rocky.qa.date'

/**
 * Keyboard-first: type a name → Enter → type the ticket → Enter = Pass
 * (Shift+Enter = Fail, then 1–6 picks the reason and Enter logs it).
 */
function QuickForm({ desk, onDone, onError }: { desk: Desk; onDone: (t: string) => void; onError: (t: string) => void }) {
  const [query, setQuery] = useState('')
  const [who, setWho] = useState<Desk['people'][number] | null>(null)
  const [hi, setHi] = useState(0)
  const [date, setDate] = useState(() => {
    try {
      const d = window.sessionStorage.getItem(DATE_KEY)
      return d && d <= today() ? d : today()
    } catch {
      return today()
    }
  })
  const [ticket, setTicket] = useState('')
  const [failing, setFailing] = useState(false)
  const [reason, setReason] = useState<string>(QA_REASONS[0])
  const [note, setNote] = useState('')
  const [keepAgent, setKeepAgent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [count, setCount] = useState(0)
  const agentRef = useRef<HTMLInputElement>(null)
  const ticketRef = useRef<HTMLInputElement>(null)
  const noteRef = useRef<HTMLInputElement>(null)
  const matches = useMemo(() => (who ? [] : suggest(query, desk.people)), [query, who, desk.people])

  useEffect(() => {
    try {
      window.sessionStorage.setItem(DATE_KEY, date)
    } catch {
      // private mode
    }
  }, [date])

  function pick(p: Desk['people'][number]) {
    setWho(p)
    setQuery(p.name)
    // Straight away (not on a timer), so fast typists never type into the agent box.
    ticketRef.current?.focus()
  }

  async function send(result: 'pass' | 'fail') {
    if (!who) {
      agentRef.current?.focus()
      return onError('Elige un agente de la lista.')
    }
    setBusy(true)
    try {
      await qaDeskApi.record({ agent: who.email, date, result, ticket, reason: result === 'fail' ? reason : '', note: result === 'fail' ? note : '' })
      setCount((c) => c + 1)
      onDone(`${result === 'pass' ? '✅ Pass' : '❌ Fail'} · ${who.name}${ticket ? ` · ${ticket}` : ''}`)
      setTicket('')
      setNote('')
      setFailing(false)
      if (keepAgent) ticketRef.current?.focus()
      else {
        setWho(null)
        setQuery('')
        agentRef.current?.focus()
      }
    } catch (e) {
      onError(errText(e))
    } finally {
      setBusy(false)
    }
  }

  function startFail() {
    if (!who) return onError('Elige un agente de la lista.')
    setFailing(true)
  }
  useEffect(() => {
    if (failing) noteRef.current?.focus()
  }, [failing])

  return (
    <div className={styles.card}>
      <div className={styles.row}>
        <label className={styles.grow}>
          <span>Agente</span>
          <div className={styles.combo}>
            <input
              ref={agentRef}
              value={query}
              autoFocus
              autoComplete="off"
              role="combobox"
              aria-expanded={matches.length > 0}
              placeholder="Escribe parte del nombre o correo…"
              onChange={(e) => {
                setQuery(e.target.value)
                setWho(null)
                setHi(0)
              }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') (e.preventDefault(), setHi((h) => Math.min(h + 1, matches.length - 1)))
                else if (e.key === 'ArrowUp') (e.preventDefault(), setHi((h) => Math.max(h - 1, 0)))
                else if ((e.key === 'Enter' || e.key === 'Tab') && matches[hi]) (e.preventDefault(), pick(matches[hi]!))
                else if (e.key === 'Enter' && who) (e.preventDefault(), ticketRef.current?.focus())
              }}
            />
            {matches.length > 0 && (
              <ul className={styles.suggest} role="listbox">
                {matches.map((p, i) => (
                  <li key={p.email} role="option" aria-selected={i === hi} onMouseDown={(e) => (e.preventDefault(), pick(p))}>
                    <b>{p.name}</b> <small>{p.email}</small>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <small className={who ? styles.okHint : styles.hint}>{who ? `✔ ${who.email}` : query && !matches.length ? 'Sin coincidencias' : '↑↓ para elegir · Enter confirma'}</small>
        </label>
        <label>
          <span>Ticket / caso</span>
          <input
            ref={ticketRef}
            value={ticket}
            onChange={(e) => setTicket(e.target.value)}
            placeholder="Enter = Pass"
            onKeyDown={(e) => {
              if (e.key !== 'Enter' || busy) return
              e.preventDefault()
              if (e.shiftKey) startFail()
              else void send('pass')
            }}
          />
          <small className={styles.hint}>Enter = Pass · Shift+Enter = Fail</small>
        </label>
        <label>
          <span>Fecha auditada</span>
          <input type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} />
        </label>
      </div>
      {!failing ? (
        <div className={styles.actions}>
          <button className={styles.passBtn} disabled={busy || !who} onClick={() => void send('pass')}>
            ✅ Pass <kbd>Enter</kbd>
          </button>
          <button className={styles.failBtn} disabled={busy || !who} onClick={startFail}>
            ❌ Fail… <kbd>⇧ Enter</kbd>
          </button>
          <label className={styles.keep}>
            <input type="checkbox" checked={keepAgent} onChange={(e) => setKeepAgent(e.target.checked)} /> Mantener agente (varios tickets seguidos)
          </label>
          {count > 0 && <span className={styles.hint}>{count} registradas en esta sesión</span>}
        </div>
      ) : (
        <div className={styles.failBox}>
          <span>¿Qué faltó? (1–{QA_REASONS.length})</span>
          <div className={styles.chips}>
            {QA_REASONS.map((r, i) => (
              <button key={r} aria-pressed={reason === r} onClick={() => setReason(r)}>
                <kbd>{i + 1}</kbd> {r}
              </button>
            ))}
          </div>
          <input
            ref={noteRef}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Comentario (opcional) · Enter registra · Esc cancela"
            onKeyDown={(e) => {
              const n = Number(e.key)
              if (!note && n >= 1 && n <= QA_REASONS.length) (e.preventDefault(), setReason(QA_REASONS[n - 1]!))
              else if (e.key === 'Enter' && !busy) (e.preventDefault(), void send('fail'))
              else if (e.key === 'Escape') (setFailing(false), ticketRef.current?.focus())
            }}
          />
          <div className={styles.actions}>
            <button className={styles.failBtn} disabled={busy} onClick={() => void send('fail')}>
              Registrar Fail <kbd>Enter</kbd>
            </button>
            <button className={styles.linkBtn} onClick={() => setFailing(false)}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function PasteForm({ desk, onDone, onError }: { desk: Desk; onDone: (t: string) => void; onError: (t: string) => void }) {
  const [text, setText] = useState('')
  const [passMark, setPassMark] = useState(85)
  const [busy, setBusy] = useState(false)
  const [results, setResults] = useState<Map<number, string> | null>(null)
  const parsed = useMemo(() => (text.trim() ? parseQaSheet(text, { passMark, today: today() }) : null), [text, passMark])
  const found = (agent: string) => desk.people.find((p) => p.email === agent.toLowerCase()) ?? matchByName(agent, desk.people)
  const ready = parsed?.rows.filter((r) => !r.problem && found(r.agent)).length ?? 0

  async function importAll() {
    setBusy(true)
    try {
      const r = await qaDeskApi.bulk(text, passMark)
      setResults(new Map(r.results.filter((x) => !x.ok).map((x) => [x.line, x.error ?? 'error'])))
      onDone(`${r.logged} auditorías registradas${r.results.length - r.logged ? `, ${r.results.length - r.logged} con problema (ver tabla)` : ''}.`)
      if (r.logged === r.results.length) setText('')
    } catch (e) {
      onError(errText(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={styles.card}>
      <p className={styles.hint}>
        Copia las filas de tu Excel de auditorías <b>con la fila de encabezados</b> y pégalas aquí. Rocky reconoce columnas como <i>Agente/Correo, Fecha, Resultado</i> (Pass/Fail,
        Cumple/No cumple) o <i>Puntaje</i>, <i>Ticket/Caso</i>, <i>Motivo</i> y <i>Comentario</i>. Un ticket repetido para el mismo agente y fecha no se registra dos veces.
      </p>
      <textarea value={text} onChange={(e) => (setText(e.target.value), setResults(null))} rows={6} placeholder={'Agente\tFecha\tResultado\tTicket\tMotivo\nana.perez@rlx.us\t29/09/2026\tPass\t12345\t'} aria-label="Auditorías pegadas" />
      {parsed && (
        <>
          <div className={styles.row}>
            <label>
              <span>Puntaje mínimo para Pass</span>
              <input type="number" min={1} max={100} value={passMark} onChange={(e) => setPassMark(Number(e.target.value))} />
            </label>
            <small className={styles.hint}>
              Fechas leídas como {parsed.dateOrder === 'dmy' ? 'día/mes/año' : 'mes/día/año'}. {parsed.missing.length ? `Faltan columnas: ${parsed.missing.join(', ')}.` : ''}
            </small>
          </div>
          <div className={styles.tableWrap}>
            <table>
              <thead>
                <tr>
                  <th>Fila</th>
                  <th>Agente</th>
                  <th>Fecha</th>
                  <th>Resultado</th>
                  <th>Ticket</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {parsed.rows.map((r) => {
                  const p = found(r.agent)
                  const err = results?.get(r.line)
                  return (
                    <tr key={r.line}>
                      <td>{r.line}</td>
                      <td>
                        {p?.name ?? r.agent}
                        {p && <small> · {p.email}</small>}
                      </td>
                      <td>{r.date ?? '—'}</td>
                      <td>{r.result === 'pass' ? '✅ Pass' : r.result === 'fail' ? `❌ Fail${r.reason ? ` · ${r.reason}` : ''}` : '—'}</td>
                      <td>{r.ticket ?? '—'}</td>
                      <td className={r.problem || !p || err ? styles.bad : styles.good}>{err ?? r.problem ?? (p ? 'OK' : 'agente no encontrado')}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className={styles.actions}>
            <button className={styles.passBtn} disabled={busy || ready === 0} onClick={() => void importAll()}>
              Registrar {ready} auditoría{ready === 1 ? '' : 's'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function Recent({ list, onChanged, onError }: { list: QaAudit[]; onChanged: (t: string) => void; onError: (t: string) => void }) {
  if (!list.length) return <p className={styles.hint}>Aún no hay auditorías registradas en los últimos 30 días.</p>
  async function flip(a: QaAudit) {
    const to = a.result === 'pass' ? 'fail' : 'pass'
    if (!window.confirm(`¿Cambiar la auditoría de ${a.name} (${a.auditDate}) a ${to === 'pass' ? 'Pass' : 'Fail'}? Rocky se ajusta solo.`)) return
    try {
      await qaDeskApi.change(a.id, to)
      onChanged(`Auditoría de ${a.name} cambiada a ${to === 'pass' ? 'Pass' : 'Fail'}.`)
    } catch (e) {
      onError(errText(e))
    }
  }
  return (
    <div className={styles.tableWrap}>
      <table>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Agente</th>
            <th>Resultado</th>
            <th>Ticket</th>
            <th>Registró</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {list.map((a) => (
            <tr key={a.id}>
              <td>{a.auditDate}</td>
              <td>{a.name}</td>
              <td className={a.result === 'pass' ? styles.good : styles.bad}>
                {a.result === 'pass' ? '✅ Pass' : `❌ Fail${a.reason ? ` · ${a.reason}` : ''}`}
                {a.correctedAt && <small> (corregida)</small>}
              </td>
              <td>{a.ticket ?? '—'}</td>
              <td>{a.auditorName}</td>
              <td>
                <button className={styles.linkBtn} onClick={() => void flip(a)}>
                  Cambiar a {a.result === 'pass' ? 'Fail' : 'Pass'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
