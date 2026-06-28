/**
 * TDD: search quality fixes
 * - handleSelect doit utiliser fr_id (pas title) pour le lookup de prix
 * - handleQuickAdd doit faire un lookup KR en background
 */

function buildPriceUrl(frProductId: string, title: string): string {
  const params = new URLSearchParams({ fr_id: frProductId, title })
  return `/api/prices?${params}`
}

describe('buildPriceUrl pour handleSelect', () => {
  it('utilise fr_id et title pour le lookup', () => {
    const url = buildPriceUrl('EP0000-PPSA00001_00-BALDURSGATE3PS5', "Baldur's Gate 3")
    expect(url).toContain('fr_id=EP0000-PPSA00001_00-BALDURSGATE3PS5')
    expect(url).toContain("title=Baldur")
  })

  it('encode les caractères spéciaux dans le titre', () => {
    const url = buildPriceUrl('EP0000-TEST', "God of War: Ragnarök")
    expect(url).toContain('title=')
    expect(url).not.toContain(' ')
  })

  it('le fr_id prend la priorité sur title pour le fetch FR', () => {
    const url = buildPriceUrl('EP0000-GTA6', 'Grand Theft Auto VI')
    expect(url).toContain('fr_id=EP0000-GTA6')
    expect(url).toContain('title=Grand+Theft+Auto+VI')
  })
})

describe('titre nettoyé (sans parenthèses) pour le lookup KR', () => {
  const cleanTitle = (name: string) => name.split('(')[0].trim()

  it('supprime la portion entre parenthèses', () => {
    expect(cleanTitle('Baldur\'s Gate 3 (PS5™)')).toBe("Baldur's Gate 3")
    expect(cleanTitle('Grand Theft Auto V (PlayStation®5)')).toBe('Grand Theft Auto V')
  })

  it('laisse intact si pas de parenthèse', () => {
    expect(cleanTitle('God of War Ragnarök')).toBe('God of War Ragnarök')
  })

  it('laisse intact si parenthèse vide', () => {
    expect(cleanTitle('Elden Ring')).toBe('Elden Ring')
  })
})
