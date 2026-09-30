// Kudos between agents: GET /kudos (mine), GET /kudos/wall, POST /kudos.
import { Router, type Request, type Response } from 'express'
import type { KudosApplicationService } from '../application/kudosApplicationService'
import { parseJsonBody } from './validation'

export function createKudosRouter(kudos: KudosApplicationService): Router {
  const router = Router()
  const me = (req: Request) => req.identity!.agentId
  router.get('/kudos', (req: Request, res: Response) => {
    res.json(kudos.mine(me(req)))
  })
  router.get('/kudos/wall', (req: Request, res: Response) => {
    res.json(kudos.wall(me(req)))
  })
  router.post('/kudos', (req: Request, res: Response) => {
    const b = parseJsonBody(req.body)
    res.json(kudos.give(me(req), { to: b.to, tag: b.tag, message: b.message }))
  })
  return router
}
