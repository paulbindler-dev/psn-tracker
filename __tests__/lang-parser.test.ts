import { parseLangsFromKRTitle } from '@/lib/lang-parser'

describe('parseLangsFromKRTitle', () => {
  it('detects EN from parenthetical list', () => {
    const { langs, safety } = parseLangsFromKRTitle(
      "Marvel's Spider-Man Remastered (한국어, 영어, 중국어(번체자))"
    )
    expect(langs).toContain('EN')
    expect(safety).toBe('safe')
  })

  it('detects KR-only from 한국어판 suffix', () => {
    const { langs, safety } = parseLangsFromKRTitle(
      "Marvel's Spider-Man: Silver Lining (한국어판)"
    )
    expect(langs).toEqual(['KR'])
    expect(safety).toBe('risky')
  })

  it('detects EN from 영어판 suffix', () => {
    const { safety } = parseLangsFromKRTitle('Some Game (영어판)')
    expect(safety).toBe('safe')
  })

  it('handles nested parens like 중국어(간체자)', () => {
    const { langs, safety } = parseLangsFromKRTitle(
      '마블 스파이더맨 2 (중국어(간체자), 한국어, 영어, 중국어(번체자))'
    )
    expect(langs).toContain('EN')
    expect(safety).toBe('safe')
  })

  it('returns unknown for unrecognised content', () => {
    const { safety } = parseLangsFromKRTitle('Some Game (Assassins Creed Shadows)')
    expect(safety).toBe('unknown')
  })

  it('returns risky for KR-only language list', () => {
    const { safety } = parseLangsFromKRTitle('어쌔신 크리드 (한국어)')
    expect(safety).toBe('risky')
  })
})
