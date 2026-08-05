import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requestMeta } from '@/lib/audit'

const TYPES = ['cookies', 'analytics', 'marketing', 'terms']

// POST /api/consent — records consent decisions. Signed-in decisions are
// stored in the database (for the data export + deletion flows); anonymous
// visitors are handled purely client-side by the consent banner.
export async function POST(req: NextRequest) {
  let body: { type?: string; granted?: boolean; version?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!TYPES.includes(body.type || '')) {
    return NextResponse.json({ error: 'Invalid consent type' }, { status: 400 })
  }

  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ success: true })
  }

  const { ip, userAgent } = requestMeta(req)

  await prisma.consent.upsert({
    where: {
      userId_type: { userId: session.user.id, type: body.type! },
    },
    update: {
      granted: body.granted === true,
      version: body.version || undefined,
      ip,
      userAgent,
    },
    create: {
      userId: session.user.id,
      type: body.type!,
      granted: body.granted === true,
      version: body.version || undefined,
      ip,
      userAgent,
    },
  })

  return NextResponse.json({ success: true })
}
