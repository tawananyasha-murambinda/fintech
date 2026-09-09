import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { redactPII } from '@/lib/pii'

// POST /api/monitoring/error — client-side error reporter. Used by the
// error boundaries so front-end crashes are captured server-side for the
// in-app diagnostics log. Message and URL only; never send stack traces
// containing tokens or headers.
export async function POST(req: NextRequest) {
  // Unauthenticated by design — an error boundary may fire before or after a
  // session exists — so it is throttled per IP. Without this, anyone can write
  // unbounded rows into ErrorLog.
  const limited = await rateLimit(req, { limit: 20, windowMs: 60 * 1000, key: 'monitoring-error' })
  if (limited) return limited

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
        // Anything a client sends could carry an account number or email
        // scraped out of the page it crashed on; redact before it is stored.
        message: redactPII(message),
        stack: typeof body.stack === 'string' ? redactPII(body.stack.slice(0, 8000)) : undefined,
        // Query strings carry reset tokens and verification links.
        url: typeof body.url === 'string' ? body.url.slice(0, 500).split('?')[0] : undefined,
        userAgent,
      },
    })

    return NextResponse.json({ success: true }, { status: 201 })
  } catch {
    // Error reporting must never take the app down.
    return NextResponse.json({ success: true }, { status: 201 })
  }
}
