'use client'

import { useState } from 'react'
import { SettingsCard } from './SettingsCard'

const CATEGORIES = ['bug', 'feature', 'feedback', 'support'] as const

export function SupportSection() {
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('feedback')
  const [message, setMessage] = useState('')
  const [rating, setRating] = useState(0)
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (message.trim().length < 10) {
      setResult({ ok: false, text: 'Please include a few more details (at least 10 characters).' })
      return
    }
    setSending(true)
    setResult(null)
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, message: message.trim(), rating: rating || undefined }),
      })
      const data = await res.json().catch(() => ({}))
      setResult({
        ok: res.ok,
        text: data.error || data.message || (res.ok ? 'Thanks for your feedback!' : 'Could not send.'),
      })
      if (res.ok) {
        setMessage('')
        setRating(0)
        setCategory('feedback')
      }
    } catch {
      setResult({ ok: false, text: 'Could not send. Please try again.' })
    } finally {
      setSending(false)
    }
  }

  return (
    <SettingsCard
      title="Support & Feedback"
      description="Report a bug, request a feature, or send feedback directly to the team."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="feedback-category" className="block text-sm font-medium text-slate-900 dark:text-slate-100">
            Category
          </label>
          <div className="flex flex-wrap gap-2 mt-2">
            {CATEGORIES.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                aria-pressed={category === c}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors capitalize ${
                  category === c
                    ? 'bg-teal-600 border-teal-600 text-white'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="feedback-message" className="block text-sm font-medium text-slate-900 dark:text-slate-100">
            Message
          </label>
          <textarea
            id="feedback-message"
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={4}
            placeholder="What happened, what did you expect, and what browser are you using?"
            className="input mt-2 resize-none"
          />
        </div>

        <div>
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">How is your experience?</p>
          <div className="flex gap-1.5 mt-2" role="radiogroup" aria-label="Rating">
            {[1, 2, 3, 4, 5].map(n => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={rating === n}
                onClick={() => setRating(rating === n ? 0 : n)}
                className={`w-8 h-8 rounded-lg text-sm transition-colors ${
                  rating >= n
                    ? 'bg-teal-600 text-white'
                    : 'border border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {result && (
          <p
            className={`text-sm px-4 py-3 rounded-lg ${
              result.ok
                ? 'bg-teal-50 text-teal-700 border border-teal-100 dark:bg-teal-950 dark:text-teal-300 dark:border-teal-900/40'
                : 'bg-red-50 text-red-600 border border-red-100 dark:bg-red-950 dark:text-red-300 dark:border-red-900/40'
            }`}
          >
            {result.text}
          </p>
        )}

        <div className="flex justify-end">
          <button type="submit" disabled={sending} className="btn-primary text-xs disabled:opacity-50">
            {sending ? 'Sending…' : 'Send feedback'}
          </button>
        </div>
      </form>
    </SettingsCard>
  )
}
