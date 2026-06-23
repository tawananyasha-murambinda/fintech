import { createCipheriv, createDecipheriv, randomBytes, createHmac } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const KEY = Buffer.from(process.env.ENCRYPTION_KEY || '', 'hex')

if (process.env.ENCRYPTION_KEY && KEY.length !== 32) {
  throw new Error('ENCRYPTION_KEY must be 32 bytes (64 hex characters)')
}

export function encrypt(plaintext: string): string {
  const iv = randomBytes(16)
  const cipher = createCipheriv(ALGORITHM, KEY, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${encrypted.toString('hex')}:${tag.toString('hex')}`
}

export function decrypt(ciphertext: string): string {
  const [ivHex, encryptedHex, tagHex] = ciphertext.split(':')
  if (!ivHex || !encryptedHex || !tagHex) throw new Error('Invalid ciphertext format')
  const iv = Buffer.from(ivHex, 'hex')
  const encrypted = Buffer.from(encryptedHex, 'hex')
  const tag = Buffer.from(tagHex, 'hex')
  const decipher = createDecipheriv(ALGORITHM, KEY, iv)
  decipher.setAuthTag(tag)
  return decipher.update(encrypted) + decipher.final('utf8')
}

export function verifyWebhookSignature(payload: string, signature: string): boolean {
  const secret = process.env.TELLER_SIGNING_SECRET || ''
  const expected = createHmac('sha256', secret).update(payload).digest('hex')
  return signature === `sha256=${expected}`
}
