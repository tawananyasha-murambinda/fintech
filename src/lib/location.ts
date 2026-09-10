// Browser-side location helpers.
//
// Reverse geocoding used to happen here, calling OpenStreetMap directly from
// the page. That is now done by /api/location: the page's connect-src does not
// allow third-party hosts, and sending someone's precise coordinates from their
// own device to an external service is not something a finance app should do
// when the server can ask on their behalf.
//
// Every function below reports *why* it failed. The previous versions returned
// null for permission-denied, timeout, lookup-failure and save-failure alike,
// which is why pressing "Detect" appeared to do nothing at all.

export type LocationFailure =
  | 'unsupported'
  | 'permission-denied'
  | 'unavailable'
  | 'timeout'
  | 'lookup-failed'
  | 'save-failed'

export type LocationResult =
  | { ok: true; city?: string; country?: string; latitude: number; longitude: number; lookupFailed: boolean }
  | { ok: false; reason: LocationFailure }

export const LOCATION_MESSAGES: Record<LocationFailure, string> = {
  unsupported: 'This browser cannot share your location. Type your city instead.',
  'permission-denied':
    'Location access was blocked. Allow it in your browser’s site settings, or type your city below.',
  unavailable: 'Your device could not get a position. Try again, or type your city below.',
  timeout: 'Finding your location took too long. Try again, or type your city below.',
  'lookup-failed':
    'We saved your position but could not work out the city name. Type it below and we will use that.',
  'save-failed': 'We could not save your location. Try again in a moment.',
}

function geolocationFailure(err: GeolocationPositionError): LocationFailure {
  if (err.code === err.PERMISSION_DENIED) return 'permission-denied'
  if (err.code === err.TIMEOUT) return 'timeout'
  return 'unavailable'
}

export async function getBrowserLocation(): Promise<
  { ok: true; latitude: number; longitude: number } | { ok: false; reason: LocationFailure }
> {
  if (typeof window === 'undefined' || !navigator.geolocation) {
    return { ok: false, reason: 'unsupported' }
  }

  try {
    const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000,
      })
    })
    return { ok: true, latitude: pos.coords.latitude, longitude: pos.coords.longitude }
  } catch (err) {
    return { ok: false, reason: geolocationFailure(err as GeolocationPositionError) }
  }
}

/**
 * Asks the browser for a position, then hands it to the server to name and
 * store in one round trip — so a success here means it is actually saved.
 */
export async function detectAndSaveLocation(): Promise<LocationResult> {
  const coords = await getBrowserLocation()
  if (!coords.ok) return coords

  try {
    const res = await fetch('/api/location', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ latitude: coords.latitude, longitude: coords.longitude }),
    })

    if (!res.ok) return { ok: false, reason: 'save-failed' }

    const data = await res.json()
    return {
      ok: true,
      city: data.location?.city || undefined,
      country: data.location?.country || undefined,
      latitude: coords.latitude,
      longitude: coords.longitude,
      lookupFailed: Boolean(data.lookupFailed) || !data.location?.city,
    }
  } catch {
    return { ok: false, reason: 'save-failed' }
  }
}

/** Saves a city the user typed themselves. */
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
    if (!res.ok) return null
    const data = await res.json()
    return data.location || null
  } catch {
    return null
  }
}
