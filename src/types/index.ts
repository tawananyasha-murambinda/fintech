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
  alternatives: {
    name: string
    estimatedSavings: number
    reason: string
    distance?: string
  }[]
}

export interface LocationInsight {
  city: string
  country: string
  totalSpent: number
  topCategories: string[]
  suggestions: string[]
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
}

export interface DashboardStats {
  totalBalance: number
  monthlyIncome: number
  monthlyExpenses: number
  netCashflow: number
  savingsRate: number
  linkedAccounts: number
}
