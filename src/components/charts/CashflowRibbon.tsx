'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { format, parseISO } from 'date-fns'
import type { CashflowPoint } from '@/types'

const DEMO_DATA: CashflowPoint[] = Array.from({ length: 30 }, (_, i) => {
  const d = new Date(Date.now() - (29 - i) * 86400000)
  return {
    date: d.toISOString().split('T')[0],
    income: Math.random() > 0.8 ? 800 + Math.random() * 2000 : 0,
    expenses: 40 + Math.random() * 200,
    net: 0,
  }
}).map((d) => ({ ...d, net: d.income - d.expenses }))

interface CashflowRibbonProps {
  data?: CashflowPoint[]
  demo?: boolean
}

function fmt(v: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(v)
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-100 rounded-lg p-3 shadow-sm text-xs">
      <p className="text-slate-500 mb-2">{format(parseISO(label), 'MMM d')}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-slate-600 capitalize">{p.name}:</span>
          <span className="font-medium text-slate-900 tabular-nums">{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

export function CashflowRibbon({ data, demo }: CashflowRibbonProps) {
  const chartData = data && data.length > 0 ? data : demo ? DEMO_DATA : []

  if (!chartData.length) {
    return (
      <div className="h-48 flex items-center justify-center text-sm text-slate-400">
        No data for this period
      </div>
    )
  }

  return (
    <div className="h-52 cashflow-ribbon">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0d7c66" stopOpacity={0.12} />
              <stop offset="100%" stopColor="#0d7c66" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#94a3b8" stopOpacity={0.1} />
              <stop offset="100%" stopColor="#94a3b8" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="#f1f5f9" strokeDasharray="0" />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            tickFormatter={(v) => format(parseISO(v), 'MMM d')}
            interval="preserveStartEnd"
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="income"
            name="Income"
            stroke="#0d7c66"
            strokeWidth={1.5}
            fill="url(#incomeGrad)"
            dot={false}
            activeDot={{ r: 3, fill: '#0d7c66' }}
          />
          <Area
            type="monotone"
            dataKey="expenses"
            name="Expenses"
            stroke="#cbd5e1"
            strokeWidth={1.5}
            fill="url(#expenseGrad)"
            dot={false}
            activeDot={{ r: 3, fill: '#94a3b8' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
