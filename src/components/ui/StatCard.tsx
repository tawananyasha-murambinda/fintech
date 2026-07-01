interface StatCardProps {
  label: string
  value: string
  change?: number
  changeLabel?: string
  accent?: 'teal' | 'red' | 'amber'
  icon?: React.ReactNode
}

const ACCENT_TEXT = {
  teal: 'text-teal-600 dark:text-teal-400',
  red: 'text-red-500 dark:text-red-400',
  amber: 'text-amber-600 dark:text-amber-400',
}

const ACCENT_BG = {
  teal: 'bg-teal-100 dark:bg-teal-950',
  red: 'bg-red-100 dark:bg-red-950',
  amber: 'bg-amber-100 dark:bg-amber-950',
}

export function StatCard({ label, value, change, changeLabel, accent, icon }: StatCardProps) {
  const textClass = accent ? ACCENT_TEXT[accent] : 'text-slate-900 dark:text-slate-100'
  const bgClass = accent ? ACCENT_BG[accent] : 'bg-slate-100 dark:bg-slate-800'

  return (
    <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-1.5 press-spring">
      <div className="flex items-center gap-2">
        {icon && <div className={`w-7 h-7 rounded-lg ${bgClass} flex items-center justify-center`}>{icon}</div>}
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide dark:text-slate-500">{label}</p>
      </div>
      <p className={`text-2xl font-bold stat-number tracking-tight ${textClass}`}>
        {value}
      </p>
      {change !== undefined && (
        <p className={`text-xs font-medium ${change < 0 ? 'text-teal-600 dark:text-teal-400' : change > 0 ? 'text-slate-500 dark:text-slate-400' : 'text-slate-400 dark:text-slate-500'}`}>
          <span className={`inline-block mr-1 ${change < 0 ? '' : change > 0 ? 'text-rose-500' : ''}`}>
            {change > 0 ? '↑' : change < 0 ? '↓' : '→'}
          </span>
          {change > 0 ? '+' : ''}{change.toFixed(1)}% {changeLabel}
        </p>
      )}
    </div>
  )
}
