// Next.js calls this once per runtime at boot. Each runtime needs its own
// Sentry client, and importing the Node config into the edge bundle breaks
// the build, so they are loaded conditionally.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config')
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config')
  }
}

export { captureRequestError as onRequestError } from '@sentry/nextjs'
