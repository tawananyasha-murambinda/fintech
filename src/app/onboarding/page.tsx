'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LinkBankButton } from '@/components/bank/LinkBankButton'
import { BUDGETABLE_CATEGORIES } from '@/lib/categories'
import { useCurrency } from '@/hooks/useCurrency'

// Onboarding.
//
// A new account previously landed on an empty dashboard — every number zero,
// every list empty, nothing to react to. That is the moment most people decide
// whether to come back.
//
// Three steps, each producing something the dashboard can actually show, and
// every one skippable: a setup flow that cannot be escaped is worse than no
// setup flow at all.

type Step = 'bank' | 'budget' | 'goal' | 'location'

const STEPS: Step[] = ['bank', 'budget', 'goal', 'location']

// The categories people actually overspend on, offered first so the common
// case is one tap rather than a scroll through twenty.
const SUGGESTED = ['Food & Dining', 'Groceries', 'Shopping', 'Transportation', 'Entertainment']

export default function OnboardingPage() {
  const router = useRouter()
  const { format: fmt } = useCurrency()
  const [step, setStep] = useState<Step>('bank')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [budgetCategory, setBudgetCategory] = useState('Food & Dining')
  const [budgetAmount, setBudgetAmount] = useState('')
  const [goalName, setGoalName] = useState('')
  const [goalTarget, setGoalTarget] = useState('')

  const index = STEPS.indexOf(step)

  function next() {
    setError('')
    const following = STEPS[index + 1]
    if (following) setStep(following)
    else finish()
  }

  function finish() {
    router.push('/dashboard')
  }

  async function saveBudget() {
    const amount = parseFloat(budgetAmount)
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Enter an amount to budget.')
      return
    }

    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: budgetCategory, amount, period: 'monthly' }),
      })
      if (!res.ok) throw new Error('Could not save that budget.')
      next()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save that budget.')
    } finally {
      setSaving(false)
    }
  }

  async function saveGoal() {
    const target = parseFloat(goalTarget)
    if (!goalName.trim() || !Number.isFinite(target) || target <= 0) {
      setError('Give the goal a name and an amount.')
      return
    }

    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: goalName.trim(), targetAmount: target }),
      })
      if (!res.ok) throw new Error('Could not save that goal.')
      next()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save that goal.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-5 py-10" style={{ background: 'var(--wash-base)' }}>
      <div className="w-full max-w-md">
        {/* Progress. Four dots rather than a percentage: it is short, and a
            percentage on a four-step flow reads as longer than it is. */}
        <div className="flex items-center gap-1.5 mb-8" role="progressbar" aria-valuenow={index + 1} aria-valuemin={1} aria-valuemax={STEPS.length}>
          {STEPS.map((s, i) => (
            <span
              key={s}
              className="h-1 flex-1 rounded-full transition-colors"
              style={{ background: i <= index ? 'var(--accent)' : 'var(--line)' }}
            />
          ))}
        </div>

        {error && (
          <p role="alert" className="text-xs text-[var(--negative)] mb-4">
            {error}
          </p>
        )}

        {step === 'bank' && (
          <section>
            <h1 className="font-display text-3xl font-semibold tracking-[-0.035em] text-[var(--ink)] mb-3">
              Connect an account
            </h1>
            <p className="text-sm text-[var(--ink-muted)] leading-relaxed mb-6">
              FinTrack reads your transactions through Plaid — read-only, and your bank credentials
              never reach us. Everything else works better once it can see real spending.
            </p>
            <LinkBankButton variant="onboarding" />
            <button onClick={next} className="btn-ghost w-full mt-3 text-sm">
              I&apos;ll connect later
            </button>
          </section>
        )}

        {step === 'budget' && (
          <section>
            <h1 className="font-display text-3xl font-semibold tracking-[-0.035em] text-[var(--ink)] mb-3">
              Set one budget
            </h1>
            <p className="text-sm text-[var(--ink-muted)] leading-relaxed mb-6">
              Just one, on whatever you most want to keep an eye on. You can add more later.
            </p>

            <div className="flex flex-wrap gap-2 mb-4">
              {SUGGESTED.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setBudgetCategory(category)}
                  aria-pressed={budgetCategory === category}
                  className="rounded-xl px-3 py-2 text-sm font-medium border transition-colors"
                  style={{
                    borderColor: budgetCategory === category ? 'var(--accent)' : 'var(--line)',
                    background: budgetCategory === category ? 'var(--accent-wash)' : 'transparent',
                    color: budgetCategory === category ? 'var(--accent-ink)' : 'var(--ink-muted)',
                  }}
                >
                  {category}
                </button>
              ))}
            </div>

            <select
              value={budgetCategory}
              onChange={(e) => setBudgetCategory(e.target.value)}
              aria-label="Budget category"
              className="input mb-3"
            >
              {BUDGETABLE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={budgetAmount}
              onChange={(e) => setBudgetAmount(e.target.value)}
              placeholder={`Monthly limit, e.g. ${fmt(300)}`}
              aria-label="Monthly budget amount"
              className="input stat-number"
            />

            <button onClick={saveBudget} disabled={saving} className="btn-primary w-full mt-4 disabled:opacity-50">
              {saving ? 'Saving…' : 'Set budget'}
            </button>
            <button onClick={next} className="btn-ghost w-full mt-2 text-sm">
              Skip
            </button>
          </section>
        )}

        {step === 'goal' && (
          <section>
            <h1 className="font-display text-3xl font-semibold tracking-[-0.035em] text-[var(--ink)] mb-3">
              What are you saving for?
            </h1>
            <p className="text-sm text-[var(--ink-muted)] leading-relaxed mb-6">
              A goal gives the numbers somewhere to go. Round-ups and spare cash can feed it later.
            </p>

            <input
              type="text"
              value={goalName}
              onChange={(e) => setGoalName(e.target.value)}
              placeholder="Holiday, emergency fund, a new laptop…"
              aria-label="Goal name"
              className="input mb-3"
            />
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={goalTarget}
              onChange={(e) => setGoalTarget(e.target.value)}
              placeholder="Target amount"
              aria-label="Target amount"
              className="input stat-number"
            />

            <button onClick={saveGoal} disabled={saving} className="btn-primary w-full mt-4 disabled:opacity-50">
              {saving ? 'Saving…' : 'Create goal'}
            </button>
            <button onClick={next} className="btn-ghost w-full mt-2 text-sm">
              Skip
            </button>
          </section>
        )}

        {step === 'location' && (
          <section>
            <h1 className="font-display text-3xl font-semibold tracking-[-0.035em] text-[var(--ink)] mb-3">
              Where are you?
            </h1>
            <p className="text-sm text-[var(--ink-muted)] leading-relaxed mb-6">
              Used to find real shops and fares near you when suggesting cheaper alternatives.
              Without it those suggestions are generic. You can set it later in Settings.
            </p>

            <button
              onClick={async () => {
                setSaving(true)
                try {
                  const { detectAndSaveLocation } = await import('@/lib/location')
                  await detectAndSaveLocation()
                } catch {
                  // Denied or unavailable — not worth blocking the flow over.
                } finally {
                  setSaving(false)
                  finish()
                }
              }}
              disabled={saving}
              className="btn-primary w-full disabled:opacity-50"
            >
              {saving ? 'Detecting…' : 'Use my location'}
            </button>
            <button onClick={finish} className="btn-ghost w-full mt-2 text-sm">
              Not now
            </button>
          </section>
        )}
      </div>
    </div>
  )
}
