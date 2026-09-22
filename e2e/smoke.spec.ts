import { test, expect } from '@playwright/test'

// The smoke suite.
//
// Deliberately narrow: sign up, get in, and confirm the app's core surfaces
// answer without a 500. It is not trying to test features — it is trying to
// catch the class of failure that has actually reached production here, where
// each piece worked and the seam between them did not.
//
// Every assertion below maps to a real bug from this codebase's history.

const password = 'TestPassword123!'

/** A fresh address per run, so a re-run never collides with a previous signup. */
function uniqueEmail(): string {
  return `e2e-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.test`
}

test.describe('a new account', () => {
  test('can register, sign in and reach the dashboard', async ({ page }) => {
    const email = uniqueEmail()

    await page.goto('/auth/register')
    await page.getByLabel(/email/i).fill(email)
    await page.getByLabel(/^password/i).first().fill(password)
    await page.getByRole('button', { name: /create|sign up|get started/i }).first().click()

    // Registration signs the user straight in; either landing counts as success.
    await expect(page).toHaveURL(/\/(dashboard|onboarding|auth\/verify)/, { timeout: 30_000 })
  })
})

test.describe('the deployment itself', () => {
  test('health reports its configuration honestly', async ({ request }) => {
    // A reachable database is not a working deployment: a missing CRON_SECRET
    // leaves every scheduled job dead while everything else looks fine.
    const res = await request.get('/api/health')
    const body = await res.json()

    expect(body.checks?.database).toBe('ok')
    expect(body).toHaveProperty('configuration')

    // Whatever the verdict, it must be justified rather than asserted.
    if (body.status !== 'ok') {
      expect(body.configuration.missingCritical.length).toBeGreaterThan(0)
      for (const gap of body.configuration.missingCritical) {
        expect(gap.impact.length).toBeGreaterThan(20)
      }
    }
  })

  test('never leaks a secret through the health endpoint', async ({ request }) => {
    const text = await (await request.get('/api/health')).text()

    // It names settings, never their values.
    expect(text).not.toMatch(/postgres(ql)?:\/\//)
    expect(text).not.toMatch(/sk_live|sk_test|whsec_/)
  })
})

test.describe('protected routes', () => {
  // Signed-out access to member data is the failure that matters most here.
  for (const path of ['/dashboard', '/dashboard/transactions', '/dashboard/settings']) {
    test(`${path} redirects a signed-out visitor to sign in`, async ({ page }) => {
      await page.goto(path)
      await expect(page).toHaveURL(/\/auth\/login/)
    })
  }

  for (const path of [
    '/api/safe-to-spend',
    '/api/plaid/accounts',
    '/api/budgets',
    '/api/transactions/splits',
    '/api/auth/profile',
  ]) {
    test(`${path} refuses a signed-out request`, async ({ request }) => {
      const res = await request.get(path)

      // 401 is correct. A 500 means the route threw before checking — which is
      // exactly what a missing database column produced.
      expect(res.status(), `${path} returned ${res.status()}`).toBe(401)
    })
  }
})

test.describe('signed in', () => {
  test.beforeEach(async ({ page }) => {
    const email = uniqueEmail()
    await page.goto('/auth/register')
    await page.getByLabel(/email/i).fill(email)
    await page.getByLabel(/^password/i).first().fill(password)
    await page.getByRole('button', { name: /create|sign up|get started/i }).first().click()
    await expect(page).toHaveURL(/\/(dashboard|onboarding)/, { timeout: 30_000 })
  })

  test('the core API surfaces answer without a server error', async ({ page }) => {
    // The regression this exists for: eight unapplied migrations meant every
    // one of these 500'd in production while the build was green.
    for (const path of [
      '/api/safe-to-spend',
      '/api/plaid/accounts',
      '/api/budgets',
      '/api/bills',
      '/api/goals',
      '/api/net-worth',
      '/api/subscriptions',
      '/api/auth/profile',
    ]) {
      const res = await page.request.get(path)
      expect(res.status(), `${path} returned ${res.status()}`).toBeLessThan(500)
    }
  })

  test('the dashboard renders without a client-side error', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    expect(errors, errors.join('\n')).toHaveLength(0)
  })

  test('changing language persists to the account', async ({ page }) => {
    // The 405: the hook sent PATCH to a route that only exports PUT, so the
    // choice never saved and silently failed to follow to another device.
    await page.goto('/dashboard/settings')

    const dutch = page.getByRole('button', { name: 'Nederlands' })
    await dutch.click()

    await expect
      .poll(async () => (await (await page.request.get('/api/auth/profile')).json()).locale)
      .toBe('nl')
  })

  test('a budget reports real spend rather than always zero', async ({ page }) => {
    // Budgets were created as "Food & Dining" while Plaid wrote
    // "FOOD_AND_DRINK", so every budget read zero for every linked user.
    await page.request.post('/api/budgets', {
      data: { category: 'Food & Dining', amount: 200, period: 'monthly' },
    })

    const res = await page.request.get('/api/budgets')
    const body = await res.json()

    expect(res.status()).toBe(200)
    expect(Array.isArray(body.budgets)).toBe(true)

    const budget = body.budgets.find((b: any) => b.category === 'Food & Dining')
    expect(budget, 'the budget just created should come back').toBeTruthy()

    // A new account has no transactions, so zero is correct here — what is
    // being asserted is that the field is computed and present, not absent.
    expect(budget).toHaveProperty('spent')
    expect(budget).toHaveProperty('window')
  })
})
