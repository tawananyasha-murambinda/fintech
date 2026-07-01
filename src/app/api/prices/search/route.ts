import { NextRequest, NextResponse } from 'next/server'
import { searchProducts, getReferencePrice } from '@/lib/prices'

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('query')
  const supermarket = req.nextUrl.searchParams.get('supermarket') || undefined

  if (!query || query.length < 2) {
    return NextResponse.json({ error: 'Query must be at least 2 characters' }, { status: 400 })
  }

  const result = await searchProducts(query, supermarket)
  return NextResponse.json(result)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { ingredients } = body

  if (!Array.isArray(ingredients) || ingredients.length === 0) {
    return NextResponse.json({ error: 'ingredients array is required' }, { status: 400 })
  }

  const items = ingredients.map((name: string) => {
    const ref = getReferencePrice(name)
    return { name, price: ref.price, supermarket: ref.supermarket, source: ref.source }
  })
  const total = Math.round(items.reduce((s: number, i: { price: number }) => s + i.price, 0) * 100) / 100

  return NextResponse.json({ items, total })
}
