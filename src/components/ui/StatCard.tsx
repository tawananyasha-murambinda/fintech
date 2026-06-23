interface StatCardProps {
  label: string
  value: string
  change?: number
  changeLabel?: string
  accent?: 'teal' | 'red' | 'amber'
}

const ACCENT_COLORS = {
  teal: 'text-teal-700',
  red: 'text-red-500',
  amber: 'text-amber-600',
}

export function StatCard({ label, value, change, changeLabel, accent }: StatCardProps) {
  const accentClass = accent ? ACCENT_COLORS[accent] : 'text-slate-900'

  return (
    <div className="card p-4 space-y-1">
      <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-semibold stat-number tracking-tight ${accentClass}`}>
        {value}
      </p>
      {change !== undefined && (
        <p className={`text-xs ${change < 0 ? 'text-teal-600' : change > 0 ? 'text-slate-500' : 'text-slate-400'}`}>
          {change > 0 ? '+' : ''}{change.toFixed(1)}% {changeLabel}
        </p>
      )}
    </div>
  )
}
