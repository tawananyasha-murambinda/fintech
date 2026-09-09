import { vi } from 'vitest'
import { NextRequest } from 'next/server'

// Test harness for API routes.
//
// Routes are exercised as real functions against a mocked Prisma client and a
// mocked NextAuth session. That covers what unit tests on lib/ cannot: the
// authentication gate, ownership scoping, input validation, and status codes.
// It deliberately does not spin up a database — these assert the route's
// contract, not the SQL.

/** Every model the routes under test touch. Add to this as coverage grows. */
const MODELS = [
  'user',
  'linkedBank',
  'transaction',
  'manualTransaction',
  'budget',
  'goal',
  'bill',
  'alert',
  'notification',
  'asset',
  'liability',
  'debtPlan',
  'taxEntry',
  'investment',
  'vault',
  'billingEvent',
  'auditLog',
  'errorLog',
  'aiUsage',
  'chatMessage',
  'pushSubscription',
  'verificationToken',
  'consent',
  'twoFactorRecoveryCode',
  'vaultContribution',
  'roundUpRule',
  'categorizationRule',
  'receipt',
] as const

type ModelName = (typeof MODELS)[number]

const METHODS = [
  'findUnique',
  'findFirst',
  'findMany',
  'create',
  'createMany',
  'update',
  'updateMany',
  'upsert',
  'delete',
  'deleteMany',
  'count',
] as const

export type MockPrisma = Record<ModelName, Record<(typeof METHODS)[number], ReturnType<typeof vi.fn>>> & {
  $transaction: ReturnType<typeof vi.fn>
}

export function createMockPrisma(): MockPrisma {
  const client = {
    // Routes that batch writes call $transaction with an array of promises.
    $transaction: vi.fn(async (arg: unknown) =>
      typeof arg === 'function' ? (arg as (c: unknown) => unknown)(client) : Promise.all(arg as Promise<unknown>[])
    ),
  } as Record<string, unknown>

  for (const model of MODELS) {
    client[model] = Object.fromEntries(
      METHODS.map((method) => [
        method,
        // Default: "nothing found". Individual tests override what they need,
        // so a route reading an unstubbed table fails loudly rather than
        // silently passing on undefined.
        vi.fn(async () => (method === 'findMany' ? [] : method === 'count' ? 0 : null)),
      ])
    )
  }

  return client as MockPrisma
}

export type SessionUser = { id: string; email?: string; emailVerified?: string | null }

/** Controls what getServerSession returns for the next route call. */
export const sessionState: { user: SessionUser | null } = { user: null }

export function signIn(user: SessionUser = { id: 'user_alice', email: 'alice@example.com' }) {
  sessionState.user = user
  return user
}

export function signOut() {
  sessionState.user = null
}

export function jsonRequest(
  url: string,
  body?: unknown,
  init: { method?: string; headers?: Record<string, string> } = {}
): NextRequest {
  return new NextRequest(`http://localhost${url}`, {
    method: init.method ?? (body === undefined ? 'GET' : 'POST'),
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': '203.0.113.10',
      ...init.headers,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
}

export async function readJson(res: Response): Promise<any> {
  return res.json()
}
