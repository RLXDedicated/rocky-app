// Agent work schedules (the shifts that live in the SharePoint roster) and a
// forgiving parser for the ways people write them in a list or a CSV export:
// "L-V", "Lun a Vie", "Mon-Fri", "1,2,3,4,5", "Lunes, Miércoles"; "8:00",
// "08:00", "8:00 a. m.", "5pm", "17:30".
//
// Pure module: shared by the frontend (admin import preview) and the backend
// (reminders only during the shift, streaks that skip days off).

export interface AgentSchedule {
  /** 0 = Sunday … 6 = Saturday. */
  days: number[]
  /** "HH:MM", 24h, local time. */
  start: string
  end: string
}

const DAY_NAMES: Record<string, number> = {
  // Spanish
  domingo: 0, dom: 0, do: 0, d: 0,
  lunes: 1, lun: 1, lu: 1, l: 1,
  martes: 2, mar: 2, ma: 2,
  miercoles: 3, mie: 3, mi: 3, x: 3,
  jueves: 4, jue: 4, ju: 4, j: 4,
  viernes: 5, vie: 5, vi: 5, v: 5,
  sabado: 6, sab: 6, sa: 6, s: 6,
  // English
  sunday: 0, sun: 0, su: 0,
  monday: 1, mon: 1, mo: 1,
  tuesday: 2, tue: 2, tues: 2, tu: 2,
  wednesday: 3, wed: 3, we: 3, w: 3,
  thursday: 4, thu: 4, thur: 4, thurs: 4, th: 4,
  friday: 5, fri: 5, fr: 5, f: 5,
  saturday: 6, sat: 6,
}

const plain = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\./g, '')
    .trim()

function dayOf(token: string): number | null {
  const t = plain(token)
  if (/^[0-6]$/.test(t)) return Number(t)
  if (t === '7') return 0
  return t in DAY_NAMES ? DAY_NAMES[t]! : null
}

/** Days from text like "L-V", "Lunes a Viernes", "Mon, Wed, Fri", "1-5". Null when it can't be read. */
export function parseDays(text: string): number[] | null {
  const src = plain(text)
  if (!src) return null
  if (/^(todos|todos los dias|diario|daily|all|everyday|every day)$/.test(src)) return [0, 1, 2, 3, 4, 5, 6]
  const days = new Set<number>()
  for (const part of src.split(/[,;/|+&]|\s+y\s+|\s+and\s+/)) {
    const p = part.trim()
    if (!p) continue
    const range = /^(.+?)\s*[-–]\s*(.+)$/.exec(p) ?? /^(.+?)\s+(?:a|to|al|hasta)\s+(.+)$/.exec(p)
    if (range && dayOf(range[1]!) !== null && dayOf(range[2]!) !== null) {
      let d = dayOf(range[1]!)!
      const end = dayOf(range[2]!)!
      for (let i = 0; i < 7; i++) {
        days.add(d)
        if (d === end) break
        d = (d + 1) % 7
      }
      continue
    }
    // "LMXJV" style run of single letters
    if (/^[lmxjvsd]{2,7}$/.test(p)) {
      const letters: Record<string, number> = { l: 1, m: 2, x: 3, j: 4, v: 5, s: 6, d: 0 }
      for (const ch of p) days.add(letters[ch]!)
      continue
    }
    const one = dayOf(p)
    if (one === null) return null
    days.add(one)
  }
  return days.size ? [...days].sort((a, b) => a - b) : null
}

/** "8", "8:00", "08:00", "8:00 a. m.", "5pm", "17:30" → "HH:MM". Null when it can't be read. */
export function parseTime(text: string): string | null {
  const src = plain(text).replace(/\s+/g, '')
  const m = /^(\d{1,2})(?:[:h](\d{2}))?(am|pm|a|p)?$/.exec(src)
  if (!m) return null
  let h = Number(m[1])
  const min = m[2] ? Number(m[2]) : 0
  const mer = m[3]?.[0]
  if (mer && (h < 1 || h > 12)) return null
  if (mer === 'p' && h < 12) h += 12
  if (mer === 'a' && h === 12) h = 0
  if (h > 23 || min > 59) return null
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
}

/** A shift string like "8:00 - 17:00" or "8am a 5pm" → [start, end]. */
export function parseShift(text: string): [string, string] | null {
  const parts = text.split(/\s*(?:-|–|a|to|hasta)\s+|\s+(?:-|–)\s*|\s*-\s*/i).filter(Boolean)
  if (parts.length !== 2) return null
  const s = parseTime(parts[0]!)
  const e = parseTime(parts[1]!)
  return s && e ? [s, e] : null
}

export const DAY_SHORT_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

/** "Lun–Vie · 08:00–17:00" */
export function describeSchedule(s: AgentSchedule): string {
  const d = [...s.days].sort((a, b) => a - b)
  const contiguous = d.length > 1 && d.every((x, i) => i === 0 || x === d[i - 1]! + 1)
  const days = contiguous ? `${DAY_SHORT_ES[d[0]!]}–${DAY_SHORT_ES[d[d.length - 1]!]}` : d.map((x) => DAY_SHORT_ES[x]).join(', ')
  return `${days} · ${s.start}–${s.end}`
}

