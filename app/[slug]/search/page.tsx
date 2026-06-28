'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useSlug } from '@/lib/slug-context'
import { PSNProduct, PriceResult } from '@/lib/types'

type Phase = 'idle' | 'searching' | 'results' | 'confirming' | 'adding'
type PlatformFilter = 'all' | 'PS5' | 'PS4'
interface SearchResults { games: PSNProduct[]; addons: PSNProduct[]; demos: PSNProduct[] }

/* ── Empty state illustration ────────────────────────────── */
function SearchEmptyState() {
  return (
    <div
      className="flex flex-col items-center justify-center py-20 px-8 gap-5"
      style={{ color: 'var(--muted)' }}
    >
      {/* Gamepad + magnifier */}
      <svg width="80" height="80" viewBox="0 0 80 80" fill="none" aria-hidden="true">
        <rect x="10" y="24" width="60" height="36" rx="18" stroke="currentColor" strokeWidth="3" fill="none"/>
        <line x1="22" y1="42" x2="30" y2="42" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
        <line x1="26" y1="38" x2="26" y2="46" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
        <circle cx="55" cy="40" r="2" fill="currentColor"/>
        <circle cx="61" cy="36" r="2" fill="currentColor"/>
        <circle cx="61" cy="44" r="2" fill="currentColor"/>
        <circle cx="67" cy="40" r="2" fill="currentColor"/>
        {/* Magnifier overlay */}
        <circle cx="56" cy="56" r="12" stroke="currentColor" strokeWidth="2.5" fill="none" opacity="0.7"/>
        <line x1="64.5" y1="64.5" x2="72" y2="72" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.7"/>
      </svg>
      <p className="text-[15px] text-center" style={{ color: 'var(--muted)' }}>
        Recherche un jeu, une extension ou une démo
      </p>
    </div>
  )
}

/* ── Product row (search results) ────────────────────────── */
function ProductRow({
  product,
  onClick,
}: {
  product: PSNProduct
  onClick: () => void
}) {
  const tier = product.serviceBranding.includes('PREMIUM')
    ? 'Premium'
    : product.serviceBranding.includes('EXTRA')
    ? 'Extra'
    : null

  return (
    <button
      className="flex gap-3 px-4 py-3 w-full text-left active:opacity-70"
      style={{ backgroundColor: 'var(--surface)' }}
      onClick={onClick}
    >
      {/* Cover */}
      <div className="relative flex-shrink-0 w-[68px] h-[68px] rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700">
        {product.coverUrl ? (
          <Image src={product.coverUrl} alt={product.name} fill className="object-cover" unoptimized />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs font-bold" style={{ color: 'var(--muted)' }}>
            PS
          </div>
        )}
        {product.platforms.length > 0 && (
          <span className="absolute bottom-1 left-1 text-[10px] font-bold px-1 py-px bg-black/80 text-white rounded leading-none">
            {product.platforms[0]}
          </span>
        )}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
        <p className="text-[15px] font-semibold leading-[1.3] line-clamp-2" style={{ color: 'var(--ink)' }}>
          {product.name.split('(')[0].trim()}
        </p>
        {tier && (
          <p className="text-[13px] flex items-center gap-1" style={{ color: '#f0b400' }}>
            <span>✦</span><span>{tier}</span>
          </p>
        )}
        <div className="flex items-center gap-1.5 flex-wrap">
          {product.discountText && (
            <span
              className="text-[11px] font-bold px-1.5 py-0.5 rounded text-white dark:bg-white/10"
              style={{ backgroundColor: 'var(--promo-bg)' }}
            >
              {product.discountText}
            </span>
          )}
          {(product.discountedPrice || product.basePrice) && (
            <span className="text-[15px] font-bold" style={{ color: 'var(--ink)' }}>
              {product.discountedPrice ?? product.basePrice}
            </span>
          )}
          {product.discountText && product.basePrice && (
            <span className="text-[13px] line-through" style={{ color: 'var(--muted)' }}>
              {product.basePrice}
            </span>
          )}
        </div>
      </div>

      {/* Chevron */}
      <div className="flex items-center self-center" style={{ color: 'var(--sep)' }}>
        <svg width="8" height="14" viewBox="0 0 8 14" fill="none">
          <path d="M1 1l6 6-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </button>
  )
}

