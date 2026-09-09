import { describe, it, expect } from 'vitest'
import {
  generateSecret,
  generateTotp,
  verifyTotp,
  hotp,
  toBase32,
  fromBase32,
  otpauthUrl,
  generateRecoveryCodes,
  normaliseRecoveryCode,
  TOTP_STEP_SECONDS,
} from '../totp'

describe('base32', () => {
  it('round-trips arbitrary bytes', () => {
    const buf = Buffer.from([0xde, 0xad, 0xbe, 0xef, 0x00, 0x11])
    expect(fromBase32(toBase32(buf))).toEqual(buf)
  })

  it('matches RFC 4648 vectors', () => {
    expect(toBase32(Buffer.from('foobar'))).toBe('MZXW6YTBOI')
    expect(fromBase32('MZXW6YTBOI').toString()).toBe('foobar')
  })

  it('tolerates padding, whitespace and lower case', () => {
    expect(fromBase32('mzxw 6ytb oi==').toString()).toBe('foobar')
  })

  it('rejects an invalid character rather than producing a wrong secret', () => {
    expect(() => fromBase32('MZXW6YTB01')).toThrow(/Invalid base32/)
  })
})

describe('hotp — RFC 4226 Appendix D test vectors', () => {
  // The published vectors for the secret "12345678901234567890".
  const secret = Buffer.from('12345678901234567890')
  const expected = [
    '755224', '287082', '359152', '969429', '338314',
    '254676', '287922', '162583', '399871', '520489',
  ]

  it('reproduces every published counter value', () => {
    expected.forEach((code, counter) => {
      expect(hotp(secret, counter)).toBe(code)
    })
  })
})

describe('generateTotp — RFC 6238 test vectors', () => {
  // RFC 6238 uses the same ASCII secret, SHA1, 8 digits. This implementation
  // is fixed at 6 digits, so the vectors are checked as the low 6 digits of
  // the published 8-digit values.
  const secret = toBase32(Buffer.from('12345678901234567890'))
  const cases: [number, string][] = [
    [59, '94287082'],
    [1111111109, '07081804'],
    [1111111111, '14050471'],
    [1234567890, '89005924'],
    [2000000000, '69279037'],
  ]

  it('matches the published codes at each timestamp', () => {
    for (const [seconds, eightDigit] of cases) {
      expect(generateTotp(secret, new Date(seconds * 1000))).toBe(eightDigit.slice(-6))
    }
  })
})

describe('verifyTotp', () => {
  const secret = generateSecret()
  const now = new Date('2026-06-15T12:00:00Z')

  it('accepts the current code', () => {
    expect(verifyTotp(secret, generateTotp(secret, now), { at: now })).toBe(true)
  })

  it('accepts one step of clock drift in either direction', () => {
    const before = new Date(now.getTime() - TOTP_STEP_SECONDS * 1000)
    const after = new Date(now.getTime() + TOTP_STEP_SECONDS * 1000)

    expect(verifyTotp(secret, generateTotp(secret, before), { at: now })).toBe(true)
    expect(verifyTotp(secret, generateTotp(secret, after), { at: now })).toBe(true)
  })

  it('rejects a code two steps stale', () => {
    const stale = new Date(now.getTime() - 3 * TOTP_STEP_SECONDS * 1000)
    expect(verifyTotp(secret, generateTotp(secret, stale), { at: now })).toBe(false)
  })

  it('rejects a code from a different secret', () => {
    expect(verifyTotp(secret, generateTotp(generateSecret(), now), { at: now })).toBe(false)
  })

  it('rejects malformed input without throwing', () => {
    expect(verifyTotp(secret, '', { at: now })).toBe(false)
    expect(verifyTotp(secret, '12345', { at: now })).toBe(false)
    expect(verifyTotp(secret, '1234567', { at: now })).toBe(false)
    expect(verifyTotp(secret, 'abcdef', { at: now })).toBe(false)
    expect(verifyTotp(secret, null as any, { at: now })).toBe(false)
  })

  it('tolerates spaces, which authenticator apps display', () => {
    const code = generateTotp(secret, now)
    const spaced = `${code.slice(0, 3)} ${code.slice(3)}`
    expect(verifyTotp(secret, spaced, { at: now })).toBe(true)
  })

  it('can be pinned to zero drift', () => {
    const before = new Date(now.getTime() - TOTP_STEP_SECONDS * 1000)
    expect(verifyTotp(secret, generateTotp(secret, before), { at: now, window: 0 })).toBe(false)
  })
})

describe('generateSecret', () => {
  it('produces a distinct 160-bit secret each time', () => {
    const a = generateSecret()
    const b = generateSecret()
    expect(a).not.toBe(b)
    expect(fromBase32(a)).toHaveLength(20)
  })
})

describe('otpauthUrl', () => {
  it('builds a scannable URI with the issuer in both label and query', () => {
    const url = otpauthUrl('JBSWY3DPEHPK3PXP', 'alice@example.com')
    expect(url).toContain('otpauth://totp/FinTrack%3Aalice%40example.com')
    expect(url).toContain('secret=JBSWY3DPEHPK3PXP')
    expect(url).toContain('issuer=FinTrack')
    expect(url).toContain('digits=6')
    expect(url).toContain('period=30')
  })
})

describe('recovery codes', () => {
  it('generates the requested number of distinct codes', () => {
    const codes = generateRecoveryCodes(10)
    expect(codes).toHaveLength(10)
    expect(new Set(codes).size).toBe(10)
  })

  it('avoids characters that are easy to misread by hand', () => {
    const codes = generateRecoveryCodes(50).join('')
    expect(codes).not.toMatch(/[ILOU]/)
  })

  it('normalises formatting differences on the way back in', () => {
    const [code] = generateRecoveryCodes(1)
    expect(normaliseRecoveryCode(code.toLowerCase())).toBe(code.replace('-', ''))
    expect(normaliseRecoveryCode(` ${code} `)).toBe(code.replace('-', ''))
  })
})
