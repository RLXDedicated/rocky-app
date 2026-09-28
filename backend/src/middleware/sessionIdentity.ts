// Session identity: a request carrying `Authorization: Bearer <token>` from
// a PIN sign-in (see application/authApplicationService.ts) acts as that
// agent. A bearer token that is unknown, expired or revoked is rejected
// with 401 (the app then shows the sign-in screen) — it never silently
// falls back to another identity.
//
// Requests without a bearer token go to `fallback` (the pilot's
// X-Agent-Email links or dev identity), unless ROCKY_REQUIRE_LOGIN is on,
// in which case they are rejected: sign-in becomes mandatory.
import type { NextFunction, Request, RequestHandler, Response } from 'express'
import { ApiError } from '../api/errors'
import type { AuthApplicationService } from '../application/authApplicationService'

export function createSessionIdentity(auth: AuthApplicationService, fallback: RequestHandler, requireLogin: boolean): RequestHandler {
  return function sessionIdentity(req: Request, res: Response, next: NextFunction): void {
    const header = req.header('Authorization')
    const match = header?.match(/^Bearer\s+(\S+)$/i)
    if (match) {
      const who = auth.resolve(match[1]!)
      if (!who) {
        next(new ApiError(401, 'SESSION_EXPIRED', 'Your session has ended. Please sign in again.'))
        return
      }
      req.identity = { agentId: who.agentId, role: who.role, via: 'session' }
      next()
      return
    }
    if (requireLogin) {
      next(new ApiError(401, 'LOGIN_REQUIRED', 'Please sign in with your work email and PIN.'))
      return
    }
    fallback(req, res, next)
  }
}
