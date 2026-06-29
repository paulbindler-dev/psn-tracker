import { parseNextDataHtml, fetchProductById } from '@/lib/psn-scraper'

const SPIDER_MAN_2_FIXTURE = `
<script id="__NEXT_DATA__" type="application/json">
{"props":{"apolloState":{
  "Product:EP9000-PPSA08338_00-MARVELSPIDERMAN2:fr-fr": {
    "__typename": "Product",
    "id": "EP9000-PPSA08338_00-MARVELSPIDERMAN2",
    "name": "Marvel's Spider-Man 2",
    "npTitleId": "PPSA08338_00",
    "platforms": ["PS5"],
    "storeDisplayClassification": "FULL_GAME",
    "price": {
      "__typename": "SkuPrice",
      "basePrice": "€79,99",
      "discountedPrice": "€59,99",
      "discountText": "-25 %",
      "isFree": false
    },
    "media": [
      {"__typename": "Media", "role": "MASTER", "type": "IMAGE",
       "url": "https://image.api.playstation.com/vulcan/ap/rnd/202306/1219/abc123.png"},
      {"__typename": "Media", "role": "PREVIEW", "type": "VIDEO",
       "url": "https://vulcan.dl.playstation.net/video.mp4"}
    ],
    "personalizedMeta": null
  },
  "Product:EP9000-PPSA08338_00-MARVELSPIDERMAN2-DLC:fr-fr": {
    "__typename": "Product",
    "id": "EP9000-PPSA08338_00-MARVELSPIDERMAN2-DLC",
    "name": "Spider-Man 2 DLC",
    "npTitleId": "PPSA08338_01",
    "platforms": ["PS5"],
    "storeDisplayClassification": "OTHER",
    "price": {"__typename": "SkuPrice", "basePrice": "€9,99", "discountedPrice": "€9,99", "discountText": null, "isFree": false},
    "media": [],
    "personalizedMeta": null
  }
}}}
</script>`

function buildFixtureWithProduct(p: {
  id: string
  storeDisplayClassification: string
  name: string
  platforms: string[]
}): string {
  return `<script id="__NEXT_DATA__" type="application/json">
{"props":{"apolloState":{
  "Product:${p.id}": {
    "__typename": "Product",
    "id": "${p.id}",
    "name": "${p.name}",
    "npTitleId": "TEST_00",
    "platforms": ${JSON.stringify(p.platforms)},
    "storeDisplayClassification": "${p.storeDisplayClassification}",
    "price": {
      "__typename": "SkuPrice",
      "basePrice": "€59,99",
      "discountedPrice": null,
      "discountText": null,
      "isFree": false,
      "serviceBranding": []
    },
    "media": [],
    "personalizedMeta": null
  }
}}}</script>`
}

describe('fetchProductById', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('retourne le produit exact quand lID matche', async () => {
    const productId = 'EP0001-PPSA01619_00-MARVELSPIDERMAN2'
    const fixture = buildFixtureWithProduct({
      id: productId,
      storeDisplayClassification: 'FULL_GAME',
      name: 'Test Game',
      platforms: ['PS5'],
    })
    global.fetch = jest.fn().mockResolvedValueOnce({ ok: true, text: async () => fixture })

    const result = await fetchProductById(productId, 'fr-fr')
    expect(result).not.toBeNull()
    expect(result!.id).toBe(productId)
    expect(result!.storeDisplayClassification).toBe('FULL_GAME')
  })

  it('retourne null si la page retourne 404', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({ ok: false, status: 404 })
    const result = await fetchProductById('INVALID-ID', 'fr-fr')
    expect(result).toBeNull()
  })

  it('utilise /search/ (product pages ne contiennent plus les données complètes)', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({ ok: false })
    await fetchProductById('EP0001-TEST', 'fr-fr')
    expect(global.fetch).toHaveBeenCalledWith(
      'https://store.playstation.com/fr-fr/search/EP0001-TEST',
      expect.any(Object)
    )
  })

  it('construit la bonne URL pour ko-kr via /search/', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({ ok: false })
    await fetchProductById('EP0001-TEST', 'ko-kr')
    expect(global.fetch).toHaveBeenCalledWith(
      'https://store.playstation.com/ko-kr/search/EP0001-TEST',
      expect.any(Object)
    )
  })

  it('retourne le premier FULL_GAME si lID exact ne matche pas', async () => {
    const fixture = buildFixtureWithProduct({
      id: 'EP0001-OTHER-ID',
      storeDisplayClassification: 'FULL_GAME',
      name: 'Another Game',
      platforms: ['PS5'],
    })
    global.fetch = jest.fn().mockResolvedValueOnce({ ok: true, text: async () => fixture })

    const result = await fetchProductById('EP0001-SEARCHED-ID', 'fr-fr')
    expect(result).not.toBeNull()
    expect(result!.storeDisplayClassification).toBe('FULL_GAME')
  })
})

