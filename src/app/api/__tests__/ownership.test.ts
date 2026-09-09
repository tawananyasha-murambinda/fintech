import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockPrisma } from '@/test/setup'
import { signIn, signOut, jsonRequest } from '@/test/harness'

// Every per-resource route must scope its query by the session user. A route
// that looks a record up by id alone lets any signed-in user read or mutate
// another user's finances by guessing an id.

const goals = await import('@/app/api/goals/[id]/route')
const bills = await import('@/app/api/bills/[id]/route')

const ALICE = 'user_alice'
// Next 15 passes route params as a promise.
const call = (handler: any, req: any, id: string) =>
  handler(req, { params: Promise.resolve({ id }) })

describe('per-resource routes scope by owner', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    signIn({ id: ALICE })
  })

  describe('goals/[id]', () => {
    it('requires a session', async () => {
      signOut()
      const res = await call(goals.PUT, jsonRequest('/api/goals/g1', { name: 'x' }), 'g1')
      expect(res.status).toBe(401)
    })

    it('scopes the lookup to the session user, not the id alone', async () => {
      mockPrisma.goal.findFirst.mockResolvedValue({ id: 'g1', userId: ALICE })
      mockPrisma.goal.update.mockResolvedValue({ id: 'g1' })

      await call(goals.PUT, jsonRequest('/api/goals/g1', { name: 'Holiday' }), 'g1')

      expect(mockPrisma.goal.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'g1', userId: ALICE } })
      )
    })

    it('404s on another user’s goal instead of updating it', async () => {
      mockPrisma.goal.findFirst.mockResolvedValue(null)

      const res = await call(goals.PUT, jsonRequest('/api/goals/g_bob', { name: 'Hijack' }), 'g_bob')

      expect(res.status).toBe(404)
      expect(mockPrisma.goal.update).not.toHaveBeenCalled()
    })

    it('deletes only within the owner scope', async () => {
      mockPrisma.goal.deleteMany.mockResolvedValue({ count: 0 })

      await call(goals.DELETE, jsonRequest('/api/goals/g_bob', undefined, { method: 'DELETE' }), 'g_bob')

      expect(mockPrisma.goal.deleteMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'g_bob', userId: ALICE } })
      )
    })
  })

  describe('bills/[id]', () => {
    it('requires a session', async () => {
      signOut()
      const res = await call(bills.PUT, jsonRequest('/api/bills/b1', { name: 'x' }), 'b1')
      expect(res.status).toBe(401)
    })

    it('404s on another user’s bill', async () => {
      mockPrisma.bill.findFirst.mockResolvedValue(null)

      const res = await call(bills.PUT, jsonRequest('/api/bills/b_bob', { amount: 1 }), 'b_bob')

      expect(res.status).toBe(404)
      expect(mockPrisma.bill.update).not.toHaveBeenCalled()
    })

    it('deletes only within the owner scope', async () => {
      mockPrisma.bill.deleteMany.mockResolvedValue({ count: 0 })

      await call(bills.DELETE, jsonRequest('/api/bills/b_bob', undefined, { method: 'DELETE' }), 'b_bob')

      expect(mockPrisma.bill.deleteMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'b_bob', userId: ALICE } })
      )
    })
  })
})
