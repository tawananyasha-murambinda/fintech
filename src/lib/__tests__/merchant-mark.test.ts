import { describe, it, expect } from 'vitest'
import { merchantColor, merchantInitials } from '../merchant'

describe('merchantInitials', () => {
  it('takes the first letter of the first two meaningful words', () => {
    expect(merchantInitials('Corner Cafe')).toBe('CC')
    expect(merchantInitials('Tesco')).toBe('TE')
  })

  it('skips leading noise words', () => {
    expect(merchantInitials('The Coffee House')).toBe('CH')
    expect(merchantInitials('Acme Ltd')).toBe('AC')
  })

  it('strips payment-processor prefixes that identify nothing', () => {
    // Half a statement is "SQ *" and "PAYPAL *"; initialising those makes
    // every row look the same.
    expect(merchantInitials('SQ *BLUE BOTTLE')).toBe('BB')
    expect(merchantInitials('PAYPAL *SPOTIFY')).toBe('SP')
  })

  it('never returns empty', () => {
    expect(merchantInitials('').length).toBeGreaterThan(0)
    expect(merchantInitials('***').length).toBeGreaterThan(0)
  })
})

describe('merchantColor', () => {
  it('is stable for the same merchant', () => {
    // Must not change between server render and hydration, or the row flashes.
    expect(merchantColor('Tesco')).toBe(merchantColor('Tesco'))
    expect(merchantColor('Tesco')).toBe(merchantColor('  tesco '))
  })

  it('separates different merchants', () => {
    const colors = ['Tesco', 'Amazon', 'Spotify', 'Uber'].map(merchantColor)
    expect(new Set(colors).size).toBeGreaterThan(1)
  })

  it('always returns a valid hex colour', () => {
    for (const name of ['a', 'Zzz', '12345', 'Ünïcödé']) {
      expect(merchantColor(name)).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })
})
