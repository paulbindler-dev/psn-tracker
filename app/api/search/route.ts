import { NextRequest, NextResponse } from 'next/server'
import { searchPSN } from '@/lib/psn-scraper'

const FULL_GAME_TYPES = ['FULL_GAME', 'GAME_BUNDLE', 'LEGACY_GAME']
const ADDON_TYPES = ['GAME_ADD_ON']
const DEMO_TYPES = ['DEMO']

export async function GET(req: NextRequest) {
  const title = req.nextUrl.searchParams.get('title')
  if (!title) return NextResponse.json({ error: 'title required' }, { status: 400 })

  const products = await searchPSN('fr-fr', title)

  return NextResponse.json({
    games: products.filter((p) => FULL_GAME_TYPES.includes(p.storeDisplayClassification)).slice(0, 6),
    addons: products.filter((p) => ADDON_TYPES.includes(p.storeDisplayClassification)).slice(0, 4),
    demos: products.filter((p) => DEMO_TYPES.includes(p.storeDisplayClassification)).slice(0, 3),
  })
}
