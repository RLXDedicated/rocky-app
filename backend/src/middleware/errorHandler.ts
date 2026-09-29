import type { NextFunction, Request, Response } from 'express'
import { ApiError } from '../api/errors'
import type { ApiErrorResponse } from '../types/dto'

// Single point of error rendering (Phase 12 §14). Never leaks a stack
// trace or internal detail to the client; always logs the technical detail
// server-side, tagged with the request's correlation id.
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  const requestId = req.requestId ?? 'unknown'

  // express.json() reports malformed JSON as a SyntaxError with a `body`
  // marker — that's a client mistake, not a server failure.
  if (err instanceof SyntaxError && 'body' in err) {
    const body: ApiErrorResponse = {
      error: { code: 'BAD_REQUEST', message: 'Request body is not valid JSON.', requestId },
    }
    res.status(400).json(body)
    return
  }

  // A body over the route's size limit (e.g. a chat picture that's too big).
  if (typeof err === 'object' && err !== null && (err as { type?: string }).type === 'entity.too.large') {
    const body: ApiErrorResponse = { error: { code: 'TOO_LARGE', message: 'That file is too big.', requestId } }
    res.status(413).json(body)
    return
  }

  if (err instanceof ApiError) {
    if (err.status >= 500) {
      console.error(`[${requestId}] ${err.code}: ${err.message}`)
    }
    const body: ApiErrorResponse = { error: { code: err.code, message: err.message, requestId } }
    res.status(err.status).json(body)
    return
  }

  // Anything else is unexpected — log full detail server-side, return
  // nothing but a generic message to the client.
  console.error(`[${requestId}] Unhandled error:`, err)
  const body: ApiErrorResponse = {
    error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.', requestId },
  }
  res.status(500).json(body)
}

/** 404 fallback for routes that don't exist at all. */
export function notFoundHandler(req: Request, res: Response): void {
  const body: ApiErrorResponse = {
    error: { code: 'NOT_FOUND', message: `No route: ${req.method} ${req.path}`, requestId: req.requestId ?? 'unknown' },
  }
  res.status(404).json(body)
}
