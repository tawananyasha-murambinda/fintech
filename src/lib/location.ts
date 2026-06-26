const GEOCODE_CACHE = new Map<string, { city: string; country: string }>()

export async function getBrowserLocation(): Promise<{ latitude: number; longitude: number } | null> {
  if (typeof window === 'undefined' || !navigator.geolocation) return null

  try {
    const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: false,
        timeout: 8000,
        maximumAge: 300000,
      })
    })
    return { latitude: pos.coords.latitude, longitude: pos.coords.longitude }
  } catch {
    return null
  }
}

export async function reverseGeocode(lat: number, lon: number): Promise<{ city: string; country: string } | null> {
  const key = `${lat.toFixed(2)},${lon.toFixed(2)}`
  if (GEOCODE_CACHE.has(key)) return GEOCODE_CACHE.get(key)!

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`,
      { headers: { 'User-Agent': 'FinTrack/1.0' } },
    )
    const data = await res.json()
    if (!data?.address) return null

    const address = data.address
    const city = address.city || address.town || address.village || address.county || ''
    const country = address.country || ''

    const result = { city, country }
    GEOCODE_CACHE.set(key, result)
    return result
  } catch {
    return null
  }
}

export async function detectUserLocation(): Promise<{ city?: string; country?: string; latitude?: number; longitude?: number } | null> {
  const coords = await getBrowserLocation()
  if (!coords) return null

  const geo = await reverseGeocode(coords.latitude, coords.longitude)
  if (!geo) return { latitude: coords.latitude, longitude: coords.longitude }

  return { ...geo, ...coords }
}

export async function saveUserLocation(data: {
  city?: string
  country?: string
  latitude?: number
  longitude?: number
}): Promise<boolean> {
  try {
    const res = await fetch('/api/location', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    return res.ok
  } catch {
    return false
  }
}

export async function getUserLocation(): Promise<{
  city?: string
  country?: string
  latitude?: number
  longitude?: number
} | null> {
  try {
    const res = await fetch('/api/location')
    const data = await res.json()
    return data.location || null
  } catch {
    return null
  }
}
