import * as Sentry from '@sentry/nextjs'
import { scrubEvent } from './src/lib/sentry-scrub'

// Sentry is optional: with no DSN set, init is a no-op and the app runs
// exactly as before. That keeps local development and CI free of noise.
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled: Boolean(process.env.SENTRY_DSN),
  environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
  // Financial data: sample errors fully, traces sparsely, and never record
  // request bodies or headers by default.
  tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
  sendDefaultPii: false,
  beforeSend: scrubEvent,
})
