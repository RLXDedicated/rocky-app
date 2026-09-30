// QA desk: for QA analysts (title "qa") and admins.
import { Router, type NextFunction, type Request, type Response } from 'express'
import type { QaDeskService } from '../application/qaDeskService'
import { parseQaSheet } from '../../../src/game/qaImport'
import { todayKey } from '../domain/rockyEngine'
import { parseJsonBody } from './validation'
import { ApiError } from './errors'

export function createQaDeskRouter(desk: QaDeskService, now: () => Date): Router {
  const router = Router()
  const me = (req: Request) => req.identity!.agentId
  const qaOnly = (req: Request, _res: Response, next: NextFunction) => (desk.canUse(me(req)) ? next() : next(ApiError.forbidden('El QA desk es para analistas QA y admins.')))
  const str = (v: unknown) => (typeof v === 'string' ? v : '')

  router.get('/qa/desk', qaOnly, (req: Request, res: Response) => {
    res.json(desk.desk(me(req)))
  })
  router.post('/qa/audits', qaOnly, (req: Request, res: Response) => {
    const b = parseJsonBody(req.body)
    const result = b.result === 'pass' || b.result === 'fail' ? b.result : null
    if (!result) throw ApiError.validation('Elige Pass o Fail.')
    res.status(201).json(desk.record({ agent: str(b.agent), date: str(b.date) || todayKey(now()), result, ticket: str(b.ticket), reason: str(b.reason), note: str(b.note) }, me(req)))
  })
  /** Body: { text } pasted from Excel, plus the pass mark for score columns. */
  router.post('/qa/audits/bulk', qaOnly, (req: Request, res: Response) => {
    const b = parseJsonBody(req.body)
    const parsed = parseQaSheet(str(b.text), { passMark: Number(b.passMark) || 85, today: todayKey(now()) })
    if (parsed.missing.length) throw ApiError.validation(`A la hoja le faltan columnas: ${parsed.missing.join(', ')}.`)
    if (parsed.rows.length > 1000) throw ApiError.validation('Pega máximo 1000 auditorías a la vez.')
    res.json(desk.bulk(parsed.rows, me(req)))
  })
  router.get('/admin/qa/audits', (req: Request, res: Response, next: NextFunction) => {
    if (req.identity?.role !== 'ADMIN') return next(ApiError.forbidden('Admins only.'))
    const since = typeof req.query.since === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(req.query.since) ? req.query.since : todayKey(new Date(now().getTime() - 30 * 86_400_000))
    res.json({ audits: desk.log(since) })
  })
  router.put('/qa/audits/:id', qaOnly, (req: Request, res: Response) => {
    const b = parseJsonBody(req.body)
    if (b.result !== 'pass' && b.result !== 'fail') throw ApiError.validation('Elige Pass o Fail.')
    res.json(desk.change(Number(req.params.id), b.result, me(req)))
  })
  return router
}
