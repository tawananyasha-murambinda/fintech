// Next.js calls this once per runtime at boot. Each runtime needs its own
// Sentry client, and importing the Node config into the edge bundle breaks
// the build, so they are loaded conditionally.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config')

    // Say once, at boot, which features are switched off by missing
    // configuration. Silent degradation is how a dead cron went unnoticed.
    const { describeGaps } = await import('@/lib/config-check')
    const { logger } = await import('@/lib/logger')
    for (const gap of describeGaps()) logger.warn(gap)
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config')
  }
}

export { captureRequestError as onRequestError } from '@sentry/nextjs'
