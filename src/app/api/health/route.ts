import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { summariseConfiguration } from '@/lib/config-check'

export const dynamic = 'force-dynamic'

// Public health endpoint for uptime monitors and status pages.
export async function GET() {
  const startedAt = Date.now()
  const config = summariseConfiguration()

  try {
    await prisma.$queryRaw`SELECT 1`

    // A reachable database is not the same as a working deployment. A missing
    // CRON_SECRET leaves every scheduled job dead while this endpoint happily
    // reports "ok", which is how it went unnoticed.
    const healthy = config.ok

    return NextResponse.json(
      {
        status: healthy ? 'ok' : 'degraded',
        service: 'fintrack',
        version: process.env.npm_package_version || '1.0.0',
        uptime: Math.round(process.uptime()),
        latencyMs: Date.now() - startedAt,
        time: new Date().toISOString(),
        checks: {
          database: 'ok',
          configuration: healthy ? 'ok' : 'incomplete',
        },
        // Names of the settings only — never their values — so this stays
        // safe to leave public for an uptime monitor.
        configuration: {
          missingCritical: config.missingCritical.map((c) => ({ key: c.key, impact: c.impact })),
          missingDegraded: config.missingDegraded.map((c) => ({ key: c.key, impact: c.impact })),
          missingOptional: config.missingOptional.map((c) => c.key),
        },
      },
      {
        status: healthy ? 200 : 503,
        headers: { 'Cache-Control': 'no-store' },
      }
    )
  } catch {
    return NextResponse.json(
      {
        status: 'degraded',
        service: 'fintrack',
        version: process.env.npm_package_version || '1.0.0',
        uptime: Math.round(process.uptime()),
        time: new Date().toISOString(),
        latencyMs: Date.now() - startedAt,
        checks: { database: 'error', configuration: config.ok ? 'ok' : 'incomplete' },
      },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    )
  }
}