describe('parseNextDataHtml', () => {
  it('extracts FULL_GAME products only', () => {
    const products = parseNextDataHtml(SPIDER_MAN_2_FIXTURE)
    expect(products).toHaveLength(1)
    expect(products[0].id).toBe('EP9000-PPSA08338_00-MARVELSPIDERMAN2')
  })

  it('extracts suffix from product ID', () => {
    const products = parseNextDataHtml(SPIDER_MAN_2_FIXTURE)
    expect(products[0].suffix).toBe('MARVELSPIDERMAN2')
  })

  it('extracts prices', () => {
    const products = parseNextDataHtml(SPIDER_MAN_2_FIXTURE)
    expect(products[0].basePrice).toBe('€79,99')
    expect(products[0].discountedPrice).toBe('€59,99')
    expect(products[0].discountText).toBe('-25 %')
  })

  it('extracts MASTER image URL', () => {
    const products = parseNextDataHtml(SPIDER_MAN_2_FIXTURE)
    expect(products[0].coverUrl).toBe(
      'https://image.api.playstation.com/vulcan/ap/rnd/202306/1219/abc123.png'
    )
  })

  it('returns empty array when no __NEXT_DATA__ found', () => {
    expect(parseNextDataHtml('<html><body>nothing</body></html>')).toHaveLength(0)
  })

  it('extracts serviceBranding from price object', () => {
    const html = `<script id="__NEXT_DATA__" type="application/json">
{"props":{"apolloState":{
  "Product:EP0000-TEST_00-EXTRATEST00000000:fr-fr": {
    "__typename": "Product",
    "id": "EP0000-TEST_00-EXTRATEST00000000",
    "name": "Extra Test Game",
    "npTitleId": "TEST_00",
    "platforms": ["PS5"],
    "storeDisplayClassification": "FULL_GAME",
    "price": {
      "__typename": "SkuPrice",
      "basePrice": "€9,99",
      "discountedPrice": "€9,99",
      "discountText": null,
      "isFree": false,
      "serviceBranding": ["EXTRA"]
    },
    "media": [],
    "personalizedMeta": null
  }
}}}</script>`
    const products = parseNextDataHtml(html)
    expect(products[0].serviceBranding).toContain('EXTRA')
  })

  it('extracts serviceBranding at product level (fallback)', () => {
    const html = `<script id="__NEXT_DATA__" type="application/json">
{"props":{"apolloState":{
  "Product:EP0000-TEST_00-PREMIUMTEST:fr-fr": {
    "__typename": "Product",
    "id": "EP0000-TEST_00-PREMIUMTEST",
    "name": "Premium Test Game",
    "npTitleId": "TEST_00",
    "platforms": ["PS5"],
    "storeDisplayClassification": "FULL_GAME",
    "serviceBranding": ["PREMIUM"],
    "price": {
      "__typename": "SkuPrice",
      "basePrice": "€9,99",
      "discountedPrice": "€9,99",
      "discountText": null,
      "isFree": false
    },
    "media": [],
    "personalizedMeta": null
  }
}}}</script>`
    const products = parseNextDataHtml(html)
    expect(products[0].serviceBranding).toContain('PREMIUM')
  })

  it('retourne tableau vide si aucun serviceBranding', () => {
    const html = `<script id="__NEXT_DATA__" type="application/json">
{"props":{"apolloState":{
  "Product:EP0000-TEST_00-NOBRANDING:fr-fr": {
    "__typename": "Product",
    "id": "EP0000-TEST_00-NOBRANDING",
    "name": "Regular Game",
    "npTitleId": "TEST_00",
    "platforms": ["PS5"],
    "storeDisplayClassification": "FULL_GAME",
    "price": {
      "__typename": "SkuPrice",
      "basePrice": "€59,99",
      "discountedPrice": null,
      "discountText": null,
      "isFree": false
    },
    "media": [],
    "personalizedMeta": null
  }
}}}</script>`
    const products = parseNextDataHtml(html)
    expect(products[0].serviceBranding).toEqual([])
  })
})
