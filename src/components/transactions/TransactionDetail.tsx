'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { MerchantMark } from '@/components/ui/MerchantMark'
import { useCurrency } from '@/hooks/useCurrency'
import { BUDGETABLE_CATEGORIES } from '@/lib/categories'

// Transaction detail.
//
// Splitting and receipts both needed somewhere to live, and there was no
// detail view at all — the list was the whole interface. This is that view:
// what the transaction is, how it divides across categories, and the receipt
// for it.

export type DetailTransaction = {
  id: string
  date: string
  amount: number
  direction: string
  description: string
  merchantName?: string | null
  merchantCategory?: string | null
  status?: string
  /** Manual entries split on a different key and can carry a receipt. */
  isManual?: boolean
  receiptUrl?: string | null
}

type Split = { id?: string; amount: number; category: string; note?: string | null; deductible: boolean }

export function TransactionDetail({
  transaction,
  open,
  onClose,
  onChanged,
}: {
  transaction: DetailTransaction | null
  open: boolean
  onClose: () => void
  onChanged?: () => void
}) {
  const { format: fmt } = useCurrency()
  const [splits, setSplits] = useState<Split[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const total = transaction ? Math.abs(transaction.amount) : 0
  const splitTotal = splits.reduce((s, x) => s + (Number(x.amount) || 0), 0)
  const remainder = Math.round((total - splitTotal) * 100) / 100

  const load = useCallback(async () => {
    if (!transaction) return
    setLoading(true)
    setError('')
    try {
      const key = transaction.isManual ? 'manualId' : 'transactionId'
      const res = await fetch(`/api/transactions/splits?${key}=${transaction.id}`)
      const data = await res.json()
      setSplits(
        (data.splits ?? []).map((s: any) => ({
          id: s.id,
          amount: s.amount,
          category: s.category,
          note: s.note,
          deductible: s.deductible,
        }))
      )
    } catch {
      setSplits([])
    } finally {
      setLoading(false)
    }
  }, [transaction])

  useEffect(() => {
    if (open && transaction) {
      load()
      setReceiptUrl(transaction.receiptUrl ?? null)
    }
  }, [open, transaction, load])

  if (!transaction) return null

  const name = transaction.merchantName || transaction.description
  const isCredit = transaction.direction === 'credit'

  function addSplit() {
    // Pre-filled with whatever is unallocated, because that is nearly always
    // the amount the user is about to type.
    setSplits((prev) => [
      ...prev,
      {
        amount: Math.max(0, remainder),
        category: transaction!.merchantCategory || 'Shopping',
        deductible: false,
      },
    ])
  }

  async function saveSplits() {
    if (!transaction) return
    setSaving(true)
    setError('')
    try {
      const usable = splits.filter((s) => Number(s.amount) > 0)

      // An empty set means "no longer split", which is a delete rather than a
      // save of nothing.
      if (usable.length === 0) {
        const key = transaction.isManual ? 'manualId' : 'transactionId'
        const res = await fetch(`/api/transactions/splits?${key}=${transaction.id}`, {
          method: 'DELETE',
        })
        if (!res.ok) throw new Error('Could not clear the splits.')
      } else {
        const res = await fetch('/api/transactions/splits', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...(transaction.isManual
              ? { manualId: transaction.id }
              : { transactionId: transaction.id }),
            splits: usable.map((s) => ({
              amount: Number(s.amount),
              category: s.category,
              note: s.note || undefined,
              deductible: s.deductible,
            })),
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Could not save those splits.')
      }

      onChanged?.()
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save those splits.')
    } finally {
      setSaving(false)
    }
  }

  async function uploadReceipt(file: File) {
    if (!transaction) return
    setUploading(true)
    setError('')
    try {
      const body = new FormData()
      body.append('file', file)
      if (transaction.isManual) body.append('manualTransactionId', transaction.id)

      const res = await fetch('/api/receipts', { method: 'POST', body })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not save that receipt.')

      setReceiptUrl(data.receipt.url)
      onChanged?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save that receipt.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Transaction">
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <MerchantMark name={name} size={44} />
          <div className="min-w-0 flex-1">
            <p className="text-base font-semibold text-[var(--ink)] truncate">{name}</p>
            <p className="text-xs text-[var(--ink-faint)]">
              {new Date(transaction.date).toLocaleDateString(undefined, {
                weekday: 'short',
                day: 'numeric',
                month: 'long',
              })}
              {transaction.status === 'pending' && ' · Pending'}
            </p>
          </div>
          <p
            className="stat-number text-lg shrink-0"
            style={{ color: isCredit ? 'var(--positive)' : 'var(--ink)' }}
          >
            {isCredit ? '+' : '−'}
            {fmt(total)}
          </p>
        </div>

        {error && (
          <p role="alert" className="text-xs text-[var(--negative)]">
            {error}
          </p>
        )}

        {/* ── Splits ───────────────────────────────────────────── */}
        <section>
          <div className="flex items-baseline justify-between mb-2">
            <h3 className="text-sm font-semibold text-[var(--ink)]">Split</h3>
            <button type="button" onClick={addSplit} className="text-xs font-medium text-[var(--accent)]">
              Add a part
            </button>
          </div>

          {splits.length === 0 && !loading && (
            <p className="text-xs text-[var(--ink-muted)] leading-relaxed">
              Assign part of this to another category — the shop that was partly work supplies, or a
              bill you share.
            </p>
          )}

          <div className="space-y-2">
            {splits.map((split, i) => (
              <div key={split.id ?? i} className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  inputMode="decimal"
                  value={split.amount}
                  onChange={(e) =>
                    setSplits((prev) =>
                      prev.map((s, j) => (j === i ? { ...s, amount: Number(e.target.value) } : s))
                    )
                  }
                  aria-label="Split amount"
                  className="input text-sm py-1.5 w-24 shrink-0"
                />
                <select
                  value={split.category}
                  onChange={(e) =>
                    setSplits((prev) =>
                      prev.map((s, j) => (j === i ? { ...s, category: e.target.value } : s))
                    )
                  }
                  aria-label="Split category"
                  className="input text-sm py-1.5 flex-1 min-w-0"
                >
                  {BUDGETABLE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setSplits((prev) => prev.filter((_, j) => j !== i))}
                  aria-label="Remove this part"
                  className="btn-ghost px-2 shrink-0"
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          {splits.length > 0 && (
            <>
              <label className="flex items-center gap-2 mt-3 text-xs text-[var(--ink-muted)]">
                <input
                  type="checkbox"
                  checked={splits.some((s) => s.deductible)}
                  onChange={(e) =>
                    setSplits((prev) => prev.map((s) => ({ ...s, deductible: e.target.checked })))
                  }
                />
                Mark these parts as business spend
              </label>

              <div className="flex items-center justify-between mt-3 text-xs">
                <span
                  style={{
                    color: remainder < -0.01 ? 'var(--negative)' : 'var(--ink-muted)',
                  }}
                >
                  {remainder < -0.01
                    ? `${fmt(Math.abs(remainder))} over the transaction`
                    : `${fmt(remainder)} unassigned`}
                </span>
                <button
                  type="button"
                  onClick={saveSplits}
                  disabled={saving || remainder < -0.01}
                  className="btn-primary text-xs py-1.5 px-3 disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save split'}
                </button>
              </div>
            </>
          )}
        </section>

        {/* ── Receipt ──────────────────────────────────────────── */}
        <section className="pt-4 border-t" style={{ borderColor: 'var(--line)' }}>
          <h3 className="text-sm font-semibold text-[var(--ink)] mb-2">Receipt</h3>

          {receiptUrl ? (
            <a
              href={receiptUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary text-xs py-1.5 px-3 inline-flex"
            >
              View receipt
            </a>
          ) : (
            <>
              <input
                ref={fileRef}
                type="file"
                // `capture` opens the camera directly on a phone, which is
                // where a receipt is actually photographed.
                accept="image/png,image/jpeg,image/webp,image/heic,application/pdf"
                capture="environment"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) uploadReceipt(file)
                  e.target.value = ''
                }}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-50"
              >
                {uploading ? 'Uploading…' : 'Attach a photo'}
              </button>
              {!transaction.isManual && (
                <p className="text-2xs text-[var(--ink-faint)] mt-2 leading-relaxed">
                  Stored against your account. Receipts attach directly to manual entries; for bank
                  transactions this keeps the photo alongside your records.
                </p>
              )}
            </>
          )}
        </section>
      </div>
    </BottomSheet>
  )
}
