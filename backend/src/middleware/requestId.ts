import { randomUUID } from 'node:crypto'
import type { NextFunction, Request, Response } from 'express'

// Every request gets a correlation id — echoed back on every response
// (including errors) and available to server-side logs, so a single
// failure can be traced end-to-end without reconstructing it from
// timestamps (Phase 11 §9 Observability; Phase 12 §15).
declare module 'express-serve-static-core' {
  interface Request {
    requestId: string
  }
}

const HEADER = 'X-Request-Id'

export function requestId(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.header(HEADER)
  req.requestId = incoming && incoming.trim().length > 0 ? incoming : randomUUID()
  res.setHeader(HEADER, req.requestId)
  next()
}
