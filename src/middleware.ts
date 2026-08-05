import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken, decode } from 'next-auth/jwt'
import { getNextAuthSecrets } from '@/lib/secrets'

// Routes that require a verified email before access.
const PROTECTED_PREFIXES = ['/dashboard', '/onboarding']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

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

  // Not logged in → let NextAuth's own pages handle the redirect to login.
  if (!token) {
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
  matcher: ['/dashboard/:path*', '/onboarding/:path*'],
}
