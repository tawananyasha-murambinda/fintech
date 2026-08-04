// Per-account color themes. Drives the immersive header on the home screen and
// can tint accents app-wide.
//
// The palette is built around FinTrack's own brand: a cyan-to-violet signature
// gradient (matching the FinTrack mark) over deep navy surfaces. Each theme is
// a distinct FinTrack identity, not an imitation of any other fintech brand.

export interface AccountTheme {
  key: string
  name: string
  // Solid accent used for buttons, active states, highlights.
  accent: string
  // The two stops of the top-of-screen header gradient (bright -> deep).
  wash: [string, string]
  // Two colours used for the animated aurora glows that sit behind the header.
  glow: [string, string]
  // A slightly translucent tint for chips/pills sitting on the header.
  chip: string
}

export const ACCOUNT_THEMES: AccountTheme[] = [
  {
    key: 'aurora',
    name: 'Aurora',
    accent: '#00c9f2',
    wash: ['#00d4ff', '#2a1568'],
    glow: ['#00d4ff', '#7c3aed'],
    chip: 'rgba(255,255,255,0.16)',
  },
  {
    key: 'indigo',
    name: 'Indigo',
    accent: '#8b7cff',
    wash: ['#8f7bff', '#1c1140'],
    glow: ['#a78bfa', '#7c3aed'],
    chip: 'rgba(255,255,255,0.16)',
  },
  {
    key: 'ocean',
    name: 'Ocean',
    accent: '#1e5eff',
    wash: ['#2f6dff', '#0b1d45'],
    glow: ['#38bdf8', '#1e5eff'],
    chip: 'rgba(255,255,255,0.16)',
  },
  {
    key: 'forest',
    name: 'Forest',
    accent: '#10b981',
    wash: ['#1fc99a', '#0a3328'],
    glow: ['#34d399', '#0d9276'],
    chip: 'rgba(255,255,255,0.16)',
  },
  {
    key: 'ember',
    name: 'Ember',
    accent: '#ff6b4a',
    wash: ['#ff8a5c', '#40140c'],
    glow: ['#ffb38a', '#ff3d5a'],
    chip: 'rgba(255,255,255,0.16)',
  },
  {
    key: 'graphite',
    name: 'Graphite',
    accent: '#94a3b8',
    wash: ['#4b5563', '#0f1318'],
    glow: ['#6b7280', '#1f2937'],
    chip: 'rgba(255,255,255,0.14)',
  },
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
