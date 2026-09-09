import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockPrisma } from '@/test/setup'
import { runRetention, RETENTION_DAYS } from '../retention'

const NOW = new Date('2026-06-15T00:00:00Z')
const daysBefore = (days: number) => new Date(NOW.getTime() - days * 86_400_000)

describe('runRetention', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    for (const model of Object.values(mockPrisma) as any[]) {
      if (model?.deleteMany) model.deleteMany.mockResolvedValue({ count: 0 })
    }
  })

  it('deletes only unverified password accounts past the window', async () => {
    await runRetention(NOW)

    const where = mockPrisma.user.deleteMany.mock.calls[0][0].where
    expect(where.emailVerified).toBeNull()
    // OAuth users are verified by the provider and have no password — they
    // must not be swept up as "never confirmed their email".
    expect(where.password).toEqual({ not: null })
    expect(where.createdAt.lt).toEqual(daysBefore(RETENTION_DAYS.unverifiedAccounts))
  })

  it('keeps unread notifications regardless of age', async () => {
    await runRetention(NOW)

    const where = mockPrisma.notification.deleteMany.mock.calls[0][0].where
    expect(where.read).toBe(true)
  })

  it('compares AiUsage on its YYYY-MM-DD string column', async () => {
    await runRetention(NOW)

    const where = mockPrisma.aiUsage.deleteMany.mock.calls[0][0].where
    expect(where.date.lt).toBe(daysBefore(RETENTION_DAYS.aiUsage).toISOString().slice(0, 10))
  })

  it('holds audit logs longest — they are the incident record', async () => {
    expect(RETENTION_DAYS.auditLogs).toBeGreaterThan(RETENTION_DAYS.errorLogs)
    expect(RETENTION_DAYS.auditLogs).toBeGreaterThan(RETENTION_DAYS.chatMessages)
  })

  it('never deletes the financial record itself', async () => {
    await runRetention(NOW)

    for (const model of ['transaction', 'manualTransaction', 'budget', 'goal', 'bill', 'taxEntry'] as const) {
      expect(mockPrisma[model].deleteMany).not.toHaveBeenCalled()
    }
  })

  it('reports counts per sweep', async () => {
    mockPrisma.errorLog.deleteMany.mockResolvedValue({ count: 12 })

    const report = await runRetention(NOW)

    expect(report.deleted.errorLogs).toBe(12)
    expect(report.failed).toEqual([])
  })

  it('carries on when one sweep fails', async () => {
    // A lock or constraint on one table must not stop the rest of the schedule.
    mockPrisma.alert.deleteMany.mockRejectedValue(new Error('deadlock detected'))
    mockPrisma.errorLog.deleteMany.mockResolvedValue({ count: 3 })

    const report = await runRetention(NOW)

    expect(report.failed).toContain('staleAlerts')
    expect(report.deleted.errorLogs).toBe(3)
  })
})
