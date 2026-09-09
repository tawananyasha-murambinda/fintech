# FinTrack

FinTrack is an intelligent personal finance application. It links to your bank accounts through Plaid, imports transactions, and combines structured budgeting tools with AI-powered analysis so you can see where your money goes and what to do about it.

- Web application built with Next.js, deployed on Vercel.
- Native Android and iOS apps wrapped with Capacitor.
- Full documentation is available in the `docs/` directory.

## Documentation index

| Document | Purpose |
|---|---|
| `docs/PRODUCTION_READINESS.md` | Gap analysis and cost estimate for a public launch (updated with completed work) |
| `docs/FinTrack-User-Manual.md` | End-user guide to every screen and feature |
| `docs/FinTrack-Technical-Documentation.md` | Architecture, API, data model, and operations reference |
| `README.md` (this file) | Quick orientation for contributors |

DOCX and PDF copies of the manuals live in `docs/`; the Markdown files are the source of truth.

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
- **Subscription billing.** Free, Plus, and Pro tiers via Stripe Checkout, with plan limits enforced on linked banks and AI usage.

### Supporting apps

- **Mobile app** for Android and iOS via Capacitor. Includes pull-to-refresh, haptic feedback, bottom sheets, and offline-friendly layouts.
- **Web push** via VAPID keys on desktop and mobile browsers.

## Technology stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) with TypeScript |
| UI | Tailwind CSS, Radix UI, Recharts |
| Database | PostgreSQL via Prisma ORM |
| Authentication | NextAuth.js (email/password, Google) |
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
| `NEXTAUTH_SECRET` | Session signing secret (comma-separated for rotation) | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Canonical app URL | `http://localhost:3000` in development |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth credentials | Google Cloud Console |
| `PLAID_CLIENT_ID` / `PLAID_SECRET` / `PLAID_ENV` | Plaid credentials | Plaid dashboard |
| `PLAID_WEBHOOK_SECRET` | Plaid webhook HMAC secret | Plaid dashboard (webhooks) |
| `ENCRYPTION_KEY` | Key for bank-token encryption | `openssl rand -hex 32` |
| `ANTHROPIC_API_KEY` | Claude API key | Anthropic Console |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `EMAIL_FROM` | Outbound email | Your email provider |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | Web push keys | `npm run vapid:generate` |
| `NEXT_PUBLIC_APP_URL` | Public app URL | `http://localhost:3000` in development |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Shared store for rate limiting | Upstash console → Redis → REST API |
| `CRON_SECRET` | Bearer token guarding `/api/cron/daily` | `openssl rand -hex 32` |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | Stripe API and webhook signing | Stripe dashboard |
| `STRIPE_PRICE_PLUS` / `STRIPE_PRICE_PRO` | Price IDs for the paid tiers | Stripe dashboard → Products |
| `LOG_LEVEL` | `debug` \| `info` \| `warn` \| `error` | Optional, defaults to `info` |
| `RESEND_API_KEY` | Transactional email (falls back to SMTP when unset) | resend.com |
| `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` | Error monitoring (inert when unset) | Sentry project settings |

### Run

```bash
# 3. Apply migrations and generate the Prisma client
npx prisma migrate deploy
npm run db:generate

# 4. Start the development server
npm run dev
```

Open http://localhost:3000.

### Validation

```bash
npm run lint        # next lint
npm run typecheck   # tsc --noEmit
npm test            # vitest — unit + API route tests
npm run build       # Production build
```

All four run in CI on every push and pull request.

## Database migrations

`prisma/migrations/` is the source of truth for schema changes. **Do not run
`prisma db push` against production** — it diffs and applies directly, which
silently drops columns and their data.

```bash
npx prisma migrate dev --name describe_the_change   # author a migration
npx prisma migrate deploy                           # apply in CI / production
```

**Adopting migrations on a database that was previously built with `db push`:**
mark the baseline as already applied, then let the second migration run
normally.

```bash
npx prisma migrate resolve --applied 00000000000000_init
npx prisma migrate deploy
```

On a fresh database, `migrate deploy` applies both in order and no resolve step
is needed. `00000000000001_money_decimal_and_session_revocation` rewrites every
row of the monetary tables — read its header comment and take a backup first.

## Categories

`src/lib/categories.ts` is the single category vocabulary. Plaid writes
`FOOD_AND_DRINK`, the AI categoriser returns `Food & Dining`, and budgets were
created from a third list — so a budget never matched the transactions it was
meant to measure, every budget reported zero spend, and no overspend alert
could fire. Everything now normalises through `canonicalCategory` on import, on
budget creation, and in the AI prompts.

Adding a category means adding it to `CATEGORIES` and mapping the Plaid values
that should land on it. Unrecognised values fall back to `Uncategorized` rather
than forming a category of one.

## Money

Monetary columns are Postgres `numeric`, not `double precision`, so stored
values are exact and reconcile against a bank statement. A Prisma client
extension (`src/lib/prisma.ts`) converts them back to JS numbers at the query
boundary, so application code works with plain numbers.

