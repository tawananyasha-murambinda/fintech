import { createHmac, randomBytes, timingSafeEqual } from 'crypto'

// RFC 6238 TOTP / RFC 4226 HOTP.
//
// Implemented directly on node:crypto rather than pulling in a dependency:
// the algorithm is thirty lines, and an auth primitive with no supply chain is
// worth more here than the convenience of a package.

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

export const TOTP_STEP_SECONDS = 30
export const TOTP_DIGITS = 6

/** Authenticator apps expect the shared secret as unpadded base32. */
export function toBase32(buffer: Buffer): string {
  let bits = 0
  let value = 0
  let output = ''

  for (const byte of buffer) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) output += BASE32_ALPHABET[(value << (5 - bits)) & 31]

  return output
}

export function fromBase32(input: string): Buffer {
  const cleaned = input.toUpperCase().replace(/=+$/, '').replace(/\s/g, '')
  let bits = 0
  let value = 0
  const bytes: number[] = []

  for (const char of cleaned) {
    const index = BASE32_ALPHABET.indexOf(char)
    if (index === -1) throw new Error('Invalid base32 character in TOTP secret')
    value = (value << 5) | index
    bits += 5
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255)
      bits -= 8
    }
  }

  return Buffer.from(bytes)
}

/** 160 bits, the RFC 4226 recommendation for HMAC-SHA1. */
export function generateSecret(): string {
  return toBase32(randomBytes(20))
}

/** The HOTP code for a specific counter value. */
export function hotp(secret: Buffer, counter: number): string {
  const buffer = Buffer.alloc(8)
  // Counter is a 64-bit big-endian integer; JS bitwise ops are 32-bit, so the
  // halves are written separately.
  buffer.writeUInt32BE(Math.floor(counter / 0x100000000), 0)
  buffer.writeUInt32BE(counter >>> 0, 4)

  const digest = createHmac('sha1', secret).update(buffer).digest()
  const offset = digest[digest.length - 1] & 0x0f
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff)

  return String(binary % 10 ** TOTP_DIGITS).padStart(TOTP_DIGITS, '0')
}

export function generateTotp(secretBase32: string, at: Date = new Date()): string {
  const counter = Math.floor(at.getTime() / 1000 / TOTP_STEP_SECONDS)
  return hotp(fromBase32(secretBase32), counter)
}

/**
 * Verifies a submitted code.
 *
 * `window` allows for clock drift between the server and the user's phone: 1
 * accepts the previous and next 30-second step as well as the current one.
 * Comparison is constant-time so a response cannot be timed digit by digit.
 */
export function verifyTotp(
  secretBase32: string,
  token: string,
  { window = 1, at = new Date() }: { window?: number; at?: Date } = {}
): boolean {
  const cleaned = (token || '').replace(/\s/g, '')
  if (!/^\d{6}$/.test(cleaned)) return false

  const secret = fromBase32(secretBase32)
  const counter = Math.floor(at.getTime() / 1000 / TOTP_STEP_SECONDS)
  const submitted = Buffer.from(cleaned)

  let matched = false
  // Every candidate is checked even after a match so the work — and therefore
  // the timing — does not depend on which step succeeded.
  for (let drift = -window; drift <= window; drift++) {
    const candidate = Buffer.from(hotp(secret, counter + drift))
    if (candidate.length === submitted.length && timingSafeEqual(candidate, submitted)) {
      matched = true
    }
  }

  return matched
}

/** The otpauth:// URI an authenticator app scans. */
export function otpauthUrl(secretBase32: string, account: string, issuer = 'FinTrack'): string {
  const label = encodeURIComponent(`${issuer}:${account}`)
  const params = new URLSearchParams({
    secret: secretBase32,
    issuer,
    algorithm: 'SHA1',
    digits: String(TOTP_DIGITS),
    period: String(TOTP_STEP_SECONDS),
  })
  return `otpauth://totp/${label}?${params.toString()}`
}

/** Recovery codes: readable, unambiguous, and high-entropy. */
export function generateRecoveryCodes(count = 10): string[] {
  // Crockford-style alphabet: no I, L, O, U — so a handwritten code cannot be
  // misread as a different valid one.
  const alphabet = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
  const codes: string[] = []

  for (let i = 0; i < count; i++) {
    const bytes = randomBytes(10)
    let code = ''
    for (let j = 0; j < 10; j++) {
      if (j === 5) code += '-'
      code += alphabet[bytes[j] % alphabet.length]
    }
    codes.push(code)
  }

  return codes
}

export function normaliseRecoveryCode(code: string): string {
  return (code || '').toUpperCase().replace(/[^0-9A-Z]/g, '')
}
