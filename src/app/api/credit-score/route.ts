import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const scores = await prisma.creditScore.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: 12,
  })

  return NextResponse.json(scores)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const { score, provider } = body

    if (score === undefined) {
      return NextResponse.json({ error: 'Score is required' }, { status: 400 })
    }

    const parsedScore = typeof score === 'number' ? Math.round(score) : parseInt(score, 10)
    if (Number.isNaN(parsedScore) || parsedScore < 300 || parsedScore > 850) {
      return NextResponse.json({ error: 'Score must be a number between 300 and 850' }, { status: 400 })
    }

    const entry = await prisma.creditScore.create({
      data: {
        userId: session.user.id,
        score: parsedScore,
        provider: provider || null,
      },
    })

    return NextResponse.json(entry)
  } catch (err) {
    console.error('Credit score create error:', err)
    return NextResponse.json({ error: 'Failed to save credit score' }, { status: 500 })
  }
}
