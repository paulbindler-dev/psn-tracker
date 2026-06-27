import { PSNProduct } from './types'

const PSN_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml',
}

export async function searchPSN(
  region: 'fr-fr' | 'ko-kr',
  title: string
): Promise<PSNProduct[]> {
  const lang = region === 'fr-fr' ? 'fr-FR' : 'ko-KR'
  const url = `https://store.playstation.com/${region}/search/${encodeURIComponent(title)}`

  const res = await fetch(url, {
    headers: { ...PSN_HEADERS, 'Accept-Language': lang },
    next: { revalidate: 3600 },
  })

  if (!res.ok) return []
  return parseNextDataHtml(await res.text())
}

export function parseNextDataHtml(html: string): PSNProduct[] {
  const match = html.match(
    /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/
  )
  if (!match) return []

  let data: any
  try {
    data = JSON.parse(match[1])
  } catch {
    return []
  }

  const apollo: Record<string, any> = data?.props?.apolloState ?? {}

  return Object.entries(apollo)
    .filter(([key]) => key.startsWith('Product:'))
    .map(([, value]) => value)
    .filter((p) =>
      ['FULL_GAME', 'GAME_BUNDLE', 'GAME_ADD_ON', 'LEGACY_GAME', 'DEMO'].includes(
        p.storeDisplayClassification
      )
    )
    .map((p): PSNProduct => {
      const branding: string[] = p.price?.serviceBranding ?? []
      return {
        id: p.id ?? '',
        suffix: (p.id ?? '').split('-').pop() ?? '',
        name: p.name ?? '',
        npTitleId: p.npTitleId ?? '',
        platforms: p.platforms ?? [],
        basePrice: p.price?.basePrice ?? null,
        discountedPrice: p.price?.discountedPrice ?? null,
        discountText: p.price?.discountText ?? null,
        isFree: p.price?.isFree ?? false,
        serviceBranding: branding,
        coverUrl:
          (p.media as any[])?.find((m) => m.role === 'MASTER')?.url ??
          (p.media as any[])?.find((m) => m.role === 'GAMEHUB_COVER_ART')?.url ??
          null,
        storeDisplayClassification: p.storeDisplayClassification ?? '',
      }
    })
}
