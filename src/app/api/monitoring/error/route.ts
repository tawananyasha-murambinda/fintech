import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST /api/monitoring/error — client-side error reporter. Used by the
// error boundaries so front-end crashes are captured server-side for the
// in-app diagnostics log. Message and URL only; never send stack traces
// containing tokens or headers.
export async function POST(req: NextRequest) {
  let body: { source?: string; message?: string; stack?: string; url?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const message = typeof body.message === 'string' ? body.message.slice(0, 2000) : ''
  if (!message) {
    return NextResponse.json({ error: 'message is required' }, { status: 400 })
  }

  try {
    const session = await getServerSession(authOptions)
    const userAgent = req.headers.get('user-agent') || undefined

    await prisma.errorLog.create({
      data: {
        ...(session?.user?.id ? { userId: session.user.id } : {}),
        source: (body.source || 'client').slice(0, 100),
        message,
        stack: typeof body.stack === 'string' ? body.stack.slice(0, 8000) : undefined,
        url: typeof body.url === 'string' ? body.url.slice(0, 500) : undefined,
        userAgent,
      },
    })

    return NextResponse.json({ success: true }, { status: 201 })
  } catch {
    // Error reporting must never take the app down.
    return NextResponse.json({ success: true }, { status: 201 })
  }
}
