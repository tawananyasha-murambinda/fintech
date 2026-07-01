'use client'

import { useState } from 'react'

interface DisclosureProps {
  // The always-visible summary line.
  title: React.ReactNode
  // Optional short value shown on the right of the summary (e.g. an amount).
  value?: React.ReactNode
  // Hidden detail, revealed on tap.
  children: React.ReactNode
  defaultOpen?: boolean
  className?: string
}

// A plain, tappable row that expands to reveal detail. Keeps dense pages calm:
// the front shows one line, the depth is one tap away.
export function Disclosure({ title, value, children, defaultOpen = false, className }: DisclosureProps) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className={`rounded-2xl bg-white dark:bg-[#15181f] border border-slate-200/70 dark:border-white/5 ${className || ''}`}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left press"
        aria-expanded={open}
      >
        <span className="flex-1 min-w-0 text-[15px] font-medium text-slate-900 dark:text-slate-100">{title}</span>
        {value != null && (
          <span className="text-sm font-semibold tabular-nums text-slate-700 dark:text-slate-300 whitespace-nowrap">{value}</span>
        )}
        <svg
          width="16" height="16" viewBox="0 0 16 16" fill="none"
          className={`text-slate-400 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        >
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className="px-4 pb-4 pt-0 text-sm text-slate-600 dark:text-slate-400 leading-relaxed animate-fade-in">
          {children}
        </div>
      )}
    </div>
  )
}
