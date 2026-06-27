import { matchProducts } from '@/lib/game-matcher'
import { PSNProduct } from '@/lib/types'

const base = (overrides: Partial<PSNProduct>): PSNProduct => ({
  id: 'EP9000-TEST_00-TESTSUFFIX',
  suffix: 'TESTSUFFIX',
  name: 'Test Game',
  npTitleId: 'TEST_00',
  platforms: ['PS5'],
  basePrice: '€19,99',
  discountedPrice: '€19,99',
  discountText: null,
  isFree: false,
  serviceBranding: [],
  coverUrl: null,
  storeDisplayClassification: 'FULL_GAME',
  ...overrides,
})

describe('matchProducts', () => {
  it('matches by identical suffix', () => {
    const fr = [base({ suffix: 'MARVELSPIDERMAN2' })]
    const kr = [base({ suffix: 'MARVELSPIDERMAN2', name: '마블 스파이더맨 2 (한국어, 영어)' })]
    const result = matchProducts(fr, kr)
    expect(result.fr).toBeTruthy()
    expect(result.kr).toBeTruthy()
    expect(result.fr!.suffix).toBe('MARVELSPIDERMAN2')
  })

  it('ignores generic suffixes for suffix matching, uses title fallback', () => {
    const fr = [base({ suffix: 'GAME000000000000', name: "Assassin's Creed Shadows" })]
    const kr = [base({ suffix: 'GAME000000000000', name: '어쌔신 크리드 섀도우스 (Assassins Creed Shadows) (한국어, 영어)' })]
    const result = matchProducts(fr, kr)
    expect(result.fr).toBeTruthy()
    expect(result.kr).toBeTruthy()
  })

  it('returns null kr when no match found', () => {
    const fr = [base({ suffix: 'EUROPEONLYGAME00', name: 'European Exclusive Game' })]
    const kr = [base({ suffix: 'COMPLETELYDIFFFF', name: '완전히 다른 게임' })]
    const result = matchProducts(fr, kr)
    expect(result.fr).toBeTruthy()
    expect(result.kr).toBeNull()
  })

  it('returns both null when fr list is empty', () => {
    const result = matchProducts([], [])
    expect(result.fr).toBeNull()
    expect(result.kr).toBeNull()
  })
})
