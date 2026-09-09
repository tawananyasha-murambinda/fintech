// Bill scheduling.
//
// `Bill.frequency` (weekly / monthly / quarterly / yearly) was stored, offered
// in the UI and shown on every bill card — and then ignored: the due date was
// always computed as "that day of the current or next month". A weekly bill
// reminded monthly, and a yearly bill reminded twelve times a year.
//
// `Bill.dueDate` remains the day of the month for monthly, quarterly and
// yearly bills. `Bill.anchorDate` — the first known occurrence — carries the
// rest of what a non-monthly schedule needs (which weekday, which month) and
// is what everything is projected from when present.

export type BillFrequency = 'weekly' | 'monthly' | 'quarterly' | 'yearly'

export const BILL_FREQUENCIES: BillFrequency[] = ['weekly', 'monthly', 'quarterly', 'yearly']

export function isBillFrequency(value: string | null | undefined): value is BillFrequency {
  return value === 'weekly' || value === 'monthly' || value === 'quarterly' || value === 'yearly'
}

const DAY_MS = 24 * 60 * 60 * 1000

/** Clamps a day-of-month to the last valid day so the 31st never rolls over. */
export function dueDateInMonth(year: number, month: number, day: number): Date {
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  return new Date(Date.UTC(year, month, Math.min(Math.max(day, 1), lastDay)))
}

function startOfUtcDay(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
}

export type BillSchedule = {
  dueDate: number
  frequency?: string | null
  anchorDate?: Date | null
}

/**
 * The next occurrence on or after today.
 *
 * "On or after" rather than "strictly after": on the morning a bill is due it
 * is still due today, and a reminder that skips to next month on the due date
 * itself is the one reminder that matters most.
 */
export function nextDueDate(bill: BillSchedule, now: Date = new Date()): Date {
  const today = startOfUtcDay(now)
  const frequency = isBillFrequency(bill.frequency) ? bill.frequency : 'monthly'

  if (frequency === 'weekly') {
    // Without an anchor there is no weekday to key off, so fall back to the
    // day-of-month value read as a weekday (0–6) — the best available guess.
    const anchor = bill.anchorDate
      ? startOfUtcDay(bill.anchorDate)
      : startOfUtcDay(new Date(Date.UTC(1970, 0, 4 + (((bill.dueDate % 7) + 7) % 7))))
    if (anchor >= today) return new Date(anchor)
    const weeksElapsed = Math.ceil((today - anchor) / (7 * DAY_MS))
    return new Date(anchor + weeksElapsed * 7 * DAY_MS)
  }

  const anchor = bill.anchorDate ?? null
  const step = frequency === 'monthly' ? 1 : frequency === 'quarterly' ? 3 : 12

  // Monthly bills need no anchor: every month is a candidate. Quarterly and
  // yearly ones do — otherwise there is no way to know *which* month.
  const anchorYear = anchor ? anchor.getUTCFullYear() : now.getUTCFullYear()
  const anchorMonth = anchor ? anchor.getUTCMonth() : now.getUTCMonth()
  const day = anchor ? anchor.getUTCDate() : bill.dueDate

  if (step === 1) {
    const thisMonth = dueDateInMonth(now.getUTCFullYear(), now.getUTCMonth(), day)
    if (thisMonth.getTime() >= today) return thisMonth
    return dueDateInMonth(now.getUTCFullYear(), now.getUTCMonth() + 1, day)
  }

  // Walk forward from the anchor in whole steps until the date is not past.
  const monthsSinceAnchor =
    (now.getUTCFullYear() - anchorYear) * 12 + (now.getUTCMonth() - anchorMonth)
  let periods = Math.floor(monthsSinceAnchor / step)
  if (periods < 0) periods = 0

  let candidate = dueDateInMonth(anchorYear, anchorMonth + periods * step, day)
  while (candidate.getTime() < today) {
    periods += 1
    candidate = dueDateInMonth(anchorYear, anchorMonth + periods * step, day)
  }
  return candidate
}

/** The occurrence after `nextDueDate`, for "then again on…" copy. */
export function followingDueDate(bill: BillSchedule, now: Date = new Date()): Date {
  const next = nextDueDate(bill, now)
  return nextDueDate(bill, new Date(next.getTime() + DAY_MS))
}

/** What one occurrence of this bill costs per month, for annualised totals. */
export function monthlyEquivalent(amount: number, frequency: string | null | undefined): number {
  if (frequency === 'weekly') return (amount * 52) / 12
  if (frequency === 'quarterly') return amount / 3
  if (frequency === 'yearly') return amount / 12
  return amount
}

/** Whole UTC days from `now` until `due`. Negative once past. */
export function daysUntilDue(due: Date, now: Date = new Date()): number {
  return Math.round((startOfUtcDay(due) - startOfUtcDay(now)) / DAY_MS)
}
