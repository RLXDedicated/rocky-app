// A single, typed error shape every route can throw and one error-handling
// middleware (see ../middleware/errorHandler.ts) knows how to render
// consistently — never a raw stack trace or internal detail to the client
// (Phase 12 §14).
export class ApiError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
    this.name = 'ApiError'
  }

  static badRequest(message: string, code = 'BAD_REQUEST'): ApiError {
    return new ApiError(400, code, message)
  }

  static unauthorized(message = 'Authentication required.'): ApiError {
    return new ApiError(401, 'UNAUTHORIZED', message)
  }

  static forbidden(message: string): ApiError {
    return new ApiError(403, 'FORBIDDEN', message)
  }

  static notFound(message: string): ApiError {
    return new ApiError(404, 'NOT_FOUND', message)
  }

  static conflict(message: string): ApiError {
    return new ApiError(409, 'CONFLICT', message)
  }

  static validation(message: string): ApiError {
    return new ApiError(422, 'VALIDATION_FAILED', message)
  }
}
