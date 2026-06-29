import { NextRequest, NextResponse } from 'next/server'
import { searchPSN, fetchProductById } from '@/lib/psn-scraper'
import { matchProducts } from '@/lib/game-matcher'
import { parseLangsFromKRTitle } from '@/lib/lang-parser'
import { PriceResult, PSNProduct } from '@/lib/types'

export const dynamic = 'force-dynamic'

function parseKRWAmount(priceStr: string | null): number | null {
  if (!priceStr) return null
  const digits = priceStr.replace(/[^0-9]/g, '')
  return digits ? parseInt(digits, 10) : null
}

export async function GET(req: NextRequest) {
  const frId = req.nextUrl.searchParams.get('fr_id')
  const krId = req.nextUrl.searchParams.get('kr_id')
  const title = req.nextUrl.searchParams.get('title')

  if (!title && !frId) {
    return NextResponse.json({ error: 'title or fr_id required' }, { status: 400 })
  }

  let frProduct: PSNProduct | null = null
  let krProduct: PSNProduct | null = null
  let frProducts: PSNProduct[] = []
  let krProducts: PSNProduct[] = []

  const exchangeResPromise = fetch(`${req.nextUrl.origin}/api/exchange`)

  // STRATEGY: Title search is always the primary source (PSN search pages still embed
  // full Apollo state with price + cover + platforms). Stored product IDs are used only
  // as edition-selection hints after the search.
  if (title) {
    const [fr, kr] = await Promise.all([
      searchPSN('fr-fr', title),
      searchPSN('ko-kr', title),
    ])
    frProducts = fr
    krProducts = kr

    const matched = matchProducts(frProducts, krProducts)

    // If we have a stored ID, prefer the exact edition in the search results
    frProduct = (frId ? frProducts.find((p) => p.id === frId) : null) ?? matched.fr
    krProduct = (krId ? krProducts.find((p) => p.id === krId) : null) ?? matched.kr
  } else if (frId || krId) {
    // No title (legacy path) — fall back to ID-based search
    const [frP, krP] = await Promise.all([
      frId ? fetchProductById(frId, 'fr-fr') : Promise.resolve(null),
      krId ? fetchProductById(krId, 'ko-kr') : Promise.resolve(null),
    ])
    if (frP) { frProduct = frP; frProducts = [frP] }
    if (krP) { krProduct = krP; krProducts = [krP] }

    if (!frProduct || !krProduct) {
      const matched = matchProducts(frProducts, krProducts)
      if (!frProduct) frProduct = matched.fr
      if (!krProduct) krProduct = matched.kr
    }
  }

  const exchangeRes = await exchangeResPromise
  const exchangeData = exchangeRes.ok ? await exchangeRes.json() : null
  const krwToEur: number = exchangeData?.rate ?? 0

  const fr = frProduct
  const kr = krProduct

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
    krwRate: krwToEur > 0 ? Math.round(1 / krwToEur) : null,
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
