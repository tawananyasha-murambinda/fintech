// PII redaction helpers used before user content is sent to AI providers.
// Keeps the model useful while preventing personal data from leaving the
// server. Replacements preserve approximate length so wording stays natural.

const REDACTIONS: { pattern: RegExp; replacement: string }[] = [
  // Email addresses
  { pattern: /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/gi, replacement: '[email redacted]' },
  // US SSN — must run before the phone pattern, whose greedy
  // country-code prefix would otherwise swallow `123-45-6789`.
  { pattern: /\b\d{3}-\d{2}-\d{4}\b/g, replacement: '[ssn redacted]' },
  // IBAN / account-like codes: 2 letters + 2 check digits + alphanumerics.
  // Must run before the card pattern, which would otherwise match the
  // digit groups in the middle of an IBAN.
  { pattern: /\b[A-Z]{2}\d{2}(\s?[A-Z0-9]){11,30}\b/g, replacement: '[account redacted]' },
  // Bank card numbers (13-19 digits, optionally spaced) — must run before
  // the phone pattern, whose optional country-code prefix would otherwise
  // swallow the leading digits of a contiguous card number.
  { pattern: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{2,7}\b/g, replacement: '[card redacted]' },
  // Phone numbers (incl. international prefixes and common separators)
  { pattern: /\b(\+?\d{1,3}[\s\-().]*)?(\d[\s\-().]*){7,14}\b/g, replacement: '[phone redacted]' },
  // BIC / SWIFT codes
  { pattern: /\b[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?\b/g, replacement: '[bic redacted]' },
]

export function redactPII(input: string): string {
  if (!input) return input
  let out = input
  for (const { pattern, replacement } of REDACTIONS) {
    out = out.replace(pattern, replacement)
  }
  return out
}

export function redactTransactions<T extends { description?: string | null; merchantName?: string | null }>(items: T[]): T[] {
  return items.map((t) => ({
    ...t,
    description: t.description ? redactPII(t.description) : t.description,
    merchantName: t.merchantName ? redactPII(t.merchantName) : t.merchantName,
  }))
}

export function redactHistory<T extends { role: string; content: string }>(history: T[]): T[] {
  return history.map((m) => ({ ...m, content: redactPII(m.content) }))
}
