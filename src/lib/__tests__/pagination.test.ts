import { describe, it, expect } from 'vitest'
import { parseLimit, parsePage } from '../pagination'

describe('parseLimit', () => {
  it('returns the default for null/undefined input', () => {
    expect(parseLimit(null)).toBe(20)
  })

  it('parses a valid number', () => {
    expect(parseLimit('5')).toBe(5)
  })

  it('falls back for non-positive values', () => {
    expect(parseLimit('0')).toBe(20)
    expect(parseLimit('-3')).toBe(20)
  })

  it('falls back for non-numeric input', () => {
    expect(parseLimit('abc')).toBe(20)
  })

  it('clamps to the configured maximum', () => {
    expect(parseLimit('999999')).toBe(100)
  })

  it('floors fractional values', () => {
    expect(parseLimit('20.7')).toBe(20)
  })

  it('honours a custom default and max', () => {
    expect(parseLimit(null, 5, 10)).toBe(5)
    expect(parseLimit('50', 5, 10)).toBe(10)
  })
})

describe('parsePage', () => {
  it('returns the default for null/undefined input', () => {
    expect(parsePage(null)).toBe(1)
  })

  it('parses a valid page number', () => {
    expect(parsePage('3')).toBe(3)
  })

  it('falls back for pages below 1', () => {
    expect(parsePage('0')).toBe(1)
    expect(parsePage('-1')).toBe(1)
  })

  it('falls back for non-numeric input', () => {
    expect(parsePage('x')).toBe(1)
  })

  it('floors fractional values', () => {
    expect(parsePage('2.9')).toBe(2)
  })
})
