import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { ConsentBanner } from '@/components/ConsentBanner'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: { default: 'FinTrack', template: '%s — FinTrack' },
  description: 'Personal finance made simple. Linked accounts, clear spending, smarter budgets.',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'FinTrack' },
  icons: {
    icon: [{ url: '/icon-192.png', sizes: '192x192', type: 'image/png' }, { url: '/icon-512.png', sizes: '512x512', type: 'image/png' }],
    apple: '/icon-192.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} dark`} suppressHydrationWarning>
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
