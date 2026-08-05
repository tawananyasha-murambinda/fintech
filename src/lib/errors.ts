// Maps common database/Prisma failure modes to user-facing messages so the
// API never fails silently with a generic 500 when the cause is known.

function isPrismaInitError(err: any): boolean {
  return (
    err?.constructor?.name === 'PrismaClientInitializationError' ||
    (err?.message &&
      (err.message.includes('Environment variable not found: DATABASE_URL') ||
        err.message.includes('Can\'t reach database server') ||
        err.message.includes('Query read timeout')))
  )
}

function isConnectionError(err: any): boolean {
  return (
    err?.code === 'ECONNREFUSED' ||
    err?.code === 'ENOTFOUND' ||
    err?.code === 'ETIMEDOUT' ||
    err?.code === 'P1001' ||
    err?.code === 'P1002' ||
    err?.code === 'P1003' ||
    err?.code === 'P1017'
  )
}

export function dbErrorResponse(err: any): { error: string; status: number } | null {
  if (isPrismaInitError(err) || isConnectionError(err)) {
    return {
      error:
        'Our database is temporarily unavailable. This usually means the server is not configured correctly. Please try again later or contact support.',
      status: 503,
    }
  }
  return null
}

export function errorResponse(err: any, fallback: string, fallbackStatus = 500) {
  const dbError = dbErrorResponse(err)
  if (dbError) return dbError
  return { error: fallback, status: fallbackStatus }
}
