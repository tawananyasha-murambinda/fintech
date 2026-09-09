import * as Sentry from '@sentry/nextjs'

type Level = 'debug' | 'info' | 'warn' | 'error'

// Structured JSON logging to stdout/stderr.
//
// Serverless filesystems are read-only and ephemeral, so writing log files
// gets you nothing: the write fails, or the container disappears with the
// file inside it. Every hosting platform worth using (Vercel, Fly, Render,
// Cloud Run, plain Docker) collects stdout/stderr instead, and one JSON
// object per line is what log shippers (Axiom, Datadog, Vercel Logs) parse
// without extra configuration.
const SERVICE = process.env.LOG_SERVICE_NAME || 'fintrack'
const MIN_LEVEL: Level = (process.env.LOG_LEVEL as Level) || 'info'

const RANK: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 }

function serialise(value: unknown): unknown {
  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack }
  }
  return value
}

function emit(level: Level, message: string, meta?: unknown) {
  if (process.env.NODE_ENV === 'test' && !process.env.LOG_IN_TESTS) return
  if (RANK[level] < RANK[MIN_LEVEL]) return

  const entry: Record<string, unknown> = {
    ts: new Date().toISOString(),
    level,
    service: SERVICE,
    msg: message,
  }
  if (meta !== undefined) entry.meta = serialise(meta)

  let line: string
  try {
    line = JSON.stringify(entry)
  } catch {
    // Circular or otherwise unserialisable meta must not lose the message.
    line = JSON.stringify({ ...entry, meta: String(meta) })
  }

  // warn/error to stderr so platform log levels classify them correctly.
  // The edge runtime (middleware) has no process.stdout/stderr, so fall back
  // to console, which every runtime provides.
  const stream = level === 'error' || level === 'warn' ? 'stderr' : 'stdout'
  const target = typeof process !== 'undefined' ? (process as any)[stream] : undefined

  if (target?.write) target.write(line + '\n')
  else if (stream === 'stderr') console.error(line)
  else console.log(line)

  // Errors also go to Sentry so someone is actually paged. Sentry is a no-op
  // without a DSN, and its beforeSend hook scrubs the payload — but never let
  // a reporting failure take down the code path that was logging.
  if (level === 'error') {
    try {
      const error = meta instanceof Error ? meta : errorFrom(meta)
      if (error) {
        Sentry.captureException(error, { extra: { message } })
      } else {
        Sentry.captureMessage(message, { level: 'error', extra: { meta } })
      }
    } catch {
      // ignore
    }
  }
}

// logger.error is called both as (msg, err) and as (msg, {userId, error}).
// Pull the Error out of either shape so Sentry groups by stack trace rather
// than lumping every call site under one message.
function errorFrom(meta: unknown): Error | null {
  if (meta instanceof Error) return meta
  if (meta && typeof meta === 'object' && 'error' in meta) {
    const inner = (meta as { error: unknown }).error
    if (inner instanceof Error) return inner
  }
  return null
}

export const logger = {
  debug: (message: string, meta?: unknown) => emit('debug', message, meta),
  info: (message: string, meta?: unknown) => emit('info', message, meta),
  warn: (message: string, meta?: unknown) => emit('warn', message, meta),
  error: (message: string, meta?: unknown) => emit('error', message, meta),
}
