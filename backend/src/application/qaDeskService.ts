// QA desk: the fast way QA analysts log audits (one at a time or pasted from
// their Excel sheet). Each audit is a real engine event (QA Pass → XP and
// energy; failed audit → Documentation Alert, Rocky worried) plus a small
// mood nudge on the pet, and it stays in a log where it can be flipped
// (an engine Correction) if it was entered wrong.
import { ApiError } from '../api/errors'
import type { PersistenceContext } from '../infrastructure/persistenceContext'
import type { QaAuditRecord } from '../infrastructure/accounts/AccountStore'
import { systemClock, todayKey, type Clock } from '../domain/rockyEngine'
import { matchByName } from '../../../src/game/schedule'
import { type QaResult, type QaRow } from '../../../src/game/qaImport'
import { publicName } from './leaderboardApplicationService'
import type { PetApplicationService } from './petApplicationService'
import type { QaApplicationService } from './qaApplicationService'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export interface QaEntry {
  agent: string
  date: string
  result: QaResult
  ticket?: string | null
  reason?: string | null
  note?: string | null
}

export function createQaDeskService({
  persistence,
  qa,
  pet,
  isStaff,
  titleOf,
  clock = systemClock,
}: {
  persistence: PersistenceContext
  qa: QaApplicationService
  pet: PetApplicationService
  isStaff: (id: string) => boolean
  titleOf: (id: string) => string | null
  clock?: Clock
}) {
  const accounts = persistence.accounts
  const repo = persistence.repoStore

  const nameOf = (id: string) => {
    const s = accounts.getSchedules()[id]
    const stored = repo.hasAgent(id) ? repo.forAgent(id).getAgent().name : ''
    return publicName(id, stored && stored !== 'Agent' ? stored : (s?.name ?? ''))
  }

  /** Everyone QA can audit: the roster plus anyone who opened Rocky. */
  function people() {
    const ids = new Set([...Object.keys(accounts.getSchedules()), ...repo.listAgentIds()])
    return [...ids].map((email) => ({ email, name: nameOf(email) })).sort((a, b) => a.name.localeCompare(b.name))
  }

  function resolve(agent: string): string {
    const a = agent.trim().toLowerCase()
    if (EMAIL.test(a)) return a
    const hit = matchByName(agent, people())
    if (!hit) throw ApiError.validation(`No encuentro a "${agent}" en el roster.`)
    return hit.email
  }

  const view = (a: QaAuditRecord) => ({ ...a, name: nameOf(a.agentId), auditorName: nameOf(a.auditor) })

  function record(e: QaEntry, auditor: string) {
    const agentId = resolve(e.agent)
    // One day of slack: a QA browser in another time zone may already be on "tomorrow".
    const latest = todayKey(new Date(clock.now().getTime() + 86_400_000))
    if (!/^\d{4}-\d{2}-\d{2}$/.test(e.date) || e.date > latest) throw ApiError.validation('Elige la fecha auditada (hoy o antes).')
    if (e.result !== 'pass' && e.result !== 'fail') throw ApiError.validation('Elige Pass o Fail.')
    if (agentId === auditor) throw ApiError.validation('No puedes auditarte a ti mismo.')
    const ticket = e.ticket?.trim().slice(0, 60) || null
    if (ticket && accounts.listQaAudits({ agentId, limit: 500 }).some((x) => x.ticket === ticket && x.auditDate === e.date))
      throw ApiError.conflict(`El ticket ${ticket} ya está registrado para ${nameOf(agentId)} el ${e.date}.`)
    const res = e.result === 'pass' ? qa.qaPass({ agentId, auditDate: e.date }) : qa.documentationAlert({ agentId, auditDate: e.date })
    const event = res.events.find((x) => x.type === (e.result === 'pass' ? 'QA_PASS' : 'DOCUMENTATION_ALERT'))
    const audit = accounts.addQaAudit({
      agentId,
      auditDate: e.date,
      result: e.result,
      ticket,
      reason: e.result === 'fail' ? e.reason?.trim().slice(0, 80) || null : null,
      note: e.note?.trim().slice(0, 500) || null,
      auditor,
      eventId: event?.id ?? null,
      createdAt: clock.now().toISOString(),
    })
    try {
      pet.qaEffect(agentId, e.result, e.result === 'pass' ? 'Clean QA audit' : `QA audit: ${audit.reason ?? 'needs work'}`, { id: auditor, via: 'qa-desk' })
    } catch {
      // the engine event already counts
    }
    return view(audit)
  }

  return {
    canUse: (id: string) => isStaff(id) || titleOf(id) === 'qa',

    desk(auditor: string) {
      const since = new Date(clock.now().getTime() - 30 * 86_400_000).toISOString()
      const mine = accounts.listQaAudits({ auditor, since, limit: 100 }).map(view)
      const today = todayKey(clock.now())
      const todays = accounts.listQaAudits({ since: `${today}T00:00:00`, limit: 2000 }).filter((a) => a.createdAt.slice(0, 10) === clock.now().toISOString().slice(0, 10))
      return {
        people: people(),
        recent: isStaff(auditor) ? accounts.listQaAudits({ since, limit: 150 }).map(view) : mine,
        today: { pass: todays.filter((a) => a.result === 'pass').length, fail: todays.filter((a) => a.result === 'fail').length },
      }
    },

    record,

    /** Admin → Registro: every audit logged in the window (newest first). */
    log(sinceDay: string) {
      return accounts.listQaAudits({ since: `${sinceDay}T00:00:00`, limit: 5000 }).map(view)
    },

    /** Rows from a pasted sheet: each one logged on its own (one bad row never blocks the rest). */
    bulk(rows: QaRow[], auditor: string) {
      const results: { line: number; ok: boolean; error?: string; id?: number }[] = []
      for (const r of rows) {
        if (r.problem || !r.result || !r.date) {
          results.push({ line: r.line, ok: false, error: r.problem ?? 'incomplete row' })
          continue
        }
        try {
          const a = persistence.withTransaction(() =>
            record({ agent: r.agent, date: r.date!, result: r.result!, ticket: r.ticket, reason: r.reason, note: r.note }, auditor),
          )
          results.push({ line: r.line, ok: true, id: a.id })
        } catch (err) {
          results.push({ line: r.line, ok: false, error: err instanceof Error ? err.message : String(err) })
        }
      }
      accounts.addAudit({ agentId: null, actor: auditor, action: 'qa.bulk', detail: { rows: rows.length, ok: results.filter((x) => x.ok).length }, source: null, createdAt: clock.now().toISOString() })
      return { logged: results.filter((x) => x.ok).length, results }
    },

    /** Flip an audit entered wrong (Pass ↔ Fail): an engine Correction, never a silent edit. */
    change(id: number, result: QaResult, actor: string) {
      const a = accounts.getQaAudit(id)
      if (!a) throw ApiError.notFound('No encuentro esa auditoría.')
      if (a.auditor !== actor && !isStaff(actor)) throw ApiError.forbidden('Solo quien la registró (o un admin) puede cambiarla.')
      if (a.result === result) return view(a)
      if (!a.eventId) throw ApiError.validation('Esta auditoría no se puede corregir.')
      // Corrections always point at the original event; the latest one wins.
      qa.correction({ agentId: a.agentId, originalEventId: a.eventId, correctedTo: result === 'pass' ? 'PASS' : 'ALERT', reason: `QA desk change by ${actor}` })
      const now = clock.now().toISOString()
      accounts.updateQaAudit(id, { result, correctedAt: now, correctedBy: actor, reason: result === 'pass' ? null : a.reason })
      try {
        pet.qaEffect(a.agentId, result, 'QA audit corrected', { id: actor, via: 'qa-desk' })
      } catch {
        // nothing to change
      }
      return view(accounts.getQaAudit(id)!)
    },
  }
}

export type QaDeskService = ReturnType<typeof createQaDeskService>
