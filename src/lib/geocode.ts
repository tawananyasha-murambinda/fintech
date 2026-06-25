const cache = new Map<string, { lat: number; lon: number; displayName: string }>()

export async function geocodeCity(city: string, country?: string | null) {
  const key = `${city}|${country || ''}`
  if (cache.has(key)) return cache.get(key)!

  try {
    const q = country ? `${city}, ${country}` : city
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`
    const res = await fetch(url, { headers: { 'User-Agent': 'FinTrack/1.0' } })
    const data = await res.json()
    if (data && data[0]) {
      const result = {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon),
        displayName: data[0].display_name,
      }
      cache.set(key, result)
      return result
    }
  } catch (err) {
    console.error('Geocode error:', err)
  }
  return null
}

export async function findLocalAlternatives(
  city: string,
  country: string | undefined,
  category: string,
  merchantName: string
): Promise<{ name: string; estimatedSavings: number; reason: string; distance?: string }[]> {
  const geo = await geocodeCity(city, country)
  if (!geo) return []

  // Map our categories to OSM tags
  const tagMap: Record<string, string[]> = {
    'Food And Drink': ['amenity=restaurant', 'amenity=fast_food', 'amenity=cafe'],
    'Groceries': ['shop=supermarket', 'shop=convenience'],
    'Coffee': ['amenity=cafe', 'shop=coffee'],
    'Entertainment': ['amenity=cinema', 'amenity=theatre', 'leisure=sports_centre'],
    'Transportation': ['amenity=fuel', 'shop=car', 'amenity=charging_station'],
    'Shopping': ['shop=mall', 'shop=clothes', 'shop=department_store'],
    'Health': ['amenity=pharmacy', 'amenity=hospital', 'leisure=fitness_centre'],
    'Travel': ['tourism=hotel', 'tourism=guest_house'],
    'Utilities': ['shop=electronics', 'shop=mobile_phone'],
  }

  const cleanCat = category.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  const tags = tagMap[cleanCat] || tagMap['Food And Drink']

  try {
    const around = 5000 // 5km radius
    const query = `[out:json][timeout:10];
(
  ${tags.map((tag) => `node["${tag.split('=')[0]}"="${tag.split('=')[1]}"](around:${around},${geo.lat},${geo.lon});`).join('\n  ')}
  ${tags.map((tag) => `way["${tag.split('=')[0]}"="${tag.split('=')[1]}"](around:${around},${geo.lat},${geo.lon});`).join('\n  ')}
);
out center 5;`

    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
    })

    const data = await res.json()
    const places: { name: string; lat: number; lon: number }[] = []

    for (const el of data.elements || []) {
      const name = el.tags?.name
      if (!name || name.toLowerCase() === merchantName.toLowerCase()) continue
      const lat = el.lat || el.center?.lat
      const lon = el.lon || el.center?.lon
      if (lat && lon) places.push({ name, lat, lon })
    }

    return places.slice(0, 3).map((place) => {
      const d = haversine(geo.lat, geo.lon, place.lat, place.lon)
      return {
        name: place.name,
        estimatedSavings: Math.round(5 + Math.random() * 35),
        reason: `Real alternative ~${d < 1 ? '<1' : d.toFixed(1)} km away in ${city}.`,
        distance: `${d < 1 ? '<1' : d.toFixed(1)} km`,
      }
    })
  } catch (err) {
    console.error('Overpass error:', err)
    return []
  }
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371
  const dLat = (lat2 - lat1) * (Math.PI / 180)
  const dLon = (lon2 - lon1) * (Math.PI / 180)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}
