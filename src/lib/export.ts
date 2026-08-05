import { prisma } from './prisma'

// GDPR-style data export. Returns a complete copy of the user's data with
// credentials excluded (passwords, Plaid access tokens, OAuth id tokens).

const USER_MODEL_SELECT = {
  profile: true,
  accounts: true,
  linkedBanks: true,
  transactions: true,
  manualTransactions: true,
  budgets: true,
  goals: true,
  bills: true,
  chatMessages: true,
  alerts: true,
  categorizationRules: true,
  assets: true,
  liabilities: true,
  debtPlans: true,
  taxEntries: true,
  investments: true,
  creditScores: true,
  notifications: true,
  vaults: true,
  roundUpRules: true,
  receipts: true,
  consents: true,
  feedbacks: true,
} as const

export async function exportUserData(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: USER_MODEL_SELECT,
  })

  if (!user) throw new Error('User not found')

  // Strip anything sensitive that should never leave the server.
  const { password: _password, accounts, linkedBanks, receipts, ...profile } = user

  const safeAccounts = accounts.map(({ refresh_token: _r, access_token: _a, id_token: _i, session_state: _s, ...rest }) => rest)

  return {
    format: 'fintrack-export-v1',
    exportedAt: new Date().toISOString(),
    generatedBy: 'FinTrack',
    profile: {
      id: profile.id,
      email: profile.email,
      name: profile.name,
      image: profile.image,
      city: profile.city,
      country: profile.country,
      currency: profile.currency,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    },
    oauthAccounts: safeAccounts,
    linkedBanks: linkedBanks.map((b) => ({
      institutionName: b.institutionName,
      accountName: b.accountName,
      accountType: b.accountType,
      currency: b.currency,
      lastSynced: b.lastSynced,
    })),
    transactions: user.transactions.map((t) => ({
      id: t.id,
      date: t.date.toISOString(),
      amount: t.amount,
      direction: t.direction,
      description: t.description,
      merchantName: t.merchantName,
      merchantCategory: t.merchantCategory,
      merchantCity: t.merchantCity,
      merchantState: t.merchantState,
      merchantCountry: t.merchantCountry,
      status: t.status,
      type: t.type,
      runningBalance: t.runningBalance,
    })),
    manualTransactions: user.manualTransactions.map((t) => ({
      id: t.id,
      date: t.date.toISOString(),
      amount: t.amount,
      direction: t.direction,
      description: t.description,
      merchantName: t.merchantName,
      merchantCategory: t.merchantCategory,
    })),
    budgets: user.budgets,
    goals: user.goals,
    bills: user.bills,
    chatMessages: user.chatMessages,
    alerts: user.alerts,
    categorizationRules: user.categorizationRules,
    assets: user.assets,
    liabilities: user.liabilities,
    debtPlans: user.debtPlans,
    taxEntries: user.taxEntries,
    investments: user.investments,
    creditScores: user.creditScores,
    notifications: user.notifications,
    vaults: user.vaults,
    roundUpRules: user.roundUpRules,
    receipts: receipts.map((r) => ({ filename: r.filename, mimeType: r.mimeType, createdAt: r.createdAt })),
    consents: user.consents.map((c) => ({ type: c.type, granted: c.granted, version: c.version, createdAt: c.createdAt })),
  }
}
