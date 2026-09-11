import { prisma } from '@/lib/prisma'

// Household sharing.
//
// A household could be created and members added, and then nothing happened:
// `householdId` was never referenced by a single query outside the households
// route, so members shared no data at all. These helpers are what make it real
// — one place that answers "who am I sharing with" and "what can I see".

/** Household ids the user belongs to. */
export async function householdIdsFor(userId: string): Promise<string[]> {
  const memberships = await prisma.householdMember.findMany({
    where: { userId },
    select: { householdId: true },
  })
  return memberships.map((m) => m.householdId)
}

/** Every user who shares a household with this one, including themselves. */
export async function householdPeers(userId: string): Promise<string[]> {
  const ids = await householdIdsFor(userId)
  if (ids.length === 0) return [userId]

  const members = await prisma.householdMember.findMany({
    where: { householdId: { in: ids } },
    select: { userId: true },
  })

  return [...new Set([userId, ...members.map((m) => m.userId)])]
}

/**
 * The filter for anything a household shares.
 *
 * Deliberately narrow: a user sees their own records, plus records other
 * members have explicitly attached to a shared household. Joining a household
 * does not expose anybody's whole account — only what they chose to share.
 */
export async function sharedScope(userId: string): Promise<{
  OR: ({ userId: string } | { householdId: { in: string[] } })[]
}> {
  const ids = await householdIdsFor(userId)
  return {
    OR: ids.length > 0 ? [{ userId }, { householdId: { in: ids } }] : [{ userId }],
  }
}

export async function isMember(userId: string, householdId: string): Promise<boolean> {
  const membership = await prisma.householdMember.findFirst({
    where: { userId, householdId },
    select: { id: true },
  })
  return membership !== null
}

/** Members of a household, for display. */
export async function householdMembers(householdId: string) {
  return prisma.householdMember.findMany({
    where: { householdId },
    select: {
      id: true,
      role: true,
      userId: true,
      user: { select: { name: true, email: true, image: true } },
    },
  })
}