/* ── Main page ───────────────────────────────────────────── */
export default function SlugSearchPage() {
  const router = useRouter()
  const slug = useSlug()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResults>({ games: [], addons: [], demos: [] })
  const [selected, setSelected] = useState<PSNProduct | null>(null)
  const [comparison, setComparison] = useState<PriceResult | null>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [error, setError] = useState<string | null>(null)
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('all')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults({ games: [], addons: [], demos: [] })
      setPhase('idle')
      setError(null)
      return
    }
    setPhase('searching')
    setError(null)
    setResults({ games: [], addons: [], demos: [] })
    setSelected(null)
    setComparison(null)

    try {
      const res = await fetch(`/api/search?title=${encodeURIComponent(q)}`)
      const data: SearchResults = await res.json()
      if (!data.games.length && !data.addons.length && !data.demos.length) {
        setError('Aucun résultat. Essaie un autre titre.')
        setPhase('idle')
      } else {
        setResults(data)
        setPhase('results')
      }
    } catch {
      setError('Erreur réseau.')
      setPhase('idle')
    }
  }, [])

  /* Debounced search on input change */
  const handleQueryChange = (val: string) => {
    setQuery(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSearch(val), 500)
  }

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
  }, [])

  const handleSelect = async (product: PSNProduct) => {
    setSelected(product)
    setPhase('confirming')
    try {
      const res = await fetch(`/api/prices?title=${encodeURIComponent(product.name.split('(')[0].trim())}`)
      if (!res.ok) {
        setComparison({ fr: null, kr: null, frHasDemo: false, krHasDemo: false })
        return
      }
      const data: PriceResult = await res.json()
      setComparison(data)
    } catch {
      setComparison({ fr: null, kr: null, frHasDemo: false, krHasDemo: false })
    }
  }

  const handleAdd = async () => {
    if (!selected) return
    setPhase('adding')
    try {
      const res = await fetch(`/api/games?slug=${encodeURIComponent(slug)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: selected.name.split('(')[0].trim(),
          fr_product_id: selected.id,
          kr_product_id: comparison?.kr?.id ?? null,
        }),
      })
      if (!res.ok) {
        setError("Erreur lors de l'ajout. Réessaie.")
        setPhase('confirming')
        return
      }
      router.push(`/${slug}`)
    } catch {
      setError("Erreur réseau lors de l'ajout.")
      setPhase('confirming')
    }
  }

  /* Platform filter helper */
  const filterByPlatform = (items: PSNProduct[]) => {
    if (platformFilter === 'all') return items
    return items.filter((p) => p.platforms.includes(platformFilter))
  }

  const kr = comparison?.kr
  const krEur = kr?.priceEur
  const frAmount = selected
    ? parseFloat((selected.discountedPrice ?? selected.basePrice ?? '').replace(/[^0-9,]/g, '').replace(',', '.')) || 0
    : 0
  const saving =
    frAmount > 0 && krEur && krEur > 0
      ? Math.round(((frAmount - krEur) / frAmount) * 100)
      : null

  const isConfirming = phase === 'confirming' || phase === 'adding'

  return (
    <main style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
      {/* ── Fixed header ───────────────────────────────────── */}
      <div
        className="fixed top-0 left-0 right-0 z-40 max-w-lg mx-auto"
        style={{ backgroundColor: 'var(--bg)' }}
      >
        {/* Back + search bar row */}
        <div className="flex items-center gap-3 px-4 pt-14 pb-2">
          {isConfirming ? (
            <button
              onClick={() => { setPhase('results'); setSelected(null) }}
              className="text-[17px] flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center"
              style={{ color: '#0070d1' }}
            >
              ‹ Résultats
            </button>
          ) : (
            <Link
              href={`/${slug}`}
              className="text-[17px] flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center"
              style={{ color: '#0070d1' }}
            >
              ‹ Ma liste
            </Link>
          )}
        </div>

        {/* Search bar */}
        {!isConfirming && (
          <div className="px-4 pb-2">
            <div
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
              style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--sep)' }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <circle cx="7" cy="7" r="5" stroke="var(--muted)" strokeWidth="1.5" fill="none"/>
                <line x1="10.5" y1="10.5" x2="14" y2="14" stroke="var(--muted)" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <input
                type="search"
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                placeholder="Rechercher un jeu…"
                autoFocus
                className="flex-1 bg-transparent outline-none text-[15px] placeholder:text-[var(--muted)]"
                style={{ color: 'var(--ink)' }}
              />
              {query && (
                <button
                  onClick={() => { setQuery(''); setPhase('idle'); setResults({ games: [], addons: [], demos: [] }) }}
                  className="text-[var(--muted)] flex items-center justify-center w-5 h-5"
                  aria-label="Effacer"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <circle cx="7" cy="7" r="7" fill="var(--muted)" opacity="0.4"/>
                    <path d="M5 5l4 4M9 5l-4 4" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
                  </svg>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Platform filter pills */}
        {phase === 'results' && !isConfirming && (
          <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-none">
            {(['all', 'PS5', 'PS4'] as PlatformFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setPlatformFilter(f)}
                className="flex-shrink-0 px-3 py-1 rounded-full text-[13px] font-semibold"
                style={{
                  backgroundColor: platformFilter === f ? '#0070d1' : 'var(--surface)',
                  color: platformFilter === f ? '#ffffff' : 'var(--ink)',
                  border: platformFilter === f ? 'none' : '1px solid var(--sep)',
                }}
              >
                {f === 'all' ? 'Tous' : f}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Scrollable content ─────────────────────────────── */}
      <div
        style={{
          paddingTop: isConfirming ? 100 : phase === 'results' ? 160 : 130,
        }}
      >
        {/* Error */}
        {error && (
          <p className="px-4 py-2 text-[14px]" style={{ color: '#ef4444' }}>
            {error}
          </p>
        )}

        {/* Idle / empty state */}
        {phase === 'idle' && !error && <SearchEmptyState />}

        {/* Loading */}
        {phase === 'searching' && (
          <div className="flex justify-center py-12">
            <span className="text-[15px]" style={{ color: 'var(--muted)' }}>Recherche…</span>
          </div>
        )}

        {/* Results */}
        {phase === 'results' && (
          <div>
            {(
              [
                { label: 'Jeux complets', items: filterByPlatform(results.games) },
                { label: 'Extensions', items: filterByPlatform(results.addons) },
                { label: 'Démos jouables', items: filterByPlatform(results.demos) },
              ] as const
            ).map(({ label, items }) =>
              items.length > 0 ? (
                <div key={label} className="mb-4">
                  <p
                    className="px-4 py-2 text-[13px] font-semibold uppercase tracking-wide"
                    style={{ color: 'var(--muted)' }}
                  >
                    {label}
                  </p>
                  <div>
                    {items.map((product, i) => (
                      <div key={product.id}>
                        {i > 0 && (
                          <div className="h-px mx-4" style={{ backgroundColor: 'var(--sep)' }} />
                        )}
                        <ProductRow product={product} onClick={() => handleSelect(product)} />
                      </div>
                    ))}
                  </div>
                </div>
              ) : null
            )}
          </div>
        )}

        {/* Confirmation panel */}
        {isConfirming && selected && (
          <div className="px-4">
            <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--surface)' }}>
              {/* Cover + meta */}
              <div className="flex gap-3 p-4">
                <div className="relative flex-shrink-0 w-[68px] h-[68px] rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700">
                  {selected.coverUrl ? (
                    <Image src={selected.coverUrl} alt={selected.name} fill className="object-cover" unoptimized />
                  ) : null}
                  {selected.platforms.length > 0 && (
                    <span className="absolute bottom-1 left-1 text-[10px] font-bold px-1 py-px bg-black/80 text-white rounded leading-none">
                      {selected.platforms[0]}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[15px] leading-snug line-clamp-2" style={{ color: 'var(--ink)' }}>
                    {selected.name.split('(')[0].trim()}
                  </p>

                  {/* Prix grid */}
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    {/* FR */}
                    <div>
                      <p className="text-[11px] font-bold mb-1" style={{ color: 'var(--muted)' }}>PRIX FR</p>
                      <div className="flex items-center gap-1 flex-wrap">
                        {selected.discountText && (
                          <span
                            className="text-[11px] font-bold px-1 py-px rounded text-white dark:bg-white/10"
                            style={{ backgroundColor: 'var(--promo-bg)' }}
                          >
                            {selected.discountText}
                          </span>
                        )}
                        <p className="text-[16px] font-bold" style={{ color: 'var(--ink)' }}>
                          {selected.discountedPrice ?? selected.basePrice ?? '—'}
                        </p>
                      </div>
                      {selected.discountText && selected.basePrice && (
                        <p className="text-[12px] line-through" style={{ color: 'var(--muted)' }}>
                          {selected.basePrice}
                        </p>
                      )}
                    </div>

                    {/* KR */}
                    <div>
                      <p className="text-[11px] font-bold mb-1" style={{ color: 'var(--muted)' }}>PRIX KR</p>
                      {!comparison ? (
                        <p className="text-[13px]" style={{ color: 'var(--muted)' }}>Chargement…</p>
                      ) : kr ? (
                        <>
                          {kr.discountText && (
                            <span
                              className="text-[11px] font-bold px-1 py-px rounded text-white dark:bg-white/10"
                              style={{ backgroundColor: 'var(--promo-bg)' }}
                            >
                              {kr.discountText}
                            </span>
                          )}
                          <p className="text-[16px] font-bold" style={{ color: 'var(--ink)' }}>
                            {krEur != null ? `€${krEur.toFixed(2)}` : (kr.discountedPrice ?? '—')}
                          </p>
                          {saving != null && saving > 0 && (
                            <span className="text-[11px] font-bold bg-[#22c55e] text-white px-1.5 py-0.5 rounded">
                              -{saving}% vs FR
                            </span>
                          )}
                          {kr.langSafety === 'risky' && (
                            <p className="text-[11px] font-bold mt-1" style={{ color: '#ef4444' }}>
                              ⚠ Pas d&apos;anglais
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="text-[13px]" style={{ color: 'var(--muted)' }}>Non dispo en KR</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Demo row */}
              {comparison && (comparison.frHasDemo || comparison.krHasDemo) && (
                <div className="px-4 pb-3 flex items-center gap-2">
                  <span className="text-[12px]" style={{ color: 'var(--muted)' }}>Démo jouable :</span>
                  {comparison.frHasDemo && (
                    <span className="text-[11px] font-bold bg-blue-100 text-blue-700 px-1.5 py-px rounded">FR ✓</span>
                  )}
                  {comparison.krHasDemo && (
                    <span className="text-[11px] font-bold bg-blue-100 text-blue-700 px-1.5 py-px rounded">KR ✓</span>
                  )}
                  {!comparison.frHasDemo && (
                    <span className="text-[11px]" style={{ color: 'var(--muted)' }}>FR –</span>
                  )}
                  {!comparison.krHasDemo && (
                    <span className="text-[11px]" style={{ color: 'var(--muted)' }}>KR –</span>
                  )}
                </div>
              )}

              {/* Add button */}
              <div className="px-4 pb-4">
                <button
                  onClick={handleAdd}
                  disabled={phase === 'adding' || !comparison}
                  className="w-full py-4 rounded-xl font-semibold text-[17px] text-white disabled:opacity-50"
                  style={{ backgroundColor: '#0070d1' }}
                >
                  {phase === 'adding' ? 'Ajout…' : '+ Ajouter à ma liste'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
