import { PrismaClient, Prisma } from '@prisma/client'

// Monetary columns are `numeric` in Postgres, which Prisma surfaces as
// `Prisma.Decimal`. Decimal objects do not survive JSON serialisation as
// numbers and cannot be used with `+`, `*` or `<` — so every one of them is
// converted back to a JS number at the client boundary by the extension below.
//
// The database stays the exact store of record; application code keeps working
// with plain numbers. See lib/money.ts for the arithmetic helpers that matter
// (rounding before a write, tolerant comparison of two computed sums).
//
// Each entry is written out rather than generated so that a nullable column
// stays `number | null` and a required one stays `number`. Adding a Decimal
// column to the schema without adding it here means that field reaches the UI
// as a Decimal object.
const required = <F extends string>(field: F) => ({
  needs: { [field]: true } as { [K in F]: true },
  compute: (record: { [K in F]: Prisma.Decimal }): number => record[field].toNumber(),
})

const nullable = <F extends string>(field: F) => ({
  needs: { [field]: true } as { [K in F]: true },
  compute: (record: { [K in F]: Prisma.Decimal | null }): number | null => {
    const value = record[field]
    return value === null ? null : value.toNumber()
  },
})

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  }).$extends({
    result: {
      linkedBank: {
        currentBalance: nullable('currentBalance'),
        availableBalance: nullable('availableBalance'),
      },
      transaction: {
        amount: required('amount'),
        runningBalance: nullable('runningBalance'),
      },
      manualTransaction: { amount: required('amount') },
      budget: { amount: required('amount') },
      goal: {
        targetAmount: required('targetAmount'),
        currentAmount: required('currentAmount'),
      },
      bill: { amount: required('amount') },
      asset: { value: required('value') },
      liability: {
        balance: required('balance'),
        interestRate: nullable('interestRate'),
        minPayment: nullable('minPayment'),
      },
      debtPlan: {
        extraPayment: required('extraPayment'),
        totalInterestSaved: nullable('totalInterestSaved'),
      },
      taxEntry: { amount: required('amount') },
      investment: {
        shares: nullable('shares'),
        costBasis: nullable('costBasis'),
        currentPrice: nullable('currentPrice'),
      },
      vault: {
        targetAmount: nullable('targetAmount'),
        currentAmount: required('currentAmount'),
      },
      vaultContribution: { amount: required('amount') },
      transactionSplit: { amount: required('amount') },
      goalContribution: { amount: required('amount') },
      netWorthSnapshot: {
        assets: required('assets'),
        liabilities: required('liabilities'),
        netWorth: required('netWorth'),
        cash: required('cash'),
        investments: required('investments'),
      },
      roundUpRule: {
        roundTo: required('roundTo'),
        maxPerTransaction: nullable('maxPerTransaction'),
      },
    },
  })
}

type ExtendedPrismaClient = ReturnType<typeof createPrismaClient>

const globalForPrisma = globalThis as unknown as {
  prisma: ExtendedPrismaClient | undefined
  prismaBase: PrismaClient | undefined
}

// The NextAuth Prisma adapter is typed against the unextended client, and the
// models it touches (User, Account, Session, VerificationToken) hold no money,
// so it uses the base client directly.
export const prismaBase = globalForPrisma.prismaBase ?? new PrismaClient()

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
  globalForPrisma.prismaBase = prismaBase
}
