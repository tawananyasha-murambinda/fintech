import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Public health endpoint for uptime monitors and status pages.
export async function GET() {
  const startedAt = Date.now()
  try {
    await prisma.$queryRaw`SELECT 1`
    return NextResponse.json(
      {
        status: 'ok',
        service: 'fintrack',
        version: process.env.npm_package_version || '1.0.0',
        uptime: Math.round(process.uptime()),
        time: new Date().toISOString(),
        checks: { database: 'ok' },
      },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch {
    return NextResponse.json(
      {
        status: 'degraded',
        service: 'fintrack',
        version: process.env.npm_package_version || '1.0.0',
        uptime: Math.round(process.uptime()),
        time: new Date().toISOString(),
        checks: { database: 'error' },
      },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    )
  }
}
