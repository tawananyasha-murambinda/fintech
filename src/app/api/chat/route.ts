import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { errorResponse } from '@/lib/errors'
import { askAssistant } from '@/lib/assistant'
import { consumeAiBudget, dailyAiLimitFor } from '@/lib/ai-budget'
import { logger } from '@/lib/logger'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const messages = await prisma.chatMessage.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'asc' },
      take: 50,
    })

    return NextResponse.json(messages)
  } catch (err) {
    logger.error('Chat history load failed', { userId: session.user.id, error: err })
    const { error, status } = errorResponse(err, 'Could not load your chat history.')
    return NextResponse.json({ error }, { status })
  }
}

export async function DELETE() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await prisma.chatMessage.deleteMany({ where: { userId: session.user.id } })
  return NextResponse.json({ cleared: true })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const limited = await rateLimit(req, {
    limit: 30,
    windowMs: 60 * 60 * 1000,
    key: `chat:${session.user.id}`,
    scope: 'user',
  })
  if (limited) return limited

  let message: string
  try {
    const body = await req.json()
    message = String(body?.message || '')
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const trimmed = message.trim()
  if (!trimmed) return NextResponse.json({ error: 'Message is required' }, { status: 400 })
  if (trimmed.length > 2000) {
    return NextResponse.json({ error: 'That message is too long — try a shorter question.' }, { status: 400 })
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { currency: true },
    })

    // The daily cap is checked before the question is stored, so a refused
    // request does not leave a dangling user message with no reply.
    if (!(await consumeAiBudget(session.user.id))) {
      const limit = await dailyAiLimitFor(session.user.id)
      logger.info('AI budget exhausted', { userId: session.user.id })
      return NextResponse.json(
        {
          error: `You've used all ${limit} assistant questions for today. The limit resets at midnight UTC.`,
          code: 'AI_LIMIT_REACHED',
        },
        { status: 429 }
      )
    }

    // History is read before the new message is written so the assistant sees
    // prior turns, not its own prompt echoed back as context.
    const history = await prisma.chatMessage.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 12,
      select: { role: true, content: true },
    })

    await prisma.chatMessage.create({
      data: { userId: session.user.id, role: 'user', content: trimmed },
    })

    const result = await askAssistant(
      trimmed,
      history
        .reverse()
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      {
        userId: session.user.id,
        currency: user?.currency || 'USD',
        now: new Date(),
      }
    )

    await prisma.chatMessage.create({
      data: { userId: session.user.id, role: 'assistant', content: result.reply },
    })

    return NextResponse.json({
      reply: result.reply,
      // Surfaced so the UI can show what the answer was actually based on,
      // which is the difference between a grounded answer and a plausible one.
      sources: [...new Set(result.toolsUsed)],
      degraded: result.degraded,
    })
  } catch (err) {
    logger.error('Chat failed', { userId: session.user.id, error: err })
    const { error, status } = errorResponse(err, 'Could not process your message right now. Please try again.')
    return NextResponse.json({ error }, { status })
  }
}
