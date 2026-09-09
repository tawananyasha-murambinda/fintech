import { describe, it, expect } from 'vitest'
import { shouldRemind, MS_PER_DAY } from '../bill-reminders'
import { daysUntilDue as daysUntil } from '../bills'

const at = (iso: string) => new Date(iso)

describe('daysUntil', () => {
  it('counts whole calendar days regardless of time of day', () => {
    // Late-night "now" against an early-morning due date must still read as 1.
    expect(daysUntil(at('2026-03-11T00:30:00Z'), at('2026-03-10T23:30:00Z'))).toBe(1)
  })

  it('returns 0 for the same day and negative once past', () => {
    expect(daysUntil(at('2026-03-10T09:00:00Z'), at('2026-03-10T21:00:00Z'))).toBe(0)
    expect(daysUntil(at('2026-03-09T00:00:00Z'), at('2026-03-10T00:00:00Z'))).toBe(-1)
  })
})

describe('shouldRemind', () => {
  const bill = { dueDate: 15, frequency: 'monthly', reminderDays: 3, lastReminded: null as Date | null }

  it('stays quiet outside the reminder window', () => {
    expect(shouldRemind(bill, at('2026-03-01T12:00:00Z'))).toBe(false)
  })

  it('fires once the bill enters the window', () => {
    expect(shouldRemind(bill, at('2026-03-13T12:00:00Z'))).toBe(true)
  })

  it('fires on the due date itself', () => {
    expect(shouldRemind(bill, at('2026-03-15T08:00:00Z'))).toBe(true)
  })

  it('does not fire twice in the same cycle', () => {
    const now = at('2026-03-14T12:00:00Z')
    const alreadySent = { ...bill, lastReminded: at('2026-03-13T12:00:00Z') }

    expect(shouldRemind(alreadySent, now)).toBe(false)
  })

  it('fires again the following month', () => {
    // Reminded in March; April's window must reopen rather than stay closed
    // because lastReminded is merely "recent".
    const remindedInMarch = { ...bill, lastReminded: at('2026-03-13T12:00:00Z') }

    expect(shouldRemind(remindedInMarch, at('2026-04-13T12:00:00Z'))).toBe(true)
  })

  it('clamps a day-31 bill to the last day of a short month', () => {
    // February has no 31st; the bill must still be reminded about, not skipped.
    const endOfMonth = { dueDate: 31, frequency: 'monthly', reminderDays: 3, lastReminded: null }

    expect(shouldRemind(endOfMonth, at('2026-02-26T12:00:00Z'))).toBe(true)
  })

  it('respects a per-bill reminder window', () => {
    const early = { dueDate: 15, frequency: 'monthly', reminderDays: 10, lastReminded: null }
    const late = { dueDate: 15, frequency: 'monthly', reminderDays: 1, lastReminded: null }
    const now = at('2026-03-08T12:00:00Z')

    expect(shouldRemind(early, now)).toBe(true)
    expect(shouldRemind(late, now)).toBe(false)
  })

  it('exposes a day constant consistent with its arithmetic', () => {
    expect(MS_PER_DAY).toBe(86_400_000)
  })

  it('reminds a weekly bill weekly, not monthly', () => {
    // Anchored to Wednesday 2026-03-04, reminding one day ahead.
    const weekly = {
      dueDate: 3,
      frequency: 'weekly',
      anchorDate: at('2026-03-04T00:00:00Z'),
      reminderDays: 1,
      lastReminded: at('2026-03-03T12:00:00Z'),
    }

    // Already reminded for the 4th, so the 3rd is quiet...
    expect(shouldRemind(weekly, at('2026-03-03T18:00:00Z'))).toBe(false)
    // ...but the next occurrence a week later opens a fresh window.
    expect(shouldRemind(weekly, at('2026-03-10T12:00:00Z'))).toBe(true)
  })

  it('does not remind a yearly bill every month', () => {
    const yearly = {
      dueDate: 1,
      frequency: 'yearly',
      anchorDate: at('2026-06-01T00:00:00Z'),
      reminderDays: 5,
      lastReminded: null,
    }

    expect(shouldRemind(yearly, at('2026-04-28T12:00:00Z'))).toBe(false)
    expect(shouldRemind(yearly, at('2026-05-28T12:00:00Z'))).toBe(true)
  })
})
