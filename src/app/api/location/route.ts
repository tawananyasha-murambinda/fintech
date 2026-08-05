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

  if (latitude !== undefined) {
    const lat = Number(latitude)
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      return NextResponse.json({ error: 'Latitude must be between -90 and 90' }, { status: 400 })
    }
  }
  if (longitude !== undefined) {
    const lng = Number(longitude)
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
      return NextResponse.json({ error: 'Longitude must be between -180 and 180' }, { status: 400 })
    }
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      ...(city !== undefined && typeof city === 'string' && { city }),
      ...(country !== undefined && typeof country === 'string' && { country }),
      ...(latitude !== undefined && { latitude: Number(latitude) }),
      ...(longitude !== undefined && { longitude: Number(longitude) }),
    },
  })

  return NextResponse.json({ success: true })
}
