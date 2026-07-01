type ProductPrice = {
  name: string
  price: number
  supermarket: string
  unitSize?: string
  unitPrice?: string
}

type PriceResult = {
  products: ProductPrice[]
  source: 'live' | 'cache' | 'reference'
  cachedAt?: number
}

const cache = new Map<string, { data: ProductPrice[]; ts: number }>()
const CACHE_TTL = 30 * 60 * 1000

async function searchLidl(query: string): Promise<ProductPrice[]> {
  try {
    const res = await fetch(`https://www.lidl.nl/search?q=${encodeURIComponent(query)}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(8000),
    })
    const html = await res.text()
    const prices: ProductPrice[] = []
    const priceMatches = [...html.matchAll(/"price":(\d+\.?\d*)/g)]
    const nameMatches = [...html.matchAll(/"name":"([^"]+)"|"title":"([^"]+)"|alt="([^"]*pasta[^"]*)"|aria-label="([^"]*pasta[^"]*)"/gi)]
    const nameValues = [...new Set(nameMatches.map(m => m[1] || m[2] || m[3] || m[4] || '').filter(Boolean))]
    for (let i = 0; i < Math.min(priceMatches.length, 5); i++) {
      const priceVal = parseFloat(priceMatches[i][1])
      if (isNaN(priceVal) || priceVal < 0.1 || priceVal > 200) continue
      const name = nameValues[i] || `${query} product ${i + 1}`
      prices.push({ name, price: priceVal < 20 ? priceVal : priceVal / 100, supermarket: 'Lidl' })
    }
    return prices
  } catch {
    return []
  }
}

async function searchOpenFoodFacts(query: string): Promise<ProductPrice[]> {
  try {
    const res = await fetch(`https://prices.openfoodfacts.org/api/v1/products?search=${encodeURIComponent(query)}&limit=5&order_by=-price_count`, {
      signal: AbortSignal.timeout(5000),
    })
    const data = await res.json()
    const products = data?.items || []
    const results: ProductPrice[] = []
    for (const p of products.slice(0, 5)) {
      const name = p.product_name || p.code || query
      const priceRes = await fetch(`https://prices.openfoodfacts.org/api/v1/prices?product_id=${p.id}&limit=1&order_by=-created`, {
        signal: AbortSignal.timeout(3000),
      })
      const priceData = await priceRes.json()
      const priceItems = priceData?.items || []
      if (priceItems.length > 0) {
        const loc = priceItems[0].location
        const supermarket = loc?.osm_name || loc?.osm_brand || 'unknown'
        results.push({
          name,
          price: priceItems[0].price || 0,
          supermarket,
        })
      }
    }
    return results
  } catch {
    return []
  }
}

const REFERENCE_PRICES: Record<string, { name: string; price: number; supermarket: string; source: string }[]> = {
  pasta: [
    { name: 'Pasta (500g)', price: 0.69, supermarket: 'Aldi', source: 'voordly.com 2026' },
    { name: 'Pasta (500g)', price: 0.75, supermarket: 'Lidl', source: 'voordly.com 2026' },
    { name: 'Pasta (500g)', price: 0.99, supermarket: 'AH', source: 'AH.nl 2026' },
  ],
  rice: [
    { name: 'Basmati rice (500g)', price: 0.99, supermarket: 'Aldi', source: 'voordly.com 2026' },
    { name: 'Long-grain rice (1kg)', price: 1.05, supermarket: 'Lidl', source: 'voordly.com 2026' },
    { name: 'Long-grain rice (1kg)', price: 1.39, supermarket: 'AH', source: 'voordly.com 2026' },
  ],
  chicken: [
    { name: 'Chicken breast (500g)', price: 3.99, supermarket: 'Aldi', source: 'voordly.com 2026' },
    { name: 'Chicken breast (500g)', price: 3.99, supermarket: 'Lidl', source: 'voordly.com 2026' },
    { name: 'Chicken breast (500g)', price: 5.99, supermarket: 'AH', source: 'voordly.com 2026' },
  ],
  eggs: [
    { name: 'Eggs (10)', price: 1.89, supermarket: 'Aldi', source: 'voordly.com 2026' },
    { name: 'Eggs (10)', price: 1.95, supermarket: 'Lidl', source: 'voordly.com 2026' },
    { name: 'Eggs (10)', price: 2.49, supermarket: 'AH', source: 'voordly.com 2026' },
  ],
  milk: [
    { name: 'Milk (1L)', price: 0.99, supermarket: 'Aldi', source: 'voordly.com 2026' },
    { name: 'Milk (1L)', price: 0.99, supermarket: 'Lidl', source: 'voordly.com 2026' },
    { name: 'Milk (1L)', price: 1.15, supermarket: 'AH', source: 'voordly.com 2026' },
  ],
  cheese: [
    { name: 'Young matured cheese (per kg)', price: 7.98, supermarket: 'Aldi', source: 'voordly.com 2026' },
    { name: 'Young matured cheese (per kg)', price: 6.98, supermarket: 'Lidl', source: 'voordly.com 2026' },
    { name: 'Young matured cheese (per kg)', price: 8.98, supermarket: 'AH', source: 'voordly.com 2026' },
  ],
  vegetables: [
    { name: 'Frozen mixed vegetables (1kg)', price: 1.49, supermarket: 'Aldi', source: 'voordly.com 2026' },
    { name: 'Frozen mixed vegetables (1kg)', price: 1.49, supermarket: 'Lidl', source: 'voordly.com 2026' },
    { name: 'Frozen mixed vegetables (1kg)', price: 2.19, supermarket: 'AH', source: 'voordly.com 2026' },
  ],
  beef: [
    { name: 'Ground beef (500g)', price: 3.99, supermarket: 'Aldi', source: 'voordly.com 2026' },
    { name: 'Ground beef (500g)', price: 3.99, supermarket: 'Lidl', source: 'voordly.com 2026' },
    { name: 'Ground beef (500g)', price: 5.49, supermarket: 'AH', source: 'voordly.com 2026' },
  ],
  bread: [
    { name: 'Fresh bread roll', price: 0.75, supermarket: 'Aldi', source: 'Expatica 2026' },
    { name: 'White bread (500g)', price: 1.90, supermarket: 'Jumbo', source: 'DBWork.jobs 2026' },
  ],
  potatoes: [
    { name: 'Potatoes (1kg)', price: 1.29, supermarket: 'Aldi', source: 'voordly.com 2026' },
    { name: 'Potatoes (1kg)', price: 1.80, supermarket: 'Average', source: 'DBWork.jobs 2026' },
  ],
  tomatoes: [
    { name: 'Tomatoes (1kg)', price: 2.00, supermarket: 'Aldi', source: 'Expatica 2026' },
    { name: 'Tomatoes (1kg)', price: 2.50, supermarket: 'Average', source: 'DBWork.jobs 2026' },
  ],
  fish: [
    { name: 'White fish fillet (300g)', price: 3.99, supermarket: 'Aldi', source: 'voordly.com 2026 estimate' },
    { name: 'White fish fillet (300g)', price: 5.49, supermarket: 'AH', source: 'voordly.com 2026 estimate' },
  ],
  coffee: [
    { name: 'Coffee (per cup at home)', price: 0.30, supermarket: 'Home', source: 'Expatica 2026' },
    { name: 'Coffee beans (1kg)', price: 10.00, supermarket: 'Aldi', source: 'Expatica 2026' },
  ],
}

