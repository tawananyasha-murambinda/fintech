'use client'

import { useState } from 'react'
import { useCurrency } from '@/hooks/useCurrency'

const CARDS = [
  { name: 'Chase Sapphire Preferred', type: 'travel', rewards: '3x dining, 2x travel, 1x other', bonus: '60k pts' },
  { name: 'Citi Double Cash', type: 'cashback', rewards: '2% everything (1% + 1%)', bonus: '$200' },
  { name: 'Amex Gold', type: 'dining', rewards: '4x dining, 4x groceries, 3x flights', bonus: '60k MR' },
  { name: 'Capital One Venture X', type: 'travel', rewards: '10x hotels, 5x flights, 2x other', bonus: '75k miles' },
  { name: 'Discover It', type: 'rotating', rewards: '5% rotating categories, 1% other', bonus: 'Cashback match' },
  { name: 'BofA Customized Cash', type: 'cashback', rewards: '3% category of choice, 2% groceries', bonus: '$200' },
  { name: 'Apple Card', type: 'cashback', rewards: '3% Apple, 2% Apple Pay, 1% physical', bonus: 'None' },
  { name: 'Amazon Prime Visa', type: 'shopping', rewards: '5% Amazon, 2% dining/gas, 1% other', bonus: '$200' },
]

const RECOMMENDATIONS: Record<string, { card: string; reason: string }[]> = {
  'Food & Dining': [
    { card: 'Amex Gold', reason: '4x points on dining, best in category' },
    { card: 'Chase Sapphire Preferred', reason: '3x points on dining with transferable UR' },
  ],
  'Groceries': [
    { card: 'Amex Gold', reason: '4x points at US supermarkets up to $25k/yr' },
    { card: 'BofA Customized Cash', reason: '3% cash back if set as category' },
  ],
  'Travel': [
    { card: 'Capital One Venture X', reason: '10x hotels, 5x flights, $300 credit' },
    { card: 'Chase Sapphire Preferred', reason: '2x travel, great transfer partners' },
  ],
  'Shopping': [
    { card: 'Amazon Prime Visa', reason: '5% back at Amazon/Whole Foods' },
    { card: 'Citi Double Cash', reason: '2% on everything, simple and effective' },
  ],
  'Transportation': [
    { card: 'Chase Sapphire Preferred', reason: '2x on all travel, including transit' },
    { card: 'Citi Double Cash', reason: '2% flat, no category tracking needed' },
  ],
  'Entertainment': [
    { card: 'Discover It', reason: '5% rotating categories often include streaming' },
    { card: 'Citi Double Cash', reason: '2% on everything, no caps' },
  ],
}

export default function RewardsPage() {
  const { format: fmt } = useCurrency()
  const [category, setCategory] = useState('')
  const [spend, setSpend] = useState('500')

  const recs = category ? RECOMMENDATIONS[category] || [] : []

  const monthlySpend = parseFloat(spend) || 0

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-up">
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded-xl bg-pink-100 dark:bg-pink-950 flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-pink-600 dark:text-pink-400">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Rewards Optimizer</h1>
          <p className="text-sm text-slate-500 mt-0.5 dark:text-slate-400">
            Find the best credit card for each merchant category to maximize cashback and points.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
        <h2 className="text-sm font-semibold text-slate-900 mb-4 dark:text-slate-100">Category analysis</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Spending category</label>
            <select className="input text-sm" value={category} onChange={e => setCategory(e.target.value)}>
              <option value="">Select category...</option>
              {Object.keys(RECOMMENDATIONS).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Monthly spend in this category</label>
            <input type="number" step="0.01" min="0" className="input text-sm" value={spend}
              onChange={e => setSpend(e.target.value)} />
          </div>
        </div>

        {recs.length > 0 && (
          <div className="mt-6 space-y-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">Best cards for <strong className="text-slate-700 dark:text-slate-300">{category}</strong>:</p>
            {recs.map((rec, i) => {
              const card = CARDS.find(c => c.name === rec.card)
              const estimatedRewards = card?.rewards.match(/(\d+)x/)
              const multiplier = estimatedRewards ? parseInt(estimatedRewards[1]) : 1
              const monthlyReward = monthlySpend * (multiplier / 100)
              const yearlyReward = monthlyReward * 12

              return (
                <div key={i} className="flex items-start gap-4 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {rec.card.split(' ').map(w => w[0]).slice(0, 2).join('')}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{rec.card}</p>
                      <span className="text-2xs px-1.5 py-0.5 rounded bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300">{card?.type}</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{rec.reason}</p>
                    <p className="text-2xs text-slate-400 mt-1">{card?.rewards} · Bonus: {card?.bonus}</p>
                    {monthlySpend > 0 && (
                      <p className="text-xs font-medium text-teal-700 mt-2 dark:text-teal-400">
                        Est. {fmt(monthlyReward)}/mo · {fmt(yearlyReward)}/yr in rewards
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-medium text-slate-900 dark:text-slate-100">{multiplier}x</p>
                    <p className="text-2xs text-slate-400">points</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
        <h2 className="text-sm font-semibold text-slate-900 mb-4 dark:text-slate-100">Your card portfolio</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {CARDS.map(card => (
            <div key={card.name} className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{card.name}</p>
                <span className="text-2xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">{card.type}</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">{card.rewards}</p>
              <p className="text-2xs text-slate-400 mt-0.5">Welcome bonus: {card.bonus}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
