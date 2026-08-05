import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { errorResponse } from '@/lib/errors'
import { logger } from '@/lib/logger'

const CATEGORIES = ['bug', 'feature', 'feedback', 'support']

// POST /api/feedback — user feedback / support request. Works signed in or out.
export async function POST(req: NextRequest) {
  let body: { category?: string; message?: string; rating?: number }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const category = CATEGORIES.includes(body.category || '') ? body.category! : 'feedback'
  const message = typeof body.message === 'string' ? body.message.trim() : ''
  const rating = Number(body.rating)

  if (message.length < 10) {
    return NextResponse.json({ error: 'Please include a few more details (at least 10 characters).' }, { status: 400 })
  }
  if (rating !== undefined && rating !== null && (!Number.isFinite(rating) || rating < 1 || rating > 5)) {
    return NextResponse.json({ error: 'Rating must be between 1 and 5.' }, { status: 400 })
  }

  try {
    const session = await getServerSession(authOptions)
    const userAgent = req.headers.get('user-agent') || undefined

    await prisma.feedback.create({
      data: {
        ...(session?.user?.id ? { userId: session.user.id } : {}),
        category,
        message,
        rating: Number.isFinite(rating) ? Math.round(rating) : undefined,
        userAgent,
      },
    })

    return NextResponse.json({ success: true, message: 'Thanks for your feedback!' })
  } catch (err) {
    logger.error('Feedback save failed')
    const { error, status } = errorResponse(err, 'We could not save your feedback right now.')
    return NextResponse.json({ error }, { status })
  }
}
