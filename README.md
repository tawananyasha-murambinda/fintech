# FinTrack

Intelligent personal finance app. Links to your bank via Teller.io, analyses spending with Claude AI, and recommends cheaper alternatives based on your location.

## Stack

- **Framework:** Next.js 14 (App Router) + TypeScript
- **Database:** PostgreSQL via Prisma ORM
- **Auth:** NextAuth.js — email/password + Google + GitHub OAuth
- **Bank connectivity:** Teller.io (EU + US open banking)
- **AI intelligence:** Anthropic Claude (claude-sonnet-4-6)
- **UI:** Tailwind CSS + Recharts
- **Deployment:** Vercel

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
| `TELLER_APPLICATION_ID` | [teller.io/dashboard](https://teller.io/dashboard) |
| `TELLER_SIGNING_SECRET` | Teller dashboard → Webhooks |
| `TELLER_CERTIFICATE` | Path to your Teller mTLS cert (`.pem`) |
| `TELLER_PRIVATE_KEY` | Path to your Teller mTLS private key |
| `ENCRYPTION_KEY` | Run: `openssl rand -hex 32` |
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) |
| `NEXT_PUBLIC_TELLER_APP_ID` | Same as `TELLER_APPLICATION_ID` |

### 4. Teller.io setup

1. Register at [teller.io](https://teller.io)
2. Create an application — note the Application ID
3. Download your mTLS certificate and private key from the dashboard
4. Set `TELLER_ENV=sandbox` for development (sandbox uses test banks)
5. For production, set `TELLER_ENV=production` and complete Teller's KYB process

### 5. Run migrations

```bash
npm run db:push       # Push schema to database
npm run db:generate   # Generate Prisma client
```

### 6. Start dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Deploying to Vercel

### 1. Push to GitHub

```bash
git init && git add . && git commit -m "Initial commit"
gh repo create fintrack --private --push
```

### 2. Create Vercel project

```bash
npm i -g vercel
vercel
```

### 3. Add environment variables

In the Vercel dashboard → Settings → Environment Variables, add all variables from `.env.example`.

For the Teller certificate and private key, you have two options:
- Store the file contents as environment variables (base64 encoded)
- Use Vercel's file system via the build step

### 4. Set up the database

Use [Neon](https://neon.tech) with Vercel's integration for the easiest setup:
1. Vercel Dashboard → Storage → Create Database → Neon
2. It auto-sets `DATABASE_URL`

### 5. Deploy

```bash
vercel --prod
```

---

## Architecture

```
User → NextAuth (JWT session)
     → Dashboard (server components, DB queries)
     → Transactions page (client, paginated API)
     → Intelligence page (Claude API, cached 1hr)
     → Accounts page (Teller.io link management)

Bank link flow:
User → Teller Connect widget (client-side)
     → /api/teller/link (saves encrypted token)
     → /api/teller/sync (pulls transactions)
     → PostgreSQL (stores via Prisma)

AI analysis flow:
/api/intelligence → fetch transactions from DB
                  → build spending summary
                  → Claude API (claude-sonnet-4-6)
                  → parse JSON response
                  → cache in AiInsight table (1hr TTL)
                  → return to client
```

## Security model

- **Passwords:** bcrypt hash, cost factor 12
- **Bank tokens:** AES-256-GCM encrypted at rest; never logged
- **Sessions:** Signed JWT, HttpOnly cookies
- **Bank access:** Read-only via Teller.io — no write permissions possible
- **mTLS:** Teller API calls authenticated with mutual TLS certificate
- **Input validation:** All API inputs validated with Zod schemas
- **CSRF:** NextAuth handles CSRF protection on all auth routes
- **Rate limiting:** Add [upstash/ratelimit](https://github.com/upstash/ratelimit) for production

## Folder structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/          NextAuth + register
│   │   ├── teller/        Link, sync, unlink
│   │   ├── transactions/  List + filter
│   │   ├── intelligence/  Claude analysis
│   │   └── accounts/      Account management
│   ├── auth/              Login + register pages
│   ├── dashboard/         Main app (overview, transactions, intelligence, accounts)
│   └── onboarding/        Post-register bank connection flow
├── components/
│   ├── bank/              LinkBankButton (Teller Connect)
│   ├── charts/            CashflowRibbon, CategoryChart
│   ├── layout/            Sidebar, TopBar
│   └── ui/                StatCard, TransactionRow, SyncButton
├── lib/
│   ├── prisma.ts          DB client singleton
│   ├── auth.ts            NextAuth config
│   ├── teller.ts          Teller.io API client
│   ├── ai.ts              Claude analysis engine
│   └── encryption.ts      AES-256-GCM token encryption
├── types/                 TypeScript types
prisma/
└── schema.prisma          DB schema
```
