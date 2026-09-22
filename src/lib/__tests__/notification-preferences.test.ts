import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockPrisma } from '@/test/setup'
import { preferencesFor, shouldDeliver, DEFAULT_PREFERENCES } from '../notification-preferences'

const ALL_ON = {
  notifyPush: true,
  notifyEmail: true,
  notifyBills: true,
  notifyAlerts: true,
  notifyGoals: true,
}

describe('preferencesFor', () => {
  beforeEach(() => vi.clearAllMocks())

  it('reads the account, not a browser', async () => {
    // These lived in localStorage, which the nightly job cannot see — so a
    // mute silenced nothing and the phone still buzzed.
    mockPrisma.user.findUnique.mockResolvedValue({ ...ALL_ON, notifyBills: false })

    const prefs = await preferencesFor('u1')
    expect(prefs.bills).toBe(false)
    expect(prefs.alerts).toBe(true)
  })

  it('delivers by default when the account cannot be read', async () => {
    // Failing closed would silence a reminder somebody is relying on.
    mockPrisma.user.findUnique.mockRejectedValue(new Error('database down'))
    expect(await preferencesFor('u1')).toEqual(DEFAULT_PREFERENCES)
  })

  it('delivers by default for an account that does not exist', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null)
    expect(await preferencesFor('nobody')).toEqual(DEFAULT_PREFERENCES)
  })
})

describe('shouldDeliver', () => {
  const prefs = { push: true, email: true, bills: true, alerts: true, goals: true }

  it('delivers when both the channel and the kind are on', () => {
    expect(shouldDeliver(prefs, 'bills', 'push')).toBe(true)
  })

  it('muting a channel silences every kind on it', () => {
    const noPush = { ...prefs, push: false }
    expect(shouldDeliver(noPush, 'bills', 'push')).toBe(false)
    expect(shouldDeliver(noPush, 'alerts', 'push')).toBe(false)
    // Email is untouched.
    expect(shouldDeliver(noPush, 'bills', 'email')).toBe(true)
  })

  it('muting a kind silences it on every channel', () => {
    const noBills = { ...prefs, bills: false }
    expect(shouldDeliver(noBills, 'bills', 'push')).toBe(false)
    expect(shouldDeliver(noBills, 'bills', 'email')).toBe(false)
    expect(shouldDeliver(noBills, 'alerts', 'push')).toBe(true)
  })
})
