// Reports what the database connection looks like, without printing it.
//
// Vercel hides environment variable values, and a variable marked Sensitive
// cannot be revealed again at all — so the connection string is not something
// you can simply read off the dashboard. This runs inside the build, where
// DATABASE_URL is injected, and prints only the shape of it.
//
// The thing that matters: schema changes cannot run over a pooled connection.
// PgBouncer in transaction mode does not hold the session state that DDL needs,
// so `prisma db push` will hang and then fail. If this reports POOLED, the
// build needs a direct connection string in DIRECT_URL.
//
// Usage: node scripts/db-preflight.mjs

const raw = process.env.DIRECT_URL || process.env.DATABASE_URL

if (!raw) {
  console.error('[db-preflight] No DATABASE_URL is set. Nothing to migrate against.')
  process.exit(1)
}

let url
try {
  url = new URL(raw)
} catch {
  console.error('[db-preflight] DATABASE_URL is not a valid URL.')
  process.exit(1)
}

const host = url.hostname
const port = url.port || '5432'
const params = url.searchParams

// Redacted host: enough to identify the provider and the pooling markers,
// not enough to reach the database.
const [first, ...rest] = host.split('.')
const redactedHost = `${first.slice(0, 3)}…${rest.length ? '.' + rest.slice(-2).join('.') : ''}`

const pooledMarkers = [
  host.includes('-pooler') && '"-pooler" in hostname (Neon pooled endpoint)',
  port === '6543' && 'port 6543 (Supabase transaction pooler)',
  params.get('pgbouncer') === 'true' && 'pgbouncer=true in the query string',
  host.includes('pooler.supabase') && 'Supabase pooler hostname',
].filter(Boolean)

const provider = host.includes('neon.tech')
  ? 'Neon'
  : host.includes('supabase')
    ? 'Supabase'
    : host.includes('rds.amazonaws')
      ? 'Amazon RDS'
      : host.includes('vercel-storage')
        ? 'Vercel Postgres'
        : 'unknown'

console.log(`[db-preflight] provider : ${provider}`)
console.log(`[db-preflight] host     : ${redactedHost}`)
console.log(`[db-preflight] port     : ${port}`)
console.log(`[db-preflight] using    : ${process.env.DIRECT_URL ? 'DIRECT_URL' : 'DATABASE_URL'}`)

if (pooledMarkers.length > 0) {
  console.error('')
  console.error('[db-preflight] POOLED CONNECTION — schema changes will not work over this.')
  for (const marker of pooledMarkers) console.error(`[db-preflight]   • ${marker}`)
  console.error('')
  console.error('[db-preflight] Fix: add a DIRECT_URL environment variable in Vercel holding')
  console.error('[db-preflight] the direct (non-pooled) connection string from your database')
  console.error('[db-preflight] provider, then redeploy. Your app keeps using the pooled')
  console.error('[db-preflight] DATABASE_URL at runtime; only migrations use DIRECT_URL.')
  // Fails the build deliberately: better a clear error here than a push that
  // hangs for the full build timeout and leaves the schema half-applied.
  process.exit(1)
}

console.log('[db-preflight] direct connection — safe to apply schema changes')
