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

function estimateTripKm(amount: number): number {
  return Math.max(1, Math.round((amount * 0.7) / 1.5))
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

function fmtCurrency(n: number): string {
  return n.toFixed(2)
}

async function fetchOverpass(query: string): Promise<any[]> {
  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  })
  const data = await res.json()
  return data.elements || []
}

async function findTransportAlternatives(
  geo: { lat: number; lon: number },
  city: string,
  _country: string | undefined,
  merchantName: string,
  avgTransaction: number,
  userCity: string,
) {
  const tripKm = estimateTripKm(avgTransaction)
  const transitCostPerKm = 0.15
  const transitBaseFare = 1.05
  const transitFare = transitBaseFare + tripKm * transitCostPerKm
  const savings = Math.round(avgTransaction - transitFare)
  const isUserHome = city.toLowerCase() === userCity.toLowerCase()
  const locPhrase = isUserHome ? `You live in ${userCity}` : `In ${city}`

  const stops = await fetchOverpass(`[out:json][timeout:8];
    nwr["highway"="bus_stop"](around:3000,${geo.lat},${geo.lon});
    out center 5;`)

  const namedStops = stops.filter((el: any) => el.tags?.name).slice(0, 5)

  if (namedStops.length > 0) {
    const best = namedStops[0]
    const stopDist = haversine(geo.lat, geo.lon, best.lat || best.center?.lat, best.lon || best.center?.lon)
    const operator = best.tags.operator || best.tags.network || 'public transit'
    const routeRef = best.tags.route_ref || best.tags.ref || ''
    const routeInfo = routeRef ? ` line ${routeRef}` : ''
    const stopName = best.tags.name

    return {
      locationContext: isUserHome ? `You live in ${userCity}. ` : `${city} is one of your spending locations. `,
      alternatives: [
        {
          name: `${operator} bus${routeInfo}`,
          estimatedSavings: savings,
          originalCost: Math.round(avgTransaction),
          alternativeCost: Math.round(transitFare),
          reason: `${locPhrase}. Your ${merchantName} trip (est. ${tripKm} km) costs ~€${fmtCurrency(avgTransaction)}. Take ${stopName} stop${routeInfo} — only ~€${fmtCurrency(transitFare)} for the same distance, saving €${savings}.`,
          distance: `${stopDist.toFixed(1)} km from city center`,
          type: 'primary' as const,
          detail: `Take bus${routeInfo} from ${stopName}`,
        },
        ...(tripKm <= 10
          ? [{
              name: 'Cycle instead',
              estimatedSavings: Math.round(avgTransaction - tripKm * 0.05),
              originalCost: Math.round(avgTransaction),
              alternativeCost: Math.round(tripKm * 0.05),
              reason: `Same ${tripKm} km by bike costs ~€${fmtCurrency(tripKm * 0.05)} in maintenance. Takes ~${Math.round(tripKm * 4)} min but saves €${Math.round(avgTransaction - tripKm * 0.05)}.`,
              distance: `${tripKm} km`,
              type: 'secondary' as const,
              detail: `${tripKm} km · ~${Math.round(tripKm * 4)} min cycle`,
            }]
          : []),
        ...(tripKm <= 3
          ? [{
              name: 'Walk it',
              estimatedSavings: Math.round(avgTransaction),
              originalCost: Math.round(avgTransaction),
              alternativeCost: 0,
              reason: `${tripKm} km is walkable in ~${Math.round(tripKm * 12)} min. Free, healthy, and saves €${Math.round(avgTransaction)}.`,
              distance: `${tripKm} km`,
              type: 'secondary' as const,
              detail: `${Math.round(tripKm * 12)} min walk`,
            }]
          : []),
      ],
    }
  }

  return null
}

