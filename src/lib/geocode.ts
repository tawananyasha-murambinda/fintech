import { haversine } from '@/lib/haversine'
import { getIngredientPrices } from '@/lib/prices'

const geocodeCache = new Map<string, { lat: number; lon: number; displayName: string }>()
const searchCache = new Map<string, { name: string; lat: number; lon: number; type: string }[]>()
let lastNominatimCall = 0

async function rateLimitedFetch(url: string): Promise<any> {
  const now = Date.now()
  const elapsed = now - lastNominatimCall
  if (elapsed < 1100) await new Promise(r => setTimeout(r, 1100 - elapsed))
  lastNominatimCall = Date.now()
  const res = await fetch(url, {
    headers: { 'User-Agent': 'FinTrack/1.0' },
    signal: AbortSignal.timeout(7000),
  })
  return res.json()
}

export async function geocodeCity(city: string, country?: string | null) {
  const key = `${city}|${country || ''}`
  if (geocodeCache.has(key)) return geocodeCache.get(key)!
  try {
    const q = country ? `${city}, ${country}` : city
    const data = await rateLimitedFetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`
    )
    if (data && data[0]) {
      const result = {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon),
        displayName: data[0].display_name,
      }
      geocodeCache.set(key, result)
      return result
    }
  } catch { /* proceed */ }
  return null
}

async function searchPlaces(query: string, city: string, country?: string | null, limit = 8): Promise<{ name: string; lat: number; lon: number; type: string }[]> {
  const cacheKey = `${query}|${city}|${country}|${limit}`
  if (searchCache.has(cacheKey)) return searchCache.get(cacheKey)!
  try {
    const q = country ? `${query}+in+${city}+${country}` : `${query}+in+${city}`
    const data = await rateLimitedFetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=${limit}`
    )
    const results = (data || [])
      .filter((d: any) => d.name)
      .map((d: any) => ({
        name: d.name,
        lat: parseFloat(d.lat),
        lon: parseFloat(d.lon),
        type: d.type,
      }))
    searchCache.set(cacheKey, results)
    return results
  } catch { return [] }
}

function estimateTripKm(amount: number): number {
  return Math.max(1, Math.round((amount * 0.7) / 1.5))
}

function fmtCurrency(n: number): string {
  return n.toFixed(2)
}

function localTransitInfo(city: string): { operator: string; note: string } {
  const known: Record<string, string> = {
    amsterdam: 'GVB', rotterdam: 'RET', utrecht: 'U-OV',
    'den haag': 'HTM', eindhoven: 'Hermes', groningen: 'Qbuzz',
    maastricht: 'Arriva', nijmegen: 'Hermes', haarlem: 'Connexxion',
    vlissingen: 'Connexxion', goes: 'Connexxion', middelburg: 'Connexxion',
    breda: 'Arriva', tilburg: 'Arriva', arnhem: 'Hermes',
    amersfoort: 'Connexxion', leeuwarden: 'Arriva', denbosch: 'Arriva',
    zwolle: 'Blauwnet', dordrecht: 'Arriva', leiden: 'Arriva',
    delft: 'RET', almere: 'Connexxion', hilversum: 'Connexxion',
  }
  const op = known[city.toLowerCase().trim()] || 'public transit'
  const note = op !== 'public transit'
    ? `${op} operates the bus/tram network in ${city}. `
    : `Check the local transit schedule in ${city}. `
  return { operator: op, note }
}

async function findNearbyBusStops(city: string, country?: string | null): Promise<{ name: string; lat: number; lon: number }[]> {
  const results = await searchPlaces('bus stop', city, country, 5)
  return results.filter(r => r.type === 'bus_stop').map(r => ({ name: r.name, lat: r.lat, lon: r.lon }))
}

async function findNearbySupermarkets(city: string, country?: string | null): Promise<{ name: string; lat: number; lon: number }[]> {
  const discounters = ['aldi', 'lidl', 'dirk', 'plus', 'spar', 'netto']
  const all = await searchPlaces('supermarket', city, country, 10)
  const sorted = all.filter(r => discounters.some(d => r.name.toLowerCase().includes(d)))
  const others = all.filter(r => !discounters.some(d => r.name.toLowerCase().includes(d)))
  return [...sorted, ...others].slice(0, 3).map(r => ({ name: r.name, lat: r.lat, lon: r.lon }))
}

type Ingredient = { name: string; price: number }

