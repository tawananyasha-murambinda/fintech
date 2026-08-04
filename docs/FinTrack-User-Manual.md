# FinTrack User Manual

**Version:** 1.0  
**Applies to:** FinTrack web application, Android app, and iOS app  
**Document type:** End-user guide

---

## 1. About FinTrack

FinTrack is a personal finance application that brings your bank accounts, spending, budgets, and financial goals into one place. It is a tool for understanding your finances, not a bank. FinTrack does not hold your money, and it cannot initiate payments or transfers.

This manual explains each screen in the application and the tasks you can complete with it. The mobile app and the website share the same features. Instructions in this manual apply to both unless a section says otherwise.

### 1.1 Key terms

| Term | Meaning |
|---|---|
| Account | A bank account or card you have linked to FinTrack |
| Transaction | A single payment into or out of an account |
| Debit | Money leaving an account |
| Credit | Money entering an account |
| Category | A spending group, such as Groceries or Transport |
| Budget | A limit you set for spending in a category over a period |
| Goal | A savings target with an amount and, optionally, a deadline |
| Vault | A ring-fenced savings pot separate from your main balance |
| Insight | An AI-generated summary of your spending |
| Sync | Downloading the latest transactions from your bank |

---

## 2. Getting started

### 2.1 Creating an account

1. Open the FinTrack website or mobile app.
2. Select **Get started**.
3. Enter your name, email address, and a password of at least 8 characters.
4. Select **Create account**.
5. Open the verification email we send you and select **Verify email**.

Your account is active only after you verify your email address. If you do not receive the email, check your spam folder and select **Resend** on the verification screen.

### 2.2 Signing in

1. Select **Sign in**.
2. Enter your email and password.
3. Select **Sign in**.

You can also sign in with Google or GitHub if you prefer. The first time you sign in with one of these, your email address is treated as verified.

### 2.3 Recovering a forgotten password

1. On the sign-in screen, select **Forgot password**.
2. Enter the email address for your account.
3. Open the reset email and follow the link.
4. Set a new password and sign in.

Reset links expire after one hour.

### 2.4 Linking your first bank account

1. Sign in and open the dashboard.
2. Select **Link account** (or **Add account** on the accounts screen).
3. Choose your bank from the list. In the United States and supported European countries, you can also search for your bank.
4. Sign in to your bank and approve the connection.
5. Return to FinTrack. Your accounts and recent transactions appear automatically.

FinTrack connects to banks through Plaid open banking. Connections are read-only. FinTrack never sees your online banking password, and it cannot transfer money out of your accounts.

### 2.5 The navigation bar

- **Home.** Your balance and monthly summary.
- **Activity.** All transactions.
- **Cards.** Your linked accounts.
- **Insights.** AI spending analysis.
- **Assistant.** The AI chat.

On the web, the same destinations are available from the sidebar on desktop and the top bar.

---

## 3. Home screen

The Home screen shows your financial position at a glance.

- **Balance.** Your combined balance across all accounts, or the balance of a single account you have selected.
- **Account picker.** Select **Accounts** to switch between individual accounts and the combined view.
- **Quick actions.** **Add money** opens the transaction form. **Move** opens the savings vault. **Details** opens the cards and accounts screen. **More** opens account colour options.
- **This month.** Money in and money out for the current month.
- **Recent activity.** Your five most recent transactions.
- **Top spending.** The categories where you spent the most this month.

To refresh your data, pull down from the top of the screen (mobile) or select the sync button (web).

### 3.1 Account colours

Each linked account is assigned a colour so you can recognise it at a glance. To change it:

1. On the Home screen, select **More**.
2. Select **Card colour**.
3. Pick a colour. The change applies to the selected account.

---

## 4. Accounts and cards

The Cards and accounts screen lists every account you have linked.

For each account you can see:

- The bank or institution name.
- The account name and type (checking, savings, credit, and so on).
- The last time the account was synced.

To remove an account, select **Unlink**. This disconnects the bank link and removes imported transactions. Your money in the bank is not affected in any way.

### 4.1 Why is my balance or activity out of date?

Transactions sync when you open the app and when you select the sync button. In some cases your bank limits how often third parties can pull data. If an account shows **Not synced** for more than a day, select the sync button or unlink and link the account again.

