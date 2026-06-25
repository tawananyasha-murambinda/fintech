'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/chat').then((r) => r.json()).then((data) => {
      setMessages(data || [])
      setHistoryLoaded(true)
    })
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMsg = input.trim()
    setInput('')
    setLoading(true)

    setMessages((prev) => [...prev, {
      id: 'temp-' + Date.now(),
      role: 'user',
      content: userMsg,
      createdAt: new Date().toISOString(),
    }])

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg }),
      })
      const data = await res.json()

      setMessages((prev) => [...prev, {
        id: 'resp-' + Date.now(),
        role: 'assistant',
        content: data.reply || 'Sorry, I could not process that request.',
        createdAt: new Date().toISOString(),
      }])
    } catch {
      setMessages((prev) => [...prev, {
        id: 'err-' + Date.now(),
        role: 'assistant',
        content: 'Sorry, something went wrong. Please try again.',
        createdAt: new Date().toISOString(),
      }])
    }

    setLoading(false)
  }

  return (
    <div className="max-w-3xl mx-auto h-[calc(100vh-8rem)] flex flex-col animate-fade-up">
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-slate-900 tracking-tight dark:text-slate-100">Financial Assistant</h1>
        <p className="text-sm text-slate-500 mt-0.5 dark:text-slate-400">
          Ask questions about your spending, get saving tips, or check if you can afford something.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1">
        {!historyLoaded ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-5 h-5 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center max-w-sm">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="mx-auto mb-4 text-slate-300">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <h2 className="text-sm font-semibold text-slate-900 mb-2 dark:text-slate-100">Start a conversation</h2>
              <p className="text-xs text-slate-500 leading-relaxed dark:text-slate-400">
                Try asking things like:<br />
                "How much did I spend on dining this month?"<br />
                "Can I afford a $500 purchase?"<br />
                "Where can I save money?"
              </p>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-xl px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-teal-700 text-white'
                  : 'bg-white border border-slate-100 text-slate-700 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300'
              }`}>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                <p className={`text-2xs mt-1.5 ${msg.role === 'user' ? 'text-teal-200' : 'text-slate-400'}`}>
                  {new Date(msg.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))
        )}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-100 dark:bg-slate-900 dark:border-slate-800 rounded-xl px-4 py-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <form onSubmit={sendMessage} className="flex gap-2 shrink-0">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your finances…"
          disabled={loading}
          className="input text-sm flex-1"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="btn-primary text-sm py-2.5 px-4 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  )
}
