// One category vocabulary for the whole app.
//
// Before this existed there were three, and they did not agree:
//   • Plaid writes `personal_finance_category.primary` — FOOD_AND_DRINK.
//   • The AI categoriser returns title case — "Food & Dining".
//   • Budgets are created from a hard-coded list — also "Food & Dining".
//
// The budgets route looked up spend by title-casing the raw Plaid value
// ("FOOD AND DRINK") and comparing it to the budget's category, which never
// matched — so every budget read as $0 spent for any bank-linked account, and
// the overspend alert (which used substring matching, failing differently)
// never fired. Everything now normalises through `canonicalCategory`.

export const CATEGORIES = [
  'Food & Dining',
  'Groceries',
  'Coffee',
  'Shopping',
  'Transportation',
  'Entertainment',
  'Bills & Utilities',
  'Rent',
  'Health & Fitness',
  'Travel',
  'Education',
  'Personal Care',
  'Home Improvement',
  'Insurance',
  'Subscriptions',
  'Gifts & Donations',
  'Fees & Charges',
  'Loan Payments',
  'Taxes',
  'Income',
  'Transfer',
  'Uncategorized',
] as const

export type Category = (typeof CATEGORIES)[number]

export const UNCATEGORIZED: Category = 'Uncategorized'

const CATEGORY_SET = new Set<string>(CATEGORIES)

// Plaid `personal_finance_category.primary` (the current taxonomy).
const PLAID_PRIMARY: Record<string, Category> = {
  INCOME: 'Income',
  TRANSFER_IN: 'Transfer',
  TRANSFER_OUT: 'Transfer',
  LOAN_PAYMENTS: 'Loan Payments',
  BANK_FEES: 'Fees & Charges',
  ENTERTAINMENT: 'Entertainment',
  FOOD_AND_DRINK: 'Food & Dining',
  GENERAL_MERCHANDISE: 'Shopping',
  HOME_IMPROVEMENT: 'Home Improvement',
  MEDICAL: 'Health & Fitness',
  PERSONAL_CARE: 'Personal Care',
  GENERAL_SERVICES: 'Bills & Utilities',
  GOVERNMENT_AND_NON_PROFIT: 'Taxes',
  TRANSPORTATION: 'Transportation',
  TRAVEL: 'Travel',
  RENT_AND_UTILITIES: 'Bills & Utilities',
}

// Plaid's legacy `category[0]`, still returned for older items.
const PLAID_LEGACY: Record<string, Category> = {
  'FOOD AND DRINK': 'Food & Dining',
  SHOPS: 'Shopping',
  TRAVEL: 'Travel',
  RECREATION: 'Entertainment',
  HEALTHCARE: 'Health & Fitness',
  SERVICE: 'Bills & Utilities',
  'BANK FEES': 'Fees & Charges',
  PAYMENT: 'Loan Payments',
  TRANSFER: 'Transfer',
  COMMUNITY: 'Gifts & Donations',
  TAX: 'Taxes',
  INTEREST: 'Fees & Charges',
  'CASH ADVANCE': 'Transfer',
}