const INGREDIENT_TO_REFERENCE: Record<string, string> = {
  'pasta': 'pasta', 'spaghetti': 'pasta', 'penne': 'pasta', 'noodles': 'pasta',
  'rice': 'rice', 'basmati': 'rice',
  'chicken': 'chicken', 'kip': 'chicken', 'chicken breast': 'chicken',
  'egg': 'eggs', 'eieren': 'eggs',
  'milk': 'milk', 'melk': 'milk',
  'cheese': 'cheese', 'kaas': 'cheese', 'mozzarella': 'cheese', 'parmesan': 'cheese',
  'vegetable': 'vegetables', 'groente': 'vegetables', 'mixed vegetables': 'vegetables',
  'beef': 'beef', 'ground beef': 'beef', 'rundvlees': 'beef', 'burger': 'beef',
  'bread': 'bread', 'brood': 'bread',
  'potato': 'potatoes', 'aardappel': 'potatoes',
  'tomato': 'tomatoes', 'tomaat': 'tomatoes',
  'fish': 'fish', 'vis': 'fish', 'salmon': 'fish',
  'coffee': 'coffee', 'koffie': 'coffee',
}

export function getReferencePrice(ingredientName: string, discountSupermarket = true): { price: number; source: string; supermarket: string } {
  const lower = ingredientName.toLowerCase()
  let key = ''
  for (const [kw, ref] of Object.entries(INGREDIENT_TO_REFERENCE)) {
    if (lower.includes(kw)) { key = ref; break }
  }
  if (!key) key = lower
  const refs = REFERENCE_PRICES[key] || REFERENCE_PRICES.pasta
  const sorted = [...refs].sort((a, b) => a.price - b.price)
  const pick = discountSupermarket ? sorted[0] : sorted[sorted.length - 1]
  return { price: pick.price, source: pick.source, supermarket: pick.supermarket }
}

export async function searchProducts(query: string, preferSupermarket?: string): Promise<PriceResult> {
  const cacheKey = `${query}|${preferSupermarket || ''}`
  const cached = cache.get(cacheKey)
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return { products: cached.data, source: 'cache', cachedAt: cached.ts }
  }

  let products: ProductPrice[] = []
  let source: 'live' | 'reference' = 'reference'

  const lidlProducts = await searchLidl(query)
  if (lidlProducts.length > 0) {
    products = lidlProducts
    source = 'live'
  }

  if (products.length === 0) {
    const offProducts = await searchOpenFoodFacts(query)
    if (offProducts.length > 0) {
      products = offProducts
      source = 'live'
    }
  }

  if (products.length === 0) {
    const refKey = query.toLowerCase()
    let refs = REFERENCE_PRICES[refKey] || []
    if (refs.length === 0) {
      for (const [key, vals] of Object.entries(REFERENCE_PRICES)) {
        if (refKey.includes(key) || key.includes(refKey)) { refs = vals; break }
      }
    }
    if (refs.length === 0) refs = REFERENCE_PRICES.pasta
    products = refs.map(r => ({ name: r.name, price: r.price, supermarket: r.supermarket }))
  }

  cache.set(cacheKey, { data: products, ts: Date.now() })
  return { products, source }
}

export async function getIngredientPrices(
  ingredientNames: string[],
): Promise<{ items: { name: string; price: number; supermarket: string; source: string }[]; total: number }> {
  const items = []
  for (const name of ingredientNames) {
    const ref = getReferencePrice(name)
    items.push({ name, price: ref.price, supermarket: ref.supermarket, source: ref.source })
  }
  const total = Math.round(items.reduce((s, i) => s + i.price, 0) * 100) / 100
  return { items, total }
}
