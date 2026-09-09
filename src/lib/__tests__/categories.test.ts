import { describe, it, expect } from 'vitest'
import { canonicalCategory, totalsByCategory, BUDGETABLE_CATEGORIES, CATEGORIES } from '../categories'

describe('canonicalCategory', () => {
  it('maps Plaid primary categories onto the app vocabulary', () => {
    // The bug this fixes: a budget saved as "Food & Dining" never matched a
    // transaction Plaid labelled FOOD_AND_DRINK, so every budget read £0 spent.
    expect(canonicalCategory('FOOD_AND_DRINK')).toBe('Food & Dining')
    expect(canonicalCategory('GENERAL_MERCHANDISE')).toBe('Shopping')
    expect(canonicalCategory('RENT_AND_UTILITIES')).toBe('Bills & Utilities')
    expect(canonicalCategory('LOAN_PAYMENTS')).toBe('Loan Payments')
  })

  it('maps Plaid legacy categories', () => {
    expect(canonicalCategory('Food and Drink')).toBe('Food & Dining')
    expect(canonicalCategory('Shops')).toBe('Shopping')
    expect(canonicalCategory('Healthcare')).toBe('Health & Fitness')
  })

  it('is stable on values already canonical', () => {
    for (const category of CATEGORIES) {
      expect(canonicalCategory(category)).toBe(category)
    }
  })

  it('folds punctuation, case and separators', () => {
    expect(canonicalCategory('food and dining')).toBe('Food & Dining')
    expect(canonicalCategory('FOOD & DINING')).toBe('Food & Dining')
    expect(canonicalCategory('food_and_dining')).toBe('Food & Dining')
  })

  it('walks back a Plaid detail suffix to its primary category', () => {
    expect(canonicalCategory('FOOD_AND_DRINK_COFFEE')).toBe('Food & Dining')
    expect(canonicalCategory('TRANSPORTATION_TAXIS_AND_RIDE_SHARES')).toBe('Transportation')
  })

  it('falls back to Uncategorized rather than inventing a category of one', () => {
    expect(canonicalCategory('ZZZ_UNKNOWN_THING')).toBe('Uncategorized')
    expect(canonicalCategory(null)).toBe('Uncategorized')
    expect(canonicalCategory('')).toBe('Uncategorized')
    expect(canonicalCategory('   ')).toBe('Uncategorized')
  })
})

describe('totalsByCategory', () => {
  it('sums differently-spelled categories into one bucket', () => {
    const totals = totalsByCategory([
      { amount: -10, merchantCategory: 'FOOD_AND_DRINK' },
      { amount: -15, merchantCategory: 'Food & Dining' },
      { amount: -5, merchantCategory: 'food and dining' },
    ])

    expect(totals['Food & Dining']).toBe(30)
    expect(Object.keys(totals)).toHaveLength(1)
  })

  it('uses absolute amounts so debit sign conventions do not cancel out', () => {
    const totals = totalsByCategory([
      { amount: -10, merchantCategory: 'TRAVEL' },
      { amount: 10, merchantCategory: 'TRAVEL' },
    ])

    expect(totals['Travel']).toBe(20)
  })
})

describe('BUDGETABLE_CATEGORIES', () => {
  it('excludes categories you cannot meaningfully budget against', () => {
    expect(BUDGETABLE_CATEGORIES).not.toContain('Income')
    expect(BUDGETABLE_CATEGORIES).not.toContain('Transfer')
    expect(BUDGETABLE_CATEGORIES).not.toContain('Uncategorized')
    expect(BUDGETABLE_CATEGORIES).toContain('Food & Dining')
  })
})
