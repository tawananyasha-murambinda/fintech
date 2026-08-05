// Safe parsing of query-string pagination values. Guards against NaN,
// negative, zero, and absurdly large values that would otherwise surface as
// Prisma errors (500) or unbounded queries.
export function parseLimit(raw: string | null, def = 20, max = 100): number {
  const n = Number(raw)
  if (!Number.isFinite(n) || n <= 0) return def
  return Math.min(Math.floor(n), max)
}

export function parsePage(raw: string | null, def = 1): number {
  const n = Number(raw)
  if (!Number.isFinite(n) || n < 1) return def
  return Math.floor(n)
}