const MEAL_INGREDIENTS: { match: RegExp; meal: string; ingredientNames: string[] }[] = [
  { match: /kfc|popeyes|fried.?chicken|chicken.?shop/i, meal: 'Fried chicken meal',
    ingredientNames: ['Chicken breast (200g)', 'Pasta (500g)', 'Tomato sauce'] },
  { match: /chicken|nando|stros|henk/i, meal: 'Grilled chicken meal',
    ingredientNames: ['Chicken thigh (300g)', 'Rice (500g)', 'Mixed vegetables'] },
  { match: /mcdonald|burger.?king|wendy|burger|fast.?food|quick/i, meal: 'Burger meal',
    ingredientNames: ['Ground beef (400g)', 'Bread rolls (4)', 'Cheese (100g)', 'Tomatoes'] },
  { match: /pizza|domino|new.?york.?pizza/i, meal: 'Homemade pizza',
    ingredientNames: ['Pizza dough mix', 'Mozzarella (200g)', 'Tomatoes', 'Mixed vegetables'] },
  { match: /italian|pasta|spaghetti|lasagna|mama|olive.?garden/i, meal: 'Pasta meal',
    ingredientNames: ['Pasta (500g)', 'Tomato sauce', 'Ground beef (300g)', 'Cheese (100g)'] },
  { match: /sushi|asian|chinese|thai|japanese|vietnam|indonesian|bami|nasi/i, meal: 'Stir-fry meal',
    ingredientNames: ['Chicken breast (200g)', 'Rice (500g)', 'Mixed vegetables', 'Eggs (2)'] },
  { match: /mexican|taco|burrito|quesadilla/i, meal: 'Taco meal',
    ingredientNames: ['Ground beef (400g)', 'Mixed vegetables', 'Cheese (100g)'] },
  { match: /subway|sandwich|sub.?way|baguette|brood/i, meal: 'Homemade sandwich',
    ingredientNames: ['Bread rolls (2)', 'Chicken breast (200g)', 'Cheese (100g)', 'Tomatoes'] },
  { match: /fish|seafood|vishandel/i, meal: 'Fish meal',
    ingredientNames: ['Fish fillet (300g)', 'Potatoes (1kg)', 'Mixed vegetables'] },
  { match: /indian|curry|tandoor|bombay|korma/i, meal: 'Curry meal',
    ingredientNames: ['Chicken thigh (300g)', 'Rice (500g)', 'Mixed vegetables'] },
  { match: /breakfast|brunch|pancake|waffle|omelet/i, meal: 'Homemade breakfast',
    ingredientNames: ['Eggs (6)', 'Bread rolls (2)', 'Milk (1L)'] },
  { match: /takeout|take.?away|chinees|chin/i, meal: 'Takeout-style meal',
    ingredientNames: ['Chicken breast (200g)', 'Rice (500g)', 'Mixed vegetables'] },
  { match: /steak|grill|loin|ribeye|entrecote/i, meal: 'Pan-seared steak meal',
    ingredientNames: ['Beef steak (250g)', 'Potatoes (1kg)', 'Mixed vegetables'] },
  { match: /restaurant|cafe|bistro|eatery|diner|tavern|bar|grill|kitchen/i, meal: 'Home-cooked meal',
    ingredientNames: ['Chicken breast (200g)', 'Rice (500g)', 'Mixed vegetables'] },
]

async function getIngredientBreakdown(merchantName: string, mealCost: number): Promise<{ meal: string; items: { name: string; price: number; supermarket: string; source: string }[]; total: number }> {
  const matched = MEAL_INGREDIENTS.find(b => b.match.test(merchantName))
  if (matched) {
    const { items, total } = await getIngredientPrices(matched.ingredientNames)
    return { meal: matched.meal, items, total }
  }
  const genericTotal = Math.round(mealCost * 0.25 * 100) / 100
  const prices = await getIngredientPrices(['Chicken breast (200g)', 'Rice (500g)', 'Mixed vegetables'])
  return { meal: 'Home-cooked meal', items: prices.items, total: prices.total }
}

async function tryApiOrFallback<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try { return await fn() } catch { return fallback }
}

