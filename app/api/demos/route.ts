import { NextRequest, NextResponse } from 'next/server'
import { searchPSN } from '@/lib/psn-scraper'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const region = (req.nextUrl.searchParams.get('region') ?? 'fr-fr') as 'fr-fr' | 'ko-kr'
  const query = req.nextUrl.searchParams.get('q') ?? ''

  // Si une query est fournie, chercher des démos par titre
  // Sinon, chercher "demo" pour obtenir des démos récentes
  const searchTerm = query.trim() || 'demo'

  const products = await searchPSN(region, searchTerm)
  const demos = products.filter(p => p.storeDisplayClassification === 'DEMO')

  return NextResponse.json(demos, {
    headers: { 'Cache-Control': 'public, s-maxage=3600' }
  })
}
