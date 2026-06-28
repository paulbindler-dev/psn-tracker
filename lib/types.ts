export interface PSNProduct {
  id: string               // full product ID e.g. "EP9000-PPSA08338_00-MARVELSPIDERMAN2"
  suffix: string           // last segment after '-' e.g. "MARVELSPIDERMAN2"
  name: string             // display name (may include Korean lang list)
  npTitleId: string
  platforms: string[]      // ['PS4', 'PS5']
  basePrice: string | null          // "€79,99" or "79,800원" or null
  discountedPrice: string | null
  discountText: string | null       // "-50 %" or null
  isFree: boolean
  serviceBranding: string[]         // ["EXTRA"], ["PREMIUM"], ["NONE"] — PS Plus catalog tier
  coverUrl: string | null           // image.api.playstation.com URL
  storeDisplayClassification: string
}

export interface PriceResult {
  fr: {
    id: string
    name: string
    platforms: string[]
    basePrice: string | null
    discountedPrice: string | null
    discountText: string | null
    coverUrl: string | null
    psPlusTier: 'EXTRA' | 'PREMIUM' | null
    storeUrl: string
  } | null
  kr: {
    id: string
    name: string
    basePrice: string | null
    discountedPrice: string | null
    discountText: string | null
    coverUrl: string | null
    langSafety: 'safe' | 'risky' | 'unknown'
    langs: string[]
    storeUrl: string
    priceEur: number | null
  } | null
  frHasDemo: boolean
  krHasDemo: boolean
}

export interface User {
  id: string
  slug: string
  name: string | null
  currency: 'EUR' | 'KRW'
}

export interface Game {
  id: string
  title: string
  fr_product_id: string | null
  kr_product_id: string | null
  user_id: string | null
  added_at: string
}

export type SortKey = 'promo' | 'saving' | 'price_fr_asc' | 'price_fr_desc' | 'name_az' | 'name_za' | 'added_recent' | 'added_old'
