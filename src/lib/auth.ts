import { NextAuthOptions } from 'next-auth'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import bcrypt from 'bcryptjs'
import { prisma, prismaBase } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'
import {
  verifySecondFactor,
  isLocked,
  recordFailedLogin,
  recordSuccessfulLogin,
} from '@/lib/two-factor'
import { z } from 'zod'

// A bcrypt hash of a value nothing will match, used to keep the timing of a
// failed sign-in the same whether or not the account exists.
const DUMMY_HASH = '$2a$12$k8Y3Zr8kQvJ5m1nQ7wXhBeH5Yw0rN4bF8tR2sV6uL9pZ1cD3eG7iK'

// `iat` is in seconds; a token issued in the same second as the revocation is
// treated as older, so the user who just changed their password is signed out
// of that tab too and has to authenticate again.
function issuedBeforeRevocation(iat: number | undefined, validFrom: Date | null): boolean {
  if (!validFrom) return false
  if (typeof iat !== 'number') return true
  return iat * 1000 <= validFrom.getTime()
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  // Present only on the second step of a two-factor sign-in.
  totp: z.string().optional(),
})

// NextAuth surfaces an `authorize` throw as `error=<message>` on the sign-in
// page, which is how the client knows to ask for a code rather than simply
// reporting "wrong password".
export const TWO_FACTOR_REQUIRED = 'TWO_FACTOR_REQUIRED'
export const TWO_FACTOR_INVALID = 'TWO_FACTOR_INVALID'
export const ACCOUNT_LOCKED = 'ACCOUNT_LOCKED'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prismaBase),
  session: {
    strategy: 'jwt',
    // A finance app should not hand out month-long sessions. Seven days, slid
    // forward at most once a day so an active user is not signed out mid-use.
    maxAge: 7 * 24 * 60 * 60,
    updateAge: 24 * 60 * 60,
  },
  pages: {
    signIn: '/auth/login',
    newUser: '/onboarding',
    error: '/auth/login',
  },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        totp: { label: 'Authentication code', type: 'text' },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        })

        // Compare against a dummy hash when the account does not exist, so the
        // response time does not reveal which emails are registered.
        if (!user || !user.password) {
          await bcrypt.compare(parsed.data.password, DUMMY_HASH)
          return null
        }

        if (isLocked(user)) throw new Error(ACCOUNT_LOCKED)

        const valid = await bcrypt.compare(parsed.data.password, user.password)
        if (!valid) {
          await recordFailedLogin(user.id)
          return null
        }

        // Password is correct; a second factor may still be outstanding.
        if (user.twoFactorEnabled) {
          if (!parsed.data.totp) throw new Error(TWO_FACTOR_REQUIRED)

          const second = await verifySecondFactor(user.id, parsed.data.totp)
          if (!second.ok) {
            // A wrong code counts toward lockout too — otherwise the code is
            // brute-forceable at leisure once the password is known.
            await recordFailedLogin(user.id)
            throw new Error(TWO_FACTOR_INVALID)
          }

          if (second.usedRecoveryCode) {
            await logAudit(user.id, 'auth.recovery_code_used', {})
          }
        }

        await recordSuccessfulLogin(user.id)

        return { id: user.id, email: user.email, name: user.name, image: user.image, emailVerified: user.emailVerified?.toISOString() || null }
      },
    }),
    ...(process.env.GOOGLE_CLIENT_ID
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
          }),
        ]
      : []),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // Audit successful sign-ins (best-effort).
      try {
        await logAudit(user?.id, account?.provider === 'credentials' ? 'auth.login' : 'auth.oauth_login', {
          metadata: { provider: account?.provider || 'unknown' },
        })
      } catch {}

      // OAuth providers (Google) have already verified the email, so mark
      // the account verified on first sign-in if it isn't already.
      if (account && account.provider !== 'credentials' && user?.email) {
        try {
          await prisma.user.updateMany({
            where: { email: user.email, emailVerified: null },
            data: { emailVerified: new Date() },
          })
        } catch (err) {
          console.error('Failed to auto-verify OAuth user:', err)
        }
      }
      return true
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id
        if (account && account.provider !== 'credentials') {
          // OAuth verifies the email on the provider side. The `user` object
          // here can be stale (captured before the signIn callback persisted
          // emailVerified), so never gate OAuth sessions behind the verify
          // page, which cannot email a link for a provider account.
          token.emailVerified =
            typeof user.emailVerified === 'string'
              ? user.emailVerified
              : (user.emailVerified as Date | null)?.toISOString() || new Date().toISOString()
        } else {
          token.emailVerified =
            typeof user.emailVerified === 'string'
              ? user.emailVerified
              : (user.emailVerified as Date | null)?.toISOString() || null
        }
      } else if (token.id) {
        // Re-read verification status from the DB so it reflects changes
        // made after login (e.g. the user clicking the verification link or
        // changing their email address or name).
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { emailVerified: true, email: true, name: true, sessionsValidFrom: true },
        })

        // The account is gone, or every session issued before a password
        // change is being revoked. Strip the identity from the token: routes
        // gate on session.user.id and the middleware on token.id, so the
        // bearer is treated as signed out from the next request onward.
        if (!dbUser || issuedBeforeRevocation(token.iat as number | undefined, dbUser.sessionsValidFrom)) {
          return {}
        }

        token.emailVerified = dbUser.emailVerified?.toISOString() || null
        if (dbUser.email) token.email = dbUser.email
        if (dbUser.name) token.name = dbUser.name
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.emailVerified = token.emailVerified as string | null | undefined
      }
      return session
    },
  },
}
