import { describe, it, expect } from 'vitest'
import {
  dueDateInMonth,
  nextDueDate,
  followingDueDate,
  monthlyEquivalent,
  daysUntilDue,
  isBillFrequency,
} from '../bills'

const at = (iso: string) => new Date(iso)
const iso = (d: Date) => d.toISOString().slice(0, 10)

describe('dueDateInMonth', () => {
  it('clamps a day-31 bill to the last day of a short month', () => {
    expect(iso(dueDateInMonth(2026, 1, 31))).toBe('2026-02-28')
    expect(iso(dueDateInMonth(2024, 1, 31))).toBe('2024-02-29')
  })

  it('clamps out-of-range days rather than rolling into the next month', () => {
    expect(iso(dueDateInMonth(2026, 3, 31))).toBe('2026-04-30')
    expect(iso(dueDateInMonth(2026, 3, 0))).toBe('2026-04-01')
  })
})

describe('nextDueDate — monthly', () => {
  const bill = { dueDate: 15, frequency: 'monthly' }

  it('returns this month when the date is still ahead', () => {
    expect(iso(nextDueDate(bill, at('2026-03-01T12:00:00Z')))).toBe('2026-03-15')
  })

  it('still returns today on the due date itself', () => {
    // The reminder that matters most is the one on the day it is due; rolling
    // to next month here means it never fires.
    expect(iso(nextDueDate(bill, at('2026-03-15T23:00:00Z')))).toBe('2026-03-15')
  })

  it('rolls to next month once past', () => {
    expect(iso(nextDueDate(bill, at('2026-03-16T00:00:00Z')))).toBe('2026-04-15')
  })

  it('rolls across a year boundary', () => {
    expect(iso(nextDueDate(bill, at('2026-12-20T00:00:00Z')))).toBe('2027-01-15')
  })
})

describe('nextDueDate — weekly', () => {
  // Anchored to Wednesday 2026-03-04.
  const bill = { dueDate: 3, frequency: 'weekly', anchorDate: at('2026-03-04T00:00:00Z') }

  it('advances a week at a time, not a month', () => {
    // The bug this replaces: a weekly bill was treated as "the 3rd of the
    // month", so it reminded twelve times a year instead of fifty-two.
    expect(iso(nextDueDate(bill, at('2026-03-05T00:00:00Z')))).toBe('2026-03-11')
    expect(iso(nextDueDate(bill, at('2026-03-12T00:00:00Z')))).toBe('2026-03-18')
  })

  it('returns the anchor itself on the day', () => {
    expect(iso(nextDueDate(bill, at('2026-03-04T09:00:00Z')))).toBe('2026-03-04')
  })

  it('handles a now that is far past the anchor', () => {
    const due = nextDueDate(bill, at('2026-09-01T00:00:00Z'))
    expect(due.getUTCDay()).toBe(3)
    expect(due.getTime()).toBeGreaterThanOrEqual(at('2026-09-01T00:00:00Z').getTime())
  })

  it('returns a future anchor unchanged', () => {
    expect(iso(nextDueDate(bill, at('2026-02-01T00:00:00Z')))).toBe('2026-03-04')
  })
})

describe('nextDueDate — quarterly', () => {
  const bill = { dueDate: 10, frequency: 'quarterly', anchorDate: at('2026-01-10T00:00:00Z') }

  it('steps three months from the anchor', () => {
    expect(iso(nextDueDate(bill, at('2026-02-01T00:00:00Z')))).toBe('2026-04-10')
    expect(iso(nextDueDate(bill, at('2026-05-01T00:00:00Z')))).toBe('2026-07-10')
  })

  it('lands on the anchor month, not merely any month', () => {
    // A quarterly bill anchored to January is due in Apr/Jul/Oct — never Feb.
    const due = nextDueDate(bill, at('2026-11-01T00:00:00Z'))
    expect(iso(due)).toBe('2027-01-10')
  })
})

describe('nextDueDate — yearly', () => {
  const bill = { dueDate: 1, frequency: 'yearly', anchorDate: at('2026-06-01T00:00:00Z') }

  it('reminds once a year, in the anchor month', () => {
    expect(iso(nextDueDate(bill, at('2026-03-01T00:00:00Z')))).toBe('2026-06-01')
    expect(iso(nextDueDate(bill, at('2026-07-01T00:00:00Z')))).toBe('2027-06-01')
  })
})

describe('followingDueDate', () => {
  it('gives the occurrence after next', () => {
    const bill = { dueDate: 15, frequency: 'monthly' }
    expect(iso(followingDueDate(bill, at('2026-03-01T00:00:00Z')))).toBe('2026-04-15')
  })
})

describe('monthlyEquivalent', () => {
  it('normalises every frequency onto a monthly figure', () => {
    // A yearly £120 bill is £10/month, not £120 — the totals shown on the
    // bills screen depend on this.
    expect(monthlyEquivalent(120, 'yearly')).toBeCloseTo(10)
    expect(monthlyEquivalent(30, 'quarterly')).toBeCloseTo(10)
    expect(monthlyEquivalent(10, 'monthly')).toBe(10)
    expect(monthlyEquivalent(10, 'weekly')).toBeCloseTo(43.333, 2)
  })

  it('treats an unknown frequency as monthly', () => {
    expect(monthlyEquivalent(10, null)).toBe(10)
  })
})

describe('daysUntilDue', () => {
  it('counts whole calendar days regardless of time of day', () => {
    expect(daysUntilDue(at('2026-03-11T00:30:00Z'), at('2026-03-10T23:30:00Z'))).toBe(1)
    expect(daysUntilDue(at('2026-03-10T09:00:00Z'), at('2026-03-10T21:00:00Z'))).toBe(0)
    expect(daysUntilDue(at('2026-03-09T00:00:00Z'), at('2026-03-10T00:00:00Z'))).toBe(-1)
  })
})

describe('isBillFrequency', () => {
  it('accepts only the four supported values', () => {
    expect(isBillFrequency('weekly')).toBe(true)
    expect(isBillFrequency('yearly')).toBe(true)
    expect(isBillFrequency('fortnightly')).toBe(false)
    expect(isBillFrequency(null)).toBe(false)
  })
})
