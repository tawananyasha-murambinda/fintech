/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production'

const nextConfig = {
  serverExternalPackages: ['@prisma/client'],
  images: {
    domains: ['avatars.githubusercontent.com', 'lh3.googleusercontent.com'],
  },
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // 'unsafe-eval' is only needed by React's dev-mode tooling; it is
              // dropped in production so an injected string cannot be executed.
              // 'unsafe-inline' remains because Next's App Router emits inline
              // bootstrap scripts — removing it needs per-request nonces, which
              // is the next step and requires middleware-generated headers.
              isProd
                ? "script-src 'self' 'unsafe-inline' https://cdn.plaid.com https://js.stripe.com"
                : "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.plaid.com https://js.stripe.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "font-src 'self' data:",
              // Restricted from `https:` to the hosts the app actually talks to,
              // so an injected script cannot exfiltrate to an arbitrary domain.
              [
                "connect-src 'self'",
                'https://api.stripe.com',
                'https://*.plaid.com',
                'https://api.resend.com',
                ...(process.env.NEXT_PUBLIC_SENTRY_DSN ? ['https://*.ingest.sentry.io', 'https://*.ingest.de.sentry.io'] : []),
              ].join(' '),
              "frame-src https://cdn.plaid.com https://js.stripe.com https://www.youtube.com",
              "manifest-src 'self'",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()' },
          // Isolates the browsing context so a cross-origin opener cannot
          // reach into the page, and blocks cross-origin embedding of it.
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
          { key: 'X-DNS-Prefetch-Control', value: 'off' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        ],
      },
    ]
  },
}

const { withSentryConfig } = require('@sentry/nextjs/config')

// Source maps are only uploaded when an auth token is present, so local builds
// and CI stay quiet and fast. Without SENTRY_DSN the SDK is inert anyway.
module.exports = withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
    // Uploaded maps must not stay served publicly — they de-minify the whole
    // client bundle for anyone who asks.
    deleteSourcemapsAfterUpload: true,
  },
  // Routes Sentry's browser requests through the app's own origin so ad
  // blockers do not silently swallow client-side error reports.
  tunnelRoute: '/monitoring/tunnel',
  webpack: { treeshake: { removeDebugLogging: true } },
})
