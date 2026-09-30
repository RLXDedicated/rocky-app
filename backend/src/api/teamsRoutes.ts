// Teams integration routes: the public card-link redirect and the admin
// screens for the roster (shifts from the SharePoint list) and the webhook.
import { Router, type Request, type Response } from 'express'
import { requireRole } from '../middleware/devIdentity'
import type { TeamsApplicationService } from '../application/teamsApplicationService'
import { parseRoster, type AgentSchedule, type RosterRow } from '../../../src/game/schedule'
import { parseJsonBody } from './validation'
import { ApiError } from './errors'

/** Public: a card button in Teams. Mounted before identity (the signed link is the identity). */
export function createTeamsLinkRouter(service: () => TeamsApplicationService): Router {
  const router = Router()
  router.get('/teams/go', (req: Request, res: Response) => {
    const teams = service()
    const token = typeof req.query.t === 'string' ? req.query.t : ''
    try {
      const target = teams.follow(token)
      if (target) res.redirect(302, target)
      else
        res
          .type('html')
          .send(
            `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Notes confirmed</title>` +
              `<body style="font-family:system-ui;text-align:center;padding:48px 16px;color:#10233f"><p style="font-size:48px;margin:0">✅</p>` +
              `<h2>Thanks — your answer was recorded.</h2><p>Keep every note complete: who, what, outcome, next step.</p><p style="color:#667085">You can close this tab and go back to Teams.</p></body>`,
          )
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Something went wrong.'
      res
        .status(err instanceof ApiError ? err.status : 500)
        .type('html')
        .send(
          `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Rocky</title>` +
            `<body style="font-family:system-ui;text-align:center;padding:48px 16px;color:#10233f"><p style="font-size:48px;margin:0">🐂</p>` +
            `<p>${msg.replace(/[<>&]/g, '')}</p><p><a href="${teams.webUrl}">Open Rocky</a></p></body>`,
        )
    }
  })
  return router
}

export function createTeamsAdminRouter(teams: TeamsApplicationService): Router {
  const router = Router()
  const admin = requireRole('ADMIN')
  const me = (req: Request) => req.identity!.agentId

  router.get('/admin/teams/status', admin, (_req: Request, res: Response) => {
    res.json({ ...teams.status(), schedules: teams.schedules() })
  })
  router.post('/admin/teams/test', admin, (req: Request, res: Response, next) => {
    const b = parseJsonBody(req.body)
    const to = typeof b.email === 'string' && b.email.trim() ? b.email.trim().toLowerCase() : me(req)
    teams.sendTest(to).then((r) => res.json(r), next)
  })
  router.put('/admin/teams/enabled', admin, (req: Request, res: Response) => {
    const b = parseJsonBody(req.body)
    const ids = b.all === true ? 'all' : Array.isArray(b.emails) ? b.emails.filter((e): e is string => typeof e === 'string') : []
    res.json(teams.setTeamsFor(ids, b.on === true, me(req)))
  })
  router.put('/admin/teams/roast', admin, (req: Request, res: Response) => {
    res.json(teams.setRoast(parseJsonBody(req.body).on === true, me(req)))
  })
  router.put('/admin/teams/notes-only', admin, (req: Request, res: Response) => {
    res.json(teams.setNotesOnly(parseJsonBody(req.body).on === true, me(req)))
  })
  router.put('/admin/teams/leader-summary', admin, (req: Request, res: Response) => {
    res.json(teams.setLeaderSummary(parseJsonBody(req.body).on === true, me(req)))
  })
  router.post('/admin/teams/leaders/send', admin, (_req: Request, res: Response, next) => {
    teams.sendLeaderSummaries().then((r) => res.json(r), next)
  })
  router.post('/admin/teams/dispatch', admin, (_req: Request, res: Response, next) => {
    teams.dispatch().then((r) => res.json(r), next)
  })
  router.get('/admin/teams/preview/:email', admin, (req: Request, res: Response) => {
    const kind = typeof req.query.kind === 'string' ? req.query.kind : 'reminder'
    res.json({ card: teams.preview(String(req.params.email).toLowerCase(), kind) })
  })
  router.put('/admin/schedules/:email', admin, (req: Request, res: Response) => {
    const b = parseJsonBody(req.body)
    const s = {
      days: Array.isArray(b.days) ? b.days.map(Number) : [],
      start: typeof b.start === 'string' ? b.start : '',
      end: typeof b.end === 'string' ? b.end : '',
      ...(b.timeZone === null || typeof b.timeZone === 'string' ? { timeZone: (b.timeZone as string | null) || null } : {}),
      ...(typeof b.teams === 'boolean' ? { teams: b.teams } : {}),
    }
    teams.setSchedule(String(req.params.email), s, me(req), typeof b.name === 'string' ? b.name.trim() || null : null)
    res.json({ ok: true })
  })
  router.delete('/admin/schedules/:email', admin, (req: Request, res: Response) => {
    teams.setSchedule(String(req.params.email), null, me(req))
    res.json({ ok: true })
  })
  /** Body: { text } (the pasted CSV) or { rows }, plus removeMissing. */
  router.post('/admin/roster/import', admin, (req: Request, res: Response) => {
    const b = parseJsonBody(req.body)
    let rows: RosterRow[]
    if (typeof b.text === 'string') {
      const parsed = parseRoster(b.text)
      if (parsed.missing.includes('email')) throw ApiError.validation('The pasted list needs an email or a name column.')
      rows = parsed.rows
    } else if (Array.isArray(b.rows)) rows = b.rows as RosterRow[]
    else throw ApiError.validation('Paste the roster first.')
    if (rows.length > 2000) throw ApiError.validation('That roster is too long.')
    const d = b.defaultSchedule as Partial<AgentSchedule> | null | undefined
    const defaultSchedule = d ? { days: Array.isArray(d.days) ? d.days.map(Number) : [], start: String(d.start ?? ''), end: String(d.end ?? '') } : null
    const timeZone = typeof b.timeZone === 'string' && b.timeZone ? b.timeZone : null
    res.json(teams.importRoster(rows, me(req), { removeMissing: b.removeMissing === true, defaultSchedule, timeZone }))
  })
  return router
}
