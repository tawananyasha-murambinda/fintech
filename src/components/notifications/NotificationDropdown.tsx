'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

interface Notification {
  id: string
  title: string
  body: string
  type: string
  read: boolean
  createdAt: string
}

const TYPE_ICONS: Record<string, string> = {
  bill_reminder: 'M8 2v4M16 2v4M3 10h18M5 14h2M11 14h2M17 14h2M5 18h2M11 18h2M17 18h2M3 6h18v14H3z',
  alert: 'M12 9v4M12 17h.01M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9',
  goal: 'M9 12l2 2 4-4M7.86 2h8.28L22 5.86v8.28L16.14 20H7.86L2 14.14V5.86L7.86 2',
  report: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8',
  system: 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 6v6l4 2',
}

export function NotificationDropdown() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/notifications').then(r => r.json()).then(data => {
      setNotifications(data)
      setUnreadCount(data.filter((n: Notification) => !n.read).length)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!open) return
    fetch('/api/notifications').then(r => r.json()).then(data => {
      setNotifications(data)
      setUnreadCount(data.filter((n: Notification) => !n.read).length)
    }).catch(() => {})
  }, [open])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  async function markRead(id: string) {
    await fetch('/api/notifications', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, read: true }),
    })
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  async function markAllRead() {
    await fetch('/api/notifications', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ read: true }),
    })
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnreadCount(0)
  }

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'now'
    if (mins < 60) return `${mins}m`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h`
    const days = Math.floor(hours / 24)
    return `${days}d`
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative text-slate-400 hover:text-slate-600 transition-colors dark:hover:text-slate-300"
        aria-label="Notifications"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 01-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white text-2xs rounded-full flex items-center justify-center font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden z-50 dark:bg-slate-900 dark:border-slate-800">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-2xs text-teal-700 hover:underline dark:text-teal-400">
                  Mark all read
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-3 text-slate-300 dark:text-slate-600">
                  <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 01-3.46 0" />
                </svg>
                <p className="text-sm text-slate-500 dark:text-slate-400">No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50 dark:divide-slate-800/50">
                {notifications.map(n => (
                  <div
                    key={n.id}
                    className={`px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer dark:hover:bg-slate-800/50 ${!n.read ? 'bg-teal-50/40 dark:bg-teal-950/20' : ''}`}
                    onClick={() => markRead(n.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        n.type === 'alert' ? 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400' :
                        n.type === 'goal' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400' :
                        n.type === 'bill_reminder' ? 'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400' :
                        'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d={TYPE_ICONS[n.type] || TYPE_ICONS.system} />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-xs ${!n.read ? 'font-semibold' : 'font-medium'} text-slate-900 dark:text-slate-100`}>
                            {n.title}
                          </p>
                          <span className="text-2xs text-slate-400 whitespace-nowrap shrink-0">{timeAgo(n.createdAt)}</span>
                        </div>
                        {n.body && (
                          <p className="text-2xs text-slate-500 mt-0.5 line-clamp-2 dark:text-slate-400">{n.body}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Link
            href="/dashboard/alerts"
            className="block px-4 py-2.5 text-2xs text-center text-teal-700 hover:bg-slate-50 border-t border-slate-100 font-medium dark:text-teal-400 dark:hover:bg-slate-800 dark:border-slate-800"
            onClick={() => setOpen(false)}
          >
            View all alerts
          </Link>
        </div>
      )}
    </div>
  )
}
