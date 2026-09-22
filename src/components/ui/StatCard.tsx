interface StatCardProps {
  label: string
  value: string
  change?: number
  changeLabel?: string
  accent?: 'teal' | 'red' | 'amber'
  icon?: React.ReactNode
}

// A single figure.
//
// Rebuilt on the design tokens rather than hard-coded slate classes, so it
// changes with the rest of the app instead of drifting from it. The figure is
// set in the display face at the size that made the mobile balance readable —
// a dashboard of small bold numbers reads as a spreadsheet, not a summary.
export function StatCard({ label, value, change, changeLabel, accent, icon }: StatCardProps) {
  const valueColor =
    accent === 'red'
      ? 'var(--negative)'
      : accent === 'amber'
        ? 'var(--warning)'
        : 'var(--ink)'

  // For spending, down is good — so the colour follows the meaning rather than
  // the sign. A 12% fall in outgoings is not a red number.
  const improving = change !== undefined && change < 0
  const changeColor =
    change === undefined || Math.abs(change) < 0.05
      ? 'var(--ink-faint)'
      : improving
        ? 'var(--positive)'
        : 'var(--negative)'

  return (
    <div className="card card-hover p-5">
      <div className="flex items-center gap-2 mb-3">
        {icon && <span style={{ color: 'var(--ink-faint)' }}>{icon}</span>}
        <p className="text-xs font-medium" style={{ color: 'var(--ink-muted)' }}>
          {label}
        </p>
      </div>

      <p className="display-number text-[1.75rem]" style={{ color: valueColor }}>
        {value}
      </p>

      {change !== undefined && (
        <p className="text-xs font-medium mt-1.5" style={{ color: changeColor }}>
          {/* An arrow says the direction faster than a sign does, and avoids
              "+12%" reading as good news when the figure is spending. */}
          {Math.abs(change) < 0.05 ? '—' : improving ? '↓' : '↑'}{' '}
          {Math.abs(change).toFixed(1)}%{changeLabel ? ` ${changeLabel}` : ''}
        </p>
      )}
    </div>
  )
}
