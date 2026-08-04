# FinTrack

FinTrack is an intelligent personal finance application. It links to your bank accounts through Plaid, imports transactions, and combines structured budgeting tools with AI-powered analysis so you can see where your money goes and what to do about it.

- Web application built with Next.js, deployed on Vercel.
- Native Android and iOS apps wrapped with Capacitor.
- Full documentation is available in the `docs/` directory.

## Documentation index

| Document | Purpose |
|---|---|
| `docs/PRODUCTION_READINESS.md` | Gap analysis and cost estimate for a public launch |
| `docs/FinTrack-User-Manual.pdf` | End-user guide to every screen and feature |
| `docs/FinTrack-Technical-Documentation.pdf` | Architecture, API, data model, and operations reference |
| `README.md` (this file) | Quick orientation for contributors |

## Product overview

### Core features

- **Bank connectivity.** Link checking, savings, and credit accounts through Plaid. Access tokens are encrypted at rest; connections are read-only.
- **Transaction feed.** Automatic and manual transaction entry, categorisation, search, and merchant-level detail.
- **Budgets.** Weekly, monthly, or quarterly spending limits per category.
- **Savings goals and vault.** Target-based goals with progress tracking, plus a vault with round-up rules.
- **Bills and reminders.** Track recurring bills and get notified before they are due.
- **Debt planning.** Snowball and avalanche payoff strategies with interest and payoff-date estimates.
- **Net worth.** Assets, liabilities, investments, and a credit-score log.
- **Tax organizer.** Income, deduction, and expense entries by tax year.
- **Household accounts.** Shared households with member roles.
- **AI spending analysis.** Fifteen analysis dimensions, cached and delivered as plain-English insights.
- **AI assistant.** Ask questions about your finances in natural language. Uses Claude when available and falls back to a fully local analysis engine when it is not.
- **Alerts and notifications.** Overspend, price-change, duplicate-subscription, bill, and goal alerts via in-app notifications and web push.
- **Multi-currency.** Account-level currency display with live conversion rates.

### Supporting apps

- **Mobile app** for Android and iOS via Capacitor. Includes pull-to-refresh, haptic feedback, bottom sheets, and offline-friendly layouts.
- **Web push** via VAPID keys on desktop and mobile browsers.

## Technology stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) with TypeScript |
| UI | Tailwind CSS, Radix UI, Recharts |
| Database | PostgreSQL via Prisma ORM |
| Authentication | NextAuth.js (email/password, Google, GitHub) |
| Bank connectivity | Plaid (US and EU open banking) |
| AI | Anthropic Claude, with a deterministic local fallback engine |
| Mobile | Capacitor 6 (Android and iOS) |
| Deployment | Vercel (serverless) |

## Repository layout

```
src/
├── app/                  Routes: dashboard, auth, onboarding, API routes
│   └── api/              Server endpoints (auth, plaid, chat, budgets, etc.)
├── components/           UI components (dashboard, charts, chat, settings, ui)
├── hooks/                Client hooks (currency, haptics, push, pull-to-refresh)
├── lib/                  Server logic (auth, ai, plaid, email, encryption, prisma)
├── middleware.ts         Auth and email-verification gate
└── types/                Shared TypeScript interfaces
prisma/
└── schema.prisma         Database schema
android/                  Capacitor Android project
docs/                     Documentation (user manual, technical reference)
```

A full file map is in the technical documentation.

## Local development

### Prerequisites

- Node.js 20 or newer
- PostgreSQL 14 or newer (or a managed instance such as Neon or Supabase)

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment variables
cp .env.example .env.local
```

Complete `.env.local` using the table below.

| Variable | Description | How to obtain |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | Your database provider |
| `NEXTAUTH_SECRET` | Session signing secret | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Canonical app URL | `http://localhost:3000` in development |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth credentials | Google Cloud Console |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | GitHub OAuth credentials | GitHub developer settings |
| `PLAID_CLIENT_ID` / `PLAID_SECRET` / `PLAID_ENV` | Plaid credentials | Plaid dashboard |
| `ENCRYPTION_KEY` | Key for bank-token encryption | `openssl rand -hex 32` |
| `ANTHROPIC_API_KEY` | Claude API key | Anthropic Console |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `EMAIL_FROM` | Outbound email | Your email provider |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | Web push keys | `npm run vapid:generate` |
| `NEXT_PUBLIC_APP_URL` | Public app URL | `http://localhost:3000` in development |

### Run

```bash
# 3. Create the database schema and generate the Prisma client
npm run db:push
npm run db:generate

# 4. Start the development server
npm run dev
```

Open http://localhost:3000.

### Validation

```bash
npx tsc --noEmit    # Type checking
npm run build       # Production build
```

## Mobile builds

```bash
npm run apk           # Sync and build a debug Android APK
npm run apk:release   # Build a release-signed APK (requires signing config)
npm run ipa           # Build and export an iOS archive (macOS and Xcode required)
```

## Security model

- Passwords are hashed with bcrypt at cost factor 12.
- Bank access tokens are encrypted with AES-256-GCM at rest and are never returned to the client.
- Sessions are signed JWTs stored in HttpOnly cookies with CSRF protection.
- Bank connections are read-only via Plaid; FinTrack never sees credentials and cannot initiate transfers.
- All API inputs are validated with Zod schemas.
- Protected routes require a verified email.

## Deployment

The project is configured for Vercel (`vercel.json`). Connect the repository to a Vercel project, set the environment variables from `.env.example`, and deploy. A CI workflow in `.github/workflows/` builds the Android APK and iOS app on push to `main`.

## Licence

Proprietary. All rights reserved.