export async function findLocalAlternatives(
  city: string,
  country: string | undefined,
  category: string,
  merchantName: string,
  avgTransaction?: number,
  userCity?: string,
  _visitCount?: number,
): Promise<{
  locationContext?: string
  error?: string
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
  const cleanCat = category.toLowerCase().replace(/_/g, ' ').trim()
  const userHome = userCity || city
  const avgTx = avgTransaction || 15
  const isUserHome = city.toLowerCase() === userHome.toLowerCase()
  const geo = await tryApiOrFallback(() => geocodeCity(userHome, country), null)
  const locPhrase = isUserHome ? `You live in ${userHome}` : `In ${city}`
  const locCtx = isUserHome
    ? `You live in ${userHome}. ${geo ? '' : 'Location lookup unavailable.'} `
    : `${city} is one of your spending locations. ${geo ? '' : 'Location lookup unavailable.'} `

  // --- TRANSPORT ---
  if (/transport|travel|rideshare|uber|lyft|taxi|gas|fuel|auto|car|commute|train|bus|metro|tram|parking|toll/.test(cleanCat)) {
    try {
      const tripKm = estimateTripKm(avgTx)
      const transit = localTransitInfo(userHome)
      const transitFare = Math.round(1.05 + tripKm * 0.15)
      const savings = Math.round(avgTx - transitFare)
      const alts: any[] = []

      const stops = await findNearbyBusStops(userHome, country)
      if (stops.length > 0) {
        const stopNames = [...new Set(stops.map(s => s.name))].slice(0, 3).join(', ')
        alts.push({ name: `${transit.operator} bus (${stopNames})`, estimatedSavings: savings, originalCost: Math.round(avgTx), alternativeCost: transitFare, reason: `${locPhrase}. Your ${merchantName} trip (est. ${tripKm} km) costs ~€${fmtCurrency(avgTx)}. ${transit.note}Nearest stops: ${stopNames}. A bus for ${tripKm} km is ~€${transitFare} — saving you €${savings} per trip.`, type: 'primary' as const, detail: `~€${transitFare} · stops: ${stopNames}` })
      } else {
        alts.push({ name: `${transit.operator} bus/tram`, estimatedSavings: savings, originalCost: Math.round(avgTx), alternativeCost: transitFare, reason: `${locPhrase}. Your ${merchantName} trip (est. ${tripKm} km) costs ~€${fmtCurrency(avgTx)}. ${transit.note}A bus for ${tripKm} km is ~€${transitFare} — saving you €${savings} per trip.`, type: 'primary' as const, detail: `~€${transitFare} · ${tripKm} km trip` })
      }
      if (tripKm <= 10) {
        const cycleTime = Math.round(tripKm * 4)
        alts.push({ name: 'Cycle instead', estimatedSavings: Math.round(avgTx - tripKm * 0.05), originalCost: Math.round(avgTx), alternativeCost: Math.round(tripKm * 0.05), reason: `Same ${tripKm} km by bike costs ~€${fmtCurrency(tripKm * 0.05)} in maintenance. Takes ~${cycleTime} min and saves €${Math.round(avgTx - tripKm * 0.05)}.`, type: 'secondary' as const, detail: `${tripKm} km · ~${cycleTime} min cycle` })
      }
      if (tripKm <= 3) {
        const walkTime = Math.round(tripKm * 12)
        alts.push({ name: 'Walk it', estimatedSavings: Math.round(avgTx), originalCost: Math.round(avgTx), alternativeCost: 0, reason: `${tripKm} km is walkable in ~${walkTime} min. Free and saves €${Math.round(avgTx)}.`, type: 'secondary' as const, detail: `${walkTime} min walk` })
      }
      return { locationContext: locCtx, alternatives: alts }
    } catch (e) {
      return makeSimpleAlt(avgTx, merchantName, userHome, 'Take public transit or cycle', 'Use fuel rewards apps', locCtx, `Location lookup failed for ${userHome}: ${e instanceof Error ? e.message : 'Unknown error'}. Showing estimates.`)
    }
  }

  // --- FOOD & DINING ---
  if (/food|drink|restaurant|dining|groceries|meal|fast.?food|kfc|mcdonald|pizza|burger|takeout|bistro|cafe|snack|lunch|dinner/.test(cleanCat)) {
    try {
      const breakdown = await getIngredientBreakdown(merchantName, Math.round(avgTx))
      const homeCost = breakdown.total
      const savings = Math.round(avgTx - homeCost)
      const alts: any[] = []

      const markets = await findNearbySupermarkets(userHome, country)
      if (markets.length > 0 && geo) {
        const m = markets[0]
        const dist = haversine(geo.lat, geo.lon, m.lat, m.lon)
        const items = breakdown.items.map(i => `${i.name} (€${i.price.toFixed(2)})`).join(' + ')
        alts.push({ name: `Cook at home (${m.name})`, estimatedSavings: savings, originalCost: Math.round(avgTx), alternativeCost: homeCost, reason: `${locPhrase}. A €${fmtCurrency(avgTx)} meal at ${merchantName}. Instead, buy at ${m.name} (${dist.toFixed(1)} km): ${items} = €${homeCost.toFixed(2)} total. Save €${savings} per meal.`, distance: `${dist.toFixed(1)} km`, type: 'primary' as const, detail: `${m.name} · ${items}` })
      } else {
        const items = breakdown.items.map(i => `${i.name} (€${i.price.toFixed(2)})`).join(' + ')
        alts.push({ name: 'Cook at home', estimatedSavings: savings, originalCost: Math.round(avgTx), alternativeCost: homeCost, reason: `${locPhrase}. A €${fmtCurrency(avgTx)} meal at ${merchantName}. Home cooking: ${items} = €${homeCost.toFixed(2)}. Save €${savings} per meal.`, type: 'primary' as const, detail: `${items} = €${homeCost.toFixed(2)}` })
      }

      const cheapEats = await tryApiOrFallback(() => searchPlaces('restaurant', userHome, country, 6), [])
      const others = cheapEats.filter((r: any) => !merchantName.toLowerCase().includes(r.name?.toLowerCase() || ''))
      if (others.length > 0 && geo) {
        const ce = others[0]
        const ceDist = haversine(geo.lat, geo.lon, ce.lat, ce.lon)
        const cheapCost = Math.round(avgTx * 0.7)
        alts.push({ name: `${ce.name} (nearby)`, estimatedSavings: Math.round(avgTx - cheapCost), originalCost: Math.round(avgTx), alternativeCost: cheapCost, reason: `Try ${ce.name} instead — ${ceDist.toFixed(1)} km away, estimated ~€${cheapCost} vs €${fmtCurrency(avgTx)} at ${merchantName}.`, distance: `${ceDist.toFixed(1)} km`, type: 'secondary' as const, detail: `~€${cheapCost}/meal · ${ceDist.toFixed(1)} km` })
      }
      alts.push({ name: 'Pack lunch / meal prep', estimatedSavings: Math.round(avgTx * 0.7), originalCost: Math.round(avgTx), alternativeCost: Math.round(avgTx * 0.3), reason: `Packing lunch costs ~€${Math.round(avgTx * 0.3)} vs €${fmtCurrency(avgTx)} at ${merchantName}. Over 22 workdays: save ~€${Math.round(avgTx * 0.7 * 22)}/mo.`, type: 'secondary' as const })
      return { locationContext: locCtx, alternatives: alts }
    } catch (e) {
      return makeSimpleAlt(avgTx, merchantName, userHome, 'Cook at home', 'Pack lunch / meal prep', locCtx, `Location lookup failed for ${userHome}: ${e instanceof Error ? e.message : 'Unknown error'}. Showing estimates.`)
    }
  }

  // --- COFFEE ---
  if (/coffee|tea|cafe/.test(cleanCat)) {
    return {
      locationContext: locCtx,
      alternatives: [{
        name: 'Brew at home', estimatedSavings: Math.round(avgTx - 0.30), originalCost: Math.round(avgTx), alternativeCost: 0.30,
        reason: `A €${fmtCurrency(avgTx)} coffee at ${merchantName}. Home-brewed: ~€0.30 per cup. Save €${Math.round(avgTx - 0.30)} per cup.`,
        type: 'primary' as const, detail: '~€0.30 per cup at home',
      }],
    }
  }

  // --- SHOPPING ---
  if (/shopping|retail|merchandise|clothing|electronics|general.?merchandise|department|store/.test(cleanCat)) {
    return {
      locationContext: locCtx,
      alternatives: [{
        name: 'Second-hand / thrift stores', estimatedSavings: Math.round(avgTx * 0.5), originalCost: Math.round(avgTx), alternativeCost: Math.round(avgTx * 0.5),
        reason: `Second-hand alternatives in ${userHome} typically save ~50% on items you'd buy new at ${merchantName}. Check local thrift shops.`,
        type: 'primary' as const, detail: `~€${Math.round(avgTx * 0.5)} saved per visit`,
      }, {
        name: 'Wait 48h before buying', estimatedSavings: Math.round(avgTx * 0.2), originalCost: Math.round(avgTx), alternativeCost: Math.round(avgTx * 0.8),
        reason: `${merchantName} spend averages €${fmtCurrency(avgTx)}/visit. A 48h cooling period reduces impulse purchases by ~20%.`,
        type: 'secondary' as const,
      }],
    }
  }

  // --- ENTERTAINMENT ---
  if (/entertainment|streaming|subscription|movies|games|music|tv|netflix|spotify|hbo|disney/.test(cleanCat)) {
    return {
      locationContext: locCtx,
      alternatives: [{
        name: 'Annual billing', estimatedSavings: Math.round(avgTx * 0.15), originalCost: Math.round(avgTx), alternativeCost: Math.round(avgTx * 0.85),
        reason: `${merchantName} likely offers 15-20% off with annual billing — saving ~€${Math.round(avgTx * 0.15)}/mo.`,
        type: 'primary' as const,
      }, {
        name: 'Ad-supported / family plan', estimatedSavings: Math.round(avgTx * 0.25), originalCost: Math.round(avgTx), alternativeCost: Math.round(avgTx * 0.75),
        reason: 'Downgrading to ad-supported tiers or splitting a family plan cuts costs significantly.',
        type: 'secondary' as const,
      }],
    }
  }

  // --- HOUSING & UTILITIES ---
  if (/rent|utilities|housing|mortgage|lease|property|hoa|maintenance|repair|electric|water|gas|internet|phone/.test(cleanCat)) {
    return {
      locationContext: locCtx,
      alternatives: [{
        name: 'Negotiate / switch providers', estimatedSavings: Math.round(avgTx * 0.12), originalCost: Math.round(avgTx), alternativeCost: Math.round(avgTx * 0.88),
        reason: `Your €${fmtCurrency(avgTx)} payment to ${merchantName} may be negotiable. Switching internet/utility providers or asking for a loyalty discount typically saves 10-15%.`,
        type: 'primary' as const,
      }, {
        name: 'Usage audit', estimatedSavings: Math.round(avgTx * 0.08), originalCost: Math.round(avgTx), alternativeCost: Math.round(avgTx * 0.92),
        reason: 'Reviewing your actual usage vs plan could uncover savings. Many households overpay by 8-12% on utilities.',
        type: 'secondary' as const,
      }],
    }
  }

  // --- FINANCIAL (loans, transfers, fees) ---
  if (/loan|payment|transfer|fee|interest|finance|bank|credit|debt|mortgage|insurance|premium/.test(cleanCat)) {
    return {
      locationContext: locCtx,
      alternatives: [{
        name: 'Compare rates / refinance', estimatedSavings: Math.round(avgTx * 0.18), originalCost: Math.round(avgTx), alternativeCost: Math.round(avgTx * 0.82),
        reason: `${merchantName} charges ~€${fmtCurrency(avgTx)}. Comparing rates or refinancing could save ~18%. Check Bunq, Revolut, or Wise for better terms.`,
        type: 'primary' as const,
      }, {
        name: 'Automate & consolidate', estimatedSavings: Math.round(avgTx * 0.08), originalCost: Math.round(avgTx), alternativeCost: Math.round(avgTx * 0.92),
        reason: 'Consolidating payments and automating transfers reduces late fees and keeps your finances organised.',
        type: 'secondary' as const,
      }],
    }
  }

  // --- GENERIC FALLBACK ---
  return makeSimpleAlt(avgTx, merchantName, userHome, 'Compare 2-3 alternatives', 'Loyalty / bulk discounts', locCtx)
}

function makeSimpleAlt(avgTx: number, merchantName: string, _userHome: string, primaryName: string, secondaryName: string, locCtx: string, error?: string) {
  return {
    locationContext: locCtx,
    error,
    alternatives: [{
      name: primaryName,
      estimatedSavings: Math.round(avgTx * 0.15),
      originalCost: Math.round(avgTx),
      alternativeCost: Math.round(avgTx * 0.85),
      reason: `At ${merchantName} you spend ~€${fmtCurrency(avgTx)} per visit. ${primaryName} could save ~€${Math.round(avgTx * 0.15)} each time.`,
      type: 'primary' as const,
    }, {
      name: secondaryName,
      estimatedSavings: Math.round(avgTx * 0.1),
      originalCost: Math.round(avgTx),
      alternativeCost: Math.round(avgTx * 0.9),
      reason: `Check if ${secondaryName.toLowerCase()} applies to your ${merchantName} spending.`,
      type: 'secondary' as const,
    }],
  }
}
