import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

let cache: { rate: number; date: string; fetchedAt: number } | null = null
const CACHE_TTL_MS = 24 * 60 * 60 * 1000

export async function GET() {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return NextResponse.json(cache)
  }

  const res = await fetch('https://api.frankfurter.app/latest?from=KRW&to=EUR', {
    cache: 'no-store',
  })
  if (!res.ok) {
    if (cache) return NextResponse.json(cache)
    return NextResponse.json({ error: 'exchange rate unavailable' }, { status: 502 })
  }

  const data = await res.json()
  cache = { rate: data.rates.EUR, date: data.date, fetchedAt: Date.now() }
  return NextResponse.json(cache)
}
