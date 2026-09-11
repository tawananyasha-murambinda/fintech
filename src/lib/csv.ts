// CSV generation.
//
// Written by hand rather than pulled in as a dependency, because the only hard
// part is escaping and getting that wrong corrupts someone's accounts export.

/**
 * Escapes one field.
 *
 * A field containing a comma, quote or newline has to be quoted, and inner
 * quotes doubled. A leading =, +, - or @ is prefixed with a quote: spreadsheets
 * treat those as formulas, so a merchant literally named "=cmd" would execute
 * on open. This is the CSV injection that keeps turning up in expense tools.
 */
export function escapeCsvField(value: unknown): string {
  if (value === null || value === undefined) return ''

  let str = String(value)

  // A negative amount legitimately starts with "-", and quoting it would make
  // every debit import as text rather than a number — so numbers are exempt.
  // Only non-numeric values starting with a formula character are neutralised.
  const isNumeric = /^[+-]?\d+(\.\d+)?$/.test(str)
  if (!isNumeric && /^[=+\-@\t\r]/.test(str)) str = `'${str}`

  if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`
  return str
}

export function toCsv(rows: Record<string, unknown>[], columns?: string[]): string {
  if (rows.length === 0) return ''

  const headers = columns ?? Object.keys(rows[0])
  const lines = [headers.map(escapeCsvField).join(',')]

  for (const row of rows) {
    lines.push(headers.map((h) => escapeCsvField(row[h])).join(','))
  }

  // CRLF: what Excel expects, and tolerated everywhere else.
  return lines.join('\r\n')
}

/** Names a download in a way that sorts chronologically and survives any OS. */
export function exportFilename(prefix: string, now = new Date()): string {
  return `${prefix}-${now.toISOString().slice(0, 10)}.csv`
}
