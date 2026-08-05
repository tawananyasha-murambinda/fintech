import { describe, it, expect } from 'vitest'
import { safeDate, toFiniteNumber } from '../validate'

describe('safeDate', () => {
  it('returns null for missing input', () => {
    expect(safeDate(null)).toBeNull()
    expect(safeDate(undefined)).toBeNull()
    expect(safeDate('')).toBeNull()
  })

  it('returns null for invalid input', () => {
    expect(safeDate('not a date')).toBeNull()
  })

  it('parses a valid ISO date', () => {
    const d = safeDate('2026-01-15')
    expect(d).not.toBeNull()
    expect(d!.getUTCFullYear()).toBe(2026)
  })
})

describe('toFiniteNumber', () => {
  it('parses numeric strings', () => {
    expect(toFiniteNumber('42')).toBe(42)
    expect(toFiniteNumber('42.5')).toBe(42.5)
  })

  it('passes through numbers', () => {
    expect(toFiniteNumber(7)).toBe(7)
  })

  it('returns null for non-finite input', () => {
    expect(toFiniteNumber('abc')).toBeNull()
    expect(toFiniteNumber(null)).toBeNull()
    expect(toFiniteNumber('')).toBeNull()
    expect(toFiniteNumber(NaN)).toBeNull()
    expect(toFiniteNumber(Infinity)).toBeNull()
  })
})
