import { useEffect, useMemo, useState } from 'react'
import { DAY_SHORT_ES, SHIFT_TIME_ZONES, describeSchedule, parseRoster } from '../../game/schedule'
import { teamsApi, type TeamsSchedule, type TeamsStatus } from '../../services/apiClient'
import { getAgentEmail } from '../../services/identityService'
import styles from './AdminConsole.module.css'
import { CardPreview } from './CardPreview'

const KIND_LABEL: Record<string, string> = {
  reminder: '📝 Recordatorio',
  greeting: '☀️ Saludo',
  weekly: '📅 Lunes (resumen)',
  streakrisk: '🔥 Racha en riesgo',
  milestone: '✨ Hito',
  kudos: '🙌 Kudos',
  leader: '📊 Líder',
}

const zoneLabel = (tz: string | null) => (tz ? (SHIFT_TIME_ZONES.find(([z]) => z === tz)?.[1] ?? tz) : 'Hora de Colombia')
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString('es', { dateStyle: 'short', timeStyle: 'short' }) : '—')
const KIND_ES: Record<string, string> = { reminder: 'Recordatorio', test: 'Prueba', ontime: 'Check-in a tiempo' }

interface NewAgent {
  name: string
  email: string
  leader: string
  days: number[]
  start: string
  end: string
  timeZone: string
  teams: boolean
}
const EMPTY_AGENT: NewAgent = { name: '', email: '', leader: '', days: [1, 2, 3, 4, 5], start: '08:00', end: '17:00', timeZone: 'America/New_York', teams: true }
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/


