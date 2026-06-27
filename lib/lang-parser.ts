export type LangSafety = 'safe' | 'risky' | 'unknown'

const LANG_MAP: Record<string, string> = {
  '한국어': 'KR',
  '영어': 'EN',
  '프랑스어': 'FR',
  '독일어': 'DE',
  '일본어': 'JP',
  '스페인어': 'ES',
  '이탈리아어': 'IT',
  '포르투갈어': 'PT',
  '중국어(간체자)': 'ZH-S',
  '중국어(번체자)': 'ZH-T',
  '아랍어': 'AR',
  '네덜란드어': 'NL',
  '폴란드어': 'PL',
  '러시아어': 'RU',
  '터키어': 'TR',
  '그리스어': 'GR',
}

export function parseLangsFromKRTitle(name: string): {
  langs: string[]
  safety: LangSafety
} {
  // Explicit edition suffix in parentheses
  if (/\(한국어판\)/.test(name) && !/영어/.test(name)) {
    return { langs: ['KR'], safety: 'risky' }
  }
  if (/\(영어판\)/.test(name)) {
    return { langs: ['EN'], safety: 'safe' }
  }

  // Find outermost last parenthetical group (handles nested parens like 중국어(간체자))
  let depth = 0
  let closePos = -1
  let openPos = -1

  for (let i = name.length - 1; i >= 0; i--) {
    if (name[i] === ')' && depth === 0) { closePos = i; depth = 1 }
    else if (name[i] === ')') depth++
    else if (name[i] === '(') {
      depth--
      if (depth === 0) { openPos = i; break }
    }
  }

  if (openPos === -1 || closePos === -1) return { langs: [], safety: 'unknown' }

  const langStr = name.slice(openPos + 1, closePos)

  // Split handling nested parens like 중국어(간체자)
  const tokens = langStr.match(/중국어\([^)]+\)|[^,]+/g) ?? []
  const langs = tokens
    .map((t) => LANG_MAP[t.trim()])
    .filter((l): l is string => Boolean(l))

  if (langs.length === 0) return { langs: [], safety: 'unknown' }

  const hasWestern = langs.includes('EN') || langs.includes('FR')
  return { langs, safety: hasWestern ? 'safe' : 'risky' }
}
