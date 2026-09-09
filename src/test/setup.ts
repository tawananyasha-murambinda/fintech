import { vi } from 'vitest'
import { createMockPrisma, sessionState } from './harness'

// Wired once for every route test: the real Prisma client and NextAuth session
// are replaced before any route module is imported.
export const mockPrisma = createMockPrisma()

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
  prismaBase: mockPrisma,
}))

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(async () =>
    sessionState.user ? { user: sessionState.user } : null
  ),
  default: vi.fn(),
}))

// The auth options pull in bcrypt, the Prisma adapter and OAuth providers,
// none of which a route test needs.
vi.mock('@/lib/auth', () => ({ authOptions: {} }))

vi.mock('@/lib/audit', () => ({
  logAudit: vi.fn(async () => undefined),
  requestMeta: vi.fn(() => ({})),
}))
