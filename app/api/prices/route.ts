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
    // Fetch by ID (possibly alongside title-based search for the other region)
    const tasks: Promise<void>[] = []

    if (frId) {
      tasks.push(
        fetchProductById(frId, 'fr-fr').then((p) => {
          frProduct = p
          if (p) frProducts = [p]
        })
      )
    } else if (title) {
      tasks.push(
        searchPSN('fr-fr', title).then((ps) => {
          frProducts = ps
        })
      )
    }

    if (krId) {
      tasks.push(
        fetchProductById(krId, 'ko-kr').then((p) => {
          krProduct = p
          if (p) krProducts = [p]
        })
      )
    } else if (title) {
      tasks.push(
        searchPSN('ko-kr', title).then((ps) => {
          krProducts = ps
        })
      )
    }

    await Promise.all(tasks)

    // If frId not provided but title was, run matchProducts to pick best FR
    if (!frId && title) {
      const matched = matchProducts(frProducts, krProducts)
      frProduct = matched.fr
    }

    // If krId not provided but title was, pick KR via matchProducts
    if (!krId && title && !krProduct) {
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
