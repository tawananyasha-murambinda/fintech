'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { resolveTheme, type AccountTheme } from '@/lib/accountTheme'

interface GradientHeaderProps {
  title: string
  subtitle?: string
  // Optional right-aligned action (e.g. a button/icon)
  action?: React.ReactNode
  // Optional large value shown centered under the title (e.g. a total)
  value?: string
  // Show a back chevron that returns to the previous screen
  back?: boolean
}

// Immersive gradient wash header, matching the home screen. Reads the active
// account theme from the URL (?account=) so the colour stays consistent as the
// user moves between screens.
export function GradientHeader({ title, subtitle, action, value, back }: GradientHeaderProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [tick, setTick] = useState(0)
  const accountId = searchParams.get('account')

  useEffect(() => {
    const h = () => setTick((t) => t + 1)
    window.addEventListener('acct-theme-change', h)
    return () => window.removeEventListener('acct-theme-change', h)
  }, [])

  const theme: AccountTheme = useMemo(() => resolveTheme(accountId), [accountId, tick])

  return (
    <div
      className="relative -mx-4 -mt-4 px-4 pt-4 pb-6 rounded-b-[32px] mb-5"
      style={{
        background: `radial-gradient(120% 90% at 50% -10%, ${theme.wash[0]} 0%, ${theme.wash[1]} 55%, var(--wash-base) 100%)`,
      }}
    >
      <div className="flex items-center gap-3 min-h-[36px]">
        {back && (
          <button onClick={() => router.back()} aria-label="Back"
            className="w-9 h-9 -ml-1 rounded-full flex items-center justify-center text-white press" style={{ background: theme.chip }}>
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5l-5 5 5 5" /></svg>
          </button>
        )}
        <div className="flex-1 min-w-0">
          {subtitle && <p className="text-[13px] text-white/70 truncate">{subtitle}</p>}
          <h1 className="text-xl font-semibold tracking-tight text-white truncate">{title}</h1>
        </div>
        {action}
      </div>

      {value && (
        <p className="text-center text-white text-[40px] leading-none font-semibold stat-number mt-6">{value}</p>
      )}
    </div>
  )
}
