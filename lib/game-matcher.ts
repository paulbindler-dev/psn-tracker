import { PSNProduct } from './types'

const GENERIC_SUFFIXES = new Set([
  'GAME000000000000',
  'ASIA000000000000',
  'ASIAPLACEHOLDER1',
  'WELCOMPACK000000',
  'EXTRALARGE000000',
  'LARGE00000000000',
  'BASE000000000000',
  'SMALL00000000000',
  'MEDIUM0000000000',
  'DLCEXPANSION0001',
  'DLCEXPANSION0002',
])

/**
 * Normalise a product name to a compact lowercase alphanumeric string for
 * fuzzy title matching.
 *
 * Strategy:
 * 1. Try the part before the first parenthetical (works for most FR/EN names).
 * 2. If that yields fewer than 4 Latin-alphanumeric chars (e.g. pure-Korean
 *    titles like "어쌔신 크리드 섀도우스 (Assassins Creed Shadows) (한국어, 영어)"),
 *    fall back to normalising the full string — this picks up the Latin
 *    subtitle that lives inside the parentheses.
 */
function normTitle(name: string): string {
  const base = name.split('(')[0].toLowerCase().replace(/[^a-z0-9]/g, '')
  if (base.length >= 4) return base
  // Korean titles: extract any Latin characters present anywhere in the name
  return name.toLowerCase().replace(/[^a-z0-9]/g, '')
}

export function matchProducts(
  frProducts: PSNProduct[],
  krProducts: PSNProduct[]
): { fr: PSNProduct | null; kr: PSNProduct | null } {
  if (frProducts.length === 0) return { fr: null, kr: null }

  // 1. Exact suffix match (skip generic suffixes)
  for (const fr of frProducts) {
    if (!GENERIC_SUFFIXES.has(fr.suffix)) {
      const kr = krProducts.find((k) => k.suffix === fr.suffix) ?? null
      if (kr) return { fr, kr }
    }
  }

  // 2. Title similarity fallback
  const frGame = frProducts[0]
  const frNorm = normTitle(frGame.name)

  const kr =
    krProducts.find((k) => {
      const kNorm = normTitle(k.name)
      if (frNorm.length < 4 || kNorm.length < 4) return false

      // Shared prefix: both titles must start identically for ≥6 chars
      const prefixLen = Math.min(frNorm.length, kNorm.length, 8)
      if (prefixLen >= 6 && frNorm.slice(0, prefixLen) === kNorm.slice(0, prefixLen)) return true

      // Substring: only when the matching substring is ≥8 chars (avoids "gate3" ⊂ "baldursgate3")
      if (kNorm.length >= 8 && frNorm.includes(kNorm.slice(0, 8))) return true
      if (frNorm.length >= 8 && kNorm.includes(frNorm.slice(0, 8))) return true

      return false
    }) ?? null

  return { fr: frGame, kr }
}

/** Suffix-only match — zero false positives, used in search result lists. */
export function matchBySuffix(fr: PSNProduct, krProducts: PSNProduct[]): PSNProduct | null {
  if (GENERIC_SUFFIXES.has(fr.suffix)) return null
  return krProducts.find((k) => k.suffix === fr.suffix) ?? null
}
