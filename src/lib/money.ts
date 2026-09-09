import { Prisma } from '@prisma/client'

// Money handling.
//
// Monetary columns are Postgres `numeric`, not `double precision`, so what is
// stored is exact: 0.1 + 0.2 is 0.30 in the database, balances do not drift as
// rows accumulate, and totals reconcile against a bank statement.
//
// In application memory amounts are plain JS numbers. A double represents every
// 2-decimal value below ~$90 trillion with far more precision than a cent, so
// summing is safe; what is *not* safe is comparing two computed sums directly,
// or letting a fraction of a cent survive into a value that gets written back.
// Use `round` before persisting and `gt`/`gte`/`eq` when comparing.

export const CENTS = 100

/** Rounds to whole cents, away from zero, killing 0.1+0.2 style residue. */
export function round(value: number, dp = 2): number {
  if (!Number.isFinite(value)) return 0
  const factor = 10 ** dp
  // Nudge by an epsilon proportional to the value so 1.005 rounds to 1.01
  // rather than 1.00 (its double is fractionally below 1.005).
  const scaled = value * factor
  const nudged = scaled + (scaled >= 0 ? Number.EPSILON * Math.abs(scaled) : -Number.EPSILON * Math.abs(scaled))
  return Math.round(nudged) / factor
}

/** Sum that rounds once at the end rather than accumulating residue. */
export function sum(values: number[]): number {
  return round(values.reduce((acc, v) => acc + (Number.isFinite(v) ? v : 0), 0))
}

export function add(...values: number[]): number {
  return sum(values)
}

export function subtract(a: number, b: number): number {
  return round(a - b)
}

export function multiply(amount: number, factor: number): number {
  return round(amount * factor)
}

/** Half a cent — the largest difference that is not a real difference. */
const TOLERANCE = 0.005

export function eq(a: number, b: number): boolean {
  return Math.abs(a - b) < TOLERANCE
}

export function gt(a: number, b: number): boolean {
  return a - b >= TOLERANCE
}

export function gte(a: number, b: number): boolean {
  return gt(a, b) || eq(a, b)
}

export function lt(a: number, b: number): boolean {
  return gt(b, a)
}

export function lte(a: number, b: number): boolean {
  return gte(b, a)
}

/**
 * Normalises whatever Prisma hands back for a numeric column into a number.
 * Prisma returns `Prisma.Decimal`; raw queries and JSON round-trips can return
 * a string; nullable columns return null.
 */
export function toNumber(value: Prisma.Decimal | number | string | null | undefined): number {
  if (value === null || value === undefined) return 0
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return value.toNumber()
}

/** Same, but preserves null instead of collapsing it to 0. */
export function toNumberOrNull(
  value: Prisma.Decimal | number | string | null | undefined
): number | null {
  if (value === null || value === undefined) return null
  return toNumber(value)
}

/** Converts a number to the Decimal type Prisma wants on write. */
export function toDecimal(value: number, dp = 2): Prisma.Decimal {
  return new Prisma.Decimal(round(value, dp).toFixed(dp))
}
