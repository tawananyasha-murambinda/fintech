import * as Sentry from '@sentry/nextjs'
import { scrubEvent } from './lib/sentry-scrub'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV,
  tracesSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
  // Session replay is deliberately off: replaying a session in this app would
  // record account balances and transaction history.
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
  sendDefaultPii: false,
  beforeSend: scrubEvent,
})

// Next uses this to report client-side navigation spans to Sentry.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
