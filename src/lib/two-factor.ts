import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { encrypt, decrypt } from '@/lib/encryption'
import { verifyTotp, generateRecoveryCodes, normaliseRecoveryCode } from '@/lib/totp'
import { logger } from '@/lib/logger'

// Two-factor verification, shared by the sign-in flow and the disable/manage
// endpoints so there is exactly one place that decides whether a second factor
// was satisfied.

/** TOTP secrets are encrypted at rest with the same key as bank tokens. */
export function encryptSecret(secretBase32: string): string {
  return encrypt(secretBase32)
}

export function decryptSecret(stored: string): string {
  return decrypt(stored)
}

export type SecondFactorResult =
  | { ok: true; usedRecoveryCode: boolean }
  | { ok: false; reason: 'missing' | 'invalid' }

/**
 * Checks a submitted second factor against the user's TOTP secret, then
 * against their unused recovery codes.
 *
 * A recovery code is consumed on use — that is the whole point of it — and the
 * consumption is atomic so the same code cannot be spent twice by two
 * concurrent requests.
 */
export async function verifySecondFactor(
  userId: string,
  submitted: string | undefined | null
): Promise<SecondFactorResult> {
  const code = (submitted || '').trim()
  if (!code) return { ok: false, reason: 'missing' }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { twoFactorSecret: true, twoFactorEnabled: true },
  })

  if (!user?.twoFactorEnabled || !user.twoFactorSecret) {
    // Nothing to verify against; the caller should not have asked.
    return { ok: false, reason: 'invalid' }
  }

  try {
    if (verifyTotp(decryptSecret(user.twoFactorSecret), code)) {
      return { ok: true, usedRecoveryCode: false }
    }
  } catch (err) {
    // A secret that cannot be decrypted (rotated key, corrupt row) must fail
    // closed rather than fall through to accepting anything.
    logger.error('Could not decrypt TOTP secret', { userId, error: err })
    return { ok: false, reason: 'invalid' }
  }

  const normalised = normaliseRecoveryCode(code)
  if (normalised.length < 8) return { ok: false, reason: 'invalid' }

  const candidates = await prisma.twoFactorRecoveryCode.findMany({
    where: { userId, usedAt: null },
    select: { id: true, codeHash: true },
  })

  for (const candidate of candidates) {
    if (!(await bcrypt.compare(normalised, candidate.codeHash))) continue

    // updateMany with `usedAt: null` in the filter makes this a compare-and-set:
    // a second concurrent request matching the same code updates zero rows.
    const { count } = await prisma.twoFactorRecoveryCode.updateMany({
      where: { id: candidate.id, usedAt: null },
      data: { usedAt: new Date() },
    })
    if (count === 1) return { ok: true, usedRecoveryCode: true }
  }

  return { ok: false, reason: 'invalid' }
}

/** Replaces every recovery code with a fresh set, returning the plaintext once. */
export async function issueRecoveryCodes(userId: string): Promise<string[]> {
  const codes = generateRecoveryCodes(10)
  const hashed = await Promise.all(
    codes.map(async (code) => ({
      userId,
      codeHash: await bcrypt.hash(normaliseRecoveryCode(code), 10),
    }))
  )

  await prisma.$transaction([
    prisma.twoFactorRecoveryCode.deleteMany({ where: { userId } }),
    prisma.twoFactorRecoveryCode.createMany({ data: hashed }),
  ])

  return codes
}

export async function countUnusedRecoveryCodes(userId: string): Promise<number> {
  return prisma.twoFactorRecoveryCode.count({ where: { userId, usedAt: null } })
}

// --- Failed sign-in throttling -------------------------------------------
//
// The IP-keyed rate limiter does not stop a distributed attempt against one
// account. This counts failures against the account itself.

export const MAX_FAILED_LOGINS = 8
const LOCKOUT_MINUTES = 15

export function isLocked(user: { lockedUntil: Date | null }, now = new Date()): boolean {
  return !!user.lockedUntil && user.lockedUntil > now
}

export async function recordFailedLogin(userId: string, now = new Date()): Promise<void> {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { failedLoginCount: { increment: 1 } },
    select: { failedLoginCount: true },
  })

  if (user.failedLoginCount >= MAX_FAILED_LOGINS) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        lockedUntil: new Date(now.getTime() + LOCKOUT_MINUTES * 60 * 1000),
        failedLoginCount: 0,
      },
    })
    logger.warn('Account locked after repeated failed sign-ins', { userId })
  }
}

export async function recordSuccessfulLogin(userId: string, now = new Date()): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: now },
  })
}
