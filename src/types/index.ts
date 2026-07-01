export interface Transaction {
  id: string
  date: string
  amount: number
  direction: 'credit' | 'debit'
  description: string
  merchantName?: string
  merchantCategory?: string
  merchantCity?: string
  merchantState?: string
  merchantCountry?: string
  status: 'posted' | 'pending'
  type?: string
  runningBalance?: number
}

export interface LinkedBank {
  id: string
  institutionName: string
  accountType: string
  accountName: string
  currency: string
  lastSynced?: string
}

export interface SpendingCategory {
  category: string
  total: number
  count: number
  percentage: number
  trend: number // % change vs previous period
  transactions: Transaction[]
}

export interface CashflowPoint {
  date: string
  income: number
  expenses: number
  net: number
}

export interface MerchantAlternative {
  merchantName: string
  category: string
  totalSpent: number
  visitCount: number
  avgTransaction: number
  locationContext?: string
  alternatives: {
    name: string
    estimatedSavings: number
    originalCost: number
    alternativeCost: number
    reason: string
    distance?: string
    type: 'primary' | 'secondary'
    detail?: string
  }[]
}

export interface LocationInsight {
  city: string
  country: string
  totalSpent: number
  topCategories: string[]
  suggestions: string[]
}

export interface SubscriptionOverlap {
  category: string
  merchants: { name: string; monthlyEstimate: number }[]
  totalMonthly: number
  suggestion: string
}

export interface RecurringTrend {
  merchantName: string
  category: string
  avgAmount: number
  transactionCount: number
  trendPercent: number // positive means price increased
  suggestion: string
}

export interface WhatIfScenario {
  label: string
  description: string
  monthlyImpact: number
  yearlyImpact: number
  difficulty: 'easy' | 'medium' | 'hard'
}

export interface CashflowForecast {
  date: string
  predictedBalance: number
  expectedIncome: number
  expectedExpenses: number
}

export interface SpendingPattern {
  title: string
  description: string
  value: string
  insight: string
}

export interface AiAnalysis {
  summary: string
  topInsight: string
  categoryBreakdown: SpendingCategory[]
  merchantAlternatives: MerchantAlternative[]
  locationInsights: LocationInsight[]
  savingsOpportunities: {
    title: string
    description: string
    estimatedMonthlySavings: number
    difficulty: 'easy' | 'medium' | 'hard'
  }[]
  cashflowHealth: 'excellent' | 'good' | 'fair' | 'concerning'
  monthlyBudgetSuggestion: number
  // Unique features
  subscriptionOverlaps: SubscriptionOverlap[]
  recurringTrends: RecurringTrend[]
  whatIfScenarios: WhatIfScenario[]
  cashflowForecast: CashflowForecast[]
  spendingPatterns: SpendingPattern[]
  merchantConcentrationRisk: {
    merchantName: string
    percentOfExpenses: number
    riskLevel: 'low' | 'medium' | 'high'
  }[]
  hiddenRecurringCharges: { merchantName: string; amount: number; frequency: string; detectedAt: string }[]
  sustainabilityScore?: number // 0-100
}

export interface DashboardStats {
  totalBalance: number
  monthlyIncome: number
  monthlyExpenses: number
  netCashflow: number
  savingsRate: number
  linkedAccounts: number
}

export interface CategorizationRule {
  id: string
  matchType: 'merchant' | 'description' | 'amount_lt' | 'amount_gt'
  matchValue: string
  category: string
  priority: number
  isActive: boolean
}

export interface Alert {
  id: string
  type: 'overspend' | 'price_change' | 'duplicate' | 'bill_reminder' | 'goal_progress'
  title: string
  message: string
  severity: 'info' | 'warning' | 'critical'
  read: boolean
  data?: any
  createdAt: string
}

export interface Asset {
  id: string
  name: string
  type: 'checking' | 'savings' | 'investment' | 'crypto' | 'property' | 'vehicle' | 'other'
  value: number
  notes?: string
}

export interface Liability {
  id: string
  name: string
  type: 'credit_card' | 'student_loan' | 'mortgage' | 'auto_loan' | 'personal_loan' | 'other'
  balance: number
  interestRate?: number
  minPayment?: number
  notes?: string
}

export interface DebtPlan {
  id: string
  liabilityId: string
  liability?: Liability
  strategy: 'snowball' | 'avalanche' | 'custom'
  extraPayment: number
  targetDate?: string
  totalInterestSaved?: number
  payoffDate?: string
}

export interface TaxEntry {
  id: string
  year: number
  type: 'deduction' | 'income' | 'donation' | 'business_expense' | 'medical' | 'education' | 'other'
  description: string
  amount: number
  category?: string
  date?: string
}

export interface Investment {
  id: string
  name: string
  type: 'stock' | 'etf' | 'mutual_fund' | 'crypto' | 'bond' | 'real_estate' | 'other'
  shares?: number
  costBasis?: number
  currentPrice?: number
  ticker?: string
  notes?: string
}

export interface CreditScore {
  id: string
  score: number
  provider?: string
  createdAt: string
}

export interface ManualTransaction {
  id: string
  date: string
  amount: number
  direction: 'credit' | 'debit'
  description: string
  merchantName?: string
  merchantCategory?: string
  receiptUrl?: string
}