async function findFoodAlternatives(
  geo: { lat: number; lon: number },
  city: string,
  _country: string | undefined,
  merchantName: string,
  avgTransaction: number,
) {
  const homeCost = Math.round(avgTransaction * 0.25)
  const savings = Math.round(avgTransaction - homeCost)

  const markets = (await fetchOverpass(`[out:json][timeout:8];
    nwr["shop"="supermarket"](around:2000,${geo.lat},${geo.lon});
    out center 5;`))
    .filter((el: any) => {
      const n = (el.tags?.name || '').toLowerCase()
      return /aldi|lidl|dirk|plus|jumbo|ah|aldi|coop|spar|netto|dekamarkt|vomar|hoogvliet|boni|picnic/.test(n)
    })
    .slice(0, 3)

  const cheapEats = (await fetchOverpass(`[out:json][timeout:8];
    nwr["amenity"~"restaurant|fast_food"](around:2000,${geo.lat},${geo.lon});
    out center 8;`))
    .filter((el: any) => el.tags?.name && !el.tags.name.toLowerCase().includes(merchantName.toLowerCase()))
    .slice(0, 4)

  const alts: any[] = []

  if (markets.length > 0) {
    const m = markets[0]
    const dist = haversine(geo.lat, geo.lon, m.lat || m.center?.lat, m.lon || m.center?.lon)

    alts.push({
      name: `Cook at home (${m.tags.name})`,
      estimatedSavings: savings,
      originalCost: Math.round(avgTransaction),
      alternativeCost: homeCost,
      reason: `A €${fmtCurrency(avgTransaction)} meal at ${merchantName}. Instead, buy ingredients at ${m.tags.name} (${dist.toFixed(1)} km away) for ~€${homeCost}. Save €${savings} per meal.`,
      distance: `${dist.toFixed(1)} km`,
      type: 'primary',
      detail: `${m.tags.name} · ~€${homeCost} for ingredients`,
    })
  } else {
    alts.push({
      name: 'Cook at home',
      estimatedSavings: savings,
      originalCost: Math.round(avgTransaction),
      alternativeCost: homeCost,
      reason: `A €${fmtCurrency(avgTransaction)} meal at ${merchantName} costs ~4x ingredients. Home cooking: ~€${homeCost}. Save €${savings} per meal.`,
      type: 'primary',
    })
  }

  if (cheapEats.length > 0) {
    const ce = cheapEats[0]
    const ceDist = haversine(geo.lat, geo.lon, ce.lat || ce.center?.lat, ce.lon || ce.center?.lon)
    const cheapCost = Math.round(avgTransaction * 0.7)

    alts.push({
      name: `${ce.tags.name} (nearby)`,
      estimatedSavings: Math.round(avgTransaction - cheapCost),
      originalCost: Math.round(avgTransaction),
      alternativeCost: cheapCost,
      reason: `Try ${ce.tags.name} instead — ${ceDist.toFixed(1)} km away, estimated ~€${cheapCost} vs €${fmtCurrency(avgTransaction)} at ${merchantName}.`,
      distance: `${ceDist.toFixed(1)} km`,
      type: 'secondary',
      detail: `~€${cheapCost}/meal · ${ceDist.toFixed(1)} km away`,
    })
  }

  alts.push({
    name: 'Pack lunch / meal prep',
    estimatedSavings: Math.round(avgTransaction * 0.7),
    originalCost: Math.round(avgTransaction),
    alternativeCost: Math.round(avgTransaction * 0.3),
    reason: `Packing lunch costs ~€${Math.round(avgTransaction * 0.3)} vs €${fmtCurrency(avgTransaction)} at ${merchantName}. Over 22 workdays: save ~€${Math.round(avgTransaction * 0.7 * 22)}/mo.`,
    type: 'secondary',
  })

  return { alternatives: alts }
}