/** Horarios y Teams: the SharePoint roster (shifts, leaders) and Rocky's reminder cards in Teams. */
export function TeamsTab({ onChanged, onError }: { onChanged: (m: string) => void; onError: (m: string) => void }) {
  const [status, setStatus] = useState<TeamsStatus | null>(null)
  const [text, setText] = useState('')
  const [removeMissing, setRemoveMissing] = useState(false)
  // For lists without shift columns (like the pilot's "Pilot agents" list).
  const [useDefault, setUseDefault] = useState(true)
  // Zone the pasted hours are written in (a "TimeZone" column overrides it per row).
  const [zone, setZone] = useState('America/New_York')
  const [fallback, setFallback] = useState({ days: [1, 2, 3, 4, 5], start: '08:00', end: '17:00' })
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState<TeamsSchedule | null>(null)
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState<NewAgent>(EMPTY_AGENT)
  const [query, setQuery] = useState('')
  const [preview, setPreview] = useState<unknown | null>(null)
  const [previewKind, setPreviewKind] = useState('reminder')
  const showPreview = (kind: string) => {
    setPreviewKind(kind)
    teamsApi
      .preview(me, kind)
      .then((r) => setPreview(r.card))
      .catch(fail)
  }
  const parsed = useMemo(() => (text.trim() ? parseRoster(text) : null), [text])
  const fail = (e: unknown) => onError(e instanceof Error ? e.message : String(e))

  const load = () => teamsApi.status().then(setStatus).catch(fail)
  useEffect(() => {
    void load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function run<T>(fn: () => Promise<T>, ok: (r: T) => string) {
    setBusy(true)
    try {
      const r = await fn()
      onChanged(ok(r))
      void load()
      return r
    } catch (e) {
      fail(e)
      return null
    } finally {
      setBusy(false)
    }
  }

  const withDefault = useDefault && fallback.days.length > 0 && fallback.start < fallback.end
  const usable = parsed?.rows.filter((r) => !r.problem && (r.schedule || withDefault)).length ?? 0
  const noShift = parsed?.rows.filter((r) => !r.problem && !r.schedule).length ?? 0
  const me = getAgentEmail() ?? ''
  const leaders = status?.leaderOptions ?? []
  const leaderName = (email: string | null) => (email ? (leaders.find((l) => l.email === email)?.name ?? email) : null)
  const q = query.trim().toLowerCase()
  const shown = (status?.schedules ?? []).filter(
    (s) => !q || s.name.toLowerCase().includes(q) || s.agentId.includes(q) || (leaderName(s.leader) ?? '').toLowerCase().includes(q),
  )
  const draftOk = draft.name.trim() !== '' && EMAIL_RE.test(draft.email.trim()) && draft.days.length > 0 && draft.start < draft.end

  return (
    <div className={styles.stack}>
      <section className={styles.card}>
        <h3>🔌 Conexión con Teams</h3>
        {status && (
          <div className={styles.kpiGrid}>
            <div className={styles.kpi}>
              <span className={styles.kpiLabel}>Webhook de Workflows</span>
              <span className={`${styles.kpiValue} ${status.configured ? styles.kpiGood : styles.kpiWarn}`}>{status.configured ? 'Conectado' : 'Sin configurar'}</span>
              <span className={styles.kpiHint}>{status.webhookHost ?? 'Falta ROCKY_TEAMS_WEBHOOK_URL en Railway'}</span>
            </div>
            <div className={styles.kpi}>
              <span className={styles.kpiLabel}>Agentes</span>
              <span className={styles.kpiValue}>{status.roster}</span>
              <span className={styles.kpiHint}>{status.teamsOn} con recordatorios activos (solo en su turno)</span>
            </div>
            <div className={styles.kpi}>
              <span className={styles.kpiLabel}>Tarjetas 24 h</span>
              <span className={styles.kpiValue}>{status.last24h.sent}</span>
              <span className={styles.kpiHint}>
                {status.last24h.opened} abiertas · {status.last24h.done} “notas listas” · {status.last24h.ignored} ignoradas
                {status.last24h.failed ? ` · ${status.last24h.failed} fallidas` : ''}
              </span>
            </div>
            <div className={styles.kpi}>
              <span className={styles.kpiLabel}>Último envío</span>
              <span className={styles.kpiValue}>{status.lastDispatch ? `${status.lastDispatch.sent}/${status.lastDispatch.due}` : '—'}</span>
              <span className={styles.kpiHint}>{status.lastDispatch ? `${when(status.lastDispatch.at)}${status.lastDispatch.error ? ` · ${status.lastDispatch.error}` : ''}` : 'Revisa cada 5 minutos'}</span>
            </div>
          </div>
        )}
        <div className={styles.actionRow}>
          <button className={styles.btnPrimary} disabled={busy || !status?.configured} onClick={() => void run(() => teamsApi.test(), (r) => (r.ok ? `Tarjeta de prueba enviada a ${me}. Revisa tu chat con Workflows en Teams.` : `Teams no la aceptó: ${r.error}`))}>
            📨 Enviarme una tarjeta de prueba
          </button>
          <button className={styles.btnGhost} disabled={busy || !status?.configured} onClick={() => void run(() => teamsApi.dispatch(), (r) => `Revisión hecha: ${r.sent} de ${r.due} tarjetas enviadas${r.error ? ` (${r.error})` : ''}.`)}>
            ⚡ Revisar turnos ahora
          </button>
          <button className={styles.btnGhost} disabled={busy} onClick={() => (preview ? setPreview(null) : showPreview(previewKind))}>
            👀 {preview ? 'Ocultar vista previa' : 'Ver las tarjetas'}
          </button>
        </div>
        {status && (
          <div className={styles.actionRow}>
            <label style={{ fontWeight: 700 }}>
              <input
                type="checkbox"
                checked={status.notesOnly !== false}
                onChange={(e) =>
                  void run(() => teamsApi.setNotesOnly(e.target.checked), (r) =>
                    r.notesOnly ? 'Modo solo notas: recordatorios y consejos, sin Rocky.' : 'Tarjetas completas de Rocky activadas (mascota, stickers, kudos, líderes).',
                  )
                }
              />{' '}
              📝 Solo notas (sin Rocky ni datos de la mascota)
            </label>
          </div>
        )}
        {status && status.notesOnly !== false && (
          <p className={styles.muted}>
            Al inicio del turno llega un enfoque de notas y luego 5 recordatorios repartidos en el turno (mínimo 60 min entre uno y otro), cada uno con un consejo. Sin
            mascota, stickers ni enlaces a la app.
          </p>
        )}
        {status && (
          <div className={styles.actionRow}>
            <button className={styles.btnGhost} disabled={busy} onClick={() => void run(() => teamsApi.setTeamsFor('all', true), (r) => `Recordatorios activados para ${r.changed} agentes.`)}>
              ✅ Activar recordatorios a todos
            </button>
            <button className={styles.btnGhost} disabled={busy} onClick={() => void run(() => teamsApi.setTeamsFor('all', false), (r) => `Recordatorios en pausa para ${r.changed} agentes.`)}>
              ⏸ Pausar a todos
            </button>
          </div>
        )}
        {status && status.notesOnly === false && (
          <details>
            <summary className={styles.summary}>Opciones de las tarjetas completas de Rocky</summary>
            <div className={styles.actionRow}>
              <label>
                <input
                  type="checkbox"
                  checked={status.roast}
                  onChange={(e) => void run(() => teamsApi.setRoast(e.target.checked), (r) => (r.roast ? 'Rocky vuelve a bromear en Teams 😏' : 'Rocky solo manda mensajes amables.'))}
                />{' '}
                😏 Tono con humor (roast estilo Duolingo)
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={status.leaderSummary !== false}
                  onChange={(e) =>
                    void run(() => teamsApi.setLeaderSummary(e.target.checked), (r) => (r.leaderSummary ? 'Los líderes recibirán su resumen cada lunes.' : 'Resumen de líderes pausado.'))
                  }
                />{' '}
                📊 Resumen semanal a líderes (lunes 9 a. m.{status.leaders !== undefined ? ` · ${status.leaders} líderes con equipo` : ''})
              </label>
              <button
                className={styles.btnGhost}
                disabled={busy || !status.configured}
                onClick={() => void run(() => teamsApi.sendLeaderSummaries(), (r) => (r.ok ? `Resumen enviado a ${r.sent} líderes.` : `No se envió: ${r.error}`))}
              >
                📤 Enviar resumen a líderes ahora
              </button>
              <a className={styles.linkBtn} href="/teams/rocky-teams-app.zip" download>
                ⬇ App de Rocky para Teams
              </a>
            </div>
            <p className={styles.muted}>
              Tarjetas: ☀️ saludo al inicio del turno (lunes con resumen semanal) · 📝 hasta 3 recordatorios con una lección de notas · 🔥 racha en riesgo al final del turno · 🙌 kudos · 📊 líderes cada lunes.
            </p>
            <p className={styles.muted}>
              Efectos: responder tarjeta +6 felicidad y +2 coins · check-in a tiempo +5 y +5 · tarjeta ignorada 3 h −6 (máx. 2/día) · días libres no rompen la racha.
            </p>
          </details>
        )}
        {status?.last24h.byKind && Object.keys(status.last24h.byKind).length > 0 && (
          <p className={styles.muted}>
            Últimas 24 h por tipo:{' '}
            {Object.entries(status.last24h.byKind)
              .map(([k, n]) => `${KIND_LABEL[k] ?? k} ${n}`)
              .join(' · ')}
          </p>
        )}
        {preview !== null && (
          <div className={styles.stack}>
            <div className={styles.actionRow}>
              {Object.entries(KIND_LABEL).map(([k, label]) => (
                <button key={k} className={k === previewKind ? styles.btnPrimary : styles.btnGhost} onClick={() => showPreview(k)}>
                  {label}
                </button>
              ))}
            </div>
            <CardPreview card={preview} />
            <details>
              <summary>JSON (adaptivecards.io/designer)</summary>
              <textarea className={styles.field} readOnly value={JSON.stringify(preview, null, 2)} rows={10} style={{ width: '100%', fontFamily: 'monospace', fontSize: 12 }} />
            </details>
          </div>
        )}
      </section>

      <section className={styles.card}>
        <div className={styles.sectionHead}>
          <div>
            <h3>➕ Agregar un agente</h3>
            <p className={styles.muted}>Para sumar a alguien sin importar un CSV.</p>
          </div>
          {!adding && (
            <button className={styles.btnPrimary} onClick={() => setAdding(true)}>
              Agregar agente
            </button>
          )}
        </div>
        {adding && (
          <div className={styles.formGrid}>
            <label className={styles.field}>
              <span>Nombre</span>
              <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Ana Pérez" />
            </label>
            <label className={styles.field}>
              <span>Correo de Teams</span>
              <input type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} placeholder="aperez@rlx.us" />
            </label>
            <label className={styles.field}>
              <span>Líder</span>
              <select className={styles.select} value={draft.leader} onChange={(e) => setDraft({ ...draft, leader: e.target.value })}>
                <option value="">Sin líder</option>
                {leaders.map((l) => (
                  <option key={l.email} value={l.email}>
                    {l.name}
                  </option>
                ))}
              </select>
            </label>
            <div className={styles.field}>
              <span>Días de trabajo</span>
              <div className={styles.dayPicks}>
                {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                  <label key={d}>
                    <input
                      type="checkbox"
                      checked={draft.days.includes(d)}
                      onChange={() =>
                        setDraft({ ...draft, days: draft.days.includes(d) ? draft.days.filter((x) => x !== d) : [...draft.days, d].sort((a, b) => a - b) })
                      }
                    />{' '}
                    {DAY_SHORT_ES[d]}
                  </label>
                ))}
              </div>
            </div>
            <label className={styles.field}>
              <span>Entrada</span>
              <input type="time" value={draft.start} onChange={(e) => setDraft({ ...draft, start: e.target.value })} />
            </label>
            <label className={styles.field}>
              <span>Salida</span>
              <input type="time" value={draft.end} onChange={(e) => setDraft({ ...draft, end: e.target.value })} />
            </label>
            <label className={styles.field}>
              <span>Zona horaria del turno</span>
              <select className={styles.select} value={draft.timeZone} onChange={(e) => setDraft({ ...draft, timeZone: e.target.value })}>
                {SHIFT_TIME_ZONES.map(([z, label]) => (
                  <option key={z} value={z}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.switchRow}>
              <input type="checkbox" role="switch" className={styles.switch} checked={draft.teams} onChange={(e) => setDraft({ ...draft, teams: e.target.checked })} />
              Recibe recordatorios en Teams
            </label>
            <div className={styles.formActions}>
              <button
                className={styles.btnPrimary}
                disabled={busy || !draftOk}
                onClick={() =>
                  void run(
                    () =>
                      teamsApi.addAgent({
                        email: draft.email.trim(),
                        name: draft.name.trim(),
                        days: draft.days,
                        start: draft.start,
                        end: draft.end,
                        timeZone: draft.timeZone,
                        leader: draft.leader || null,
                        teams: draft.teams,
                      }),
                    () => `${draft.name.trim()} agregado${draft.teams ? ': recibirá recordatorios en su turno.' : ' (recordatorios en pausa).'}`,
                  ).then((r) => {
                    if (r) {
                      setDraft(EMPTY_AGENT)
                      setAdding(false)
                    }
                  })
                }
              >
                Guardar agente
              </button>
              <button
                className={styles.linkBtn}
                onClick={() => {
                  setDraft(EMPTY_AGENT)
                  setAdding(false)
                }}
              >
                Cancelar
              </button>
              {!draftOk && <small className={styles.muted}>Completa nombre, un correo válido, al menos un día y una salida después de la entrada.</small>}
            </div>
          </div>
        )}
      </section>

      <details className={styles.card}>
        <summary className={styles.summary}>📋 Importar la lista de SharePoint (CSV)</summary>
        <p className={styles.muted}>Pega el CSV de la lista de SharePoint (con encabezados) o una lista “Nombre / Horario”; los nombres se buscan en el roster.</p>
        <textarea
          className={styles.field}
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          placeholder={'Correo,Nombre,Líder,Días,Entrada,Salida\nana.perez@rlx.us,Ana Pérez,mcantillo@rlx.us,L-V,8:00,17:00'}
          style={{ width: '100%', fontFamily: 'monospace', fontSize: 12 }}
          aria-label="Lista pegada"
        />
        {parsed && (
          <>
            {parsed.missing.includes('email') ? (
              <p className={styles.riskLine}>No encuentro la columna de correo. Encabezados leídos: {parsed.columns.join(' · ') || '—'}</p>
            ) : (
              parsed.missing.length > 0 && (
                <p className={styles.muted}>
                  La lista no trae columnas de horario ({parsed.missing.join(', ')}): se usará el turno por defecto de abajo, y luego puedes ajustar a cada agente.
                </p>
              )
            )}
            <div className={styles.tableCard} style={{ maxHeight: 280, overflow: 'auto' }}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Fila</th>
                    <th>Agente</th>
                    <th>Líder</th>
                    <th>Horario</th>
                    <th>Recordatorios</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {parsed.rows.map((r) => (
                    <tr key={r.line}>
                      <td className={styles.muted}>{r.line}</td>
                      <td>
                        {r.name ?? '—'}
                        <br />
                        <small className={styles.muted}>{r.email || 'se busca por nombre'}</small>
                      </td>
                      <td className={styles.muted}>{r.leader ?? r.leaderName ?? '—'}</td>
                      <td>
                        {r.schedule ? describeSchedule(r.schedule) : withDefault && !r.problem ? <i className={styles.muted}>{describeSchedule(fallback)} (por defecto)</i> : '—'}
                        {r.timeZone && <small className={styles.muted}> · {zoneLabel(r.timeZone)}</small>}
                      </td>
                      <td>{r.active === false ? <span className={styles.chip}>No</span> : r.active ? <span className={styles.statusOk}>Sí</span> : <span className={styles.muted}>—</span>}</td>
                      <td>{r.problem ? <span className={styles.statusWarn}>{r.problem}</span> : r.schedule || withDefault ? <span className={styles.statusOk}>OK</span> : <span className={styles.chip}>sin horario</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {noShift > 0 && (
              <div className={styles.inlineForm}>
                <label>
                  <input type="checkbox" checked={useDefault} onChange={(e) => setUseDefault(e.target.checked)} /> Turno por defecto para los {noShift} sin horario:
                </label>
                {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                  <label key={d}>
                    <input
                      type="checkbox"
                      disabled={!useDefault}
                      checked={fallback.days.includes(d)}
                      onChange={() => setFallback((f) => ({ ...f, days: f.days.includes(d) ? f.days.filter((x) => x !== d) : [...f.days, d].sort((a, b) => a - b) }))}
                    />{' '}
                    {DAY_SHORT_ES[d]}
                  </label>
                ))}
                <input type="time" disabled={!useDefault} value={fallback.start} onChange={(e) => setFallback((f) => ({ ...f, start: e.target.value }))} aria-label="Entrada por defecto" />
                <input type="time" disabled={!useDefault} value={fallback.end} onChange={(e) => setFallback((f) => ({ ...f, end: e.target.value }))} aria-label="Salida por defecto" />
              </div>
            )}
            <div className={styles.inlineForm}>
              <label className={styles.field}>
                <span>Las horas de esta lista están en</span>
                <select className={styles.select} value={zone} onChange={(e) => setZone(e.target.value)}>
                  {SHIFT_TIME_ZONES.map(([z, label]) => (
                    <option key={z} value={z}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <small className={styles.muted}>
                Si las horas están en hora del Este, Rocky las pasa a hora Colombia solo (hoy 08:00 Este = 07:00 Colombia) y sigue el cambio de horario de EE. UU. en
                noviembre. Una columna TimeZone en la lista tiene prioridad.
              </small>
            </div>
            <div className={styles.actionRow}>
              <label>
                <input type="checkbox" checked={removeMissing} onChange={(e) => setRemoveMissing(e.target.checked)} /> Quitar el horario a quien ya no está en la lista
              </label>
              <button
                className={styles.btnPrimary}
                disabled={busy || usable === 0}
                onClick={() =>
                  void run(
                    () => teamsApi.importRoster(text, removeMissing, withDefault ? fallback : null, zone),
                    (r) =>
                      [
                        `Lista importada: ${r.schedules} horarios y ${r.leaders} asignaciones de líder.`,
                        r.matchedByName ? `${r.matchedByName} encontrados por nombre.` : '',
                        r.unmatched.length ? `Sin coincidencia (no están en el roster): ${r.unmatched.join(', ')}.` : '',
                        r.unmatchedLeaders.length ? `Líder sin identificar: ${r.unmatchedLeaders.join(', ')} (asígnalo en Roles y equipos).` : '',
                      ]
                        .filter(Boolean)
                        .join(' '),
                  ).then((r) => r && setText(''))
                }
              >
                Importar {usable} agente{usable === 1 ? '' : 's'}
              </button>
            </div>
          </>
        )}
      </details>

      <div className={styles.tableCard}>
        <div className={styles.tableToolbar}>
          <div>
            <b>Agentes y recordatorios</b>
            {status && (
              <small className={styles.muted}>
                {' '}
                · {status.teamsOn} de {status.roster} reciben recordatorios
              </small>
            )}
          </div>
          <input
            className={styles.search}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar agente, correo o líder"
            aria-label="Buscar agente"
          />
        </div>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Agente</th>
              <th>Líder</th>
              <th>Horario</th>
              <th>Recordatorios</th>
              <th>Origen</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {status && shown.length === 0 && (
              <tr>
                <td colSpan={6} className={styles.muted}>
                  {status.schedules.length === 0 ? 'Aún no hay agentes. Agrega uno o importa la lista de SharePoint.' : 'Nadie coincide con la búsqueda.'}
                </td>
              </tr>
            )}
            {shown.map((s) =>
              editing?.agentId === s.agentId ? (
                <tr key={s.agentId}>
                  <td colSpan={6}>
                    <ScheduleEditor
                      value={editing}
                      leaders={leaders}
                      onChange={setEditing}
                      onCancel={() => setEditing(null)}
                      onSave={() =>
                        void run(
                          () => teamsApi.setSchedule(editing.agentId, {
                              days: editing.days,
                              start: editing.start,
                              end: editing.end,
                              timeZone: editing.timeZone,
                              leader: editing.leader ?? null,
                            }),
                          () => `Horario guardado: ${editing.name}`,
                        ).then((r) => r && setEditing(null))
                      }
                      busy={busy}
                    />
                  </td>
                </tr>
              ) : (
                <tr key={s.agentId}>
                  <td>
                    <b>{s.name}</b> {!s.signedUp && <span className={styles.chip}>aún no abre Rocky</span>}
                    <br />
                    <small className={styles.muted}>{s.agentId}</small>
                  </td>
                  <td className={styles.muted}>{leaderName(s.leader) ?? '—'}</td>
                  <td>
                    {describeSchedule(s)}
                    {s.local && (
                      <>
                        <br />
                        <small className={styles.muted}>
                          {zoneLabel(s.timeZone)} · hoy en Colombia: {s.local.start}–{s.local.end}
                        </small>
                      </>
                    )}
                  </td>
                  <td>
                    <label className={styles.switchRow} title={s.teams ? 'Recibe recordatorios en Teams en su turno.' : 'Recordatorios en pausa.'}>
                      <input
                        type="checkbox"
                        role="switch"
                        className={styles.switch}
                        checked={s.teams}
                        disabled={busy}
                        aria-label={`Recordatorios de ${s.name}`}
                        onChange={() =>
                          void run(
                            () => teamsApi.setTeamsFor([s.agentId], !s.teams),
                            () => (s.teams ? `Recordatorios en pausa para ${s.name}.` : `${s.name} recibirá recordatorios en su turno.`),
                          )
                        }
                      />
                      <span className={s.teams ? styles.statusOk : styles.muted}>{s.teams ? 'Activos' : 'En pausa'}</span>
                    </label>
                  </td>
                  <td className={styles.muted}>{s.source === 'import' ? 'SharePoint' : 'Admin'}</td>
                  <td>
                    <button className={styles.linkBtn} onClick={() => setEditing(s)}>
                      Editar
                    </button>{' '}
                    <button
                      className={styles.linkBtn}
                      onClick={() => {
                        if (window.confirm(`¿Quitar el horario de ${s.name}? Dejará de recibir tarjetas en Teams.`))
                          void run(() => teamsApi.removeSchedule(s.agentId), () => 'Horario quitado.')
                      }}
                    >
                      Quitar
                    </button>
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>

      {status && status.recent.length > 0 && (
        <div className={styles.tableCard}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Enviada</th>
                <th>Agente</th>
                <th>Tipo</th>
                <th>Resultado</th>
              </tr>
            </thead>
            <tbody>
              {status.recent.map((d) => (
                <tr key={d.id}>
                  <td className={styles.muted}>{when(d.sentAt)}</td>
                  <td>{d.name}</td>
                  <td>
                    {KIND_ES[d.kind] ?? d.kind}
                    {d.category ? <small className={styles.muted}> · {d.category}</small> : null}
                  </td>
                  <td>
                    {!d.ok ? (
                      <span className={styles.statusWarn}>No enviada{d.error ? `: ${d.error}` : ''}</span>
                    ) : d.actedAt ? (
                      <span className={styles.statusOk}>✅ Notas listas</span>
                    ) : d.openedAt ? (
                      <span className={styles.statusOk}>Abrió Rocky</span>
                    ) : d.ignoredAt ? (
                      <span className={styles.statusWarn}>Ignorada</span>
                    ) : (
                      <span className={styles.chip}>{d.kind === 'ontime' ? 'Bono aplicado' : 'Esperando'}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  )
}

function ScheduleEditor({
  value,
  leaders,
  onChange,
  onSave,
  onCancel,
  busy,
}: {
  value: TeamsSchedule
  leaders: { email: string; name: string }[]
  onChange: (s: TeamsSchedule) => void
  onSave: () => void
  onCancel: () => void
  busy: boolean
}) {
  const toggle = (d: number) => onChange({ ...value, days: value.days.includes(d) ? value.days.filter((x) => x !== d) : [...value.days, d].sort((a, b) => a - b) })
  return (
    <div className={styles.inlineForm}>
      <b>{value.name}</b>
      {[1, 2, 3, 4, 5, 6, 0].map((d) => (
        <label key={d}>
          <input type="checkbox" checked={value.days.includes(d)} onChange={() => toggle(d)} /> {DAY_SHORT_ES[d]}
        </label>
      ))}
      <label className={styles.field}>
        <span>Entrada</span>
        <input type="time" value={value.start} onChange={(e) => onChange({ ...value, start: e.target.value })} />
      </label>
      <label className={styles.field}>
        <span>Salida</span>
        <input type="time" value={value.end} onChange={(e) => onChange({ ...value, end: e.target.value })} />
      </label>
      <select className={styles.select} value={value.timeZone ?? 'America/Bogota'} onChange={(e) => onChange({ ...value, timeZone: e.target.value })} aria-label="Zona horaria">
        {SHIFT_TIME_ZONES.map(([z, label]) => (
          <option key={z} value={z}>
            {label}
          </option>
        ))}
      </select>
      <select className={styles.select} value={value.leader ?? ''} onChange={(e) => onChange({ ...value, leader: e.target.value || null })} aria-label="Líder">
        <option value="">Sin líder</option>
        {leaders.map((l) => (
          <option key={l.email} value={l.email}>
            {l.name}
          </option>
        ))}
        {value.leader && !leaders.some((l) => l.email === value.leader) && <option value={value.leader}>{value.leader}</option>}
      </select>
      <button className={styles.btnPrimary} disabled={busy || value.days.length === 0 || value.start >= value.end} onClick={onSave}>
        Guardar
      </button>
      <button className={styles.linkBtn} onClick={onCancel}>
        Cancelar
      </button>
    </div>
  )
}
