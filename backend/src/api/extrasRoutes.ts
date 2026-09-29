// Team challenges, Rocky's photo album and the Arcade's weekly ranking.
import express, { Router, type Request, type Response } from 'express'
import { randomBytes } from 'node:crypto'
import { requireRole } from '../middleware/devIdentity'
import type { ChallengeApplicationService } from '../application/challengeApplicationService'
import type { PetApplicationService } from '../application/petApplicationService'
import type { PersistenceContext } from '../infrastructure/persistenceContext'
import { MAX_IMAGE_BYTES, sniffImage } from '../application/chatApplicationService'
import { systemClock, type Clock } from '../domain/rockyEngine'
import { parseJsonBody, requireEnum } from './validation'
import { ApiError } from './errors'

const PHOTO_LIMIT = 24

export function createExtrasRouter({
  challenges,
  pet,
  persistence,
  clock = systemClock,
}: {
  challenges: ChallengeApplicationService
  pet: PetApplicationService
  persistence: PersistenceContext
  clock?: Clock
}): Router {
  const router = Router()
  const me = (req: Request) => req.identity!.agentId
  const admin = requireRole('ADMIN')
  const accounts = persistence.accounts

  // ---- Team challenges ----
  router.get('/challenges', (req: Request, res: Response) => {
    res.json({ challenges: challenges.mine(me(req)) })
  })
  router.get('/admin/challenges', admin, (_req: Request, res: Response) => {
    res.json({ challenges: challenges.adminList() })
  })
  router.post('/admin/challenges', admin, (req: Request, res: Response) => {
    const b = parseJsonBody(req.body)
    const str = (v: unknown) => (typeof v === 'string' ? v : '')
    res.status(201).json(
      challenges.create(
        {
          title: str(b.title),
          leaderId: typeof b.leaderId === 'string' && b.leaderId ? b.leaderId.trim().toLowerCase() : null,
          metric: requireEnum(b.metric, ['checkins', 'qa'] as const, 'metric'),
          target: Number(b.target),
          startDay: str(b.startDay),
          endDay: str(b.endDay),
          rewardItem: typeof b.rewardItem === 'string' && b.rewardItem ? b.rewardItem : null,
          rewardCoins: Number(b.rewardCoins ?? 0),
        },
        me(req),
      ),
    )
  })
  router.delete('/admin/challenges/:id', admin, (req: Request, res: Response) => {
    res.json(challenges.cancel(Number(req.params.id), me(req)))
  })

  // ---- Arcade weekly ranking ----
  router.get('/arcade/leaderboard', (req: Request, res: Response) => {
    res.json(pet.arcadeBoard(me(req), req.query.week === 'last'))
  })

  // ---- Rocky's photo album (private to the agent; they share a photo to chat if they like) ----
  router.get('/photos', (req: Request, res: Response) => {
    res.json({ photos: accounts.listPhotos(me(req)).map((p) => ({ id: p.id, caption: p.caption, at: p.createdAt })) })
  })
  router.post('/photos', express.raw({ type: ['image/png', 'image/jpeg', 'image/webp', 'application/octet-stream'], limit: MAX_IMAGE_BYTES + 1024 }), (req: Request, res: Response) => {
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) throw ApiError.validation('Take a photo first.')
    const bytes = new Uint8Array(req.body)
    const mime = sniffImage(bytes)
    if (!mime || mime === 'image/gif') throw ApiError.validation('Photos are PNG, JPEG or WebP.')
    if (bytes.length > MAX_IMAGE_BYTES) throw ApiError.validation('That photo is too big.')
    const caption = typeof req.query.caption === 'string' ? req.query.caption.trim().slice(0, 80) || null : null
    const id = randomBytes(12).toString('hex')
    const agentId = me(req)
    persistence.withTransaction(() => {
      accounts.addPhoto({ id, agentId, mime, data: bytes, caption, createdAt: clock.now().toISOString() })
      // The album keeps the latest photos.
      for (const old of accounts.listPhotos(agentId).slice(PHOTO_LIMIT)) accounts.deletePhoto(old.id)
    })
    res.status(201).json({ id, caption, at: clock.now().toISOString() })
  })
  router.get('/photos/:id', (req: Request, res: Response) => {
    const p = accounts.getPhoto(req.params.id!)
    if (!p || p.agentId !== me(req)) throw ApiError.notFound('That photo could not be found.')
    res.setHeader('Content-Type', p.mime)
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Cache-Control', 'private, max-age=86400')
    res.send(Buffer.from(p.data))
  })
  router.delete('/photos/:id', (req: Request, res: Response) => {
    const p = accounts.getPhoto(req.params.id!)
    if (!p || p.agentId !== me(req)) throw ApiError.notFound('That photo could not be found.')
    accounts.deletePhoto(p.id)
    res.json({ ok: true })
  })

  return router
}
