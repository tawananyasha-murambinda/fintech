import { format, parseISO } from 'date-fns'
import { useCurrency } from '@/hooks/useCurrency'

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
    currency?: string | null
  }
}

function cleanCategory(cat: string) {
  return cat.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function getInitial(name: string) {
  return (name.trim().charAt(0) || '?').toUpperCase()
}

// Muted, consistent avatar tones — no rainbow, no emoji.
const TONES = [
  'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
  'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300',
  'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
  'bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300',
  'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
]

function toneFor(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return TONES[h % TONES.length]
}

export function TransactionRow({ transaction: tx }: TransactionRowProps) {
  const { convertFormat } = useCurrency()
  const name = tx.merchantName || tx.description
  const isCredit = tx.direction === 'credit'
  const amountText = isCredit ? `+${convertFormat(tx.amount, tx.currency)}` : `-${convertFormat(tx.amount, tx.currency)}`
  const initial = getInitial(name)

  return (
    <div className="flex items-center gap-3 py-3 px-1 group">
      <div className={`w-11 h-11 rounded-full ${toneFor(name)} flex items-center justify-center text-sm font-semibold shrink-0`}>
        {initial}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-medium text-slate-900 truncate dark:text-slate-100">{name}</p>
        <p className="text-[13px] text-slate-400 dark:text-slate-500 truncate">
          {tx.merchantCategory ? cleanCategory(tx.merchantCategory) : 'Payment'}
          <span className="mx-1.5 text-slate-300 dark:text-slate-600">·</span>
          {format(parseISO(tx.date), 'MMM d')}
          {tx.status === 'pending' && (
            <span className="ml-2 badge-pending">Pending</span>
          )}
        </p>
      </div>
      <p className={`text-[15px] font-semibold tabular-nums shrink-0 ${
        isCredit ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-slate-100'
      }`}>
        {amountText}
      </p>
    </div>
  )
}
