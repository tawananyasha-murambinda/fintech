import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockPrisma } from '@/test/setup'
import bcrypt from 'bcryptjs'
import { generateSecret, generateTotp } from '../totp'

// Encryption is exercised in its own suite; here the secret is passed through
// so the tests are about verification logic, not AES.
vi.mock('@/lib/encryption', () => ({
  encrypt: (v: string) => `enc:${v}`,
  decrypt: (v: string) => v.replace(/^enc:/, ''),
}))

const { verifySecondFactor, isLocked, recordFailedLogin, MAX_FAILED_LOGINS } = await import('../two-factor')

const SECRET = generateSecret()

describe('verifySecondFactor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.user.findUnique.mockResolvedValue({
      twoFactorSecret: `enc:${SECRET}`,
      twoFactorEnabled: true,
    })
    mockPrisma.twoFactorRecoveryCode.findMany.mockResolvedValue([])
  })

  it('accepts a valid TOTP code', async () => {
    const result = await verifySecondFactor('u1', generateTotp(SECRET))
    expect(result).toEqual({ ok: true, usedRecoveryCode: false })
  })

  it('rejects a wrong code', async () => {
    expect(await verifySecondFactor('u1', '000000')).toEqual({ ok: false, reason: 'invalid' })
  })

  it('rejects an empty submission without a database round trip', async () => {
    expect(await verifySecondFactor('u1', '')).toEqual({ ok: false, reason: 'missing' })
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled()
  })

  it('refuses when two-factor is not enabled for the account', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ twoFactorSecret: null, twoFactorEnabled: false })
    expect(await verifySecondFactor('u1', '123456')).toEqual({ ok: false, reason: 'invalid' })
  })

  it('accepts a recovery code and consumes it', async () => {
    const code = 'ABCDE-FGHJK'
    const normalised = 'ABCDEFGHJK'
    mockPrisma.twoFactorRecoveryCode.findMany.mockResolvedValue([
      { id: 'rc1', codeHash: await bcrypt.hash(normalised, 10) },
    ])
    mockPrisma.twoFactorRecoveryCode.updateMany.mockResolvedValue({ count: 1 })

    const result = await verifySecondFactor('u1', code)

    expect(result).toEqual({ ok: true, usedRecoveryCode: true })
    // Filtered on usedAt: null, which makes consumption a compare-and-set.
    expect(mockPrisma.twoFactorRecoveryCode.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'rc1', usedAt: null } })
    )
  })

  it('does not let the same recovery code be spent twice concurrently', async () => {
    mockPrisma.twoFactorRecoveryCode.findMany.mockResolvedValue([
      { id: 'rc1', codeHash: await bcrypt.hash('ABCDEFGHJK', 10) },
    ])
    // The competing request already marked it used, so zero rows update.
    mockPrisma.twoFactorRecoveryCode.updateMany.mockResolvedValue({ count: 0 })

    expect(await verifySecondFactor('u1', 'ABCDE-FGHJK')).toEqual({ ok: false, reason: 'invalid' })
  })

  it('fails closed when the stored secret cannot be decrypted', async () => {
    // A rotated encryption key must not degrade into accepting anything.
    mockPrisma.user.findUnique.mockResolvedValue({
      twoFactorSecret: 'enc:!!!not-base32!!!',
      twoFactorEnabled: true,
    })
    expect(await verifySecondFactor('u1', '123456')).toEqual({ ok: false, reason: 'invalid' })
  })
})

describe('login throttling', () => {
  beforeEach(() => vi.clearAllMocks())

  it('treats a future lockedUntil as locked', () => {
    const future = new Date(Date.now() + 60_000)
    expect(isLocked({ lockedUntil: future })).toBe(true)
  })

  it('treats an expired lock as clear', () => {
    expect(isLocked({ lockedUntil: new Date(Date.now() - 1000) })).toBe(false)
    expect(isLocked({ lockedUntil: null })).toBe(false)
  })

  it('locks the account once the failure threshold is reached', async () => {
    mockPrisma.user.update.mockResolvedValue({ failedLoginCount: MAX_FAILED_LOGINS })

    await recordFailedLogin('u1')

    const lockCall = mockPrisma.user.update.mock.calls[1][0]
    expect(lockCall.data.lockedUntil).toBeInstanceOf(Date)
    // Counter resets so the next lock needs a fresh run of failures.
    expect(lockCall.data.failedLoginCount).toBe(0)
  })

  it('does not lock before the threshold', async () => {
    mockPrisma.user.update.mockResolvedValue({ failedLoginCount: 3 })

    await recordFailedLogin('u1')

    expect(mockPrisma.user.update).toHaveBeenCalledTimes(1)
  })
})
