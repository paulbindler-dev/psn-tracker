import { NextRequest, NextResponse } from 'next/server'
import { searchPSN } from '@/lib/psn-scraper'

const FULL_GAME_TYPES = ['FULL_GAME', 'GAME_BUNDLE', 'LEGACY_GAME']
const ADDON_TYPES = ['GAME_ADD_ON']
const DEMO_TYPES = ['DEMO']

export async function GET(req: NextRequest) {
  const title = req.nextUrl.searchParams.get('title')
  if (!title) return NextResponse.json({ error: 'title required' }, { status: 400 })

  // Search FR and KR in parallel — same cost as searching FR alone
  const [frProducts, krProducts] = await Promise.all([
    searchPSN('fr-fr', title),
    searchPSN('ko-kr', title),
  ])

  return NextResponse.json({
    games:   frProducts.filter((p) => FULL_GAME_TYPES.includes(p.storeDisplayClassification)).slice(0, 6),
    addons:  frProducts.filter((p) => ADDON_TYPES.includes(p.storeDisplayClassification)).slice(0, 4),
    demos:   frProducts.filter((p) => DEMO_TYPES.includes(p.storeDisplayClassification)).slice(0, 3),
    krGames: krProducts.filter((p) => FULL_GAME_TYPES.includes(p.storeDisplayClassification)).slice(0, 6),
  })
}
