import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { errorResponse } from '@/lib/errors'
import { logger } from '@/lib/logger'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { city: true, country: true, latitude: true, longitude: true },
  })

  return NextResponse.json({ location: user || null })
}

/**
 * Turns coordinates into a city, server-side.
 *
 * This used to run in the browser, which had two problems: the page's
 * connect-src does not allow OpenStreetMap (so the request was blocked and the
 * failure swallowed), and it sent the user's precise coordinates straight from
 * their device to a third party. Doing it here fixes both, and lets us send the
 * descriptive User-Agent Nominatim's usage policy asks for.
 */
async function reverseGeocode(
  lat: number,
  lon: number
): Promise<{ city: string; country: string } | null> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`

  const res = await fetch(url, {
    headers: {
      'User-Agent': `FinTrack/1.0 (${process.env.NEXT_PUBLIC_APP_URL || 'https://fintrack.app'})`,
      'Accept-Language': 'en',
    },
    signal: AbortSignal.timeout(8000),
  })

  if (!res.ok) throw new Error(`Nominatim responded ${res.status}`)

  const data = await res.json()
  const address = data?.address
  if (!address) return null

  const city = address.city || address.town || address.village || address.municipality || address.county || ''
  const country = address.country || ''
  if (!city && !country) return null

  return { city, country }
}

function coordError(value: unknown, min: number, max: number, name: string): string | null {
  const n = Number(value)
  if (!Number.isFinite(n) || n < min || n > max) return `${name} must be between ${min} and ${max}`
  return null
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Reverse geocoding hits a third-party service with a one-request-per-second
  // policy, so this cannot be called freely.
  const limited = await rateLimit(req, {
    limit: 20,
    windowMs: 15 * 60 * 1000,
    key: `location:${session.user.id}`,
    scope: 'user',
  })
  if (limited) return limited

  let body: { city?: unknown; country?: unknown; latitude?: unknown; longitude?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { latitude, longitude } = body
  let city = typeof body.city === 'string' ? body.city.trim() : undefined
  let country = typeof body.country === 'string' ? body.country.trim() : undefined

  if (latitude !== undefined) {
    const err = coordError(latitude, -90, 90, 'Latitude')
    if (err) return NextResponse.json({ error: err }, { status: 400 })
  }
  if (longitude !== undefined) {
    const err = coordError(longitude, -180, 180, 'Longitude')
    if (err) return NextResponse.json({ error: err }, { status: 400 })
  }

  // Coordinates with no place name: look it up rather than storing a position
  // the rest of the app cannot use. Local alternatives are keyed on the city
  // name, so coordinates alone leave the feature exactly as broken.
  let lookupFailed = false
  if (!city && latitude !== undefined && longitude !== undefined) {
    try {
      const geo = await reverseGeocode(Number(latitude), Number(longitude))
      if (geo) {
        city = geo.city || undefined
        country = geo.country || country
      } else {
        lookupFailed = true
      }
    } catch (err) {
      lookupFailed = true
      logger.warn('Reverse geocode failed', {
        userId: session.user.id,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  if (!city && !country && latitude === undefined) {
    return NextResponse.json({ error: 'Provide a city or coordinates.' }, { status: 400 })
  }

  try {
    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...(city !== undefined && { city }),
        ...(country !== undefined && { country }),
        ...(latitude !== undefined && { latitude: Number(latitude) }),
        ...(longitude !== undefined && { longitude: Number(longitude) }),
      },
      select: { city: true, country: true, latitude: true, longitude: true },
    })

    // Cached analyses embed the city in their wording, so a location change
    // has to invalidate them or the old text survives for another hour.
    await prisma.aiInsight
      .deleteMany({ where: { userId: session.user.id } })
      .catch(() => undefined)

    return NextResponse.json({
      success: true,
      location: updated,
      // Reported so the UI can say the coordinates saved but the place name
      // did not, rather than appearing to do nothing.
      lookupFailed,
    })
  } catch (err) {
    logger.error('Location save failed', { userId: session.user.id, error: err })
    const { error, status } = errorResponse(err, 'We could not save your location.')
    return NextResponse.json({ error }, { status })
  }
}
