import { createCipheriv, createDecipheriv, randomBytes, createHmac } from 'crypto'

const ALGORITHM = 'aes-256-gcm'

// The AES key is resolved lazily so that a missing or malformed
// ENCRYPTION_KEY does not crash the module (and therefore the whole
// build/app) at import time — it only fails the specific encrypt/decrypt
// call that needs it, with a clear message.
let cachedKey: Buffer | null = null

function getKey(): Buffer {
  if (cachedKey) return cachedKey
  const raw = process.env.ENCRYPTION_KEY || ''
  const key = Buffer.from(raw, 'hex')
  if (!raw || key.length !== 32) {
    throw new Error('ENCRYPTION_KEY must be 32 bytes (64 hex characters)')
  }
  cachedKey = key
  return key
}

export function encrypt(plaintext: string): string {
  const iv = randomBytes(16)
  const cipher = createCipheriv(ALGORITHM, getKey(), iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${encrypted.toString('hex')}:${tag.toString('hex')}`
}

export function decrypt(ciphertext: string): string {
  const parts = ciphertext.split(':')
  const [ivHex, encryptedHex, tagHex] = parts
  // The payload segment is legitimately empty when the plaintext was empty, so
  // only the IV and auth tag are required to be non-empty.
  if (parts.length !== 3 || !ivHex || !tagHex) throw new Error('Invalid ciphertext format')
  const iv = Buffer.from(ivHex, 'hex')
  const encrypted = Buffer.from(encryptedHex, 'hex')
  const tag = Buffer.from(tagHex, 'hex')
  const decipher = createDecipheriv(ALGORITHM, getKey(), iv)
  decipher.setAuthTag(tag)
  return decipher.update(encrypted) + decipher.final('utf8')
}

export function verifyWebhookSignature(payload: string, signature: string): boolean {
  const secret = process.env.TELLER_SIGNING_SECRET || ''
  const expected = createHmac('sha256', secret).update(payload).digest('hex')
  return signature === `sha256=${expected}`
}
