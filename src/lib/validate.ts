// Parse an optional date string into a Date, returning null instead of
// throwing a RangeError on invalid input.
export function safeDate(raw: string | null | undefined): Date | null {
  if (!raw) return null
  const d = new Date(raw)
  return Number.isNaN(d.getTime()) ? null : d
}

// Coerce a number-or-string into a finite number, or null when invalid.
export function toFiniteNumber(raw: unknown): number | null {
  const n = typeof raw === 'number' ? raw : parseFloat(String(raw))
  return Number.isFinite(n) ? n : null
}
