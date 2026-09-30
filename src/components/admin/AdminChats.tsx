import { useEffect, useState } from 'react'
import { chatApi, type AdminChatChannel, type AdminChatMessage, type AdminChatReport, type ChatBackupStatus } from '../../services/apiClient'
import { ChatMedia, mediaOf } from '../chat/Media'
import styles from './AdminConsole.module.css'

const KIND: Record<AdminChatChannel['kind'], string> = { general: 'General', dm: '1 a 1', visit: 'Visita', group: 'Grupo / sala' }
const fmt = (at: string) => new Date(at).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })
const localDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/**
 * Copia de control de calidad de todas las conversaciones (solo admins de
 * Rocky; los supervisores no tienen acceso). Cada lectura y exportación
 * queda en la auditoría.
 */
export function ChatsTab({ onChanged, onError }: { onChanged: (m: string) => void; onError: (m: string) => void }) {
  const [sub, setSub] = useState<'reports' | 'pins' | 'conversations' | 'safety'>('reports')
  return (
    <div className={styles.stack}>
      <p className={styles.muted}>Solo admins. Cada lectura y exportación queda registrada; los mensajes se borran a los 90 días.</p>
      <div className={styles.subTabs}>
        {(
          [
            ['reports', '⚑ Reportes'],
            ['pins', '📌 Fijados'],
            ['conversations', 'Conversaciones'],
            ['safety', 'Pausas, exportación y backup'],
          ] as const
        ).map(([k, label]) => (
          <button key={k} className={`${styles.subTab} ${sub === k ? styles.subTabActive : ''}`} onClick={() => setSub(k)}>
            {label}
          </button>
        ))}
      </div>
      {sub === 'reports' && <Reports onChanged={onChanged} onError={onError} />}
      {sub === 'pins' && <Pins onChanged={onChanged} onError={onError} />}
      {sub === 'conversations' && <Conversations onChanged={onChanged} onError={onError} />}
      {sub === 'safety' && <Safety onChanged={onChanged} onError={onError} />}
    </div>
  )
}

