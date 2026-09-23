// Types for the seed generator, so the test that asserts against it is checked
// rather than cast to `any`.

export type SeededRow = {
  date: Date
  amount: number
  direction: 'credit' | 'debit'
  description: string
  merchantName: string
  merchantCategory: string
  merchantCity?: string
  merchantState?: string
  merchantCountry?: string
  status: 'posted' | 'pending'
  channel: string
  runningBalance: number
}

export const rows: SeededRow[]
export const opening: number
export const closing: number
export const trough: number