export function validSchedule(s: Partial<AgentSchedule> | null | undefined): s is AgentSchedule {
  return (
    !!s &&
    Array.isArray(s.days) &&
    s.days.length > 0 &&
    s.days.every((d) => Number.isInteger(d) && d >= 0 && d <= 6) &&
    typeof s.start === 'string' &&
    typeof s.end === 'string' &&
    /^\d{2}:\d{2}$/.test(s.start) &&
    /^\d{2}:\d{2}$/.test(s.end) &&
    s.start < s.end
  )
}

// ---------------------------------------------------------------------------
// Roster import: a CSV/TSV pasted from a SharePoint list export (or Excel).
// Columns are found by name, in Spanish or English.
// ---------------------------------------------------------------------------
export interface RosterRow {
  line: number
  email: string
  name: string | null
  leader: string | null
  schedule: AgentSchedule | null
  /** Why the row can't be used as-is (it's still shown in the preview). */
  problem: string | null
}

const HEADERS: Record<'email' | 'name' | 'leader' | 'days' | 'start' | 'end' | 'shift' | 'active', RegExp> = {
  // The pilot's SharePoint list ("Pilot agents") uses AgentName / TeamsEmail / Active; the RLX roster uses Name / RLX Email.
  email: /^(e-?mail|correo|mail|correo electronico|usuario|user|upn|agente \(correo\)|agent email|teams ?email|rlx ?email|correo teams|correo rlx)$/,
  name: /^(nombre|name|agente|agent|agent ?name|nombre completo|full name|title|titulo|nombre del agente)$/,
  leader: /^(lider|leader|supervisor|team lead|jefe|lider \(correo\)|leader email|supervisor email)$/,
  days: /^(dias|days|dias laborales|working days|workdays|dias de trabajo)$/,
  start: /^(inicio|entrada|hora inicio|hora de entrada|start|start time|shift start|desde)$/,
  end: /^(fin|salida|hora fin|hora de salida|end|end time|shift end|hasta)$/,
  shift: /^(horario|turno|shift|schedule|jornada)$/,
  active: /^(active|activo|activa|is active|en piloto)$/,
}

function splitLine(line: string, sep: string): string[] {
  if (sep === '\t') return line.split('\t').map((c) => c.trim())
  const out: string[] = []
  let cur = ''
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        cur += '"'
        i++
      } else quoted = !quoted
    } else if (ch === sep && !quoted) {
      out.push(cur.trim())
      cur = ''
    } else cur += ch
  }
  out.push(cur.trim())
  return out
}

const LOOKS_LIKE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Reads a pasted CSV/TSV (header row first). */
export function parseRoster(text: string): { rows: RosterRow[]; columns: string[]; missing: string[] } {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim())
  if (lines.length === 0) return { rows: [], columns: [], missing: ['email'] }
  const first = lines[0]!
  const sep = first.includes('\t') ? '\t' : first.split(';').length > first.split(',').length ? ';' : ','
  const header = splitLine(first, sep).map(plain)
  const col = (k: keyof typeof HEADERS) => header.findIndex((h) => HEADERS[k].test(h))
  const idx = { email: col('email'), name: col('name'), leader: col('leader'), days: col('days'), start: col('start'), end: col('end'), shift: col('shift'), active: col('active') }
  const missing = [idx.email < 0 ? 'email' : null, idx.days < 0 ? 'days' : null, idx.start < 0 && idx.shift < 0 ? 'start/shift' : null].filter(Boolean) as string[]
  const rows: RosterRow[] = []
  lines.slice(1).forEach((line, i) => {
    const cells = splitLine(line, sep)
    const get = (n: number) => (n >= 0 ? (cells[n] ?? '').trim() : '')
    const email = get(idx.email).toLowerCase()
    if (!email) return
    const problems: string[] = []
    if (!LOOKS_LIKE_EMAIL.test(email)) problems.push('correo no válido')
    if (idx.active >= 0 && /^(no|false|falso|0|inactivo|inactive)$/.test(plain(get(idx.active)))) problems.push('inactivo en la lista')
    const days = idx.days >= 0 && get(idx.days) ? parseDays(get(idx.days)) : null
    let times: [string, string] | null = null
    if (idx.start >= 0 && idx.end >= 0 && get(idx.start) && get(idx.end)) {
      const s = parseTime(get(idx.start))
      const e = parseTime(get(idx.end))
      times = s && e ? [s, e] : null
    } else if (idx.shift >= 0 && get(idx.shift)) times = parseShift(get(idx.shift))
    if (idx.days >= 0 && get(idx.days) && !days) problems.push(`no entiendo los días "${get(idx.days)}"`)
    if ((get(idx.start) || get(idx.shift)) && !times) problems.push('no entiendo el horario')
    const schedule = days && times ? { days, start: times[0], end: times[1] } : null
    if (schedule && !validSchedule(schedule)) problems.push('la hora de salida debe ser después de la de entrada')
    const leader = get(idx.leader).toLowerCase() || null
    rows.push({
      line: i + 2,
      email,
      name: get(idx.name) || null,
      leader: leader && LOOKS_LIKE_EMAIL.test(leader) ? leader : null,
      schedule: schedule && validSchedule(schedule) ? schedule : null,
      problem: problems.length ? problems.join('; ') : null,
    })
  })
  return { rows, columns: header, missing }
}

/** Minutes after the shift started (negative before it), or null when today isn't a work day. */
export function minutesIntoShift(s: AgentSchedule, now: Date): number | null {
  if (!s.days.includes(now.getDay())) return null
  const [h, m] = s.start.split(':').map(Number) as [number, number]
  return now.getHours() * 60 + now.getMinutes() - (h * 60 + m)
}