---

## 5. Activity and transactions

The Activity screen lists all your transactions, newest first.

### 5.1 Understanding a transaction

Each transaction shows:

- The merchant or description.
- The amount, with a minus sign for money out.
- The date.
- The category (for example, Groceries or Transport).

### 5.2 Searching and filtering

1. Open the Activity screen.
2. Select the filter icon.
3. Enter a search term to find transactions by merchant or description.
4. Use the filters to narrow results by date, category, or amount.

### 5.3 Adding a transaction manually

Use this for cash payments or anything your bank does not import.

1. Select **Add money** on the Home screen (mobile) or open the Manual entry screen (web).
2. Enter a description.
3. Enter the amount.
4. Choose **Money out** or **Money in**.
5. Select **Add transaction**.

You can attach a receipt to a manual transaction in the Manual entry screen.

### 5.4 Categorising transactions

FinTrack assigns a category automatically. To change it:

1. Open the transaction from the Activity screen.
2. Select the category and choose a new one.

To make a change permanent, create a rule (section 13.4) so future transactions from the same merchant are categorised automatically.

---

## 6. Budgets

Budgets set a limit on how much you want to spend in a category over a week, a month, or a quarter.

### 6.1 Creating a budget

1. Open the Budgets screen.
2. Select **New budget**.
3. Choose a category.
4. Enter the limit.
5. Choose the period (weekly, monthly, or quarterly).
6. Select **Save**.

The budget screen shows how much you have spent against each limit, and the percentage remaining. You receive an alert when you approach or exceed a limit.

---

## 7. Savings goals

Goals track progress toward a specific savings target.

### 7.1 Creating a goal

1. Open the Savings goals screen.
2. Select **New goal**.
3. Enter a name and a target amount.
4. Optionally set a deadline and choose a colour.
5. Select **Save**.

To record progress, open the goal and add an amount. The progress bar updates automatically.

### 7.2 The savings vault

The vault is a ring-fenced savings pot.

1. Open the Savings vault screen.
2. Select **New pot**, give it a name, and optionally set a target.
3. Move money into a pot with **Move** from the Home screen.

**Round-ups.** When round-ups are enabled, FinTrack rounds eligible card payments up to the nearest whole unit and counts the difference toward a selected pot. Round-ups are a tracking convenience, not a real transfer; they calculate what you could set aside. To actually set the money aside, move it yourself.

---

## 8. Bills

The Bills screen tracks recurring payments so you do not miss a due date.

### 8.1 Adding a bill

1. Open the Bills screen.
2. Select **New bill**.
3. Enter the name (for example, Rent) and the amount.
4. Set the due day of the month and the frequency (monthly, quarterly, or yearly).
5. Choose how many days before the due date you want a reminder.
6. Select **Save**.

You receive in-app and push notifications according to your reminder preference. You can pause a bill at any time by switching it to inactive.

---

## 9. Debt planner

The Debt planner helps you decide how to pay down debts.

1. Open the Debt planner screen.
2. Select **New liability** and enter the balance, interest rate, and minimum payment.
3. Select a strategy:
   - **Snowball.** Pay off the smallest balance first. Fast early wins.
   - **Avalanche.** Pay off the highest interest rate first. Lowest total interest.
4. Enter an extra monthly payment.

FinTrack estimates your payoff date and the interest you will save. You can update the figures as your situation changes.

---

## 10. Net worth

The Net worth screen combines your assets and liabilities into a single picture.

- **Assets.** Cash, property, vehicles, investments, and anything else you own. Add these in the Net worth screen.
- **Liabilities.** Credit card balances, loans, and mortgages. These are the debts from the Debt planner.

Your net worth is total assets minus total liabilities. Track it over time to see your financial position improving.

### 10.1 Investments

The Investments screen tracks holdings such as stocks, funds, and cryptocurrency. Enter the name, type, quantity, cost basis, and current price. Values are as you enter them; FinTrack does not fetch live market data.

### 10.2 Credit score

The Credit score screen stores credit score readings you enter yourself, from sources such as your bank or a credit reference agency. Keep a monthly log to see the trend.

---

## 11. Insights and the Assistant

### 11.1 Insights

The Insights screen generates a full analysis of your spending:

