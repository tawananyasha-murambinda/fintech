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

function cleanCategory(cat: string) {
  return cat.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function getInitial(name: string) {
  return name.charAt(0).toUpperCase()
}

const INIS_COLORS: Record<string, string> = {
  A: 'bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400',
  B: 'bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400',
  C: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-950 dark:text-cyan-400',
  D: 'bg-teal-100 text-teal-600 dark:bg-teal-950 dark:text-teal-400',
  E: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400',
  F: 'bg-violet-100 text-violet-600 dark:bg-violet-950 dark:text-violet-400',
  G: 'bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-400',
  H: 'bg-pink-100 text-pink-600 dark:bg-pink-950 dark:text-pink-400',
  I: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400',
  J: 'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400',
  K: 'bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400',
  L: 'bg-lime-100 text-lime-600 dark:bg-lime-950 dark:text-lime-400',
  M: 'bg-teal-100 text-teal-600 dark:bg-teal-950 dark:text-teal-400',
  N: 'bg-sky-100 text-sky-600 dark:bg-sky-950 dark:text-sky-400',
  O: 'bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400',
  P: 'bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-400',
  Q: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400',
  R: 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400',
  S: 'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400',
  T: 'bg-teal-100 text-teal-600 dark:bg-teal-950 dark:text-teal-400',
  U: 'bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400',
  V: 'bg-violet-100 text-violet-600 dark:bg-violet-950 dark:text-violet-400',
  W: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-950 dark:text-cyan-400',
  X: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  Y: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-950 dark:text-yellow-400',
  Z: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
}

export function TransactionRow({ transaction: tx }: TransactionRowProps) {
  const { format: fmt } = useCurrency()
  const name = tx.merchantName || tx.description
  const isCredit = tx.direction === 'credit'
  const amountText = isCredit ? `+${fmt(tx.amount)}` : `-${fmt(tx.amount)}`
  const initial = getInitial(name)
  const initialColor = INIS_COLORS[initial] || INIS_COLORS.X

  return (
    <div className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors group">
      <div className={`w-9 h-9 rounded-xl ${initialColor} flex items-center justify-center text-sm font-bold shrink-0 transition-transform group-hover:scale-105`}>
        {initial}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-900 truncate dark:text-slate-100">{name}</p>
        <p className="text-xs text-slate-400 truncate flex items-center gap-1">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="text-slate-300 dark:text-slate-600"><circle cx="5" cy="5" r="4" stroke="currentColor" strokeWidth="1.2"/></svg>
          {format(parseISO(tx.date), 'MMM d')}
          {tx.merchantCategory && <><span className="text-slate-300 dark:text-slate-600">·</span> {cleanCategory(tx.merchantCategory)}</>}
          {tx.status === 'pending' && <span className="ml-auto text-amber-500 dark:text-amber-400 font-medium">Pending</span>}
        </p>
      </div>
      <p className={`text-sm font-bold tabular-nums shrink-0 ${
        isCredit ? 'text-teal-600 dark:text-teal-400' : 'text-slate-900 dark:text-slate-100'
      }`}>
        {amountText}
      </p>
    </div>
  )
}
