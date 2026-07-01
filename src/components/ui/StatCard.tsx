interface StatCardProps {
  label: string
  value: string
  change?: number
  changeLabel?: string
  accent?: 'teal' | 'red' | 'amber'
  icon?: React.ReactNode
}

export function StatCard({ label, value, change, changeLabel, accent, icon }: StatCardProps) {
  const valueClass =
    accent === 'red'
      ? 'text-rose-600 dark:text-rose-400'
      : accent === 'amber'
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-slate-900 dark:text-slate-100'

  // For a bank, lower spend = good. Keep the semantics but drop arrow glyphs.
  const positive = change !== undefined && change < 0
  const changeClass = positive
    ? 'text-emerald-600 dark:text-emerald-400'
    : change && change > 0
    ? 'text-rose-500 dark:text-rose-400'
    : 'text-slate-400 dark:text-slate-500'

  return (
    <div className="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
      <div className="flex items-center gap-2 mb-2">
        {icon && (
          <span className="text-slate-400 dark:text-slate-500">{icon}</span>
        )}
        <p className="text-[13px] font-medium text-slate-500 dark:text-slate-400">{label}</p>
      </div>
      <p className={`text-2xl font-semibold stat-number ${valueClass}`}>{value}</p>
      {change !== undefined && (
        <p className={`text-[13px] font-medium mt-1 ${changeClass}`}>
          {change > 0 ? '+' : ''}{change.toFixed(1)}%{changeLabel ? ` ${changeLabel}` : ''}
        </p>
      )}
    </div>
  )
}
