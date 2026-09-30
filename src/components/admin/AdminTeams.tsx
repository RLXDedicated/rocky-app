import { useEffect, useMemo, useState } from 'react'
import { DAY_SHORT_ES, describeSchedule, parseRoster } from '../../game/schedule'
import { teamsApi, type TeamsSchedule, type TeamsStatus } from '../../services/apiClient'
import { getAgentEmail } from '../../services/identityService'
import styles from './AdminConsole.module.css'

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString('es', { dateStyle: 'short', timeStyle: 'short' }) : '—')
const KIND_ES: Record<string, string> = { reminder: 'Recordatorio', test: 'Prueba', ontime: 'Check-in a tiempo' }

/** The JSON the Workflows trigger receives — paste it as the "Parse JSON" sample. */
const SAMPLE_PAYLOAD = JSON.stringify(
  {
    type: 'rocky.cards',
    sentAt: '2026-09-30T14:00:00.000Z',
    count: 1,
    cards: [{ email: 'agente@rlx.us', name: 'Nombre Apellido', deliveryId: 'abc123', kind: 'reminder', category: 'Documentation', message: 'Texto', card: {} }],
  },
  null,
  2,
)

/** Horarios y Teams: the SharePoint roster (shifts, leaders) and Rocky's reminder cards in Teams. */
export function TeamsTab({ onChanged, onError }: { onChanged: (m: string) => void; onError: (m: string) => void }) {
  const [status, setStatus] = useState<TeamsStatus | null>(null)
  const [text, setText] = useState('')
  const [removeMissing, setRemoveMissing] = useState(false)
  // For lists without shift columns (like the pilot's "Pilot agents" list).
  const [useDefault, setUseDefault] = useState(true)
  const [fallback, setFallback] = useState({ days: [1, 2, 3, 4, 5], start: '08:00', end: '17:00' })
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState<TeamsSchedule | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
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
              <span className={styles.kpiLabel}>Agentes con horario</span>
              <span className={styles.kpiValue}>{status.roster}</span>
              <span className={styles.kpiHint}>Solo ellos reciben tarjetas, y solo en su turno</span>
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
          <button
            className={styles.btnGhost}
            disabled={busy}
            onClick={() =>
              void teamsApi
                .preview(me)
                .then((r) => setPreview(JSON.stringify(r.card, null, 2)))
                .catch(fail)
            }
          >
            👀 Ver JSON de la tarjeta
          </button>
        </div>
        <p className={styles.muted}>
          Efectos en Rocky: responder una tarjeta → +6 felicidad y +2 coins · check-in a tiempo para su turno (30 min antes a 60 min después) → +5 felicidad y +5 coins ·
          tarjeta ignorada 3 h → −6 felicidad (máx. 2 al día) · los días libres de su horario no rompen la racha.
        </p>
        {preview && (
          <details open>
            <summary>Adaptive Card (pégala en adaptivecards.io/designer para verla)</summary>
            <textarea className={styles.field} readOnly value={preview} rows={10} style={{ width: '100%', fontFamily: 'monospace', fontSize: 12 }} />
          </details>
        )}
      </section>

      <section className={styles.card}>
        <h3>📋 Importar la lista de SharePoint</h3>
        <p className={styles.muted}>
          En la lista de SharePoint: <b>Exportar → CSV</b> (o selecciona las filas en Excel y copia). Pega aquí el contenido con la fila de encabezados. Rocky reconoce columnas
          como <i>Correo, Nombre, Líder, Días, Entrada, Salida</i> u <i>Horario</i> (“8:00 - 17:00”), en español o inglés. Los días pueden ser “L-V”, “Lunes a Viernes”, “Mon-Fri” o
          “LMXJV”.
        </p>
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
                        <small className={styles.muted}>{r.email}</small>
                      </td>
                      <td className={styles.muted}>{r.leader ?? '—'}</td>
                      <td>{r.schedule ? describeSchedule(r.schedule) : withDefault && !r.problem ? <i className={styles.muted}>{describeSchedule(fallback)} (por defecto)</i> : '—'}</td>
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
            <div className={styles.actionRow}>
              <label>
                <input type="checkbox" checked={removeMissing} onChange={(e) => setRemoveMissing(e.target.checked)} /> Quitar el horario a quien ya no está en la lista
              </label>
              <button
                className={styles.btnPrimary}
                disabled={busy || usable === 0}
                onClick={() =>
                  void run(
                    () => teamsApi.importRoster(text, removeMissing, withDefault ? fallback : null),
                    (r) => `Lista importada: ${r.schedules} horarios y ${r.leaders} asignaciones de líder.`,
                  ).then((r) => r && setText(''))
                }
              >
                Importar {usable} agente{usable === 1 ? '' : 's'}
              </button>
            </div>
          </>
        )}
      </section>

      <div className={styles.tableCard}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Agente</th>
              <th>Líder</th>
              <th>Horario</th>
              <th>Origen</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {status?.schedules.length === 0 && (
              <tr>
                <td colSpan={5} className={styles.muted}>
                  Aún no hay horarios. Importa la lista de SharePoint arriba.
                </td>
              </tr>
            )}
            {status?.schedules.map((s) =>
              editing?.agentId === s.agentId ? (
                <tr key={s.agentId}>
                  <td colSpan={5}>
                    <ScheduleEditor
                      value={editing}
                      onChange={setEditing}
                      onCancel={() => setEditing(null)}
                      onSave={() =>
                        void run(
                          () => teamsApi.setSchedule(editing.agentId, { days: editing.days, start: editing.start, end: editing.end }),
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
                  <td className={styles.muted}>{s.leader ?? '—'}</td>
                  <td>{describeSchedule(s)}</td>
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

      <section className={styles.card}>
        <h3>🐂 Rocky dentro de Teams</h3>
        <ol className={styles.plainList} style={{ listStyle: 'decimal', paddingLeft: 20 }}>
          <li>
            <b>App de Rocky (recomendado):</b> descarga{' '}
            <a href="/teams/rocky-teams-app.zip" download>
              rocky-teams-app.zip
            </a>{' '}
            y en Teams ve a <b>Aplicaciones → Administrar sus aplicaciones → Cargar una aplicación</b>. Rocky aparece en la barra lateral y abre con la cuenta de Teams de cada
            agente, sin enlaces personales. Si tu cuenta no permite cargar apps, pide a TI que la publique para la organización (o solo para el grupo del piloto) desde el Centro
            de administración de Teams.
          </li>
          <li>
            <b>Sin permisos de TI:</b> en el canal o chat del equipo pulsa <b>+ → Sitio web</b> y pega <code>https://rocky-dist.vercel.app</code>. Cada agente entra una vez con su
            enlace personal (o su PIN) y queda recordado.
          </li>
        </ol>
      </section>

      <section className={styles.card}>
        <h3>🛠️ Cómo crear el flujo en Teams (una sola vez, sin conectores premium)</h3>
        <ol className={styles.plainList} style={{ listStyle: 'decimal', paddingLeft: 20 }}>
          <li>
            En Teams abre <b>Workflows</b> (o make.powerautomate.com) → <b>Crear</b> → <b>Flujo de nube instantáneo</b> con el desencadenador{' '}
            <b>“When a Teams webhook request is received”</b> (Cuando se recibe una solicitud de webhook de Teams). En “Who can trigger the flow” elige <b>Anyone</b>.
          </li>
          <li>
            Agrega <b>Parse JSON</b> (Analizar JSON) con Contenido = <i>Body</i> del desencadenador y “Use sample payload” con este ejemplo:
            <textarea className={styles.field} readOnly value={SAMPLE_PAYLOAD} rows={8} style={{ width: '100%', fontFamily: 'monospace', fontSize: 12 }} />
          </li>
          <li>
            Agrega <b>Apply to each</b> sobre <i>cards</i>. Dentro, <b>Post card in a chat or channel</b> (Publicar tarjeta en un chat o canal): Post as = <b>Flow bot</b>, Post in ={' '}
            <b>Chat with Flow bot</b>, Recipient = <i>email</i> (del elemento actual), Adaptive Card = la expresión <code>string(item()?['card'])</code>.
          </li>
          <li>
            Guarda. Copia la <b>URL HTTP POST</b> del desencadenador y pégala tú mismo en Railway → servicio rocky-backend → <b>Variables</b> →{' '}
            <code>ROCKY_TEAMS_WEBHOOK_URL</code> (no la compartas por chat: quien la tenga puede enviar tarjetas).
          </li>
          <li>Cuando Railway termine de desplegar, vuelve aquí y pulsa “Enviarme una tarjeta de prueba”.</li>
        </ol>
        <p className={styles.muted}>
          El flujo no decide nada: Rocky ya elige a quién, cuándo (solo dentro de su turno, con el mismo límite diario y pausas que la app) y qué dice. Los botones de la tarjeta abren
          Rocky con un enlace firmado que registra la respuesta.
        </p>
      </section>
    </div>
  )
}

function ScheduleEditor({
  value,
  onChange,
  onSave,
  onCancel,
  busy,
}: {
  value: TeamsSchedule
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
      <button className={styles.btnPrimary} disabled={busy || value.days.length === 0 || value.start >= value.end} onClick={onSave}>
        Guardar
      </button>
      <button className={styles.linkBtn} onClick={onCancel}>
        Cancelar
      </button>
    </div>
  )
}
