// Titles and teams. Everyone: GET /me/role (my title; a leader also gets her
// team's spirit). Leaders: GET /my-team (their own team only). Rocky admins:
// list people and set titles and teams.
import { Router, type Request, type Response } from 'express'
import { requireRole } from '../middleware/devIdentity'
import type { PeopleApplicationService } from '../application/peopleApplicationService'
import { parseJsonBody } from './validation'
import { ApiError } from './errors'

const TITLES = ['qa', 'leader'] as const

export function createPeopleRouter(people: PeopleApplicationService): Router {
  const router = Router()
  router.get('/me/role', (req: Request, res: Response) => {
    res.json(people.me(req.identity!.agentId))
  })
  router.get('/my-team', (req: Request, res: Response) => {
    res.json(people.teamReport(req.identity!.agentId))
  })
  const admin = requireRole('ADMIN')
  router.get('/admin/people', admin, (_req: Request, res: Response) => {
    res.json({ people: people.adminPeople() })
  })
  router.put('/admin/people/:email', admin, (req: Request, res: Response) => {
    const body = parseJsonBody(req.body)
    const change: { title?: 'qa' | 'leader' | null; leader?: string | null; tester?: boolean } = {}
    if ('title' in body) {
      if (body.title !== null && !TITLES.includes(body.title as (typeof TITLES)[number])) throw ApiError.validation('title must be "qa", "leader" or null.')
      change.title = body.title as 'qa' | 'leader' | null
    }
    if ('tester' in body) {
      if (typeof body.tester !== 'boolean') throw ApiError.validation('tester must be true or false.')
      change.tester = body.tester
    }
    if ('leader' in body) {
      if (body.leader !== null && typeof body.leader !== 'string') throw ApiError.validation('leader must be an email or null.')
      change.leader = typeof body.leader === 'string' ? body.leader.trim().toLowerCase() : null
    }
    const email = req.params.email!.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw ApiError.validation('That does not look like an email.')
    res.json(people.adminSetPerson(email, change, { id: req.identity!.agentId, via: req.identity!.via }))
  })
  return router
}
