// Runs the standalone data backfills that `prisma db push` cannot.
//
// `db push` applies schema changes but never executes migration bodies, so the
// category normalisation that ships inside migration 00000000000002 has to be
// run separately. This is safe to run on every deploy: after the first pass the
// statements match zero rows, because everything is already canonical.
//
// Usage: node scripts/db-backfill.mjs

import { readFileSync } from 'node:fs'
import { PrismaClient } from '@prisma/client'

const SQL_FILE = new URL('./sql/backfill-categories.sql', import.meta.url)

function statements(sql) {
  return sql
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n')
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean)
}

const prisma = new PrismaClient()

try {
  const sql = readFileSync(SQL_FILE, 'utf8')
  const parts = statements(sql)

  let changed = 0
  for (const statement of parts) {
    // $executeRawUnsafe is correct here: this is a trusted file on disk with
    // no interpolated input, and the statements are DDL-adjacent UPDATEs that
    // cannot be expressed as a parameterised query.
    const count = await prisma.$executeRawUnsafe(statement)
    changed += count
  }

  console.log(`[db-backfill] ${parts.length} statements, ${changed} rows updated`)
} catch (err) {
  console.error('[db-backfill] failed:', err.message)
  // Non-zero exit so a broken backfill fails the deploy rather than shipping
  // an app whose budgets silently read zero.
  process.exit(1)
} finally {
  await prisma.$disconnect()
}
