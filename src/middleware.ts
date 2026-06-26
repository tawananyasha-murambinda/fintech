import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

// Routes that require a verified email before access.
const PROTECTED_PREFIXES = ['/dashboard', '/onboarding']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  const needsVerification = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  )
  if (!needsVerification) return NextResponse.next()

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  })

  // Not logged in → let NextAuth's own pages handle the redirect to login.
  if (!token) {
    const loginUrl = new URL('/auth/login', req.url)
    loginUrl.searchParams.set('callbackUrl', req.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Logged in but email not verified → send to the verify-required page.
  if (!token.emailVerified) {
    const verifyUrl = new URL('/auth/verify-required', req.url)
    return NextResponse.redirect(verifyUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/onboarding/:path*'],
}
