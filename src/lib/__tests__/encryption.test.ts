import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

const KEY_A = 'a'.repeat(64)
const KEY_B = 'b'.repeat(64)

// The module caches the key after first use, so each case re-imports it fresh.
async function loadWithKey(key: string | undefined) {
  vi.resetModules()
  if (key === undefined) delete process.env.ENCRYPTION_KEY
  else process.env.ENCRYPTION_KEY = key
  return import('../encryption')
}

describe('encryption', () => {
  const original = process.env.ENCRYPTION_KEY
  beforeEach(() => vi.resetModules())
  afterEach(() => {
    if (original === undefined) delete process.env.ENCRYPTION_KEY
    else process.env.ENCRYPTION_KEY = original
  })

  it('round-trips a Plaid access token', async () => {
    const { encrypt, decrypt } = await loadWithKey(KEY_A)
    const token = 'access-sandbox-8ab976e6-64bc-4b38-98f7-731e7a349970'

    expect(decrypt(encrypt(token))).toBe(token)
  })

  it('round-trips unicode and empty strings', async () => {
    const { encrypt, decrypt } = await loadWithKey(KEY_A)

    expect(decrypt(encrypt(''))).toBe('')
    expect(decrypt(encrypt('café — ☕ 中文'))).toBe('café — ☕ 中文')
  })

  it('produces a different ciphertext each time (random IV)', async () => {
    const { encrypt, decrypt } = await loadWithKey(KEY_A)
    const a = encrypt('same-secret')
    const b = encrypt('same-secret')

    expect(a).not.toBe(b)
    expect(decrypt(a)).toBe(decrypt(b))
  })

  it('rejects ciphertext whose payload was tampered with', async () => {
    const { encrypt, decrypt } = await loadWithKey(KEY_A)
    const [iv, payload, tag] = encrypt('balance: 100').split(':')
    // Flip one hex digit of the payload; GCM's auth tag must catch it.
    const flipped = (payload[0] === '0' ? '1' : '0') + payload.slice(1)

    expect(() => decrypt(`${iv}:${flipped}:${tag}`)).toThrow()
  })

  it('rejects ciphertext encrypted under a different key', async () => {
    const { encrypt } = await loadWithKey(KEY_A)
    const ciphertext = encrypt('cross-key')

    const { decrypt: decryptB } = await loadWithKey(KEY_B)
    expect(() => decryptB(ciphertext)).toThrow()
  })

  it('rejects malformed ciphertext', async () => {
    const { decrypt } = await loadWithKey(KEY_A)

    expect(() => decrypt('not-ciphertext')).toThrow('Invalid ciphertext format')
    expect(() => decrypt('aa:bb')).toThrow('Invalid ciphertext format')
  })

  it('fails loudly when the key is missing or the wrong length', async () => {
    const missing = await loadWithKey(undefined)
    expect(() => missing.encrypt('x')).toThrow(/ENCRYPTION_KEY/)

    const short = await loadWithKey('abcd')
    expect(() => short.encrypt('x')).toThrow(/ENCRYPTION_KEY/)
  })
})
