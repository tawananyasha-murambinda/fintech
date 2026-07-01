interface SettingsCardProps {
  title: string
  description?: string
  children: React.ReactNode
  danger?: boolean
}

export function SettingsCard({ title, description, children, danger }: SettingsCardProps) {
  return (
    <div className={`rounded-2xl border ${danger ? 'border-red-100 dark:border-red-900/40' : 'border-slate-100 dark:border-slate-800'} bg-white dark:bg-slate-900 p-6 space-y-5`}>
      <div>
        <h2 className={`text-sm font-semibold ${danger ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-slate-100'}`}>{title}</h2>
        {description && <p className="text-xs text-slate-500 mt-0.5 leading-relaxed dark:text-slate-400">{description}</p>}
      </div>
      {children}
    </div>
  )
}

interface SettingsRowProps {
  label: string
  description?: string
  children: React.ReactNode
}

export function SettingsRow({ label, description, children }: SettingsRowProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-4 border-t border-slate-100 first:border-t-0 first:pt-0 last:pb-0 dark:border-slate-800">
      <div className="space-y-0.5">
        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{label}</p>
        {description && <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>}
      </div>
      <div className="sm:text-right shrink-0">{children}</div>
    </div>
  )
}
