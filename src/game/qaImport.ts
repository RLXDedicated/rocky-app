// QA desk: audits pasted from the QA team's Excel sheet (or typed fast).
// Pure: the admin preview and the backend import read the same way.
import { nameKey } from './schedule'

export type QaResult = 'pass' | 'fail'

export interface QaRow {
  line: number
  /** An email, or a name to match against the roster. */
  agent: string
  /** YYYY-MM-DD */
  date: string | null
  result: QaResult | null
  score: number | null
  ticket: string | null
  reason: string | null
  note: string | null
  problem: string | null
}

/** Why an audit failed — one tap in the QA desk. */
export const QA_REASONS = ['Missing notes', 'Incomplete notes', 'Wrong information', 'Process not followed', 'Tone / courtesy', 'Other'] as const

const plain = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()

const HEADERS: Record<'agent' | 'date' | 'result' | 'score' | 'ticket' | 'reason' | 'note', RegExp> = {
  agent: /^(agent|agente|agent name|agent email|email|correo|nombre|name|teams ?email|asesor|representante|rep)$/,
  date: /^(date|fecha|audit date|fecha (de )?auditoria|fecha (de la )?interaccion|interaction date|dia)$/,
  result: /^(result|resultado|status|estado|outcome|qa result|resultado qa|pass\/fail|cumple|calificacion final)$/,
  score: /^(score|puntaje|nota|calificacion|%|porcentaje|qa score)$/,
  ticket: /^(ticket|caso|case|id|interaction|interaccion|interaction id|id interaccion|call id|order|orden|numero|#)$/,
  reason: /^(reason|motivo|razon|error|hallazgo|categoria|category|tipo de error|failure reason)$/,
  note: /^(note|notes|nota qa|comment|comments|comentario|comentarios|observacion|observaciones|feedback)$/,
}

export function parseQaResult(text: string): QaResult | null {
  const t = plain(text)
  if (!t) return null
  if (/^(pass|passed|ok|yes|si|cumple|aprobado|aprobada|approved|good|bien|correcto|1|true|✅|✔)$/.test(t)) return 'pass'
  if (/^(fail|failed|no|no cumple|rechazado|rechazada|reprobado|bad|mal|incorrecto|alert|0|false|❌|✖|x)$/.test(t)) return 'fail'
  return null
}

function splitLine(line: string, sep: string): string[] {
  if (sep === '\t') return line.split('\t').map((c) => c.trim())
  const out: string[] = []
  let cur = ''
  let q = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!
    if (ch === '"') {
      if (q && line[i + 1] === '"') (cur += '"'), i++
      else q = !q
    } else if (ch === sep && !q) (out.push(cur.trim()), (cur = ''))
    else cur += ch
  }
  out.push(cur.trim())
  return out
}

const pad = (n: number) => String(n).padStart(2, '0')

/** Reads one date; `order` says how to read "03/04/2026" (day first in Colombia, month first in the US). */
export function parseQaDate(text: string, order: 'dmy' | 'mdy'): string | null {
  const t = text.trim()
  if (!t) return null
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(t)
  if (m) return `${m[1]}-${pad(+m[2]!)}-${pad(+m[3]!)}`
  m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/.exec(t)
  if (m) {
    const [a, b] = [+m[1]!, +m[2]!]
    const y = m[3]!.length === 2 ? 2000 + +m[3]! : +m[3]!
    const [d, mo] = a > 12 ? [a, b] : b > 12 ? [b, a] : order === 'dmy' ? [a, b] : [b, a]
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return null
    return `${y}-${pad(mo)}-${pad(d)}`
  }
  // Excel serial day number (1900 system)
  if (/^\d{5}$/.test(t)) {
    const d = new Date(Date.UTC(1899, 11, 30) + Number(t) * 86_400_000)
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
  }
  return null
}

/**
 * Reads a pasted sheet (header row first). Needs an agent column and a
 * result or score column; a score at or above `passMark` counts as a pass.
 */
export function parseQaSheet(
  text: string,
  opts: { passMark?: number; today: string },
): { rows: QaRow[]; columns: string[]; missing: string[]; dateOrder: 'dmy' | 'mdy' } {
  const passMark = opts.passMark ?? 85
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim())
  if (!lines.length) return { rows: [], columns: [], missing: ['agent', 'result'], dateOrder: 'dmy' }
  const first = lines[0]!
  const sep = first.includes('\t') ? '\t' : first.split(';').length > first.split(',').length ? ';' : ','
  const header = splitLine(first, sep).map(plain)
  const col = (k: keyof typeof HEADERS) => header.findIndex((h) => HEADERS[k].test(h))
  const idx = { agent: col('agent'), date: col('date'), result: col('result'), score: col('score'), ticket: col('ticket'), reason: col('reason'), note: col('note') }
  const missing = [idx.agent < 0 ? 'agent' : null, idx.result < 0 && idx.score < 0 ? 'result' : null].filter(Boolean) as string[]
  const cells = lines.slice(1).map((l) => splitLine(l, sep))
  // Day-first unless some date only makes sense month-first.
  let dateOrder: 'dmy' | 'mdy' = 'dmy'
  if (idx.date >= 0)
    for (const c of cells) {
      const m = /^(\d{1,2})[/.-](\d{1,2})[/.-]/.exec(c[idx.date] ?? '')
      if (m && +m[2]! > 12) dateOrder = 'mdy'
      if (m && +m[1]! > 12) {
        dateOrder = 'dmy'
        break
      }
    }
  const rows: QaRow[] = []
  cells.forEach((c, i) => {
    const get = (n: number) => (n >= 0 ? (c[n] ?? '').trim() : '')
    const agent = get(idx.agent)
    if (!agent) return
    const problems: string[] = []
    const scoreText = get(idx.score).replace('%', '').replace(',', '.')
    const score = scoreText && !Number.isNaN(Number(scoreText)) ? Number(scoreText) : null
    let result = parseQaResult(get(idx.result))
    if (!result && score !== null) result = score >= passMark ? 'pass' : 'fail'
    if (!result) problems.push(get(idx.result) ? `no entiendo el resultado "${get(idx.result)}"` : 'sin resultado')
    const date = idx.date >= 0 && get(idx.date) ? parseQaDate(get(idx.date), dateOrder) : opts.today
    if (!date) problems.push(`no entiendo la fecha "${get(idx.date)}"`)
    else if (date > opts.today) problems.push('la fecha es futura')
    if (!/@/.test(agent) && nameKey(agent).length < 2) problems.push('escribe el correo o el nombre completo')
    rows.push({
      line: i + 2,
      agent,
      date,
      result,
      score,
      ticket: get(idx.ticket) || null,
      reason: get(idx.reason) || null,
      note: get(idx.note) || null,
      problem: problems.length ? problems.join('; ') : null,
    })
  })
  return { rows, columns: header, missing, dateOrder }
}
