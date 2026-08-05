import Link from 'next/link'

interface EmptyStateProps {
  title: string
  description: string
  icon?: React.ReactNode
  action?: { href: string; label: string }
  onAction?: () => void
}

export function EmptyState({ title, description, icon, action, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      {icon && (
        <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-950 flex items-center justify-center text-slate-400 mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
      <p className="text-sm text-slate-500 mt-1.5 max-w-sm leading-relaxed dark:text-slate-400">{description}</p>
      {action &&
        (onAction ? (
          <button onClick={onAction} className="btn-primary text-xs mt-5">
            {action.label}
          </button>
        ) : (
          <Link href={action.href} className="btn-primary text-xs mt-5">
            {action.label}
          </Link>
        ))}
    </div>
  )
}
