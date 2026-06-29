'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { MagnifyingGlass, X, StarFour, Check } from '@phosphor-icons/react'
import { useSlug } from '@/lib/slug-context'
import { PSNProduct, PriceResult, Game } from '@/lib/types'
import { matchProducts } from '@/lib/game-matcher'

type Phase = 'idle' | 'searching' | 'results' | 'confirming' | 'adding'
type ViewFilter = 'all' | 'PS5' | 'PS4' | 'DEMO'
interface SearchResults { games: PSNProduct[]; addons: PSNProduct[]; demos: PSNProduct[]; krGames: PSNProduct[] }

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

function SearchEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-8 gap-4" style={{ color: 'var(--muted)' }}>
      <MagnifyingGlass size={56} weight="light" color="var(--muted)" />
      <p className="text-[15px] text-center leading-relaxed" style={{ color: 'var(--muted)' }}>
        Recherche un jeu ou une extension
      </p>
    </div>
  )
}

function ProductRow({
  product,
  krProduct,
  krwRate,
  isAdded,
  onClick,
  onQuickAdd,
}: {
  product: PSNProduct
  krProduct: PSNProduct | null
  krwRate: number
  isAdded: boolean
  onClick: () => void
  onQuickAdd: () => void
}) {
  const tier = product.serviceBranding.includes('PREMIUM')
    ? 'Premium'
    : product.serviceBranding.includes('EXTRA')
    ? 'Extra'
    : null
  const isDemo = product.storeDisplayClassification === 'DEMO'

  const krEur = krProduct
    ? (() => {
        const raw = parseInt((krProduct.discountedPrice ?? krProduct.basePrice ?? '').replace(/[^0-9]/g, ''), 10)
        return krwRate > 0 && raw > 0 ? Math.round(raw / krwRate * 100) / 100 : null
      })()
    : null

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
            <>
              {/* Prix FR */}
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
              {/* Prix KR */}
              {krProduct && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] font-bold" style={{ color: 'var(--muted)' }}>KR</span>
                  {krProduct.discountText && (
                    <span className="text-[11px] font-bold px-1.5 py-0.5 rounded text-white" style={{ backgroundColor: 'var(--promo-bg)' }}>
                      {krProduct.discountText}
                    </span>
                  )}
                  <span className="text-[15px] font-bold" style={{ color: 'var(--ink)' }}>
                    {krEur != null ? `€${krEur.toFixed(2)}` : (krProduct.discountedPrice ?? krProduct.basePrice)}
                  </span>
                </div>
              )}
            </>
          ) : null}
        </div>
      </button>

      {/* Add / already-added indicator */}
      <button
        className="flex items-center justify-center pr-4 flex-shrink-0 active:opacity-70"
        onClick={onQuickAdd}
        disabled={isAdded}
        aria-label={isAdded ? 'Déjà dans la liste' : 'Ajouter à ma liste'}
      >
        {isAdded ? (
          <div className="flex items-center justify-center" style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: 'var(--sep)' }}>
            <Check size={14} weight="bold" color="var(--muted)" />
          </div>
        ) : (
          <div className="flex items-center justify-center" style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: '#0070d1' }}>
            <span className="text-white font-medium" style={{ fontSize: 20, lineHeight: 1, marginTop: -1 }}>+</span>
          </div>
        )}
      </button>
    </div>
  )
}

