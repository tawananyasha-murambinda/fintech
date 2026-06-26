import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { city: true, country: true, latitude: true, longitude: true },
  })

  return NextResponse.json({ location: user || null })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { city, country, latitude, longitude } = await req.json()

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      ...(city !== undefined && { city }),
      ...(country !== undefined && { country }),
      ...(latitude !== undefined && { latitude }),
      ...(longitude !== undefined && { longitude }),
    },
  })

  return NextResponse.json({ success: true })
}
