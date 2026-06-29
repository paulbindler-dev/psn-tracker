'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { MagnifyingGlass, X, StarFour } from '@phosphor-icons/react'
import { useSlug } from '@/lib/slug-context'
import { PSNProduct, PriceResult } from '@/lib/types'

type Phase = 'idle' | 'searching' | 'results' | 'confirming' | 'adding'
type ViewFilter = 'all' | 'PS5' | 'PS4' | 'DEMO'
interface SearchResults { games: PSNProduct[]; addons: PSNProduct[]; demos: PSNProduct[] }

/* ── Toast ───────────────────────────────────────────────── */
function Toast({ message }: { message: string }) {
  return (
    <div
      className="fixed bottom-24 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-white text-[14px] font-medium z-50"
      style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}
    >
      {message}
    </div>
  )
}

/* ── Empty state ─────────────────────────────────────────── */
function SearchEmptyState({ demoMode }: { demoMode?: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-8 gap-5" style={{ color: 'var(--muted)' }}>
      {/* Manette avec loupe — style PSN */}
      <svg width="72" height="72" viewBox="0 0 72 72" fill="none" aria-hidden="true">
        {/* Corps manette */}
        <rect x="8" y="22" width="56" height="34" rx="17" stroke="currentColor" strokeWidth="2.5" fill="none"/>
        {/* Stick gauche (croix) */}
        <line x1="20" y1="39" x2="28" y2="39" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <line x1="24" y1="35" x2="24" y2="43" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        {/* Boutons droite */}
        <circle cx="48" cy="37" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
        <circle cx="54" cy="33" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
        <circle cx="54" cy="41" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
        <circle cx="60" cy="37" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
        {/* Loupe — premier plan */}
        <circle cx="52" cy="52" r="11" fill="var(--bg)" stroke="currentColor" strokeWidth="2.5"/>
        <circle cx="52" cy="52" r="6.5" stroke="currentColor" strokeWidth="2"/>
        <line x1="57.5" y1="57.5" x2="64" y2="64" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
      </svg>
      <p className="text-[15px] text-center leading-relaxed" style={{ color: 'var(--muted)' }}>
        {demoMode
          ? 'Chargement des démos…'
          : 'Recherche un jeu, une extension\nou une démo'}
      </p>
    </div>
  )
}

/* ── Product row ─────────────────────────────────────────── */
function ProductRow({
  product,
  onClick,
  onQuickAdd,
}: {
  product: PSNProduct
  onClick: () => void
  onQuickAdd: () => void
}) {
  const tier = product.serviceBranding.includes('PREMIUM')
    ? 'Premium'
    : product.serviceBranding.includes('EXTRA')
    ? 'Extra'
    : null
  const isDemo = product.storeDisplayClassification === 'DEMO'

  return (
    <div className="flex items-stretch w-full" style={{ backgroundColor: 'var(--surface)' }}>
      <button className="flex gap-3 px-4 py-3 flex-1 min-w-0 text-left active:opacity-70" onClick={onClick}>
        <div className="relative flex-shrink-0 w-[68px] h-[68px] rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700">
          {product.coverUrl ? (
            <Image src={product.coverUrl} alt={product.name} fill className="object-cover" unoptimized />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs font-bold" style={{ color: 'var(--muted)' }}>PS</div>
          )}
          {product.platforms.length > 0 && (
            <span className="absolute bottom-1 left-1 text-[10px] font-bold px-1 py-px bg-black/80 text-white rounded leading-none">
              {product.platforms[0]}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
          <p className="text-[15px] font-normal leading-[1.3] line-clamp-2" style={{ color: 'var(--ink)' }}>
            {product.name.split('(')[0].trim()}
          </p>
          {tier && (
            <p className="text-[13px] flex items-center gap-0.5" style={{ color: '#f0b400' }}>
              <StarFour size={11} weight="fill" color="#f0b400" /><span>{tier}</span>
            </p>
          )}
          {isDemo || product.isFree ? (
            <span className="text-[13px]" style={{ color: 'var(--muted)' }}>Gratuit</span>
          ) : (product.discountedPrice || product.basePrice) ? (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-bold" style={{ color: 'var(--muted)' }}>FR</span>
              {product.discountText && (
                <span className="text-[11px] font-bold px-1.5 py-0.5 rounded text-white" style={{ backgroundColor: 'var(--promo-bg)' }}>
                  {product.discountText}
                </span>
              )}
              <span className="text-[15px] font-bold" style={{ color: 'var(--ink)' }}>
                {product.discountedPrice ?? product.basePrice}
              </span>
              {product.discountText && product.basePrice && (
                <span className="text-[13px] line-through" style={{ color: 'var(--muted)' }}>{product.basePrice}</span>
              )}
            </div>
          ) : null}
        </div>
      </button>
      <button
        className="flex items-center justify-center pr-4 flex-shrink-0 active:opacity-70"
        onClick={onQuickAdd}
        aria-label="Ajouter à ma liste"
      >
        <div className="flex items-center justify-center" style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: '#0070d1' }}>
          <span className="text-white font-medium" style={{ fontSize: 20, lineHeight: 1, marginTop: -1 }}>+</span>
        </div>
      </button>
    </div>
  )
}

