import { describe, it, expect } from 'vitest'
import { parseSearchQuery } from '../search-query'

const NOW = new Date('2026-06-15T12:00:00')

describe('parseSearchQuery', () => {
  it('splits a compound query into separate constraints', () => {
    // The old search ORed these, so a more precise query returned more rows.
    const q = parseSearchQuery('coffee over 5 last month', NOW)

    expect(q.category).toBe('Coffee')
    expect(q.minAmount).toBe(5)
    expect(q.from).toEqual(new Date(2026, 4, 1))
    expect(q.to).toEqual(new Date(2026, 5, 1))
  })

  it('handles under and between', () => {
    expect(parseSearchQuery('under £20', NOW).maxAmount).toBe(20)

    const between = parseSearchQuery('between 10 and 50', NOW)
    expect(between.minAmount).toBe(10)
    expect(between.maxAmount).toBe(50)
  })

  it('reads direction', () => {
    expect(parseSearchQuery('income this year', NOW).direction).toBe('credit')
    expect(parseSearchQuery('money out', NOW).direction).toBe('debit')
  })

  it('resolves relative dates', () => {
    expect(parseSearchQuery('today', NOW).from).toEqual(new Date(2026, 5, 15))
    expect(parseSearchQuery('last 7 days', NOW).from).toEqual(new Date(2026, 5, 8))
    expect(parseSearchQuery('this year', NOW).from).toEqual(new Date(2026, 0, 1))
  })

  it('reads a bare month, rolling back a year when it has not happened yet', () => {
    const december = parseSearchQuery('december', NOW)
    expect(december.from?.getFullYear()).toBe(2025)

    const march = parseSearchQuery('march', NOW)
    expect(march.from?.getFullYear()).toBe(2026)
  })

  it('maps everyday words onto categories', () => {
    expect(parseSearchQuery('petrol', NOW).category).toBe('Transportation')
    expect(parseSearchQuery('supermarket', NOW).category).toBe('Groceries')
  })

  it('keeps unrecognised words as merchant text rather than dropping them', () => {
    const q = parseSearchQuery('greggs last week', NOW)
    expect(q.text).toBe('greggs')
    expect(q.from).not.toBeNull()
  })

  it('strips filler that would otherwise be searched for', () => {
    expect(parseSearchQuery('show me all my transactions', NOW).text).toBeNull()
  })

  it('reports what it understood', () => {
    const q = parseSearchQuery('coffee over 5 last month', NOW)
    const kinds = q.matched.map((m) => m.kind)

    expect(kinds).toContain('amount')
    expect(kinds).toContain('date')
    expect(kinds).toContain('category')
  })

  it('returns an empty query for empty input', () => {
    const q = parseSearchQuery('', NOW)
    expect(q.text).toBeNull()
    expect(q.matched).toEqual([])
  })
})
