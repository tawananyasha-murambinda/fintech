import { describe, it, expect } from 'vitest'
import { sumInCurrency } from '../fx'

describe('sumInCurrency', () => {
  it('adds same-currency amounts without converting', async () => {
    const result = await sumInCurrency(
      [
        { amount: 500, currency: 'GBP' },
        { amount: 250, currency: 'GBP' },
      ],
      'GBP'
    )

    expect(result.total).toBe(750)
    expect(result.converted).toBe(false)
  })

  it('converts rather than adding different currencies raw', async () => {
    // £500 + €500 is not 1000 of anything, which is what this produced before.
    const result = await sumInCurrency(
      [
        { amount: 500, currency: 'GBP' },
        { amount: 500, currency: 'EUR' },
      ],
      'GBP'
    )

    expect(result.converted).toBe(true)
    expect(result.total).not.toBe(1000)
    // A euro is worth less than a pound, so the total lands between the two.
    expect(result.total).toBeGreaterThan(500)
    expect(result.total).toBeLessThan(1000)
  }, 15000)

  it('reports whether the rates were live, so the caller can hedge', async () => {
    const result = await sumInCurrency([{ amount: 100, currency: 'EUR' }], 'USD')
    expect(typeof result.live).toBe('boolean')
  }, 15000)

  it('is zero for nothing', async () => {
    expect((await sumInCurrency([], 'GBP')).total).toBe(0)
  })
})