function Reports({ onChanged, onError }: { onChanged: (m: string) => void; onError: (m: string) => void }) {
  const [all, setAll] = useState(false)
  const [reports, setReports] = useState<AdminChatReport[] | null>(null)
  const load = () =>
    chatApi
      .adminReports(all)
      .then((r) => setReports(r.reports))
      .catch((e) => onError(String(e.message ?? e)))
  useEffect(() => {
    void load()
  }, [all]) // eslint-disable-line react-hooks/exhaustive-deps

  async function resolve(r: AdminChatReport, action: 'hide' | 'dismiss') {
    try {
      await chatApi.adminResolve(r.id, action)
      onChanged(action === 'hide' ? 'Mensaje ocultado.' : 'Reporte descartado.')
      void load()
    } catch (e) {
      onError(e instanceof Error ? e.message : String(e))
    }
  }

  if (!reports) return <p className={styles.muted}>Cargando…</p>
  return (
    <div className={styles.card}>
      <div className={styles.toolbar}>
        <h3>{all ? 'Todos los reportes' : 'Reportes pendientes'}</h3>
        <label>
          <input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} /> Ver también los resueltos
        </label>
      </div>
      {reports.length === 0 && <p className={styles.empty}>No hay reportes {all ? '' : 'pendientes'}. 🎉</p>}
      <ul className={styles.plainList}>
        {reports.map((r) => (
          <li key={r.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--divider)' }}>
            <div>
              <strong>{r.message?.name ?? '—'}</strong> <span className={styles.muted}>({r.message?.email})</span> · {r.message ? fmt(r.message.at) : ''}
            </div>
            <blockquote style={{ margin: '6px 0', padding: '6px 10px', background: '#f6f8fa', borderRadius: 8 }}>
              {r.message?.body ?? '(mensaje borrado por retención)'}
              {r.message?.hidden && <em> — oculto</em>}
            </blockquote>
            <div className={styles.muted}>
              Reportado por {r.reporter.name} ({r.reporter.email}) · {fmt(r.at)}
              {r.reason ? ` · Motivo: “${r.reason}”` : ''}
              {r.resolution ? ` · Resuelto: ${r.resolution === 'hidden' ? 'ocultado' : 'descartado'} por ${r.resolvedBy}` : ''}
            </div>
            {!r.resolution && (
              <div className={styles.actionRow} style={{ marginTop: 6 }}>
                <button className={styles.btnDanger} onClick={() => void resolve(r, 'hide')}>
                  Ocultar mensaje
                </button>
                <button className={styles.btnGhost} onClick={() => void resolve(r, 'dismiss')}>
                  Descartar
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

function Conversations({ onChanged, onError }: { onChanged: (m: string) => void; onError: (m: string) => void }) {
  const [channels, setChannels] = useState<AdminChatChannel[] | null>(null)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState<AdminChatChannel | null>(null)
  const [messages, setMessages] = useState<AdminChatMessage[] | null>(null)
  const [more, setMore] = useState(false)

  useEffect(() => {
    chatApi
      .adminChannels()
      .then((r) => setChannels(r.channels.sort((a, b) => (b.lastAt ?? '').localeCompare(a.lastAt ?? ''))))
      .catch((e) => onError(String(e.message ?? e)))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function read(c: AdminChatChannel) {
    setOpen(c)
    setMessages(null)
    try {
      const r = await chatApi.adminRead(c.id)
      setMessages(r.messages)
      setMore(r.more)
    } catch (e) {
      onError(e instanceof Error ? e.message : String(e))
    }
  }
  async function older() {
    if (!open || !messages?.length) return
    const r = await chatApi.adminRead(open.id, messages[0]!.id)
    setMessages([...r.messages, ...messages])
    setMore(r.more)
  }
  async function hide(m: AdminChatMessage) {
    if (!window.confirm(`¿Ocultar este mensaje de ${m.name}? Los agentes verán “Mensaje ocultado por QA”.`)) return
    try {
      await chatApi.adminHide(m.id)
      setMessages((list) => list?.map((x) => (x.id === m.id ? { ...x, hidden: true } : x)) ?? list)
      onChanged('Mensaje ocultado.')
    } catch (e) {
      onError(e instanceof Error ? e.message : String(e))
    }
  }

  const q = query.trim().toLowerCase()
  const shown = (channels ?? []).filter((c) => !q || `${c.title} ${c.members.map((m) => `${m.name} ${m.email}`).join(' ')}`.toLowerCase().includes(q))
  return (
    <div className={styles.grid} style={{ gridTemplateColumns: 'minmax(260px, 1fr) 2fr', alignItems: 'start' }}>
      <div className={styles.card}>
        <input className={styles.search} placeholder="Buscar por agente o correo…" value={query} onChange={(e) => setQuery(e.target.value)} />
        {!channels && <p className={styles.muted}>Cargando…</p>}
        {channels?.length === 0 && <p className={styles.empty}>Aún no hay conversaciones.</p>}
        <ul className={styles.agentList}>
          {shown.map((c) => (
            <li key={c.id}>
              <button className={styles.agentListBtn} onClick={() => void read(c)} aria-current={open?.id === c.id}>
                <span className={styles.chip}>{KIND[c.kind]}</span> <strong>{c.title}</strong>
                <br />
                <small className={styles.muted}>{c.lastAt ? `Último mensaje: ${fmt(c.lastAt)}` : 'Sin mensajes'}</small>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className={styles.card}>
        {!open && <p className={styles.muted}>Elige una conversación para leerla. La lectura queda registrada en Auditoría.</p>}
        {open && (
          <>
            <h3>
              {open.title} <span className={styles.chip}>{KIND[open.kind]}</span>
            </h3>
            {open.members.length > 0 && <p className={styles.muted}>Participantes: {open.members.map((m) => `${m.name} (${m.email})`).join(', ')}</p>}
            {more && (
              <button className={styles.btnGhost} onClick={() => void older()}>
                Cargar mensajes anteriores
              </button>
            )}
            {!messages && <p className={styles.muted}>Cargando…</p>}
            <ul className={styles.plainList}>
              {messages?.map((m) => (
                <li key={m.id} style={{ padding: '6px 0', borderBottom: '1px solid var(--divider)', opacity: m.hidden ? 0.55 : 1 }}>
                  <strong>{m.name}</strong> <span className={styles.muted}>{m.email} · {fmt(m.at)}</span>
                  {m.flagged && <span className={styles.chip} title="El agente confirmó el envío aunque parecía dato de cliente"> ⚠️ posible dato de cliente</span>}
                  {m.hidden && <span className={styles.chip}>{m.hiddenBy === m.email ? ' borrado por su autor' : ` oculto por ${m.hiddenBy}`}</span>}
                  {mediaOf(m.body) ? <ChatMedia media={mediaOf(m.body)!} /> : <div style={{ whiteSpace: 'pre-wrap' }}>{m.body}</div>}
                  {m.edits && m.edits.length > 0 && (
                    <details>
                      <summary className={styles.muted}>editado {m.edits.length} vez/veces — ver versiones anteriores</summary>
                      {m.edits.map((e, i) => (
                        <div key={i} className={styles.muted} style={{ whiteSpace: 'pre-wrap' }}>
                          {fmt(e.editedAt)}: {e.body}
                        </div>
                      ))}
                    </details>
                  )}
                  {!m.hidden && (
                    <button className={styles.linkBtn} onClick={() => void hide(m)}>
                      ocultar
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  )
}

function Safety({ onChanged, onError }: { onChanged: (m: string) => void; onError: (m: string) => void }) {
  const today = new Date()
  const weekAgo = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6)
  const [email, setEmail] = useState('')
  const [hours, setHours] = useState('24')
  const [reason, setReason] = useState('')
  const [from, setFrom] = useState(localDay(weekAgo))
  const [to, setTo] = useState(localDay(today))
  const [backup, setBackup] = useState<ChatBackupStatus | null>(null)
  const [busy, setBusy] = useState(false)

  const loadBackup = () => chatApi.adminBackups().then(setBackup).catch((e) => onError(String(e.message ?? e)))
  useEffect(() => {
    void loadBackup()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function mute(h: number) {
    if (!email.trim()) return onError('Escribe el correo del agente.')
    try {
      const r = await chatApi.adminMute(email.trim(), h, reason)
      onChanged(r.mutedUntil ? `Chat pausado hasta ${fmt(r.mutedUntil)}.` : 'Pausa levantada.')
    } catch (e) {
      onError(e instanceof Error ? e.message : String(e))
    }
  }
  async function exportRange() {
    setBusy(true)
    try {
      const data = await chatApi.adminExport(from, to)
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `rocky-chat-${from}-a-${to}.json`
      a.click()
      URL.revokeObjectURL(a.href)
      onChanged(`Exportados ${data.messages.length} mensajes.`)
    } catch (e) {
      onError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }
  async function backupNow() {
    setBusy(true)
    try {
      const r = await chatApi.adminBackupNow(localDay(today))
      onChanged(`Backup de hoy: ${r.count} mensajes${r.uploaded ? ', subido al bucket' : ''}${r.error ? ` (error del bucket: ${r.error})` : ''}.`)
      void loadBackup()
    } catch (e) {
      onError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={styles.grid}>
      <div className={styles.card}>
        <h3>Pausar el chat de un agente</h3>
        <p className={styles.muted}>El agente puede leer pero no escribir hasta la fecha indicada. Queda en Auditoría.</p>
        <div className={styles.inlineForm}>
          <input className={styles.field} placeholder="correo@rlx.us" value={email} onChange={(e) => setEmail(e.target.value)} />
          <select className={styles.select} value={hours} onChange={(e) => setHours(e.target.value)}>
            <option value="1">1 hora</option>
            <option value="24">1 día</option>
            <option value="72">3 días</option>
            <option value="168">7 días</option>
          </select>
          <input className={styles.field} placeholder="Motivo (opcional)" value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
        <div className={styles.actionRow}>
          <button className={styles.btnDanger} onClick={() => void mute(Number(hours))}>
            Pausar chat
          </button>
          <button className={styles.btnGhost} onClick={() => void mute(0)}>
            Levantar pausa
          </button>
        </div>
      </div>
      <div className={styles.card}>
        <h3>Exportar conversaciones</h3>
        <p className={styles.muted}>Descarga todos los mensajes (incluidos ocultos) del rango, con correos. Queda en Auditoría.</p>
        <div className={styles.inlineForm}>
          <label>
            Desde <input className={styles.field} type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label>
            Hasta <input className={styles.field} type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
        </div>
        <button className={styles.btnPrimary} disabled={busy} onClick={() => void exportRange()}>
          Descargar JSON
        </button>
      </div>
      <div className={styles.card}>
        <h3>Backup diario</h3>
        {!backup && <p className={styles.muted}>Cargando…</p>}
        {backup && (
          <>
            <ul className={styles.plainList}>
              <li>{backup.target.local ? '✅' : '⚠️'} Copia en el volumen del servidor</li>
              <li>{backup.target.bucket ? '✅' : '⚠️'} Copia externa en bucket (fuera del servidor)</li>
              <li>{backup.target.encrypted ? '✅ Cifrado (AES-256-GCM)' : '⚠️ Sin cifrar — falta ROCKY_CHAT_BACKUP_KEY'}</li>
              <li>
                Último backup:{' '}
                {backup.last
                  ? `${backup.last.day} · ${backup.last.count} mensajes${backup.last.uploaded ? ' · subido' : ''}${backup.last.error ? ` · error: ${backup.last.error}` : ''}`
                  : 'aún no en este arranque (se hace cada noche)'}
              </li>
              <li>Última limpieza de 90 días: {backup.lastPurge ? `${fmt(backup.lastPurge.at)} · ${backup.lastPurge.removed} borrados` : '—'}</li>
            </ul>
            <button className={styles.btnGhost} disabled={busy} onClick={() => void backupNow()}>
              Hacer backup de hoy ahora
            </button>
          </>
        )}
      </div>
    </div>
  )
}

/** Every pinned announcement in one place: unpin without hunting for the message. */
function Pins({ onChanged, onError }: { onChanged: (m: string) => void; onError: (m: string) => void }) {
  const [pins, setPins] = useState<Awaited<ReturnType<typeof chatApi.adminPins>>['pins'] | null>(null)
  const load = () =>
    chatApi
      .adminPins()
      .then((r) => setPins(r.pins))
      .catch((e) => onError(String(e.message ?? e)))
  useEffect(() => {
    void load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  if (!pins) return <p className={styles.muted}>Cargando…</p>
  if (!pins.length) return <p className={styles.muted}>No hay mensajes fijados. Se fija un mensaje desde el chat (📌 junto al mensaje).</p>
  return (
    <div className={styles.tableCard}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Conversación</th>
            <th>Mensaje fijado</th>
            <th>Fijado por</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {pins.map((p) => (
            <tr key={p.channelId}>
              <td>
                <b>{p.title}</b>
                <br />
                <small className={styles.muted}>{KIND[p.kind as AdminChatChannel['kind']] ?? p.kind}</small>
              </td>
              <td>
                <b>{p.pinned.name}:</b> {mediaOf(p.pinned.body) ? '📷 Imagen' : p.pinned.body.slice(0, 160)}
              </td>
              <td className={styles.muted}>
                {p.pinned.pinnedBy}
                <br />
                {fmt(p.pinned.pinnedAt)}
              </td>
              <td>
                <button
                  className={styles.btnDangerOutline}
                  onClick={() =>
                    void chatApi
                      .adminPin(p.pinned.id, false)
                      .then(() => (onChanged('Mensaje desfijado.'), load()))
                      .catch((e) => onError(String(e.message ?? e)))
                  }
                >
                  Desfijar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
