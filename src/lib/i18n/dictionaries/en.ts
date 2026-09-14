// English — the source dictionary.
//
// Its shape is exported as `Dictionary`, and every other language is typed
// against it. A missing or misspelled key is then a compile error rather than
// a screen that silently falls back to English in production.
//
// Placeholders are `{name}` and substituted at call time.

export const en = {
  nav: {
    home: 'Home',
    activity: 'Activity',
    cards: 'Cards',
    insights: 'Insights',
    assistant: 'Assistant',
    settings: 'Settings',
  },

  common: {
    save: 'Save',
    saving: 'Saving…',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    add: 'Add',
    close: 'Close',
    back: 'Back',
    seeAll: 'See all',
    loading: 'Loading…',
    somethingWentWrong: 'Something went wrong. Please try again.',
    notAvailable: 'Not available',
    today: 'Today',
    yesterday: 'Yesterday',
    perDay: 'a day',
    of: 'of',
  },

  dashboard: {
    balance: 'Balance',
    allAccounts: 'All accounts',
    accountsCount: '{count} accounts',
    moneyIn: 'In',
    moneyOut: 'Out',
    dailySpend: 'Daily spend',
    daysCount: '{count} days',
    whereItWent: 'Where it went',
    recent: 'Recent',
    addTransaction: 'Add transaction',
    allActivity: 'All activity',
    onLastMonth: '{percent}% on last month',
    noBalanceYet:
      'Your bank has not reported a balance yet. Pull down to refresh, or open an account for its recent activity.',
    excludesAccounts: 'Excludes {count} account(s) with no reported balance',
    addFirstAccount: 'Add your first account',
    addFirstAccountBody: 'Connect a bank to see balances and spending in one place.',
  },

  safeToSpend: {
    title: 'Safe to spend',
    titleNegative: 'Short before payday',
    how: 'How?',
    hide: 'Hide',
    perDayUntil: 'About {amount} a day for {days} day(s) {horizon}',
    paidBy: ', when {source} pays you.',
    untilEndOfMonth: 'until the end of the month',
    untilDate: 'until {date}',
    shortBody: 'Your bills come to {committed} {horizon}, which is more than the {balance} you have.',
    balanceRow: 'Balance',
    billsRow: 'Bills due {horizon}',
    leftRow: 'Left',
    reviewAccounts: 'Review accounts',
  },

  transactions: {
    title: 'Transactions',
    count: '{count} transactions',
    income: 'Income',
    expenses: 'Expenses',
    net: 'Net',
    exportCsv: 'Export CSV',
    preparing: 'Preparing…',
    exportFailed: 'Export failed.',
    searchPlaceholder: "Try 'coffee over 5 last month' or 'income this year'",
    matches: '{count} match(es)',
    noResults: 'No transactions found.',
    pending: 'Pending',
    page: 'Page {page} of {pages}',
    previous: 'Previous',
    next: 'Next',
  },

  detail: {
    title: 'Transaction',
    split: 'Split',
    addPart: 'Add a part',
    splitHelp:
      'Assign part of this to another category — the shop that was partly work supplies, or a bill you share.',
    splitAmount: 'Split amount',
    splitCategory: 'Split category',
    removePart: 'Remove this part',
    markBusiness: 'Mark these parts as business spend',
    unassigned: '{amount} unassigned',
    overTransaction: '{amount} over the transaction',
    saveSplit: 'Save split',
    receipt: 'Receipt',
    viewReceipt: 'View receipt',
    attachPhoto: 'Attach a photo',
    uploading: 'Uploading…',
    receiptNote:
      'Stored against your account. Receipts attach directly to manual entries; for bank transactions this keeps the photo alongside your records.',
  },

  goals: {
    title: 'Goals',
    toGo: '{amount} to go',
    completed: 'Completed!',
    amount: 'Amount',
    addFunds: 'Add',
    takeOut: 'Take out',
    reached: 'That completes this goal — nicely done.',
    couldNotRecord: 'Could not record that.',
  },

  settings: {
    title: 'Settings',
    language: 'Language',
    languageDescription: 'The language used across the app.',
    preferences: 'Preferences',
  },

  auth: {
    signIn: 'Sign in',
    signOut: 'Sign out',
    email: 'Email address',
    password: 'Password',
    forgotPassword: 'Forgot password?',
    noAccount: "Don't have an account?",
    createOne: 'Create one',
    invalidCredentials: 'Invalid email or password.',
    authCode: 'Authentication code',
    authCodeHelp: 'From your authenticator app. You can also use one of your recovery codes.',
    verifyCode: 'Verify code',
    codeWrong: 'That code is not right. Try the current one from your app.',
    lockedOut: 'Too many failed attempts. Try again in about 15 minutes.',
    signingIn: 'Signing in…',
    continueWithGoogle: 'Continue with Google',
    or: 'or',
  },
  // Period labels, interpolated into budget copy. Kept here rather than built
  // in budget-period.ts so "this month" is translatable everywhere it appears.
  periods: {
    thisWeek: 'this week',
    thisMonth: 'this month',
    thisQuarter: 'this quarter',
    weekly: 'weekly',
    monthly: 'monthly',
    quarterly: 'quarterly',
  },

  // Alerts are composed on the server when the nightly job runs, so they are
  // translated at creation time using the account's language — not rendered
  // through a hook like the rest of the interface.
  alerts: {
    spendingUpTitle: 'Spending increased significantly',
    spendingUpMessage:
      'Your spending is up {percent}% this month ({previous} → {current}). Review your top categories to find areas to cut back.',
    budgetExceededTitle: 'Budget exceeded: {category}',
    budgetExceededMessage:
      "You've spent {spent} of your {budget} {period} budget for {category} ({window}). Consider adjusting or pausing non-essential spend.",
    onPaceTitle: 'On pace to exceed: {category}',
    onPaceMessage:
      "You've used {used}% of your {category} budget with {remaining}% of {window} left. About {daily} a day keeps you inside it.",
    categorySpikeTitle: '{category} spending spike',
    categorySpikeMessage:
      'Your {category} spending jumped to {current} ({percent}% increase from {previous}). Check if this is a one-time expense or a new pattern.',
    anomalyHeading: '{title}: {merchant}',
  },

  anomalies: {
    amountOutlierTitle: 'Unusually large {category} charge',
    amountOutlierMessage:
      '{merchant} charged {amount} — your typical {category} spend is around {typical}.',
    newMerchantTitle: 'Large charge at a new merchant',
    newMerchantMessage:
      '{merchant} charged {amount} and has not appeared in your history before. Worth confirming you recognise it.',
    duplicateTitle: 'Possible duplicate charge',
    duplicateMessage:
      '{merchant} charged {amount} {count} times on the same day. If it was a single purchase, this is worth disputing.',
  },

  notifications: {
    billDueToday: 'Bill due today',
    billDueInDays: 'Bill due in {days} day(s)',
    billReminderBody: '{name} — {amount} is due {when}.',
    dueToday: 'today',
    dueInDays: 'in {days} day(s)',
    goalReached: 'Goal reached',
    goalReachedBody: 'You hit your {name} goal.',
  },
} as const

export type Dictionary = {
  [Section in keyof typeof en]: Record<keyof (typeof en)[Section], string>
}