// Aliases for values that arrive from the AI categoriser, older app versions,
// or a user typing a near-miss.
const ALIASES: Record<string, Category> = {
  FOOD: 'Food & Dining',
  DINING: 'Food & Dining',
  RESTAURANTS: 'Food & Dining',
  'FOOD AND DINING': 'Food & Dining',
  GROCERY: 'Groceries',
  SUPERMARKETS: 'Groceries',
  COFFEE: 'Coffee',
  'COFFEE SHOPS': 'Coffee',
  SHOPPING: 'Shopping',
  MERCHANDISE: 'Shopping',
  TRANSPORT: 'Transportation',
  GAS: 'Transportation',
  FUEL: 'Transportation',
  AUTO: 'Transportation',
  BILLS: 'Bills & Utilities',
  UTILITIES: 'Bills & Utilities',
  'BILLS AND UTILITIES': 'Bills & Utilities',
  RENT: 'Rent',
  MORTGAGE: 'Rent',
  HEALTH: 'Health & Fitness',
  FITNESS: 'Health & Fitness',
  MEDICAL: 'Health & Fitness',
  'HEALTH AND FITNESS': 'Health & Fitness',
  EDUCATION: 'Education',
  'PERSONAL CARE': 'Personal Care',
  'HOME IMPROVEMENT': 'Home Improvement',
  HOME: 'Home Improvement',
  INSURANCE: 'Insurance',
  SUBSCRIPTION: 'Subscriptions',
  SUBSCRIPTIONS: 'Subscriptions',
  GIFTS: 'Gifts & Donations',
  DONATIONS: 'Gifts & Donations',
  'GIFTS AND DONATIONS': 'Gifts & Donations',
  CHARITY: 'Gifts & Donations',
  FEES: 'Fees & Charges',
  'BANK FEES': 'Fees & Charges',
  'FEES AND CHARGES': 'Fees & Charges',
  LOAN: 'Loan Payments',
  LOANS: 'Loan Payments',
  DEBT: 'Loan Payments',
  'LOAN PAYMENTS': 'Loan Payments',
  TAX: 'Taxes',
  TAXES: 'Taxes',
  SALARY: 'Income',
  PAYCHECK: 'Income',
  INCOME: 'Income',
  TRANSFER: 'Transfer',
  TRANSFERS: 'Transfer',
  ENTERTAINMENT: 'Entertainment',
  TRAVEL: 'Travel',
  UNCATEGORIZED: 'Uncategorized',
}

// Comparison key: upper-cased, punctuation folded to spaces, runs collapsed.
// "FOOD_AND_DRINK", "Food & Dining" and "food and dining" all reduce to a form
// that can be looked up.
function key(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/&/g, ' AND ')
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

const BY_KEY = new Map<string, Category>()
for (const category of CATEGORIES) BY_KEY.set(key(category), category)
for (const [raw, category] of Object.entries(PLAID_PRIMARY)) BY_KEY.set(key(raw), category)
for (const [raw, category] of Object.entries(PLAID_LEGACY)) BY_KEY.set(key(raw), category)
for (const [raw, category] of Object.entries(ALIASES)) BY_KEY.set(key(raw), category)

/**
 * Maps any category string — Plaid, AI, user-entered, legacy — onto the
 * canonical vocabulary. Unrecognised values fall back to `Uncategorized`
 * rather than silently forming a category of one.
 */
export function canonicalCategory(raw: string | null | undefined): Category {
  if (!raw) return UNCATEGORIZED
  const normalised = key(raw)
  if (!normalised) return UNCATEGORIZED

  const direct = BY_KEY.get(normalised)
  if (direct) return direct

  // Plaid appends a detail suffix on some values (FOOD_AND_DRINK_COFFEE).
  // Walk the prefix back a word at a time before giving up.
  const words = normalised.split(' ')
  for (let end = words.length - 1; end >= 1; end--) {
    const prefix = BY_KEY.get(words.slice(0, end).join(' '))
    if (prefix) return prefix
  }

  return UNCATEGORIZED
}

export function isCanonicalCategory(value: string | null | undefined): value is Category {
  return !!value && CATEGORY_SET.has(value)
}

/** Categories a user can budget against — spending only. */
export const BUDGETABLE_CATEGORIES: Category[] = CATEGORIES.filter(
  (c) => c !== 'Income' && c !== 'Transfer' && c !== 'Uncategorized'
)

/** Sums transaction amounts per canonical category. */
export function totalsByCategory(
  transactions: { amount: number; merchantCategory: string | null }[]
): Record<string, number> {
  const totals: Record<string, number> = {}
  for (const t of transactions) {
    const category = canonicalCategory(t.merchantCategory)
    totals[category] = (totals[category] || 0) + Math.abs(t.amount)
  }
  return totals
}
