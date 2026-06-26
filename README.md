# FinTrack

Intelligent personal finance app. Links to your bank via Plaid.io, analyzes spending with Claude AI, and provides actionable insights to save money and reach financial goals.

---

## Stack

- **Framework:** Next.js 14 (App Router) + TypeScript
- **Database:** PostgreSQL via Prisma ORM
- **Auth:** NextAuth.js — email/password + Google + GitHub OAuth
- **Bank connectivity:** Plaid.io (US + EU open banking)
- **AI intelligence:** Anthropic Claude (claude-sonnet-4-6)
- **AI Chat:** Local fallback engine with full transaction data analysis (no API key required)
- **UI:** Tailwind CSS + Recharts (cashflow charts, category donut charts)
- **Animations:** Custom CSS keyframes (18+ animations: fade-up, slide-in, bounce-in, scale-in, shimmer, float, card-enter, stagger-fade, etc.)
- **Mobile:** Responsive design with mobile-first dashboard, bottom sheet, pull-to-refresh, haptic feedback
- **Deployment:** Vercel (serverless + edge functions)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────┐  │
│  │ Dashboard│  │  Chat    │  │  Intelligence     │  │
│  │ (Server  │  │  (Client │  │  (Client + Cache) │  │
│  │  Fetch)  │  │   + API) │  │                   │  │
│  └────┬─────┘  └────┬─────┘  └────────┬──────────┘  │
│       │              │                 │             │
│  ┌────▼──────────────▼─────────────────▼──────────┐  │
│  │            API Routes (Next.js)                 │  │
│  │  /api/chat  /api/intelligence  /api/plaid/*    │  │
│  │  /api/transactions  /api/budgets  /api/goals   │  │
│  └────────────────────┬───────────────────────────┘  │
└───────────────────────┼──────────────────────────────┘
                        │
┌───────────────────────▼──────────────────────────────┐
│              Server Layer                             │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────┐  │
│  │  Prisma  │  │   AI     │  │  Plaid.io Client  │  │
│  │   ORM    │  │  Engine  │  │  (lib/plaid.ts)   │  │
│  │          │  │(lib/ai)  │  │                   │  │
│  └────┬─────┘  └────┬─────┘  └────────┬──────────┘  │
│       │              │                 │             │
│  ┌────▼──────────────▼─────────────────▼──────────┐  │
│  │         External Services                       │  │
│  │  PostgreSQL  │  Claude API  │  Plaid.io API    │  │
│  └──────────────┴──────────────┴──────────────────┘  │
└──────────────────────────────────────────────────────┘
```

---

## Key Modules

### 1. Authentication (`src/lib/auth.ts`)

- NextAuth v4 with credentials (email/password) + OAuth (Google, GitHub)
- Passwords hashed with bcrypt (cost factor 12)
- JWT session strategy with HttpOnly cookies
- CSRF protection via NextAuth
- Middleware (`src/middleware.ts`) protects `/dashboard/*` and `/api/*` routes

### 2. Database Schema (`prisma/schema.prisma`)

17 models covering the full financial domain:

| Model | Purpose |
|---|---|
| `User` | User accounts with email, name, password hash |
| `LinkedBank` | Plaid connection per account (encrypted tokens) |
| `Transaction` | Plaid-synced transactions (credit/debit, merchant, category, location) |
| `ManualTransaction` | User-entered transactions (receipt upload support) |
| `Budget` | Monthly/weekly/quarterly category spending limits |
| `Goal` | Savings goals with target amount and deadline |
| `Bill` | Recurring bill tracking with due dates and reminders |
| `ChatMessage` | AI chat conversation history |
| `DebtPlan` | Debt payoff strategies (snowball/avalanche) |
| `Alert` | System alerts (overspend, price change, bill reminders) |
| `AiInsight` | Cached AI analysis results (1hr TTL) |
| `Asset` / `Liability` | Net worth tracking |
| `CategorizationRule` | Auto-categorization rules for transactions |
| Plus: `Investment`, `TaxEntry`, `CreditScore`, `Household`, `Notification`, `PushSubscription` |

### 3. Bank Integration (`src/lib/plaid.ts`)

- **Link flow:** Create Plaid Link token → User authenticates in Plaid modal → Exchange public token for access token → Encrypt and store in DB
- **Sync flow:** Decrypt access tokens → Call Plaid transactionsSync with cursor → Upsert transactions → Update lastSynced timestamp
- **Security:** AES-256-GCM encryption for all bank access tokens at rest; never logged or exposed to client

### 4. AI Analysis Engine (`src/lib/ai.ts`)

The AI system has two main components:

#### a. `analyzeSpending()` — Deep Financial Intelligence
Computes **15 distinct analysis dimensions** from transaction data:
1. **Summary** — Claude-generated 2-3 sentence plain-English overview
2. **Top Insight** — Single most actionable money-saving insight
3. **Category Breakdown** — Spending by category with % and trend vs prior period
4. **Merchant Alternatives** — Local cheaper options (via Overpass API or generic fallbacks)
5. **Location Insights** — City-level spending analysis with suggestions
6. **Savings Opportunities** — Top 5 calculated savings recommendations
7. **Cashflow Health** — Excellent/Good/Fair/Concerning rating
8. **Subscription Overlaps** — Detects duplicate streaming/productivity/wellness subscriptions
9. **Recurring Trends** — Merchants with rising/falling prices over time
10. **What-If Scenarios** — 6 simulations (cook at home, cancel subscription, etc.)
11. **Cashflow Forecast** — 14-day projected balance
12. **Spending Patterns** — Weekend spender, big-ticket frequency, merchant loyalty
13. **Merchant Concentration Risk** — Dependency on single merchants
14. **Hidden Recurring Charges** — Pattern detection for unlabeled subscriptions
15. **Sustainability Score** — 0-100 environmental impact estimate

Results cached in `AiInsight` table with 1-hour TTL.

#### b. `chatWithData()` — Conversational AI Assistant
- Primary path: Claude API with function-calling tools (`search_transactions`, `get_category_totals`, `get_merchant_info`)
- **Local fallback engine**: When Claude API is unavailable, a fully deterministic analysis engine takes over. It:
  - Computes all transaction aggregates (categories, merchants, time periods, trends)
  - Detects user intent via multi-signal pattern matching (category keywords, time ranges, question types)
  - Generates data-driven responses referencing actual numbers, comparisons, and trends
  - Supports 15+ question types: category queries, merchant lookups, affordability, savings tips, trends, budgets, income analysis, weekly/monthly breakdowns, comparisons, and more
  - Handles time-range-specific queries ("last 3 months", "this year") with automatic date filtering
  - Performs month-over-month category trend analysis

### 5. Chat API (`/api/chat`)
- `POST` — Saves user message, loads last 20 messages as context, fetches 500 recent transactions + budgets + goals + debts, calls AI engine, saves reply
- `GET` — Returns last 50 chat messages for conversation history

### 6. Dashboard (`/dashboard`)

#### Desktop (`DashboardClient.tsx`)
- Server-fetched data from PostgreSQL (stats, cashflow series, categories, recent transactions)
- Account switcher for multi-account users
- 4 StatCards: income, expenses (with change), net cashflow, savings rate
- 8 quick-access cards (Budgets, Goals, Bills, Subscriptions, Net Worth, Debt, Investments, Reports)
- Insight of the day widget (from /api/intelligence)
- Financial health score (0-100 ring SVG)
- Cashflow ribbon chart (Recharts AreaChart)
- Category donut chart (Recharts PieChart)
- Recent transactions list (top 10)

#### Mobile (`MobileDashboard.tsx`)
- Pull-to-refresh with spring animation
- Skeleton loading states
- Account cards carousel (Revolut-style snap-scroll with gradient backgrounds)
- Animated balance counter (ease-out cubic)
- 4 quick action buttons (Ask AI, History, Budgets, Goals)
- Monthly summary with animated bar rows
- Recent transactions (top 5)
- Category spending chips
- Quick-add FAB → BottomSheet transaction form

#### AI Chat Widget (`ChatWidget.tsx`)
- Floating action button (bottom-right) with bounce-in + pulse animations
- Opens a mini chat popover with backdrop blur
- Same API as full chat page — fetches history and sends messages
- Animated entrance (slide-up), message bubbles, loading dots
- Responsive: bottom sheet on mobile, centered popover on desktop

### 7. UI Component Library (`src/components/ui/`)
- `StatCard` — Metric display card with optional change indicator and color accents
- `TransactionRow` — Single transaction row (icon, merchant, amount, date)
- `SyncButton` — Plaid sync trigger with loading state
- `BottomSheet` — Radix-powered draggable bottom sheet with pull-to-dismiss
- `CashflowRibbon` — Recharts AreaChart for income/expense visualization
- `CategoryChart` — Recharts PieChart for spending breakdown

### 8. Animations (`tailwind.config.js`)

18 custom animations:
| Animation | Use Case |
|---|---|
| `fade-up` | Page entrances, message bubbles |
| `fade-in` | Backdrops, overlays |
| `slide-in` | Sidebar, left-entering elements |
| `slide-up` | Popovers, bottom sheets |
| `scale-in` | Stat cards, modals |
| `bounce-in` | First-load CTAs, FABs |
| `pulse-soft` | AI button attention |
| `shimmer` | Skeleton loading |
| `card-enter` | Account cards entrance |
| `stagger-fade` | Transaction rows |
| `float` | Floating elements |
| `wiggle` | Error shake |
| `flow-right/left` | Cashflow particles |
| `count-up` | Number counters |

Plus custom CSS classes: `.glass`, `.card-lift`, `.press-spring`, `.card-stack`, `.tick`, `.skeleton`, `.snap-scroll`

---

## Data Flow

### Bank Linking
```
User clicks "Link account"
  → GET /api/plaid/link-token (creates Plaid Link token)
  → Plaid Link modal (user authenticates with bank)
  → POST /api/plaid/exchange (public_token → access_token)
  → Encrypt access_token with AES-256-GCM
  → Save to prisma.linkedBank
  → POST /api/plaid/sync (transaction import)
```

### Transaction Syncing
```
SyncButton / Auto-sync
  → For each LinkedBank:
    → Decrypt access_token
    → Plaid transactionsSync (cursor-based incremental sync)
    → Upsert into prisma.transaction (keyed by Plaid transaction_id)
    → Update linkedBank.lastSynced
```

### AI Analysis
```
Intelligence page / Insight widget
  → POST /api/intelligence
  → Check AiInsight cache (1hr TTL)
  → Fetch transactions for current + prior period
  → analyzeSpending() → 15-dimension analysis
  → Cache result
  → Return AiAnalysis to client
```

### AI Chat
```
Chat page / ChatWidget
  → POST /api/chat
  → Save user message to ChatMessage
  → Load last 20 messages (conversation context)
  → Fetch 500 recent transactions, all budgets/goals/debts
  → chatWithData() → Claude API with tools OR local fallback
  → Save assistant reply to ChatMessage
  → Return reply to client
```

### Dashboard Load
```
DashboardPage (Server Component)
  → Get session
  → Fetch LinkedBank records
  → Fetch current month transactions
  → Fetch previous month transactions
  → Compute stats, cashflow series, categories
  → Pass to DashboardClient
```

---

## Local setup

### 1. Clone and install

```bash
git clone <your-repo>
cd fintrack
npm install
```

### 2. Database

You need a PostgreSQL database. Options:
- [Neon](https://neon.tech) — free tier, works great with Vercel
- [Supabase](https://supabase.com) — free tier
- Local: `brew install postgresql && brew services start postgresql`

### 3. Environment variables

```bash
cp .env.example .env.local
```

Fill in each value:

| Variable | How to get it |
|---|---|
| `DATABASE_URL` | Your PostgreSQL connection string |
| `NEXTAUTH_SECRET` | Run: `openssl rand -base64 32` |
| `NEXTAUTH_URL` | `http://localhost:3000` for dev |
| `GOOGLE_CLIENT_ID/SECRET` | [console.cloud.google.com](https://console.cloud.google.com) → OAuth 2.0 |
| `GITHUB_CLIENT_ID/SECRET` | GitHub → Settings → Developer settings → OAuth Apps |
| `PLAID_CLIENT_ID` | [dashboard.plaid.com](https://dashboard.plaid.com) |
| `PLAID_SECRET` | Plaid dashboard (sandbox vs production) |
| `PLAID_ENV` | `sandbox` for development |
| `ENCRYPTION_KEY` | Run: `openssl rand -hex 32` |
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) |

### 4. Run migrations

```bash
npm run db:push       # Push schema to database
npm run db:generate   # Generate Prisma client
```

### 5. Start dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Security model

- **Passwords:** bcrypt hash, cost factor 12
- **Bank tokens:** AES-256-GCM encrypted at rest; never logged
- **Sessions:** Signed JWT, HttpOnly cookies
- **Bank access:** Read-only via Plaid.io — no write permissions possible
- **mTLS:** Plaid API calls use client credentials (client_id + secret)
- **Input validation:** All API inputs validated with Zod schemas
- **CSRF:** NextAuth handles CSRF protection on all auth routes
- **Rate limiting:** Add [upstash/ratelimit](https://github.com/upstash/ratelimit) for production

---

## Full file structure

```
src/
├── app/
│   ├── api/
│   │   ├── accounts/me/           GET current user profile
│   │   ├── alerts/                CRUD alerts
│   │   ├── bills/                 CRUD bills + upcoming bills
│   │   ├── budgets/               CRUD budgets
│   │   ├── categorize/            AI transaction categorization
│   │   ├── chat/                  POST message, GET history
│   │   ├── goals/                 CRUD savings goals
│   │   ├── health-score/          Financial health calculation
│   │   ├── households/            Household management
│   │   ├── intelligence/          Claude analysis (1hr cached)
│   │   ├── manual-transactions/   Manual transaction CRUD
│   │   ├── net-worth/             Net worth calculation
│   │   ├── notifications/         In-app notifications
│   │   ├── plaid/                 Link token, exchange, accounts, sync
│   │   ├── push/                  Web push notification setup
│   │   ├── reports/               Monthly reports
│   │   ├── rules/                 Categorization rules CRUD
│   │   ├── subscriptions/         Recurring subscriptions
│   │   └── transactions/          List/filter transactions
│   ├── auth/                      Login, register, forgot/reset password, verify
│   ├── dashboard/                 17 pages: overview, accounts, alerts, bills,
│   │                               budgets, cashflow, chat, credit-score, debt,
│   │                               goals, household, intelligence, investments,
│   │                               manual, net-worth, reports, rewards, rules,
│   │                               settings, subscriptions, tax, transactions
│   └── onboarding/                Post-registration bank linking flow
├── components/
│   ├── bank/                      LinkBankButton (Plaid Connect)
│   ├── charts/                    CashflowRibbon (area), CategoryChart (donut)
│   ├── chat/                      ChatWidget (floating AI assistant)
│   ├── dashboard/                 AccountSwitcher, MobileDashboard
│   ├── layout/                    DashboardShell, Sidebar, TopBar, MobileNav
│   ├── notifications/             NotificationDropdown
│   ├── providers/                 ThemeProvider (dark/light)
│   ├── settings/                  Profile, Security, Preferences, Privacy, etc.
│   ├── transactions/              MobileTransactions
│   └── ui/                        BottomSheet, StatCard, SyncButton, TransactionRow
├── hooks/                         useCurrency, useHaptics, useProfile,
│                                   usePullToRefresh, usePushNotifications
├── lib/
│   ├── ai.ts                      Claude analysis engine + Chat system
│   ├── auth.ts                    NextAuth config (credentials + OAuth)
│   ├── capacitor-push.ts          Capacitor push notification setup
│   ├── categorize.ts              AI categorization + rule engine
│   ├── currency.ts                Currency formatting utilities
│   ├── email.ts                   Nodemailer SMTP email sender
│   ├── encryption.ts              AES-256-GCM encrypt/decrypt + HMAC verify
│   ├── geocode.ts                 OpenStreetMap geocoding + Overpass API
│   ├── notifications.ts           Push notification sender
│   ├── plaid.ts                   Plaid API client
│   ├── prisma.ts                  Prisma client singleton
│   └── push-notifications.ts     Web push notification helpers
├── middleware.ts                  Auth middleware (protects dashboard + API)
└── types/
    ├── index.ts                   TypeScript interfaces (Transaction, AiAnalysis, etc.)
    └── next-auth.d.ts             NextAuth type augmentation

prisma/
└── schema.prisma                  Full DB schema (17 models)
```
