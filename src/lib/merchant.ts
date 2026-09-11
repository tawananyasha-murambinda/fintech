// Merchant identity, derived from the name alone.
//
// Kept out of the component so it is plain TypeScript: a deterministic colour
// and monogram are logic, not markup, and they need to be testable without a
// JSX transform.

// Chosen to be distinguishable side by side and legible against white text —
// not a rainbow, and no two neighbours that read as the same colour at 32px.
const PALETTE = [
  '#1e5eff', // blue
  '#0f7a5a', // green
  '#a8431f', // rust
  '#6d3bc4', // violet
  '#0b6b78', // teal
  '#9a2b5c', // plum
  '#8a6512', // ochre
  '#31527a', // slate blue
]

/** FNV-1a — small, fast, and stable across runtimes, which matters because the
 *  colour must not change between server render and client hydration. */
function hash(input: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

export function merchantColor(name: string): string {
  return PALETTE[hash(name.toLowerCase().trim()) % PALETTE.length]
}

/**
 * Up to two initials from the merchant name.
 *
 * Leading noise words are dropped so "The Coffee House" reads CH rather than
 * TC, and payment-processor prefixes ("SQ *", "PAYPAL *") are stripped because
 * they are on half of everyone's statement and identify nothing.
 */
export function merchantInitials(name: string): string {
  const cleaned = name
    .replace(/^(sq|sumup|zettle|paypal|pos|visa|mastercard)\s*\*?\s*/i, '')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .trim()

  const words = cleaned
    .split(/\s+/)
    .filter((w) => w.length > 0 && !/^(the|a|an|of|and|ltd|inc|llc|bv|gmbh)$/i.test(w))

  if (words.length === 0) return name.slice(0, 2).toUpperCase() || '?'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}
