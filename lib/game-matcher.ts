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

  // 2. Title similarity fallback (used when all FR suffixes are generic)
  const frGame = frProducts[0]
  const frNorm = normTitle(frGame.name)

  const kr =
    krProducts.find((k) => {
      const kNorm = normTitle(k.name)
      // Guard: never match when either side has no recognisable Latin chars
      if (frNorm.length === 0 || kNorm.length === 0) return false
      const minLen = Math.min(frNorm.length, kNorm.length, 8)
      return (
        frNorm.slice(0, minLen) === kNorm.slice(0, minLen) ||
        (kNorm.length >= 4 && kNorm.includes(frNorm.slice(0, 6))) ||
        (frNorm.length >= 4 && frNorm.includes(kNorm.slice(0, 6)))
      )
    }) ?? null

  return { fr: frGame, kr }
}
