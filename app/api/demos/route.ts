import { NextResponse } from 'next/server'
import { searchPSN } from '@/lib/psn-scraper'
import { PSNProduct } from '@/lib/types'

export const dynamic = 'force-dynamic'

// Multiple queries to maximise demo coverage — PSN indexes vary by region/date
const BROWSE_QUERIES = ['demo', 'trial', 'gratuit', 'démonstration']

export async function GET() {
  const results = await Promise.allSettled(
    BROWSE_QUERIES.map((q) => searchPSN('fr-fr', q))
  )

  const seen = new Set<string>()
  const demos: PSNProduct[] = []

  for (const result of results) {
    if (result.status !== 'fulfilled') continue
    for (const p of result.value) {
      if (
        p.storeDisplayClassification === 'DEMO' &&
        p.platforms.includes('PS5') &&
        !seen.has(p.id)
      ) {
        seen.add(p.id)
        demos.push(p)
      }
    }
  }

  return NextResponse.json(
    { demos: demos.slice(0, 40) },
    { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' } }
  )
}
