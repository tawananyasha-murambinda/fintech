'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

// Catches render errors that escape every other boundary. Because it replaces
// the root layout, it has to render its own <html> and cannot use any of the
// app's providers or styles.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="en">
      <body
        style={{
          fontFamily: 'system-ui, sans-serif',
          display: 'flex',
          minHeight: '100vh',
          alignItems: 'center',
          justifyContent: 'center',
          margin: 0,
          padding: '24px',
          background: '#f8fafc',
          color: '#0f172a',
        }}
      >
        <main style={{ maxWidth: '420px', textAlign: 'center' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px' }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.6, marginBottom: '24px' }}>
            The error has been reported. Your financial data has not been affected — try again, or
            reload the page.
          </p>
          <button
            onClick={reset}
            style={{
              background: '#0d9488',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  )
}
