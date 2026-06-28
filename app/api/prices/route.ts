import { NextRequest, NextResponse } from 'next/server'
import { searchPSN } from '@/lib/psn-scraper'
import { matchProducts } from '@/lib/game-matcher'
import { parseLangsFromKRTitle } from '@/lib/lang-parser'
import { PriceResult } from '@/lib/types'

function parseKRWAmount(priceStr: string | null): number | null {
  if (!priceStr) return null
  const digits = priceStr.replace(/[^0-9]/g, '')
  return digits ? parseInt(digits, 10) : null
}

export async function GET(req: NextRequest) {
  const title = req.nextUrl.searchParams.get('title')
  if (!title) {
    return NextResponse.json({ error: 'title parameter required' }, { status: 400 })
  }

  const [frProducts, krProducts, exchangeRes] = await Promise.all([
    searchPSN('fr-fr', title),
    searchPSN('ko-kr', title),
    fetch(`${req.nextUrl.origin}/api/exchange`),
  ])

  const exchangeData = exchangeRes.ok ? await exchangeRes.json() : null
  const krwToEur: number = exchangeData?.rate ?? 0

  const { fr, kr } = matchProducts(frProducts, krProducts)
  const krLang = kr ? parseLangsFromKRTitle(kr.name) : null

  const krwAmount = kr ? parseKRWAmount(kr.discountedPrice ?? kr.basePrice) : null
  const priceEur = krwAmount && krwToEur ? Math.round(krwAmount * krwToEur * 100) / 100 : null

  const psPlusTier = fr?.serviceBranding.includes('PREMIUM')
    ? 'PREMIUM'
    : fr?.serviceBranding.includes('EXTRA')
    ? 'EXTRA'
    : null

  const frHasDemo = frProducts.some((p) => p.storeDisplayClassification === 'DEMO')
  const krHasDemo = krProducts.some((p) => p.storeDisplayClassification === 'DEMO')

  const result: PriceResult = {
    fr: fr
      ? {
          id: fr.id,
          name: fr.name,
          platforms: fr.platforms,
          basePrice: fr.basePrice,
          discountedPrice: fr.discountedPrice,
          discountText: fr.discountText,
          coverUrl: fr.coverUrl,
          psPlusTier,
          storeUrl: `https://store.playstation.com/fr-fr/product/${fr.id}`,
        }
      : null,
    kr: kr
      ? {
          id: kr.id,
          name: kr.name,
          basePrice: kr.basePrice,
          discountedPrice: kr.discountedPrice,
          discountText: kr.discountText,
          coverUrl: kr.coverUrl,
          langSafety: krLang?.safety ?? 'unknown',
          langs: krLang?.langs ?? [],
          storeUrl: `https://store.playstation.com/ko-kr/product/${kr.id}`,
          priceEur,
        }
      : null,
    frHasDemo,
    krHasDemo,
  }

  return NextResponse.json(result)
}
