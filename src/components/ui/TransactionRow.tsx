import { format, parseISO } from 'date-fns'

interface TransactionRowProps {
  transaction: {
    id: string
    date: string
    amount: number
    direction: 'credit' | 'debit'
    description: string
    merchantName?: string | null
    merchantCategory?: string | null
    status: 'posted' | 'pending'
  }
}

const CATEGORY_ICONS: Record<string, string> = {
  food_and_drink: '🍽',
  groceries: '🛒',
  transportation: '🚗',
  entertainment: '🎬',
  shopping: '🛍',
  health: '💊',
  utilities: '⚡',
  travel: '✈',
}

function fmt(amount: number, direction: 'credit' | 'debit') {
  const abs = Math.abs(amount)
  const n = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(abs)
  return direction === 'credit' ? `+${n}` : `-${n}`
}

function cleanCategory(cat: string) {
  return cat.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function getInitial(name: string) {
  return name.charAt(0).toUpperCase()
}

export function TransactionRow({ transaction: tx }: TransactionRowProps) {
  const name = tx.merchantName || tx.description
  const isCredit = tx.direction === 'credit'

  return (
    <div className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-slate-50 transition-colors group">
      {/* Avatar */}
      <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center text-xs font-semibold shrink-0 group-hover:bg-slate-200 transition-colors">
        {getInitial(name)}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-900 font-medium truncate">{name}</p>
        <p className="text-xs text-slate-400 truncate">
          {format(parseISO(tx.date), 'MMM d')}
          {tx.merchantCategory && ` · ${cleanCategory(tx.merchantCategory)}`}
          {tx.status === 'pending' && <span className="ml-1 text-amber-500">· Pending</span>}
        </p>
      </div>

      {/* Amount */}
      <p
        className={`text-sm font-medium tabular-nums shrink-0 ${
          isCredit ? 'text-teal-700' : 'text-slate-900'
        }`}
      >
        {fmt(tx.amount, tx.direction)}
      </p>
    </div>
  )
}