`src/lib/money.ts` covers the two places where doubles still bite:

- `round` / `sum` before persisting, so no sub-cent residue is written back.
- `eq` / `gt` / `gte` when comparing two computed sums, so a budget spent
  exactly to the penny is not reported as exceeded.

Adding a `Decimal` column to the schema means adding it to the extension's
list too, or it reaches the UI as a `Decimal` object rather than a number.

## Scheduled work

Beyond bill reminders, stale-bank resync, alerts and retention, the nightly job
also sweeps round-up savings. Round-ups are additionally swept immediately
after a manual sync and when the rule is first enabled, so the feature does
something visible straight away rather than looking broken until the next night.

Every sweep writes a `VaultContribution` row keyed on the transaction, so a
transaction can only ever be counted once and a vault balance can be explained
back to the purchases that produced it.

## Data retention

`src/lib/retention.ts` holds the retention schedule as one table, enforced
nightly by the daily cron. Financial history — transactions, budgets, goals,
bills, tax entries — is never swept; it is removed only when the user deletes
their account. Audit logs have the longest window because they are the record
an incident investigation needs.

### Ops scripts

```bash
scripts/backup.sh         # pg_dump database + globals with retention pruning
scripts/load-test.js      # concurrency/duration load test against any path
scripts/android-sign.sh   # write signing config and build a signed release APK
```

## Mobile builds

```bash
npm run apk           # Sync and build a debug Android APK
npm run apk:release   # Build a release-signed APK (requires signing config)
npm run ipa           # Build and export an iOS archive (macOS and Xcode required)
```

## Scheduled jobs

`GET|POST /api/cron/daily` runs the work that must happen whether or not anyone
opens the app:

| Job | What it does |
|---|---|
| Bill reminders | Notifies owners of bills entering their reminder window (in-app + web push), once per billing cycle |
| Stale bank resync | Re-syncs any linked bank untouched for 24h — the safety net for dropped Plaid webhooks |
| Alert generation | Generates overspend, budget, spike, and duplicate alerts for users with activity in the last 30 days |

The endpoint authenticates with a bearer token, so it is safe to expose:

```bash
curl -X POST https://your-app/api/cron/daily \
  -H "Authorization: Bearer $CRON_SECRET"
```

On Vercel the schedule is declared in `vercel.json` (`0 13 * * *`) and the
platform sends `CRON_SECRET` automatically. Any other scheduler works the same
way. Without `CRON_SECRET` set the endpoint returns 503 and no jobs run.

Each job is isolated: a Plaid outage cannot stop bill reminders going out. The
run returns a JSON report and logs one structured summary line.

## Billing

Plans and limits are defined in `src/lib/plans.ts` — **the price points and
limits there are placeholders**; set them to what you actually charge and
create matching prices in Stripe.

| | Free | Plus | Pro |
|---|---|---|---|
| Linked banks | 1 | 5 | 25 |
| AI calls / day | 5 | 60 | 300 |
| History | 3 months | 24 months | 120 months |

Enforcement reads `ENTITLEMENTS`, so changing a limit is a one-line edit.
Limits are applied in `POST /api/plaid/exchange` (returns 402 at the cap) and
in `consumeAiBudget`.

Webhook events are recorded in `BillingEvent` before their side effects run, so
Stripe's at-least-once delivery cannot double-apply a plan change. Point a
webhook at `/api/billing/webhook` for `checkout.session.completed`,
`customer.subscription.*`, and `invoice.payment_failed`. Locally:

```bash
stripe listen --forward-to localhost:3000/api/billing/webhook
```

## Observability

`src/lib/logger.ts` writes one JSON object per line to stdout (stderr for
`warn`/`error`), which is what Vercel Logs, Axiom, and Datadog ingest without
extra configuration. Set `LOG_LEVEL` to control verbosity.

## Security model

- Passwords are hashed with bcrypt at cost factor 12.
- Bank access tokens are encrypted with AES-256-GCM at rest and are never returned to the client.
- Sessions are signed JWTs stored in HttpOnly cookies with CSRF protection.
- Bank connections are read-only via Plaid; FinTrack never sees credentials and cannot initiate transfers.
- All API inputs are validated with Zod schemas.
- Protected routes require a verified email.
- Rate limits are enforced through a shared Redis store, so they hold across serverless instances rather than per-instance memory.
- The cron endpoint and the Stripe webhook authenticate every request (bearer token and HMAC signature respectively).
- Sessions last 7 days with a sliding refresh, and every session is revoked on password change or reset (`User.sessionsValidFrom`).
- Error reports are scrubbed before leaving the process (`src/lib/sentry-scrub.ts`): request bodies, cookies, headers and query strings are dropped, and free text passes through the same PII redaction used for AI prompts.

## Deployment

The project is configured for Vercel (`vercel.json`). Connect the repository to a Vercel project, set the environment variables from `.env.example`, and deploy. CI workflows in `.github/workflows/` run typecheck, unit tests, and the production build on every push/PR (`ci.yml`) and build the Android APK and iOS app (`build.yml`).

## Licence

Proprietary. All rights reserved.
