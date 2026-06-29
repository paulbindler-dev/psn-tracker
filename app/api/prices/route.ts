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

  if (!frId && !title) {
    return NextResponse.json({ error: 'title or fr_id parameter required' }, { status: 400 })
  }

  // Fetch FR product
  let frProduct: PSNProduct | null = null
  let frProducts: PSNProduct[] = []

  // Fetch KR product
  let krProduct: PSNProduct | null = null
  let krProducts: PSNProduct[] = []

  const exchangeResPromise = fetch(`${req.nextUrl.origin}/api/exchange`)

  if (frId || krId) {
    // Fetch by ID, with title fallback when ID lookup fails
    const tasks: Promise<void>[] = []

    if (frId) {
      tasks.push(
        fetchProductById(frId, 'fr-fr').then((p) => {
          if (p) { frProduct = p; frProducts = [p] }
        })
      )
    }

    if (krId) {
      tasks.push(
        fetchProductById(krId, 'ko-kr').then((p) => {
          if (p) { krProduct = p; krProducts = [p] }
        })
      )
    }

    // Always search KR by title when no krId — needed for price comparison
    if (!krId && title) {
      tasks.push(
        searchPSN('ko-kr', title).then((ps) => {
          krProducts = ps
        })
      )
    }

    await Promise.all(tasks)

    // Fallback: if frId lookup returned nothing, try title search
    if (frId && frProducts.length === 0 && title) {
      frProducts = await searchPSN('fr-fr', title)
    }

    // Fallback: if krId lookup returned nothing, try title search
    if (krId && krProducts.length === 0 && title) {
      krProducts = await searchPSN('ko-kr', title)
    }

    if (!frProduct) {
      const matched = matchProducts(frProducts, krProducts)
      frProduct = matched.fr
    }

    if (!krProduct) {
      const matched = matchProducts(frProducts, krProducts)
      krProduct = matched.kr
    }
  } else {
    // Classic title-based search for both regions
    const [fr, kr] = await Promise.all([
      searchPSN('fr-fr', title!),
      searchPSN('ko-kr', title!),
    ])
    frProducts = fr
    krProducts = kr

    const matched = matchProducts(frProducts, krProducts)
    frProduct = matched.fr
    krProduct = matched.kr
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

  // Demo detection: when fetching by ID we only have that product, so demos won't appear
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