/* ── Main page ───────────────────────────────────────────── */
export default function SlugSearchPage() {
  const router = useRouter()
  const slug = useSlug()
  const scrollRef = useRef<HTMLDivElement>(null)

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResults>({ games: [], addons: [], demos: [] })
  const [selected, setSelected] = useState<PSNProduct | null>(null)
  const [comparison, setComparison] = useState<PriceResult | null>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<ViewFilter>('all')
  const [toast, setToast] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Scroll to top when entering confirmation
  useEffect(() => {
    if (phase === 'confirming') {
      scrollRef.current?.scrollTo({ top: 0 })
      window.scrollTo({ top: 0 })
    }
  }, [phase])

  // When demo filter activated with no query, auto-fetch demos
  useEffect(() => {
    if (filter === 'DEMO' && !query.trim()) {
      doSearch('demo')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter])

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

  const handleQueryChange = (val: string) => {
    setQuery(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSearch(val), 300)
  }

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current) }, [])

  const handleSelect = async (product: PSNProduct) => {
    setSelected(product)
    setPhase('confirming')
    try {
      const params = new URLSearchParams({ fr_id: product.id, title: product.name.split('(')[0].trim() })
      const res = await fetch(`/api/prices?${params}`)
      if (!res.ok) {
        setComparison({ fr: null, kr: null, frHasDemo: false, krHasDemo: false, krwRate: null })
        return
      }
      setComparison(await res.json())
    } catch {
      setComparison({ fr: null, kr: null, frHasDemo: false, krHasDemo: false, krwRate: null })
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
      if (!res.ok) { setError("Erreur lors de l'ajout. Réessaie."); setPhase('confirming'); return }
      router.push(`/${slug}`)
    } catch {
      setError("Erreur réseau lors de l'ajout.")
      setPhase('confirming')
    }
  }

  const handleQuickAdd = useCallback(async (product: PSNProduct) => {
    const clean = product.name.split('(')[0].trim()
    try {
      const res = await fetch(`/api/games?slug=${encodeURIComponent(slug)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: clean, fr_product_id: product.id, kr_product_id: null }),
      })
      if (!res.ok) { setToast("Erreur lors de l'ajout") }
      else {
        setToast('Ajouté ✓')
        const game = await res.json().catch(() => null)
        if (game?.id) {
          fetch(`/api/prices?${new URLSearchParams({ fr_id: product.id, title: clean })}`)
            .then(r => r.ok ? r.json() : null)
            .then(prices => {
              const krId = prices?.kr?.id
              if (krId) {
                fetch(`/api/games/${game.id}?slug=${encodeURIComponent(slug)}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ kr_product_id: krId }),
                }).catch(() => {})
              }
            })
            .catch(() => {})
        }
      }
    } catch {
      setToast('Erreur réseau')
    }
    setTimeout(() => setToast(null), 2000)
  }, [slug])

  // Filtering logic
  const filterItems = (items: PSNProduct[], platformFilter: 'all' | 'PS5' | 'PS4') => {
    if (platformFilter === 'all') return items
    return items.filter(p => p.platforms.includes(platformFilter))
  }

  const visibleGames = filter === 'DEMO' ? [] : filterItems(results.games, filter === 'all' ? 'all' : filter as 'PS5' | 'PS4')
  const visibleAddons = filter === 'DEMO' ? [] : filterItems(results.addons, filter === 'all' ? 'all' : filter as 'PS5' | 'PS4')
  const visibleDemos = filter === 'DEMO'
    ? results.demos.filter(p => p.platforms.includes('PS5'))
    : []

  const kr = comparison?.kr
  const krEur = kr?.priceEur
  const frAmount = selected
    ? parseFloat((selected.discountedPrice ?? selected.basePrice ?? '').replace(/[^0-9,]/g, '').replace(',', '.')) || 0
    : 0
  const saving = frAmount > 0 && krEur && krEur > 0
    ? Math.round(((frAmount - krEur) / frAmount) * 100)
    : null

  const isConfirming = phase === 'confirming' || phase === 'adding'

  const filterPills: { key: ViewFilter; label: string }[] = [
    { key: 'all', label: 'Tous' },
    { key: 'PS5', label: 'PS5' },
    { key: 'PS4', label: 'PS4' },
    { key: 'DEMO', label: 'Démo PS5' },
  ]

  return (
    <main ref={scrollRef} style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
      {/* ── Fixed header ───────────────────────────────────── */}
      <div className="fixed top-0 left-0 right-0 z-40 max-w-lg mx-auto" style={{ backgroundColor: 'var(--bg)' }}>
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
              ‹ Liste
            </Link>
          )}
        </div>

        {!isConfirming && (
          <div className="px-4 pb-2">
            <div
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
              style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--sep)' }}
            >
              <MagnifyingGlass size={17} color="var(--muted)" />
              <input
                type="text"
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                placeholder="Rechercher un jeu…"
                autoFocus
                className="flex-1 bg-transparent outline-none placeholder:text-[var(--muted)]"
                style={{ color: 'var(--ink)', fontSize: '16px' }}
              />
              {query && (
                <button
                  onClick={() => {
                    setQuery('')
                    setPhase(filter === 'DEMO' ? 'searching' : 'idle')
                    setResults({ games: [], addons: [], demos: [] })
                    if (filter === 'DEMO') doSearch('demo')
                  }}
                  className="flex items-center justify-center w-5 h-5"
                  aria-label="Effacer"
                >
                  <X size={14} color="var(--muted)" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Filter pills */}
        {phase === 'results' && !isConfirming && (
          <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-none">
            {filterPills.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className="flex-shrink-0 px-3 py-1 rounded-full text-[13px] font-semibold"
                style={{
                  backgroundColor: filter === f.key ? '#0070d1' : 'var(--surface)',
                  color: filter === f.key ? '#ffffff' : 'var(--ink)',
                  border: filter === f.key ? 'none' : '1px solid var(--sep)',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Scrollable content ─────────────────────────────── */}
      <div style={{ paddingTop: isConfirming ? 100 : phase === 'results' ? 164 : 130 }}>
        {error && (
          <p className="px-4 py-2 text-[14px]" style={{ color: '#ef4444' }}>{error}</p>
        )}

        {phase === 'idle' && !error && <SearchEmptyState />}

        {phase === 'searching' && (
          <div className="flex justify-center py-12">
            <span className="text-[15px]" style={{ color: 'var(--muted)' }}>Recherche…</span>
          </div>
        )}

        {/* Results */}
        {phase === 'results' && (
          <div>
            {filter === 'DEMO' ? (
              // Demo filter view
              visibleDemos.length > 0 ? (
                <div>
                  {visibleDemos.map((product, i) => (
                    <div key={product.id}>
                      {i > 0 && <div className="h-px mx-4" style={{ backgroundColor: 'var(--sep)' }} />}
                      <ProductRow
                        product={product}
                        onClick={() => handleSelect(product)}
                        onQuickAdd={() => handleQuickAdd(product)}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="px-4 py-8 text-center text-[14px]" style={{ color: 'var(--muted)' }}>
                  Aucune démo PS5 trouvée.
                </p>
              )
            ) : (
              // Normal view: jeux + extensions
              [
                { label: 'Jeux complets', items: visibleGames },
                { label: 'Extensions', items: visibleAddons },
              ].map(({ label, items }) =>
                items.length > 0 ? (
                  <div key={label} className="mb-4">
                    <p className="px-4 py-2 text-[13px] font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
                      {label}
                    </p>
                    <div>
                      {items.map((product, i) => (
                        <div key={product.id}>
                          {i > 0 && <div className="h-px mx-4" style={{ backgroundColor: 'var(--sep)' }} />}
                          <ProductRow
                            product={product}
                            onClick={() => handleSelect(product)}
                            onQuickAdd={() => handleQuickAdd(product)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null
              )
            )}
          </div>
        )}

        {/* Confirmation panel */}
        {isConfirming && selected && (
          <div className="px-4">
            <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--surface)' }}>
              <div className="flex gap-3 p-4">
                <div className="relative flex-shrink-0 w-[68px] h-[68px] rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700">
                  {selected.coverUrl && <Image src={selected.coverUrl} alt={selected.name} fill className="object-cover" unoptimized />}
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
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    {/* FR */}
                    <div>
                      <p className="text-[11px] font-bold mb-1" style={{ color: 'var(--muted)' }}>PRIX FR</p>
                      <div className="flex items-center gap-1 flex-wrap">
                        {selected.discountText && (
                          <span className="text-[11px] font-bold px-1 py-px rounded text-white" style={{ backgroundColor: 'var(--promo-bg)' }}>
                            {selected.discountText}
                          </span>
                        )}
                        <p className="text-[16px] font-bold" style={{ color: 'var(--ink)' }}>
                          {selected.discountedPrice ?? selected.basePrice ?? '—'}
                        </p>
                      </div>
                      {selected.discountText && selected.basePrice && (
                        <p className="text-[12px] line-through" style={{ color: 'var(--muted)' }}>{selected.basePrice}</p>
                      )}
                    </div>
                    {/* KR */}
                    <div>
                      <p className="text-[11px] font-bold mb-1" style={{ color: 'var(--muted)' }}>PRIX KR</p>
                      {!comparison ? (
                        <p className="text-[13px]" style={{ color: 'var(--muted)' }}>Chargement…</p>
                      ) : kr ? (
                        <>
                          <div className="flex items-center gap-1 flex-wrap">
                            {kr.discountText && (
                              <span className="text-[11px] font-bold px-1 py-px rounded text-white" style={{ backgroundColor: 'var(--promo-bg)' }}>
                                {kr.discountText}
                              </span>
                            )}
                            <p className="text-[16px] font-bold" style={{ color: 'var(--ink)' }}>
                              {krEur != null ? `€${krEur.toFixed(2)}` : (kr.discountedPrice ?? '—')}
                            </p>
                          </div>
                          {kr.discountText && kr.basePrice && krEur != null && (
                            <p className="text-[12px] line-through" style={{ color: 'var(--muted)' }}>
                              {`€${((parseInt(kr.basePrice.replace(/[^0-9]/g, ''), 10) || 0) * (comparison?.krwRate ? 1 / comparison.krwRate : 0)).toFixed(2)}`}
                            </p>
                          )}
                          {saving != null && saving > 0 && (
                            <span className="text-[11px] font-bold bg-[#22c55e] text-white px-1.5 py-0.5 rounded">
                              -{saving}% vs FR
                            </span>
                          )}
                          {kr.langSafety === 'risky' && (
                            <p className="text-[11px] font-semibold mt-1" style={{ color: '#ef4444' }}>Pas d&apos;anglais</p>
                          )}
                        </>
                      ) : (
                        <p className="text-[13px]" style={{ color: 'var(--muted)' }}>Non dispo en KR</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Demo badge */}
              {comparison && (comparison.frHasDemo || comparison.krHasDemo) && (
                <div className="px-4 pb-3 flex items-center gap-1.5">
                  <span className="text-[12px]" style={{ color: 'var(--muted)' }}>Démo :</span>
                  {comparison.frHasDemo && (
                    <span className="text-[11px] font-bold px-1.5 py-px rounded text-white" style={{ backgroundColor: '#0070d1' }}>FR</span>
                  )}
                  {comparison.krHasDemo && (
                    <span className="text-[11px] font-bold px-1.5 py-px rounded text-white" style={{ backgroundColor: '#0070d1' }}>KR</span>
                  )}
                </div>
              )}

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

      {toast && <Toast message={toast} />}
    </main>
  )
}
