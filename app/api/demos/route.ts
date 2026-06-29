import { NextResponse } from 'next/server'
import { fetchPSNUrl, searchPSN } from '@/lib/psn-scraper'
import { PSNProduct } from '@/lib/types'

export const dynamic = 'force-dynamic'

// PSN store category pages for demos — tried in order, first with results wins
const DEMO_PAGES = [
  'https://store.playstation.com/fr-fr/pages/demos',
  'https://store.playstation.com/fr-fr/pages/game-demos',
  'https://store.playstation.com/fr-fr/pages/ps5/demos',
]

// Fallback search terms when category pages yield nothing
const FALLBACK_QUERIES = ['démo', 'demo', 'trial', 'gratuit']

function deduped(products: PSNProduct[]): PSNProduct[] {
  const seen = new Set<string>()
  return products.filter(p => {
    if (seen.has(p.id)) return false
    seen.add(p.id)
    return true
  })
}

export async function GET() {
  // 1. Try PSN category pages (most reliable, PSN-curated list)
  for (const url of DEMO_PAGES) {
    try {
      const products = await fetchPSNUrl(url)
      const demos = products.filter(p => p.storeDisplayClassification === 'DEMO')
      if (demos.length >= 3) {
        return NextResponse.json(
          { demos: demos.slice(0, 40) },
          { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' } }
        )
      }
    } catch {
      // try next
    }
  }

  // 2. Fallback: parallel searches across multiple terms
  const results = await Promise.allSettled(
    FALLBACK_QUERIES.map(q => searchPSN('fr-fr', q))
  )

  const all: PSNProduct[] = []
  for (const r of results) {
    if (r.status === 'fulfilled') {
      all.push(...r.value.filter(p => p.storeDisplayClassification === 'DEMO'))
    }
  }

  return NextResponse.json(
    { demos: deduped(all).slice(0, 40) },
    { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' } }
  )
}
