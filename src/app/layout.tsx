import type { Metadata } from 'next'
import { Manrope, Bricolage_Grotesque, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { ConsentBanner } from '@/components/ConsentBanner'

// Typography.
//
// Manrope for the interface: a geometric grotesque with genuinely distinctive
// letterforms (the single-storey 'a', the open 'g') that still holds up at
// 11px, and — the part that matters for a finance app — proper tabular figures
// so columns of money line up instead of shimmering as digits change.
const sans = Manrope({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
})

// Bricolage Grotesque for display only — page titles, the wordmark, headline
// figures. It has real character, which is exactly why it is rationed: used
// everywhere it would be exhausting, used on one line per screen it gives the
// product a voice.
const display = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  weight: ['500', '600', '700'],
})

// For account numbers, reference codes and anything the user might read aloud
// or copy — the places where 0/O and 1/l have to be unmistakable.
const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
  weight: ['400', '500'],
})

export const metadata: Metadata = {
  title: { default: 'FinTrack', template: '%s — FinTrack' },
  description: 'Personal finance made simple. Linked accounts, clear spending, smarter budgets.',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'FinTrack' },
  icons: {
    icon: [
      { url: '/logo-mark.svg', type: 'image/svg+xml' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/icon-192.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${display.variable} ${mono.variable} dark`}
      suppressHydrationWarning
    >
      <head />
      <body className="bg-slate-925 text-slate-100 antialiased transition-colors" style={{ backgroundColor: '#0f172a' }}>
        <a
          href="#main"
          className="skip-link sr-only focus:not-sr-only focus:fixed focus:top-0 focus:left-0 focus:z-[100] focus:bg-teal-600 focus:text-white focus:px-4 focus:py-2 focus:text-sm"
        >
          Skip to content
        </a>
        <ThemeProvider>
          <Providers>{children}</Providers>
        </ThemeProvider>
        <ConsentBanner />
      </body>
    </html>
  )
}
