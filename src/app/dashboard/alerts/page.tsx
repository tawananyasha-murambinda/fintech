'use client'

import { useState, useEffect } from 'react'
import type { Alert } from '@/types'

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-900/40',
  warning: 'bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-900/40',
  info: 'bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-900/40',
}

const SEVERITY_DOTS: Record<string, string> = {
  critical: 'bg-red-500',
  warning: 'bg-amber-500',
  info: 'bg-blue-500',
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/alerts').then(r => r.json()).then(d => {
      setAlerts(d)
      setLoading(false)
    })
  }, [])

  const markRead = async (id?: string) => {
    await fetch('/api/alerts', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, read: true }),
    })
    setAlerts(prev => id ? prev.map(a => a.id === id ? { ...a, read: true } : a) : prev.map(a => ({ ...a, read: true })))
  }

  const unread = alerts.filter(a => !a.read).length

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-xl bg-rose-100 dark:bg-rose-950 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-rose-600 dark:text-rose-400">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M13.73 21a2 2 0 01-3.46 0" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Spending Alerts</h1>
            <p className="text-sm text-slate-500 mt-0.5 dark:text-slate-400">
              Notifications about overspending, price changes, and unusual charges.
            </p>
          </div>
        </div>
        {unread > 0 && (
          <button onClick={() => markRead()} className="btn-secondary text-xs py-1.5 px-3">
            Mark all read ({unread})
          </button>
        )}
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-16 text-center">
          <div className="w-10 h-10 border-[3px] border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : alerts.length === 0 ? (
        <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-900 dark:bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-white dark:text-slate-900">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M13.73 21a2 2 0 01-3.46 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <h2 className="text-base font-semibold text-slate-900 mb-1 dark:text-slate-100">All clear</h2>
          <p className="text-sm text-slate-500 max-w-sm mx-auto dark:text-slate-400">
            You'll see alerts here when you overspend a budget, get charged more than usual, or when duplicate charges are detected.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {alerts.map(alert => (
            <div key={alert.id} className={`rounded-2xl border ${SEVERITY_COLORS[alert.severity] || 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900'} p-4 ${!alert.read ? 'ring-1 ring-teal-400' : ''}`}>
              <div className="flex items-start gap-3">
                <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${SEVERITY_DOTS[alert.severity] || 'bg-slate-400'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{alert.title}</p>
                    <span className={`text-2xs px-1.5 py-0.5 rounded font-medium ${
                      alert.severity === 'critical' ? 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-300' :
                      alert.severity === 'warning' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900 dark:text-amber-300' :
                      'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300'
                    }`}>{alert.severity}</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">{alert.message}</p>
                  <p className="text-2xs text-slate-400 mt-1">{new Date(alert.createdAt).toLocaleString()}</p>
                </div>
                {!alert.read && (
                  <button onClick={() => markRead(alert.id)} className="text-xs text-teal-700 hover:underline shrink-0 dark:text-teal-400">
                    Dismiss
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
