// Arcade tournament, duels and "Rocky of the week".
import { Router, type Request, type Response } from 'express'
import type { EngagementApplicationService } from '../application/engagementApplicationService'
import { parseJsonBody } from './validation'

export function createEngagementRouter(engagement: EngagementApplicationService): Router {
  const router = Router()
  const me = (req: Request) => req.identity!.agentId
  router.get('/arcade/tournament', (req: Request, res: Response) => {
    res.json(engagement.tournament(me(req), req.query.month === 'last'))
  })
  router.get('/duels', (req: Request, res: Response) => {
    res.json(engagement.duels(me(req)))
  })
  router.post('/duels', (req: Request, res: Response) => {
    const b = parseJsonBody(req.body)
    res.json(engagement.challenge(me(req), { to: b.to, game: b.game, score: b.score }))
  })
  router.post('/duels/:id/answer', (req: Request, res: Response) => {
    const b = parseJsonBody(req.body)
    res.json(engagement.answer(me(req), Number(req.params.id), b.score))
  })
  router.get('/rotw', (req: Request, res: Response) => {
    res.json(engagement.rotw(me(req)))
  })
  router.put('/rotw/vote', (req: Request, res: Response) => {
    res.json(engagement.vote(me(req), parseJsonBody(req.body).to))
  })
  return router
}
