'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { useCurrency } from '@/hooks/useCurrency'

const COLORS = ['#0d7c66', '#0f5145', '#14b891', '#2dd4aa', '#5de9c8', '#94a3b8']

interface CategoryChartProps {
  data: { category: string; total: number; percentage: number }[]
}

function cleanCategory(cat: string) {
  return cat
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export function CategoryChart({ data }: CategoryChartProps) {
  const { format: fmt } = useCurrency()

  if (!data.length) {
    return <div className="text-sm text-slate-400 dark:text-slate-500 py-8 text-center">No spending data</div>
  }

  return (
    <div>
      <div className="h-36 mb-4">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={64}
              paddingAngle={2}
              dataKey="total"
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} strokeWidth={0} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v: number) => [fmt(v), '']}
              labelFormatter={(label) => cleanCategory(String(label))}
              contentStyle={{
                fontSize: 12,
                border: '1px solid #f1f5f9',
                borderRadius: 8,
                boxShadow: 'none',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-2.5">
        {data.map((item, i) => (
          <div key={item.category} className="flex items-center gap-2.5">
            <span
              className="w-2 h-2 rounded-sm shrink-0"
              style={{ background: COLORS[i % COLORS.length] }}
            />
            <span className="text-xs text-slate-600 flex-1 truncate dark:text-slate-300">
              {cleanCategory(item.category)}
            </span>
            <span className="text-xs tabular-nums text-slate-900 font-medium dark:text-slate-100">
              {fmt(item.total)}
            </span>
            <span className="text-2xs text-slate-400 tabular-nums w-10 text-right dark:text-slate-500">
              {item.percentage.toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