1. Open the Insights screen.
2. Choose a period: week, month, or quarter.
3. Select **Run analysis**.

The analysis covers categories, top merchants, savings opportunities, cashflow health, subscriptions you might be paying twice for, recurring cost trends, and more. Results are cached for an hour; select **Re-analyse** for a fresh run.

Insights are generated by AI and may not always be accurate. Treat them as a starting point, not as financial advice.

### 11.2 The Assistant

The Assistant answers questions about your finances in plain language. Ask things like:

- How much did I spend on groceries last month?
- What was my income in March?
- Am I on track with my budget?
- Where can I save money?

Your questions and our answers appear in the Assistant chat. The chat history is stored with your account so you can return to previous conversations.

When the AI provider is unavailable, a built-in engine answers from your transaction data so the Assistant still works.

---

## 12. Alerts and notifications

Alerts appear in the notifications bell at the top of the screen and, when enabled, as push notifications.

Alert types:

| Type | Trigger |
|---|---|
| Overspend | A category budget is approached or exceeded |
| Price change | A merchant's typical charge changes noticeably |
| Duplicate | The same subscription appears to be billed twice |
| Bill reminder | A tracked bill is due soon |
| Goal progress | A goal milestone is reached |

### 12.1 Managing notifications

1. Open Settings.
2. Select **Notifications**.
3. Choose which alert types you want to receive.

For push notifications to work on a browser, you must allow notifications when the browser asks. Mobile push notifications are enabled separately in the mobile app settings.

---

## 13. Settings

Settings is organised into the following sections.

### 13.1 Profile

Change your name and email address. When you change your email, you must confirm the new address by email.

### 13.2 Security

- Change your password. We ask you to re-enter your current password.
- Enable biometric unlock on supported mobile devices.
- Delete your account. Deleting is permanent: it removes your profile, linked accounts, transactions, and all stored data. Your bank accounts are not affected.

### 13.3 Preferences

- **Currency.** Choose the currency used for display across the app.
- **Compact mode.** Reduce spacing in lists and cards to fit more on screen.

### 13.4 Privacy

- **Auto-sync transactions.** Controls whether FinTrack downloads new transactions automatically.
- **Rules.** Create rules so transactions matching a merchant, description, or amount are categorised automatically. Rules apply in priority order.

### 13.5 Location

FinTrack can use your approximate location to suggest cheaper local alternatives for merchants you visit. You can disable location tracking here at any time.

### 13.6 Notifications

See section 12.1.

---

## 14. Reports and the tax organizer

### 14.1 Reports

The Reports screen summarises a month of income, expenses, and savings. Open a month to see totals, category breakdowns, and cashflow. Reports are generated from the transactions you have imported.

### 14.2 Tax organizer

The Tax organizer stores tax-related records by year:

- Income entries.
- Deductions and business expenses.
- Donations.
- Medical and education expenses.

Open the Tax organizer, select a tax year, and add entries. This is a record-keeping tool; FinTrack does not prepare or file your tax return.

---

## 15. Household accounts

Household accounts let several people share a financial picture.

1. Open the Household screen.
2. Create a household and invite members by email.
3. Members who accept the invitation can view and manage shared goals, budgets, and bills.

The person who creates the household is the owner. Owners can remove members. Household features are optional; you can use FinTrack entirely on your own.

---

## 16. Security and privacy at a glance

- FinTrack uses read-only bank connections through Plaid. It cannot move money.
- Bank access tokens are encrypted and never shown to you or anyone else.
- Passwords are stored as one-way hashes.
- You can export your data and delete your account at any time from Settings.

If you believe your account has been compromised, change your password immediately and unlink any accounts you did not connect yourself.

---

## 17. Troubleshooting

| Problem | Solution |
|---|---|
| I did not receive the verification email | Check spam; select Resend on the verification screen |
| A bank will not link | Confirm your bank supports open banking in your country; try a different browser |
| Transactions are missing | Select the sync button; check the account is not showing Not synced |
| The Assistant will not answer | Check your internet connection; the built-in engine still works without the AI provider |
| The app looks wrong after an update | Refresh the page; close and reopen the mobile app |
| I want to stop using FinTrack | Unlink your accounts, then delete your account in Settings |
