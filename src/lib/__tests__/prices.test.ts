import { describe, it, expect } from 'vitest'
import { parseQuantity, getReferencePrice } from '../prices'

describe('parseQuantity', () => {
  it('reads masses and normalises to grams', () => {
    expect(parseQuantity('Cheese (100g)')).toEqual({ amount: 100, unit: 'mass' })
    expect(parseQuantity('Potatoes (1kg)')).toEqual({ amount: 1000, unit: 'mass' })
  })

  it('reads volumes and normalises to millilitres', () => {
    expect(parseQuantity('Milk (1L)')).toEqual({ amount: 1000, unit: 'volume' })
    expect(parseQuantity('Cream (250ml)')).toEqual({ amount: 250, unit: 'volume' })
  })

  it('reads a bare number as a count', () => {
    expect(parseQuantity('Eggs (10)')).toEqual({ amount: 10, unit: 'count' })
    expect(parseQuantity('Bread rolls (4)')).toEqual({ amount: 4, unit: 'count' })
  })

  it('understands per-kilo pricing', () => {
    expect(parseQuantity('Young matured cheese (per kg)')).toEqual({ amount: 1000, unit: 'mass' })
  })

  it('returns null when there is no quantity to read', () => {
    expect(parseQuantity('Tomato sauce')).toBeNull()
    expect(parseQuantity('Pizza dough mix')).toBeNull()
  })
})

describe('getReferencePrice', () => {
  it('charges for the portion used, not the whole pack', () => {
    // The bug: cheese is priced per kilo, the recipe asks for 100g, and the
    // basket was charged €6.98 — ten times what it should be.
    const hundredGrams = getReferencePrice('Cheese (100g)').price
    const wholeKilo = getReferencePrice('Young matured cheese (per kg)').price

    expect(hundredGrams).toBeLessThan(wholeKilo)
    expect(hundredGrams).toBeCloseTo(wholeKilo / 10, 1)
  })

  it('scales a part-pack of chicken', () => {
    // Reference pack is 500g; the recipe wants 200g.
    const portion = getReferencePrice('Chicken breast (200g)').price
    const pack = getReferencePrice('Chicken breast (500g)').price

    expect(portion).toBeLessThan(pack)
    expect(portion).toBeCloseTo(pack * 0.4, 1)
  })

  it('never charges more than one pack', () => {
    // Needing more than the pack means buying two, but billing a single meal
    // for multiple packs overstates what cooking costs.
    const huge = getReferencePrice('Chicken breast (5kg)').price
    const pack = getReferencePrice('Chicken breast (500g)').price
    expect(huge).toBeLessThanOrEqual(pack)
  })

  it('never returns zero for a small quantity', () => {
    expect(getReferencePrice('Cheese (1g)').price).toBeGreaterThan(0)
  })

  it('falls back to the pack price when no quantity is given', () => {
    expect(getReferencePrice('Tomato sauce').price).toBeGreaterThan(0)
  })

  it('does not divide grams by millilitres', () => {
    // Mismatched unit families must leave the price alone rather than
    // producing a nonsense number.
    const price = getReferencePrice('Milk (500g)').price
    expect(price).toBeGreaterThan(0)
  })
})
