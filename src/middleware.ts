import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken, decode } from 'next-auth/jwt'
import { getNextAuthSecrets } from '@/lib/secrets'
import { rateLimit } from '@/lib/rate-limit'

// Routes that require a verified email before access.
const PROTECTED_PREFIXES = ['/dashboard', '/onboarding']

// A blanket ceiling on API traffic per client. Individual routes still apply
// their own tighter, purpose-specific limits (sign-in attempts, AI calls,
// checkout); this is the backstop so the ~55 routes that carry no limiter of
// their own cannot be hammered. Deliberately generous — it is a circuit
// breaker, not a quota.
const API_BURST_LIMIT = 300
const API_BURST_WINDOW_MS = 60_000

// Stripe and Plaid webhooks authenticate by signature and must not be throttled
// on the sender's IP; the cron endpoint authenticates by bearer token.
const UNTHROTTLED = ['/api/billing/webhook', '/api/plaid/webhook', '/api/cron/']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (pathname.startsWith('/api/')) {
    if (UNTHROTTLED.some((prefix) => pathname.startsWith(prefix))) return NextResponse.next()

    const limited = await rateLimit(req, {
      limit: API_BURST_LIMIT,
      windowMs: API_BURST_WINDOW_MS,
      key: 'api-burst',
    })
    return limited ?? NextResponse.next()
  }

  const needsVerification = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  )
  if (!needsVerification) return NextResponse.next()

  const secrets = getNextAuthSecrets()

  // NEXTAUTH_SECRET may be a comma-separated list for rotation. Try each
  // value until one verifies, so sessions signed by the previous secret keep
  // working while the new one is phased in.
  const token = await getToken({
    req,
    ...(secrets.length > 0
      ? {
          decode: async (params) => {
            for (const secret of secrets) {
              const t = await decode({ ...params, secret })
              if (t) return t
            }
            return null
          },
        }
      : {}),
  })

  // Not logged in, or holding a token whose identity was stripped because the
  // password changed (see the jwt callback in lib/auth.ts) → back to login.
  if (!token || !token.id) {
    const loginUrl = new URL('/auth/login', req.url)
    loginUrl.searchParams.set('callbackUrl', req.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Logged in but email not verified → send to the verify-required page.
  if (!token.emailVerified) {
    const verifyUrl = new URL('/auth/verify', req.url)
    verifyUrl.searchParams.set('callbackUrl', req.nextUrl.pathname)
    return NextResponse.redirect(verifyUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/onboarding/:path*', '/api/:path*'],
}
