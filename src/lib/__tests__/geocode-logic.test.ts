import { describe, it, expect } from 'vitest'
import { findLocalAlternatives, setGeocodeCurrency } from '../geocode'

// These exercise the branch selection and the guarantees that hold regardless
// of whether the map lookups succeed — the network calls inside fall back
// cleanly, so the assertions below hold either way.

describe('drink merchants', () => {
  it('does not suggest a chicken-and-rice recipe against a coffee', async () => {
    // The bug: "Food & Dining" matched the meal branch on the word "cafe", so a
    // €4.33 Starbucks was costed against a home-cooked dinner.
    setGeocodeCurrency('EUR')
    const result = await findLocalAlternatives(
      'Middelburg', 'Netherlands', 'Food & Dining', 'Starbucks', 4.33, 'Middelburg',
    )

    const text = result.alternatives.map((a) => `${a.name} ${a.reason}`).join(' ').toLowerCase()
    expect(text).not.toMatch(/chicken breast|rice \(500g\)|ground beef/)
    expect(text).toMatch(/cup|drink|coffee|reusable/)
  }, 20000)

  it('treats a named coffee chain as a drink even under a food category', async () => {
    const result = await findLocalAlternatives(
      'Middelburg', 'Netherlands', 'Food & Dining', 'Costa Coffee', 3.9, 'Middelburg',
    )
    const names = result.alternatives.map((a) => a.name).join(' ')
    expect(names).toMatch(/home|reusable/i)
  }, 20000)
})

describe('savings are never negative', () => {
  it('drops a suggestion that costs more than the thing it replaces', async () => {
    // Cooking a €12 McDonald's came to €13.72 and was shown as "Save €-2".
    const result = await findLocalAlternatives(
      'Middelburg', 'Netherlands', 'Food & Dining', "McDonald's", 12, 'Middelburg',
    )
    for (const alt of result.alternatives) {
      expect(alt.estimatedSavings).toBeGreaterThan(0)
    }
  }, 20000)

  it('holds for a very small transaction, where most advice is not worth it', async () => {
    const result = await findLocalAlternatives(
      'Middelburg', 'Netherlands', 'Food & Dining', 'Bakery', 1.2, 'Middelburg',
    )
    for (const alt of result.alternatives) {
      expect(alt.estimatedSavings).toBeGreaterThan(0)
    }
  }, 20000)

  it('holds across categories', async () => {
    for (const [cat, merchant, amount] of [
      ['Shopping', 'FUN', 89.4],
      ['Transportation', 'Uber', 5.87],
    ] as const) {
      const result = await findLocalAlternatives(
        'Middelburg', 'Netherlands', cat, merchant, amount, 'Middelburg',
      )
      for (const alt of result.alternatives) {
        expect(alt.estimatedSavings).toBeGreaterThan(0)
      }
    }
  }, 30000)
})

describe('currency', () => {
  it('formats in the configured currency, not a hardcoded euro', async () => {
    setGeocodeCurrency('GBP')
    const result = await findLocalAlternatives(
      'London', 'United Kingdom', 'Food & Dining', 'Pret', 5, 'London',
    )
    const text = result.alternatives.map((a) => a.reason).join(' ')
    if (text.length > 0) {
      expect(text).not.toMatch(/€/)
    }
    setGeocodeCurrency('EUR')
  }, 20000)
})
