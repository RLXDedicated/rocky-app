// Chat API (docs/REALTIME_CHAT_PLAN.md). Agents: channels, messages, the
// house rules and reports. Rocky admins only (role ADMIN, i.e.
// ROCKY_ADMIN_EMAILS): the quality-control copy of every conversation,
// reports, hiding, pausing someone's chat, exports and backups.
import express, { Router, type Request, type Response } from 'express'
import { requireRole } from '../middleware/devIdentity'
import { IMAGE_TYPES, MAX_GIF_BYTES, type ChatApplicationService } from '../application/chatApplicationService'
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
  // Pictures and GIFs: the raw file as the request body (its type is checked from the bytes, not trusted from the header).
  router.post(
    '/chat/channels/:id/images',
    express.raw({ type: [...IMAGE_TYPES, 'application/octet-stream'], limit: MAX_GIF_BYTES + 1024 }),
    (req: Request, res: Response) => {
      if (!Buffer.isBuffer(req.body) || req.body.length === 0) throw ApiError.validation('Attach a picture.')
      res.status(201).json(chat.postImage(me(req), req.params.id!, new Uint8Array(req.body), actorOf(req)))
    },
  )
  router.get('/chat/attachments/:id', (req: Request, res: Response) => {
    const a = chat.attachment(me(req), req.params.id!, req.identity!.role === 'ADMIN')
    res.setHeader('Content-Type', a.mime)
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Content-Disposition', 'inline')
    res.setHeader('Cache-Control', 'private, max-age=86400')
    res.send(Buffer.from(a.data))
  })
  // Groups and open rooms.
  router.post('/chat/groups', (req: Request, res: Response) => {
    const b = parseJsonBody(req.body)
    res.status(201).json(chat.createGroup(me(req), { title: b.title, members: b.members, avatar: b.avatar, open: b.open }, actorOf(req)))
  })
  router.get('/chat/groups/:id', (req: Request, res: Response) => {
    res.json(chat.groupInfo(me(req), req.params.id!))
  })
  router.put('/chat/groups/:id', (req: Request, res: Response) => {
    const b = parseJsonBody(req.body)
    res.json(chat.updateGroup(me(req), req.params.id!, { title: b.title, avatar: b.avatar }, actorOf(req)))
  })
  router.post(
    '/chat/groups/:id/picture',
    express.raw({ type: [...IMAGE_TYPES, 'application/octet-stream'], limit: MAX_GIF_BYTES + 1024 }),
    (req: Request, res: Response) => {
      if (!Buffer.isBuffer(req.body) || req.body.length === 0) throw ApiError.validation('Attach a picture.')
      res.json(chat.setGroupPicture(me(req), req.params.id!, new Uint8Array(req.body), actorOf(req)))
    },
  )
  router.post('/chat/groups/:id/members', (req: Request, res: Response) => {
    res.json(chat.addToGroup(me(req), req.params.id!, parseJsonBody(req.body).members, actorOf(req)))
  })
  router.delete('/chat/groups/:id/members/:key', (req: Request, res: Response) => {
    res.json(chat.removeFromGroup(me(req), req.params.id!, req.params.key!, actorOf(req)))
  })
  router.get('/chat/rooms', (req: Request, res: Response) => {
    res.json({ rooms: chat.rooms(me(req)) })
  })
  router.post('/chat/rooms/:id/join', (req: Request, res: Response) => {
    res.json(chat.joinRoom(me(req), req.params.id!))
  })
  router.put('/chat/channels/:id/archive', (req: Request, res: Response) => {
    res.json(chat.archive(me(req), req.params.id!, parseJsonBody(req.body).on !== false))
  })
  // Your own messages: fix a typo (24 h) or unsend.
  router.put('/chat/messages/:id', (req: Request, res: Response) => {
    const b = parseJsonBody(req.body)
    res.json(chat.editMessage(me(req), optionalId(req.params.id, 'id') ?? -1, b.text, b.confirm === true, actorOf(req)))
  })
  router.delete('/chat/messages/:id', (req: Request, res: Response) => {
    res.json(chat.deleteMessage(me(req), optionalId(req.params.id, 'id') ?? -1, actorOf(req)))
  })
  router.post('/chat/channels/:id/polls', (req: Request, res: Response) => {
    const body = parseJsonBody(req.body)
    res.json(chat.createPoll(me(req), String(req.params.id), { question: body.question, options: body.options }, actorOf(req)))
  })
  router.put('/chat/messages/:id/vote', (req: Request, res: Response) => {
    const body = parseJsonBody(req.body)
    res.json(chat.vote(me(req), optionalId(req.params.id, 'id') ?? -1, body.option))
  })
  router.post('/chat/messages/:id/react', (req: Request, res: Response) => {
    const body = parseJsonBody(req.body)
    res.json(chat.react(me(req), optionalId(req.params.id, 'id') ?? -1, body.emoji))
  })
  router.get('/chat/gifs', async (req: Request, res: Response) => {
    res.json(await chat.gifs(typeof req.query.q === 'string' ? req.query.q : ''))
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
  router.get('/admin/chat/pins', admin, (_req: Request, res: Response) => {
    res.json({ pins: chat.adminPins() })
  })
  router.post('/admin/chat/messages/:id/pin', admin, (req: Request, res: Response) => {
    const body = parseJsonBody(req.body)
    res.json(chat.adminPin(optionalId(req.params.id, 'id') ?? -1, body.pin !== false, actorOf(req)))
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
