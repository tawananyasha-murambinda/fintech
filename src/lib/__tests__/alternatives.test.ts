import { describe, it, expect } from 'vitest'
import { observedCadence } from '../ai'

describe('observedCadence', () => {
  it('refuses to call a single purchase a habit', () => {
    // The bug this exists to prevent: one $89 purchase was reported back as
    // "~1x/week visits averaging $89.40", projecting $387/month from one row.
    expect(observedCadence(1, 30)).toBeNull()
    expect(observedCadence(2, 30)).toBeNull()
  })

  it('refuses to infer a rate from too short a window', () => {
    expect(observedCadence(5, 3)).toBeNull()
  })

  it('describes a genuine weekly pattern', () => {
    const cadence = observedCadence(8, 60)
    expect(cadence).not.toBeNull()
    expect(cadence!.perMonth).toBeCloseTo(4, 0)
    expect(cadence!.label).toMatch(/week/)
  })

  it('describes a monthly pattern', () => {
    const cadence = observedCadence(3, 90)
    expect(cadence!.label).toMatch(/month|occasionally/)
  })

  it('describes near-daily spending', () => {
    expect(observedCadence(25, 30)!.label).toBe('most days')
  })

  it('scales with the real window, not an assumed month', () => {
    // Same visit count over twice the span is half the rate.
    const dense = observedCadence(10, 30)!
    const sparse = observedCadence(10, 60)!
    expect(dense.perMonth).toBeCloseTo(sparse.perMonth * 2, 1)
  })
})