async function findCoffeeAlternatives(
  geo: { lat: number; lon: number },
  _city: string,
  merchantName: string,
  avgTransaction: number,
) {
  const homeCost = 0.30
  const savings = Math.round(avgTransaction - homeCost)

  const cafes = (await fetchOverpass(`[out:json][timeout:8];
    nwr["amenity"="cafe"](around:1000,${geo.lat},${geo.lon});
    out center 5;`))
    .filter((el: any) => el.tags?.name && !el.tags.name.toLowerCase().includes(merchantName.toLowerCase()))
    .slice(0, 2)

  const alts: any[] = [
    {
      name: 'Brew at home',
      estimatedSavings: savings,
      originalCost: Math.round(avgTransaction),
      alternativeCost: Math.round(homeCost),
      reason: `A €${fmtCurrency(avgTransaction)} coffee at ${merchantName}. Home-brewed: ~€${fmtCurrency(homeCost)} per cup. Save €${savings} per cup.`,
      type: 'primary',
      detail: `~€${fmtCurrency(homeCost)} per cup at home`,
    },
  ]

  if (cafes.length > 0) {
    alts.push({
      name: cafes[0].tags.name,
      estimatedSavings: Math.round(avgTransaction * 0.3),
      originalCost: Math.round(avgTransaction),
      alternativeCost: Math.round(avgTransaction * 0.7),
      reason: `Try ${cafes[0].tags.name} — likely cheaper coffee near you.`,
      type: 'secondary',
    })
  }

  return { alternatives: alts }
}

function generateGenericAlternatives(
  merchantName: string,
  avgTransaction: number,
) {
  const alts: any[] = [
    {
      name: 'Compare 2-3 alternatives',
      estimatedSavings: Math.round(avgTransaction * 0.15),
      originalCost: Math.round(avgTransaction),
      alternativeCost: Math.round(avgTransaction * 0.85),
      reason: `Shopping around for what you buy at ${merchantName} typically saves ~15% (€${Math.round(avgTransaction * 0.15)} per visit).`,
      type: 'primary',
    },
    {
      name: 'Loyalty / bulk discounts',
      estimatedSavings: Math.round(avgTransaction * 0.1),
      originalCost: Math.round(avgTransaction),
      alternativeCost: Math.round(avgTransaction * 0.9),
      reason: 'Check for loyalty rewards, student discounts, or bulk pricing.',
      type: 'secondary',
    },
  ]
  return { alternatives: alts }
}

export async function findLocalAlternatives(
  city: string,
  country: string | undefined,
  category: string,
  merchantName: string,
  avgTransaction?: number,
  userCity?: string,
  visitCount?: number,
): Promise<{
  locationContext?: string
  alternatives: {
    name: string
    estimatedSavings: number
    originalCost: number
    alternativeCost: number
    reason: string
    distance?: string
    type: 'primary' | 'secondary'
    detail?: string
  }[]
}> {
  const geo = await geocodeCity(city, country)
  if (!geo) return { alternatives: [] }

  const cleanCat = category.toLowerCase().replace(/_/g, ' ')
  const userHome = userCity || city
  const avgTx = avgTransaction || 15

  try {
    // Transport / rideshare
    if (/rideshare|uber|lyft|taxi|transport|gas|fuel/.test(cleanCat) && !/parking|toll/.test(cleanCat)) {
      const result = await findTransportAlternatives(geo, city, country, merchantName, avgTx, userHome)
      if (result) return result
    }

    // Food / dining
    if (/food.*dining|restaurant|fast food|kfc|mcdonald|pizza|takeout|burger|dining|groceries/.test(cleanCat)) {
      const result = await findFoodAlternatives(geo, city, country, merchantName, avgTx)
      if (result.alternatives.length > 0) return result
    }

    // Coffee
    if (/coffee/.test(cleanCat)) {
      const result = await findCoffeeAlternatives(geo, city, merchantName, avgTx)
      if (result.alternatives.length > 0) return result
    }
  } catch (err) {
    console.error('findLocalAlternatives error:', err)
  }

  return generateGenericAlternatives(merchantName, avgTx)
}
