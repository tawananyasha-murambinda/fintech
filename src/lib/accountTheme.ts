// Per-account color themes — drives the immersive gradient wash on the home
// screen and can tint accents app-wide. Dark-first, with values that also read
// well on a light background.

export interface AccountTheme {
  key: string
  name: string
  // Solid accent used for buttons, active states, highlights.
  accent: string
  // The two stops of the top-of-screen gradient wash (bright -> deep).
  wash: [string, string]
  // A slightly translucent tint for chips/pills sitting on the wash.
  chip: string
}

export const ACCOUNT_THEMES: AccountTheme[] = [
  { key: 'violet', name: 'Violet', accent: '#7c5cff', wash: ['#8b5cf6', '#2a1a5e'], chip: 'rgba(255,255,255,0.14)' },
  { key: 'blue',   name: 'Blue',   accent: '#1e5eff', wash: ['#3b6fff', '#101a44'], chip: 'rgba(255,255,255,0.14)' },
  { key: 'teal',   name: 'Teal',   accent: '#10b981', wash: ['#14b8a6', '#0c3b34'], chip: 'rgba(255,255,255,0.14)' },
  { key: 'coral',  name: 'Coral',  accent: '#ff6b57', wash: ['#ff7a66', '#4a1d17'], chip: 'rgba(255,255,255,0.14)' },
  { key: 'amber',  name: 'Amber',  accent: '#f59e0b', wash: ['#fbbf24', '#4a2f08'], chip: 'rgba(255,255,255,0.14)' },
  { key: 'slate',  name: 'Graphite', accent: '#64748b', wash: ['#64748b', '#161a22'], chip: 'rgba(255,255,255,0.12)' },
]

export const DEFAULT_THEME = ACCOUNT_THEMES[0]

// Deterministically pick a theme for an account id/name so each account keeps a
// stable color, even before the user customizes it.
export function themeForAccount(seed: string | null | undefined): AccountTheme {
  if (!seed) return DEFAULT_THEME
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return ACCOUNT_THEMES[h % ACCOUNT_THEMES.length]
}

export function themeByKey(key: string | null | undefined): AccountTheme {
  return ACCOUNT_THEMES.find((t) => t.key === key) || DEFAULT_THEME
}

// A saved per-account override, stored client-side.
export function getAccountThemeKey(accountId: string | null): string | null {
  if (typeof window === 'undefined') return null
  const id = accountId || 'all'
  return localStorage.getItem(`acct-theme:${id}`)
}

export function setAccountThemeKey(accountId: string | null, key: string) {
  if (typeof window === 'undefined') return
  const id = accountId || 'all'
  localStorage.setItem(`acct-theme:${id}`, key)
  window.dispatchEvent(new Event('acct-theme-change'))
}

export function resolveTheme(accountId: string | null, seed?: string | null): AccountTheme {
  const saved = getAccountThemeKey(accountId)
  if (saved) return themeByKey(saved)
  return themeForAccount(seed ?? accountId)
}
