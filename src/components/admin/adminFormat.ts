import type { AdminAgentSummary, AdminEventRow } from '../../services/apiClient'

// Spanish display helpers shared by the admin console.

export const MOOD_ES: Record<string, string> = {
  Happy: 'Feliz',
  Motivated: 'Motivado',
  Worried: 'Preocupado',
  Recovery: 'Recuperándose',
}

export const STAGE_ES: Record<string, string> = {
  Baby: 'Baby',
  Young: 'Young',
  Advanced: 'Advanced',
  Elite: 'Elite',
}

export const WEEKDAY_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

export const EVENT_TYPE_ES: Record<string, string> = {
  CHECK_IN: 'Check-in',
  QA_PASS: 'QA Pass',
  DOCUMENTATION_ALERT: 'Alerta de documentación',
  STREAK_MILESTONE: 'Hito de racha',
  LEVEL_UP: 'Subió de nivel',
  EVOLUTION: 'Evolución',
  ACHIEVEMENT: 'Logro',
  CORRECTION: 'Corrección',
}

export function eventDetail(e: AdminEventRow): string {
  const p = e.payload ?? {}
  switch (e.type) {
    case 'CHECK_IN':
    case 'QA_PASS':
      return `+${p.xpGained ?? 0} XP · +${p.energyGained ?? 0} energía`
    case 'DOCUMENTATION_ALERT':
      return `−${p.energyLoss ?? 0} energía${p.streakBroken ? ' · racha rota' : ''}`
    case 'STREAK_MILESTONE':
      return `${p.days ?? ''} días · +${p.xpGained ?? 0} XP`
    case 'LEVEL_UP':
      return `Nivel ${p.previousLevel ?? '?'} → ${p.newLevel ?? p.level ?? '?'}`
    case 'EVOLUTION':
      return `${p.previousStage ?? '?'} → ${p.newStage ?? p.stage ?? '?'}`
    case 'ACHIEVEMENT':
      return String(p.name ?? '')
    case 'CORRECTION':
      return `Corregido a ${p.correctedTo === 'PASS' ? 'QA Pass' : 'Alerta'}${p.reason ? ` · “${p.reason}”` : ''}`
    default:
      return ''
  }
}

const dateTimeFmt = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' })
const dayFmt = new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short' })

export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : dateTimeFmt.format(d)
}

export function fmtDayKey(key: string): string {
  return dayFmt.format(new Date(`${key}T12:00:00`))
}

export function relativeDays(days: number | null): string {
  if (days === null) return 'Nunca'
  if (days === 0) return 'Hoy'
  if (days === 1) return 'Ayer'
  return `Hace ${days} días`
}

export function todayIso(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function displayName(a: Pick<AdminAgentSummary, 'id' | 'name'>): string {
  return a.name && a.name !== 'Agent' ? a.name : a.id.split('@')[0]!
}

function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? '' : String(v)
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function agentsToCsv(agents: AdminAgentSummary[]): string {
  const header = [
    'correo', 'nombre', 'nivel', 'xp', 'energia', 'animo', 'etapa', 'racha_actual', 'mejor_racha',
    'ultimo_checkin', 'checkins', 'qa_pass', 'alertas', 'correcciones', 'logros', 'en_riesgo', 'motivos_riesgo',
  ]
  const rows = agents.map((a) => [
    a.id, a.name, a.state.level, a.state.xp, a.state.energy, MOOD_ES[a.state.mood] ?? a.state.mood, a.state.evolutionStage,
    a.state.currentStreak, a.state.bestStreak, a.state.lastCheckInDate ?? '', a.metrics.checkIns, a.metrics.qaPasses,
    a.metrics.alerts, a.metrics.corrections, a.metrics.achievements, a.metrics.atRisk ? 'si' : 'no', a.metrics.riskReasons.join(' | '),
  ])
  return [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\n')
}

export function downloadText(filename: string, text: string, type = 'text/csv;charset=utf-8'): void {
  // BOM so Excel opens accented Spanish text correctly.
  const blob = new Blob(['﻿', text], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
