import { describe, it, expect } from 'vitest'
import { redactPII, redactTransactions, redactHistory } from '../pii'

describe('redactPII', () => {
  it('returns input unchanged when empty', () => {
    expect(redactPII('')).toBe('')
  })

  it('redacts email addresses', () => {
    const out = redactPII('Contact john.doe@example.com today')
    expect(out).toContain('[email redacted]')
    expect(out).not.toContain('john.doe@example.com')
  })

  it('redacts phone numbers with separators and prefixes', () => {
    const out = redactPII('Call me at +1 (555) 123-4567 now')
    expect(out).toContain('[phone redacted]')
    expect(out).not.toContain('555-123-4567')
  })

  it('redacts card numbers', () => {
    const out = redactPII('Card 4111 1111 1111 1111 used')
    expect(out).toContain('[card redacted]')
    expect(out).not.toContain('4111 1111 1111 1111')
  })

  it('redacts IBAN-like account codes', () => {
    const out = redactPII('IBAN DE89 3704 0044 0532 0130 00')
    expect(out).toContain('[account redacted]')
    expect(out).not.toContain('DE89')
  })

  it('redacts BIC/SWIFT codes', () => {
    const out = redactPII('Bank code DEUTDEFF arrives')
    expect(out).toContain('[bic redacted]')
    expect(out).not.toContain('DEUTDEFF')
  })

  it('redacts US social security numbers', () => {
    const out = redactPII('SSN 123-45-6789 on file')
    expect(out).toContain('[ssn redacted]')
    expect(out).not.toContain('123-45-6789')
  })

  it('redacts multiple kinds of PII in one string', () => {
    const out = redactPII('a@b.co +49 170 1234567 4111111111111111')
    expect(out).toContain('[email redacted]')
    expect(out).toContain('[phone redacted]')
    expect(out).toContain('[card redacted]')
  })
})

describe('redactTransactions', () => {
  it('redacts description and merchantName fields', () => {
    const input = [
      {
        description: 'paid john.doe@example.com',
        merchantName: 'BILL+ME 4111111111111111',
        amount: 12.5,
      },
    ]
    const out = redactTransactions(input)
    expect(out[0].description).toContain('[email redacted]')
    expect(out[0].merchantName).toContain('[card redacted]')
    expect(out[0].amount).toBe(12.5)
  })

  it('leaves null fields untouched', () => {
    const input = [{ description: null, merchantName: 'safe merchant', amount: 1 }]
    const out = redactTransactions(input)
    expect(out[0].description).toBeNull()
    expect(out[0].merchantName).toBe('safe merchant')
  })
})

describe('redactHistory', () => {
  it('redacts content on every message', () => {
    const input = [
      { role: 'user', content: 'my email is a@b.co' },
      { role: 'assistant', content: 'thanks, a@b.co' },
    ]
    const out = redactHistory(input)
    expect(out[0].content).not.toContain('a@b.co')
    expect(out[1].content).not.toContain('a@b.co')
    expect(out[0].role).toBe('user')
  })
})
