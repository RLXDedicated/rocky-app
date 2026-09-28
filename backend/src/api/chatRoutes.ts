// Chat API (docs/REALTIME_CHAT_PLAN.md). Agents: channels, messages, the
// house rules and reports. Rocky admins only (role ADMIN, i.e.
// ROCKY_ADMIN_EMAILS): the quality-control copy of every conversation,
// reports, hiding, pausing someone's chat, exports and backups.
import { Router, type Request, type Response } from 'express'
import { requireRole } from '../middleware/devIdentity'
import type { ChatApplicationService } from '../application/chatApplicationService'
import type { ChatJobs } from '../application/chatJobs'
import { parseJsonBody, requireNonEmptyString } from './validation'
import { ApiError } from './errors'

const actorOf = (req: Request) => ({ id: req.identity!.agentId, via: req.identity!.via })

function optionalId(value: unknown, field: string): number | undefined {
  if (value === undefined || value === '') return undefined
  const n = Number(value)
  if (!Number.isInteger(n) || n < 0) throw ApiError.validation(`${field} must be a message id.`)
  return n
}

const DAY = /^\d{4}-\d{2}-\d{2}$/

export function createChatRouter(chat: ChatApplicationService, jobs: ChatJobs): Router {
  const router = Router()
  const me = (req: Request) => req.identity!.agentId

  router.get('/chat/rules', (req: Request, res: Response) => {
    res.json(chat.rules(me(req)))
  })
  router.post('/chat/rules', (req: Request, res: Response) => {
    const body = parseJsonBody(req.body)
    res.json(chat.acceptRules(me(req), requireNonEmptyString(body.version, 'version'), actorOf(req)))
  })

  router.get('/chat/channels', (req: Request, res: Response) => {
    res.json(chat.listChannels(me(req)))
  })
  router.post('/chat/direct', (req: Request, res: Response) => {
    const body = parseJsonBody(req.body)
    res.json(chat.openDirect(me(req), requireNonEmptyString(body.friend, 'friend')))
  })
  router.post('/chat/visit', (req: Request, res: Response) => {
    const body = parseJsonBody(req.body)
    res.json(chat.openVisit(me(req), typeof body.host === 'string' && body.host ? body.host : null))
  })
  router.get('/chat/channels/:id/messages', (req: Request, res: Response) => {
    res.json(
      chat.messages(me(req), req.params.id!, {
        before: optionalId(req.query.before, 'before'),
        after: optionalId(req.query.after, 'after'),
      }),
    )
  })
  router.post('/chat/channels/:id/messages', (req: Request, res: Response) => {
    const body = parseJsonBody(req.body)
    res.status(201).json(chat.send(me(req), req.params.id!, body.text, body.confirm === true, actorOf(req)))
  })
  router.post('/chat/channels/:id/read', (req: Request, res: Response) => {
    const body = parseJsonBody(req.body)
    res.json(chat.markRead(me(req), req.params.id!, optionalId(body.id, 'id') ?? 0))
  })
  router.post('/chat/messages/:id/report', (req: Request, res: Response) => {
    const body = parseJsonBody(req.body)
    res.json(chat.report(me(req), optionalId(req.params.id, 'id') ?? -1, body.reason, actorOf(req)))
  })

  // ---- Rocky admins: quality-control copy (every read is audited) ----
  const admin = requireRole('ADMIN')
  router.get('/admin/chat/channels', admin, (_req: Request, res: Response) => {
    res.json({ channels: chat.adminChannels() })
  })
  router.get('/admin/chat/channels/:id', admin, (req: Request, res: Response) => {
    res.json(chat.adminRead(req.params.id!, optionalId(req.query.before, 'before'), actorOf(req)))
  })
  router.get('/admin/chat/reports', admin, (req: Request, res: Response) => {
    res.json({ reports: chat.adminReports(req.query.all !== '1') })
  })
  router.post('/admin/chat/reports/:id', admin, (req: Request, res: Response) => {
    const body = parseJsonBody(req.body)
    const action = body.action === 'hide' ? 'hide' : body.action === 'dismiss' ? 'dismiss' : null
    if (!action) throw ApiError.validation('action must be "hide" or "dismiss".')
    res.json(chat.adminResolve(optionalId(req.params.id, 'id') ?? -1, action, actorOf(req)))
  })
  router.post('/admin/chat/messages/:id/hide', admin, (req: Request, res: Response) => {
    res.json(chat.adminHide(optionalId(req.params.id, 'id') ?? -1, actorOf(req)))
  })
  router.post('/admin/chat/mute', admin, (req: Request, res: Response) => {
    const body = parseJsonBody(req.body)
    const hours = Number(body.hours)
    if (!Number.isFinite(hours)) throw ApiError.validation('hours must be a number (0 to lift the pause).')
    res.json(
      chat.adminMute(
        requireNonEmptyString(body.email, 'email').toLowerCase(),
        hours,
        typeof body.reason === 'string' ? body.reason.slice(0, 300) : null,
        actorOf(req),
      ),
    )
  })
  router.get('/admin/chat/export', admin, (req: Request, res: Response) => {
    const from = String(req.query.from ?? '')
    const to = String(req.query.to ?? '')
    if (!DAY.test(from) || !DAY.test(to)) throw ApiError.validation('from and to must be days (YYYY-MM-DD).')
    const [fy, fm, fd] = from.split('-').map(Number) as [number, number, number]
    const [ty, tm, td] = to.split('-').map(Number) as [number, number, number]
    const data = chat.adminExport(new Date(fy, fm - 1, fd).toISOString(), new Date(ty, tm - 1, td + 1).toISOString(), actorOf(req))
    res.setHeader('Content-Disposition', `attachment; filename="rocky-chat-${from}-to-${to}.json"`)
    res.json(data)
  })
  router.get('/admin/chat/backups', admin, (_req: Request, res: Response) => {
    res.json(jobs.status())
  })
  router.post('/admin/chat/backups', admin, async (req: Request, res: Response, next) => {
    try {
      const body = parseJsonBody(req.body)
      const day = typeof body.day === 'string' && DAY.test(body.day) ? body.day : null
      if (!day) throw ApiError.validation('day must be YYYY-MM-DD.')
      const result = await jobs.backupDay(day)
      res.json({ ...result, file: result.file ? result.file.split('/').pop() : null })
    } catch (err) {
      next(err)
    }
  })

  return router
}
