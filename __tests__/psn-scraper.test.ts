import { parseNextDataHtml } from '@/lib/psn-scraper'

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
})
