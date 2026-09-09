import * as Sentry from '@sentry/nextjs'
import { scrubEvent } from './src/lib/sentry-scrub'

// The middleware runs on the edge runtime, which needs its own client.
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled: Boolean(process.env.SENTRY_DSN),
  environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
  tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
  sendDefaultPii: false,
  beforeSend: scrubEvent,
})