export default function SlugSearchPage() {
  const router = useRouter()
  const slug = useSlug()

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResults>({ games: [], addons: [], demos: [], krGames: [] })
  const [krMatchMap, setKrMatchMap] = useState<Map<string, PSNProduct>>(new Map())
  const [krwRate, setKrwRate] = useState(0)
  const [userGameIds, setUserGameIds] = useState<Set<string>>(new Set())
  const [selected, setSelected] = useState<PSNProduct | null>(null)
  const [comparison, setComparison] = useState<PriceResult | null>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<ViewFilter>('all')
  const [toast, setToast] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mainRef = useRef<HTMLDivElement>(null)

  // Fetch exchange rate once (KRW per 1 EUR)
  useEffect(() => {
    fetch('/api/exchange')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.rate && d.rate > 0) setKrwRate(Math.round(1 / d.rate)) })
      .catch(() => {})
  }, [])

  // Load user's existing games to detect already-added items
  useEffect(() => {
    if (!slug) return
    fetch(`/api/games?slug=${slug}`)
      .then(r => r.ok ? r.json() : [])
      .then((games: Game[]) => {
        const ids = new Set<string>()
        games.forEach(g => {
          if (g.fr_product_id) ids.add(g.fr_product_id)
        })
        setUserGameIds(ids)
      })
      .catch(() => {})
  }, [slug])

  // Scroll to top when entering confirmation
  useEffect(() => {
    if (phase === 'confirming') {
      mainRef.current?.scrollTo({ top: 0 })
      window.scrollTo({ top: 0 })
    }
  }, [phase])

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults({ games: [], addons: [], demos: [], krGames: [] })
      setPhase('idle')
      setError(null)
      return
    }
    setPhase('searching')
    setError(null)
    setResults({ games: [], addons: [], demos: [], krGames: [] })
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
        // Match KR products to FR products for inline display
        const map = new Map<string, PSNProduct>()
        ;(data.games as PSNProduct[]).forEach(fr => {
          const { kr } = matchProducts([fr], data.krGames as PSNProduct[] ?? [])
          if (kr) map.set(fr.id, kr)
        })
        setKrMatchMap(map)
      }
    } catch {
      setError('Erreur réseau.')
      setPhase('idle')
    }
  }, [])

  const prevFilter = useRef<ViewFilter>('all')
  useEffect(() => { prevFilter.current = filter }, [filter])

  const handleQueryChange = (val: string) => {
    setQuery(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSearch(val), 300)
  }

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current) }, [])

  const handleClearQuery = () => {
    setQuery('')
    setPhase('idle')
    setResults({ games: [], addons: [], demos: [], krGames: [] })
  }

  const handleSelect = async (product: PSNProduct) => {
    setSelected(product)
    setPhase('confirming')
    setComparison(null)
    try {
      const params = new URLSearchParams({ fr_id: product.id, title: product.name.split('(')[0].trim() })
      const res = await fetch(`/api/prices?${params}`)
      setComparison(res.ok ? await res.json() : { fr: null, kr: null, frHasDemo: false, krHasDemo: false, krwRate: null })
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
      setUserGameIds(prev => { const s = new Set(prev); s.add(selected.id); return s })
      router.push(`/${slug}`)
    } catch {
      setError("Erreur réseau lors de l'ajout.")
      setPhase('confirming')
    }
  }

  const handleQuickAdd = useCallback(async (product: PSNProduct) => {
    if (userGameIds.has(product.id)) return
    const clean = product.name.split('(')[0].trim()
    try {
      const res = await fetch(`/api/games?slug=${encodeURIComponent(slug)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: clean, fr_product_id: product.id, kr_product_id: null }),
      })
      if (!res.ok) { setToast("Erreur lors de l'ajout"); return }
      // Optimistic: mark as added immediately
      setUserGameIds(prev => { const s = new Set(prev); s.add(product.id); return s })
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
    } catch {
      setToast('Erreur réseau')
    }
    setTimeout(() => setToast(null), 2000)
  }, [slug, userGameIds])

  const filterItems = (items: PSNProduct[], pf: 'all' | 'PS5' | 'PS4') =>
    pf === 'all' ? items : items.filter(p => p.platforms.includes(pf))

  const platformFilter = filter === 'DEMO' ? 'all' : filter as 'all' | 'PS5' | 'PS4'
  const visibleGames   = filter === 'DEMO' ? [] : filterItems(results.games, platformFilter)
  const visibleAddons  = filter === 'DEMO' ? [] : filterItems(results.addons, platformFilter)
  const visibleDemos   = filter === 'DEMO' ? results.demos.filter(p => p.platforms.includes('PS5')) : []

  const kr = comparison?.kr
  const krEur = kr?.priceEur
  const frAmount = selected
    ? parseFloat((selected.discountedPrice ?? selected.basePrice ?? '').replace(/[^0-9,]/g, '').replace(',', '.')) || 0
    : 0
  const saving = frAmount > 0 && krEur && krEur > 0
    ? Math.round(((frAmount - krEur) / frAmount) * 100) : null

  const isConfirming = phase === 'confirming' || phase === 'adding'

  const filterPills: { key: ViewFilter; label: string }[] = [
    { key: 'all',  label: 'Tous' },
    { key: 'PS5',  label: 'PS5' },
    { key: 'PS4',  label: 'PS4' },
    { key: 'DEMO', label: 'Démo PS5' },
  ]

  return (
    <main ref={mainRef} style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
      {/* ── Fixed header ──────────────────────────────────── */}
      <div className="fixed top-0 left-0 right-0 z-40 max-w-lg mx-auto" style={{ backgroundColor: 'var(--bg)' }}>
        {/* Back nav */}
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
            <Link href={`/${slug}`} className="text-[17px] flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center" style={{ color: '#0070d1' }}>
              ‹ Liste
            </Link>
          )}
        </div>

        {/* Search bar */}
        {!isConfirming && (
          <div className="px-4 pb-2">
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--sep)' }}>
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
                <button onClick={handleClearQuery} className="flex items-center justify-center w-5 h-5" aria-label="Effacer">
                  <X size={14} color="var(--muted)" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Filter pills — always visible (not confirming) */}
        {!isConfirming && (
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

      {/* ── Content ────────────────────────────────────────── */}
      <div style={{ paddingTop: isConfirming ? 110 : 222 }}>
        {error && <p className="px-4 py-2 text-[14px]" style={{ color: '#ef4444' }}>{error}</p>}

        {phase === 'idle' && !error && (
          filter === 'DEMO' ? (
            <div className="flex flex-col items-center justify-center py-20 px-8 gap-4" style={{ color: 'var(--muted)' }}>
              <MagnifyingGlass size={56} weight="light" color="var(--muted)" />
              <p className="text-[15px] text-center leading-relaxed" style={{ color: 'var(--muted)' }}>
                Tape le titre d&apos;un jeu pour trouver sa démo PS5
              </p>
            </div>
          ) : <SearchEmptyState />
        )}

        {phase === 'searching' && (
          <div className="flex justify-center py-12">
            <span className="text-[15px]" style={{ color: 'var(--muted)' }}>Recherche…</span>
          </div>
        )}

        {/* Results */}
        {phase === 'results' && (
          <div>
            {filter === 'DEMO' ? (
              visibleDemos.length > 0 ? (
                <div>
                  {visibleDemos.map((product, i) => (
                    <div key={product.id}>
                      {i > 0 && <div className="h-px mx-4" style={{ backgroundColor: 'var(--sep)' }} />}
                      <ProductRow
                        product={product}
                        krProduct={null}
                        krwRate={0}
                        isAdded={userGameIds.has(product.id)}
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
                            krProduct={krMatchMap.get(product.id) ?? null}
                            krwRate={krwRate}
                            isAdded={userGameIds.has(product.id)}
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
                          {kr.discountText && kr.basePrice && krEur != null && comparison.krwRate && (
                            <p className="text-[12px] line-through" style={{ color: 'var(--muted)' }}>
                              {`€${(parseInt(kr.basePrice.replace(/[^0-9]/g, ''), 10) / comparison.krwRate).toFixed(2)}`}
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
