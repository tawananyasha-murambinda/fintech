import type { ErrorEvent, EventHint } from '@sentry/nextjs'
import { redactPII } from './pii'

// Everything leaving this process for Sentry passes through here.
//
// The existing redactPII covers emails, phones, cards, IBANs, BICs and SSNs in
// free text. On top of that, whole fields that are secret by name are dropped
// outright rather than redacted, and query strings are stripped from URLs
// because tokens ride in them (`?token=`, `?email=`).
const SECRET_KEY = /pass|secret|token|authorization|cookie|api[-_]?key|access[-_]?token|card|cvv|iban|ssn/i

function scrubString(value: string): string {
  return redactPII(value)
}

function scrubValue(value: unknown, depth = 0): unknown {
  if (depth > 6) return '[truncated]'
  if (typeof value === 'string') return scrubString(value)
  if (Array.isArray(value)) return value.map((v) => scrubValue(v, depth + 1))
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, v]) =>
        SECRET_KEY.test(key) ? [key, '[redacted]'] : [key, scrubValue(v, depth + 1)]
      )
    )
  }
  return value
}

function scrubUrl(url: string | undefined): string | undefined {
  if (!url) return url
  const queryIndex = url.indexOf('?')
  return queryIndex === -1 ? url : `${url.slice(0, queryIndex)}?[stripped]`
}

export function scrubEvent(event: ErrorEvent, _hint?: EventHint): ErrorEvent | null {
  if (event.request) {
    event.request.url = scrubUrl(event.request.url)
    // Bodies and cookies on a finance app are account data by definition.
    delete event.request.data
    delete event.request.cookies
    delete event.request.headers
    if (event.request.query_string) event.request.query_string = '[stripped]'
  }

  // Keep the user id for correlation; drop everything that identifies a person.
  if (event.user) {
    event.user = { id: event.user.id }
  }

  if (event.extra) event.extra = scrubValue(event.extra) as typeof event.extra
  if (event.contexts) event.contexts = scrubValue(event.contexts) as typeof event.contexts

  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.map((crumb) => ({
      ...crumb,
      message: crumb.message ? scrubString(crumb.message) : crumb.message,
      data: crumb.data ? (scrubValue(crumb.data) as Record<string, unknown>) : crumb.data,
    }))
  }

  if (event.exception?.values) {
    event.exception.values = event.exception.values.map((value) => ({
      ...value,
      value: value.value ? scrubString(value.value) : value.value,
    }))
  }

  if (event.message) event.message = scrubString(event.message)

  return event
}
