import fs from 'fs'
import path from 'path'

type Level = 'debug' | 'info' | 'warn' | 'error'

const LOG_DIR = path.join(process.cwd(), '.logs')
const LOG_FILE = path.join(LOG_DIR, 'app.log')
const MAX_BYTES = 5 * 1024 * 1024 // rotate at 5MB
const MAX_FILES = 5

// File logging is fire-and-forget: never block a request or crash a route
// when the filesystem is unavailable (e.g. read-only serverless function).
function rotateIfNeeded() {
  try {
    if (!fs.existsSync(LOG_FILE)) return
    const { size } = fs.statSync(LOG_FILE)
    if (size < MAX_BYTES) return
    for (let i = MAX_FILES - 1; i >= 1; i--) {
      const from = `${LOG_FILE}.${i}`
      const to = `${LOG_FILE}.${i + 1}`
      if (fs.existsSync(from)) fs.renameSync(from, to)
    }
    fs.renameSync(LOG_FILE, `${LOG_FILE}.1`)
  } catch {
    // ignore
  }
}

function append(level: Level, message: string, meta?: unknown) {
  const line = `${new Date().toISOString()} [${level}] ${message}${meta !== undefined ? ' ' + safeStringify(meta) : ''}\n`
  if (process.env.NODE_ENV === 'test') return
  rotateIfNeeded()
  fs.appendFile(LOG_FILE, line, (err) => {
    if (err && level === 'error') console.error('Logger write failed:', err)
  })
  if (level === 'error') console.error(message, meta ?? '')
  else if (level === 'warn') console.warn(message, meta ?? '')
  else if (level === 'debug' && process.env.DEBUG_LOGGING) console.debug(message, meta ?? '')
  else if (level === 'info') console.log(message, meta ?? '')
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

export const logger = {
  debug: (message: string, meta?: unknown) => append('debug', message, meta),
  info: (message: string, meta?: unknown) => append('info', message, meta),
  warn: (message: string, meta?: unknown) => append('warn', message, meta),
  error: (message: string, meta?: unknown) => append('error', message, meta),
}
