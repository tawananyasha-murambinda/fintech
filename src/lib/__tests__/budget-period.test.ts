import { describe, it, expect } from 'vitest'
import { currentPeriodWindow, periodProgress, monthlyEquivalent, isBudgetPeriod } from '../budget-period'

const at = (iso: string) => new Date(iso)

describe('currentPeriodWindow', () => {
  it('returns the Monday-anchored week for a weekly budget', () => {
    // 2026-03-11 is a Wednesday.
    const w = currentPeriodWindow('weekly', at('2026-03-11T12:00:00'))
    expect(w.start.getDay()).toBe(1)
    expect(Math.round((w.end.getTime() - w.start.getTime()) / 86_400_000)).toBe(7)
  })

  it('treats Sunday as the end of the week, not the start', () => {
    const w = currentPeriodWindow('weekly', at('2026-03-15T12:00:00'))
    expect(w.start.getDate()).toBe(9)
  })

  it('returns the calendar month for a monthly budget', () => {
    const w = currentPeriodWindow('monthly', at('2026-03-11T12:00:00'))
    expect(w.start.getDate()).toBe(1)
    expect(w.start.getMonth()).toBe(2)
    expect(w.end.getMonth()).toBe(3)
  })

  it('returns the calendar quarter for a quarterly budget', () => {
    const w = currentPeriodWindow('quarterly', at('2026-05-20T12:00:00'))
    expect(w.start.getMonth()).toBe(3)
    expect(w.end.getMonth()).toBe(6)
    expect(w.label).toBe('Q2')
  })

  it('falls back to monthly for an unknown period', () => {
    expect(currentPeriodWindow('fortnightly', at('2026-03-11T12:00:00')).label).toBe('this month')
  })
})

describe('periodProgress', () => {
  it('is 0 at the start and near 1 at the end', () => {
    const w = currentPeriodWindow('monthly', at('2026-03-01T00:00:00'))
    expect(periodProgress(w, at('2026-03-01T00:00:00'))).toBe(0)
    expect(periodProgress(w, at('2026-03-31T23:00:00'))).toBeGreaterThan(0.95)
  })

  it('clamps rather than exceeding 1 past the window', () => {
    const w = currentPeriodWindow('monthly', at('2026-03-01T00:00:00'))
    expect(periodProgress(w, at('2026-05-01T00:00:00'))).toBe(1)
  })
})

describe('monthlyEquivalent', () => {
  it('normalises each period onto a monthly figure', () => {
    expect(monthlyEquivalent(100, 'weekly')).toBeCloseTo(433.33, 1)
    expect(monthlyEquivalent(300, 'quarterly')).toBe(100)
    expect(monthlyEquivalent(100, 'monthly')).toBe(100)
  })
})

describe('isBudgetPeriod', () => {
  it('accepts only the supported periods', () => {
    expect(isBudgetPeriod('weekly')).toBe(true)
    expect(isBudgetPeriod('daily')).toBe(false)
    expect(isBudgetPeriod(null)).toBe(false)
  })
})
