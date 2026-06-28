'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Game, PriceResult, SortKey } from '@/lib/types'
import { GameCard } from './GameCard'
import { SortModal } from './SortModal'
import { useSlug } from '@/lib/slug-context'

function parseFrEur(priceStr: string | null | undefined): number {
  if (!priceStr) return Infinity
  return parseFloat(priceStr.replace(/[^0-9,]/g, '').replace(',', '.')) || Infinity
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-8 gap-5">
      {/* PS logo placeholder */}
      <svg width="72" height="72" viewBox="0 0 72 72" fill="none" aria-hidden="true">
        <rect width="72" height="72" rx="36" fill="none"/>
        <text
          x="36"
          y="48"
          textAnchor="middle"
          fontSize="32"
          fontWeight="bold"
          fill="var(--sep)"
          fontFamily="DM Sans, sans-serif"
        >
          PS
        </text>
      </svg>
      <div className="text-center gap-1.5 flex flex-col">
        <p className="text-[17px] font-semibold" style={{ color: 'var(--ink)' }}>
          Ta liste est vide
        </p>
        <p className="text-[15px]" style={{ color: 'var(--muted)' }}>
          Recherche un jeu pour commencer
        </p>
      </div>
      <Link
        href="/search"
        className="mt-2 px-6 py-3 rounded-xl text-[15px] font-semibold text-white"
        style={{ backgroundColor: '#0070d1' }}
      >
        Rechercher
      </Link>
    </div>
  )
}

function SortIcon() {
  return (
    <svg width="18" height="14" viewBox="0 0 18 14" fill="none" aria-hidden="true">
      <path d="M1 1h16M1 7h10M1 13h6" stroke="#0070d1" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

export function GameList() {
  const slug = useSlug()
  const [games, setGames] = useState<Game[]>([])
  const [prices, setPrices] = useState<Record<string, PriceResult | null>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [sortKey, setSortKey] = useState<SortKey>('added_recent')
  const [showSort, setShowSort] = useState(false)
  const [currency, setCurrency] = useState<'EUR' | 'KRW'>('EUR')

  // Charger la devise du user au démarrage
  useEffect(() => {
    if (!slug) return
    fetch(`/api/users/${slug}`)
      .then((r) => r.ok ? r.json() : null)
      .then((user) => {
        if (user?.currency) setCurrency(user.currency)
      })
      .catch(() => {})
  }, [slug])

  const fetchGames = useCallback(async () => {
    if (!slug) return
    const res = await fetch(`/api/games?slug=${slug}`)
    const data: Game[] = await res.json()
    setGames(data)
    data.forEach((game, index) => {
      setTimeout(() => {
        setLoading((l) => ({ ...l, [game.id]: true }))
        const priceUrl =
          game.fr_product_id || game.kr_product_id
            ? `/api/prices?fr_id=${game.fr_product_id ?? ''}&kr_id=${game.kr_product_id ?? ''}`
            : `/api/prices?title=${encodeURIComponent(game.title)}`
        fetch(priceUrl)
          .then((r) => {
            if (!r.ok) return null
            return r.json()
          })
          .then((p: PriceResult | null) => {
            if (p) setPrices((prev) => ({ ...prev, [game.id]: p }))
          })
          .finally(() => setLoading((l) => ({ ...l, [game.id]: false })))
      }, index * 200)
    })
  }, [slug])

  useEffect(() => { fetchGames() }, [fetchGames])

  const handleDelete = async (id: string) => {
    await fetch(`/api/games/${id}`, { method: 'DELETE' })
    setGames((g) => g.filter((game) => game.id !== id))
    setPrices((p) => { const { [id]: _, ...rest } = p; return rest })
  }

  const handleToggleCurrency = async () => {
    const next: 'EUR' | 'KRW' = currency === 'EUR' ? 'KRW' : 'EUR'
    setCurrency(next)
    if (!slug) return
    await fetch(`/api/users/${slug}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currency: next }),
    }).catch(() => {})
  }

  const sorted = [...games].sort((a, b) => {
    const pa = prices[a.id]
    const pb = prices[b.id]
    switch (sortKey) {
      case 'added_recent': return 0
      case 'added_old':    return new Date(a.added_at).getTime() - new Date(b.added_at).getTime()
      case 'name_az':      return a.title.localeCompare(b.title, 'fr')
      case 'name_za':      return b.title.localeCompare(a.title, 'fr')
      case 'price_fr_asc':
        return parseFrEur(pa?.fr?.discountedPrice) - parseFrEur(pb?.fr?.discountedPrice)
      case 'price_fr_desc':
        return parseFrEur(pb?.fr?.discountedPrice) - parseFrEur(pa?.fr?.discountedPrice)
      case 'promo':
        return (+(!!pb?.fr?.discountText || !!pb?.kr?.discountText)) -
               (+(!!pa?.fr?.discountText || !!pa?.kr?.discountText))
      case 'saving': {
        const savA = pa?.kr?.priceEur != null ? parseFrEur(pa?.fr?.discountedPrice) - pa.kr.priceEur : -Infinity
        const savB = pb?.kr?.priceEur != null ? parseFrEur(pb?.fr?.discountedPrice) - pb.kr.priceEur : -Infinity
        return savB - savA
      }
      default: return 0
    }
  })

  return (
    <>
      {/* Header PSN */}
      <div className="flex items-center justify-between px-4 pt-6 pb-4">
        <h1
          className="text-[28px] font-bold"
          style={{ color: 'var(--ink)' }}
        >
          Liste de souhaits
        </h1>
        <div className="flex items-center gap-2">
          {/* Toggle EUR/KRW */}
          <div className="flex rounded-full border overflow-hidden text-[13px]" style={{ borderColor: 'var(--sep)' }}>
            <button
              onClick={currency !== 'EUR' ? handleToggleCurrency : undefined}
              className="px-3 py-1 font-semibold transition-colors"
              style={{
                backgroundColor: currency === 'EUR' ? '#0070d1' : 'transparent',
                color: currency === 'EUR' ? '#fff' : 'var(--muted)',
              }}
            >
              EUR
            </button>
            <button
              onClick={currency !== 'KRW' ? handleToggleCurrency : undefined}
              className="px-3 py-1 font-semibold transition-colors"
              style={{
                backgroundColor: currency === 'KRW' ? '#0070d1' : 'transparent',
                color: currency === 'KRW' ? '#fff' : 'var(--muted)',
              }}
            >
              KRW
            </button>
          </div>
          {/* Sort button */}
          <button
            onClick={() => setShowSort(true)}
            className="w-10 h-10 rounded-full border flex items-center justify-center flex-shrink-0"
            style={{ borderColor: '#0070d1' }}
            aria-label="Trier la liste"
          >
            <SortIcon />
          </button>
        </div>
      </div>

      {/* List */}
      <div style={{ backgroundColor: 'var(--bg)' }}>
        {sorted.length === 0 ? (
          <EmptyState />
        ) : (
          sorted.map((game) => (
            <GameCard
              key={game.id}
              game={game}
              prices={prices[game.id] ?? null}
              loading={loading[game.id] ?? false}
              onDelete={handleDelete}
              currency={currency}
            />
          ))
        )}
      </div>

      {showSort && (
        <SortModal
          current={sortKey}
          onChange={setSortKey}
          onClose={() => setShowSort(false)}
        />
      )}
    </>
  )
}
