import { describe, it, expect } from 'vitest'
import { dueDateInMonth, nextDueDate } from '../bills'

describe('dueDateInMonth', () => {
  it('keeps normal days unchanged', () => {
    expect(dueDateInMonth(2026, 0, 15)).toEqual(new Date(2026, 0, 15))
  })

  it('clamps February 31 to the last day of the month', () => {
    expect(dueDateInMonth(2026, 1, 31)).toEqual(new Date(2026, 1, 28))
  })

  it('respects leap years', () => {
    expect(dueDateInMonth(2024, 1, 31)).toEqual(new Date(2024, 1, 29))
  })

  it('clamps day 0 to day 1', () => {
    expect(dueDateInMonth(2026, 5, 0)).toEqual(new Date(2026, 5, 1))
  })

  it('handles December rollover correctly', () => {
    expect(dueDateInMonth(2026, 11, 31)).toEqual(new Date(2026, 11, 31))
  })
})

describe('nextDueDate', () => {
  it('returns this month when the day is still ahead', () => {
    const now = new Date(2026, 0, 3)
    expect(nextDueDate(5, now)).toEqual(new Date(2026, 0, 5))
  })

  it('returns next month when the day has already passed', () => {
    const now = new Date(2026, 0, 20)
    expect(nextDueDate(5, now)).toEqual(new Date(2026, 1, 5))
  })

  it('clamps to a valid day in the target month', () => {
    const now = new Date(2026, 1, 20)
    expect(nextDueDate(31, now)).toEqual(new Date(2026, 1, 28))
  })
})
