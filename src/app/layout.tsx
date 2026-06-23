import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: { default: 'FinTrack', template: '%s — FinTrack' },
  description: 'Intelligent personal finance. Linked accounts, AI-powered analysis, smarter spending.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-white text-slate-900 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
