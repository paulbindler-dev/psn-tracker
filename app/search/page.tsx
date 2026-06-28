'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { PSNProduct, PriceResult } from '@/lib/types'

type Phase = 'idle' | 'searching' | 'results' | 'confirming' | 'adding'
interface SearchResults { games: PSNProduct[]; addons: PSNProduct[]; demos: PSNProduct[] }

export default function SearchPage() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResults>({ games: [], addons: [], demos: [] })
  const [selected, setSelected] = useState<PSNProduct | null>(null)
  const [comparison, setComparison] = useState<PriceResult | null>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [error, setError] = useState<string | null>(null)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    setPhase('searching')
    setError(null)
    setResults({ games: [], addons: [], demos: [] })
    setSelected(null)
    setComparison(null)

    try {
      const res = await fetch(`/api/search?title=${encodeURIComponent(query)}`)
      const data: SearchResults = await res.json()
      if (!data.games.length && !data.addons.length) {
        setError('Aucun jeu trouvé. Essaie un autre titre.')
        setPhase('idle')
      } else {
        setResults(data)
        setPhase('results')
      }
    } catch {
      setError('Erreur réseau.')
      setPhase('idle')
    }
  }

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
      const res = await fetch('/api/games', {
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
      router.push('/')
    } catch {
      setError("Erreur réseau lors de l'ajout.")
      setPhase('confirming')
    }
  }

  const kr = comparison?.kr
  const krEur = kr?.priceEur
  const frAmount = selected
    ? parseFloat((selected.discountedPrice ?? selected.basePrice ?? '').replace(/[^0-9,]/g, '').replace(',', '.')) || 0
    : 0
  const saving = frAmount > 0 && krEur && krEur > 0
    ? Math.round(((frAmount - krEur) / frAmount) * 100)
    : null

  return (
    <main className="max-w-lg mx-auto min-h-screen bg-[#f2f2f7]">
      {/* Fixed header */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-[#f2f2f7]/90 backdrop-blur-sm max-w-lg mx-auto">
        <div className="flex items-center gap-3 px-4 pt-12 pb-3">
          <button
            onClick={() => phase === 'confirming' ? (setPhase('results'), setSelected(null)) : router.push('/')}
            className="text-[#007AFF] text-[17px]"
          >
            {phase === 'confirming' ? '← Résultats' : '← Annuler'}
          </button>
        </div>
        <div className="px-4 pb-3">
          <form onSubmit={handleSearch}>
            <div className="flex gap-2">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Titre du jeu…"
                autoFocus
                className="flex-1 bg-white rounded-xl px-4 py-3 text-[15px] focus:outline-none border border-gray-200"
              />
              <button
                type="submit"
                disabled={phase === 'searching'}
                className="bg-[#0D1B2A] text-white px-5 py-3 rounded-xl text-[15px] font-semibold disabled:opacity-50"
              >
                {phase === 'searching' ? '…' : 'Chercher'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="pt-[140px]">
        {error && <p className="px-4 text-red-500 text-[14px]">{error}</p>}

        {/* Empty state */}
        {phase === 'idle' && !error && (
          <div className="flex flex-col items-center justify-center py-24 px-8 opacity-40">
            <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
              <circle cx="34" cy="34" r="20" stroke="#888" strokeWidth="3" fill="none"/>
              <line x1="48" y1="48" x2="68" y2="68" stroke="#888" strokeWidth="4" strokeLinecap="round"/>
            </svg>
            <p className="text-[15px] text-gray-500 mt-4 text-center">Recherche un jeu PSN France</p>
          </div>
        )}

        {/* Results */}
        {phase === 'results' && (
          <div className="space-y-4">
            {([
              { label: 'Jeux complets', items: results.games },
              { label: 'Extensions', items: results.addons },
              { label: 'Démos jouables', items: results.demos },
            ] as const).map(({ label, items }) => items.length > 0 && (
              <div key={label}>
                <p className="px-4 py-2 text-[13px] font-semibold text-gray-500 uppercase tracking-wide">
                  {label}
                </p>
                <div className="bg-white overflow-hidden">
                  {items.map((product, i) => (
                    <div key={product.id}>
                      {i > 0 && <div className="ml-[118px] border-b border-gray-100" />}
                      <button
                        className="flex gap-3 px-4 py-3 w-full text-left active:bg-gray-50"
                        onClick={() => handleSelect(product)}
                      >
                        <div className="relative flex-shrink-0 w-[90px] h-[90px] rounded-lg overflow-hidden bg-gray-100">
                          {product.coverUrl ? (
                            <Image src={product.coverUrl} alt={product.name} fill className="object-cover" unoptimized />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">PS</div>
                          )}
                          {product.platforms.length > 0 && (
                            <span className="absolute bottom-1 left-1 text-[10px] font-bold px-1 py-px bg-black/80 text-white rounded">
                              {product.platforms[0]}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0 py-1">
                          <p className="font-semibold text-[#0D1B2A] text-[15px] leading-snug line-clamp-2">
                            {product.name.split('(')[0].trim()}
                          </p>
                          {(() => {
                            const tier = product.serviceBranding.includes('PREMIUM') ? 'Premium'
                              : product.serviceBranding.includes('EXTRA') ? 'Extra' : null
                            return tier ? (
                              <p className="text-[13px] text-[#C89A0F] flex items-center gap-1">
                                <span>✦</span><span>{tier}</span>
                              </p>
                            ) : null
                          })()}
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            {product.discountText && (
                              <span className="text-[12px] font-bold bg-[#1A1A1A] text-white px-1.5 py-px rounded">
                                {product.discountText}
                              </span>
                            )}
                            <span className="text-[15px] font-semibold text-[#0D1B2A]">
                              {product.discountedPrice ?? product.basePrice ?? 'Prix N/D'}
                            </span>
                            {product.discountText && product.basePrice && (
                              <span className="text-[13px] text-gray-400 line-through">{product.basePrice}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center text-gray-300 self-center">›</div>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Confirmation panel */}
        {(phase === 'confirming' || phase === 'adding') && selected && (
          <div className="px-4">
            <div className="bg-white rounded-2xl overflow-hidden">
              <div className="flex gap-3 p-4">
                <div className="relative flex-shrink-0 w-[90px] h-[90px] rounded-lg overflow-hidden bg-gray-100">
                  {selected.coverUrl ? (
                    <Image src={selected.coverUrl} alt={selected.name} fill className="object-cover" unoptimized />
                  ) : null}
                  {selected.platforms.length > 0 && (
                    <span className="absolute bottom-1 left-1 text-[10px] font-bold px-1 py-px bg-black/80 text-white rounded">
                      {selected.platforms[0]}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0 py-1">
                  <p className="font-semibold text-[#0D1B2A] text-[15px] leading-snug">
                    {selected.name.split('(')[0].trim()}
                  </p>
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div>
                      <p className="text-[11px] font-bold text-gray-400 mb-1">PRIX FR</p>
                      <div className="flex items-center gap-1 flex-wrap">
                        {selected.discountText && (
                          <span className="text-[11px] font-bold bg-[#1A1A1A] text-white px-1 py-px rounded">
                            {selected.discountText}
                          </span>
                        )}
                        <p className="text-[16px] font-bold text-[#0D1B2A]">
                          {selected.discountedPrice ?? selected.basePrice ?? '—'}
                        </p>
                      </div>
                      {selected.discountText && selected.basePrice && (
                        <p className="text-[12px] text-gray-400 line-through">{selected.basePrice}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-gray-400 mb-1">PRIX KR</p>
                      {!comparison ? (
                        <p className="text-[13px] text-gray-400">Chargement…</p>
                      ) : kr ? (
                        <>
                          {kr.discountText && (
                            <span className="text-[11px] font-bold bg-[#1A1A1A] text-white px-1 py-px rounded">
                              {kr.discountText}
                            </span>
                          )}
                          <p className="text-[16px] font-bold text-[#0D1B2A]">
                            {krEur != null ? `€${krEur.toFixed(2)}` : kr.discountedPrice}
                          </p>
                          {saving != null && saving > 0 && (
                            <span className="text-[11px] font-bold bg-[#22C55E] text-white px-1.5 py-px rounded">
                              -{saving}% vs FR
                            </span>
                          )}
                          {kr.langSafety === 'risky' && (
                            <p className="text-[11px] text-red-500 font-bold mt-1">⚠ Pas d&apos;anglais</p>
                          )}
                        </>
                      ) : (
                        <p className="text-[13px] text-gray-400">Non dispo en KR</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              {comparison && (comparison.frHasDemo || comparison.krHasDemo) && (
                <div className="px-4 pb-2 flex items-center gap-2">
                  <span className="text-[12px] text-gray-500">Démo jouable :</span>
                  {comparison.frHasDemo && (
                    <span className="text-[11px] font-bold bg-blue-100 text-blue-700 px-1.5 py-px rounded">FR ✓</span>
                  )}
                  {comparison.krHasDemo && (
                    <span className="text-[11px] font-bold bg-blue-100 text-blue-700 px-1.5 py-px rounded">KR ✓</span>
                  )}
                  {!comparison.frHasDemo && (
                    <span className="text-[11px] text-gray-400">FR –</span>
                  )}
                  {!comparison.krHasDemo && (
                    <span className="text-[11px] text-gray-400">KR –</span>
                  )}
                </div>
              )}
              <div className="px-4 pb-4">
                <button
                  onClick={handleAdd}
                  disabled={phase === 'adding' || !comparison}
                  className="w-full bg-[#0D1B2A] text-white py-4 rounded-xl font-semibold text-[17px] disabled:opacity-50"
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
