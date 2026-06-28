'use client'
import { useState, useEffect, useCallback } from 'react'
import { Game, PriceResult, SortKey } from '@/lib/types'
import { GameCard } from './GameCard'
import { SortModal } from './SortModal'

function parseFrEur(priceStr: string | null | undefined): number {
  if (!priceStr) return Infinity
  return parseFloat(priceStr.replace(/[^0-9,]/g, '').replace(',', '.')) || Infinity
}

export function GameList() {
  const [games, setGames] = useState<Game[]>([])
  const [prices, setPrices] = useState<Record<string, PriceResult | null>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [sortKey, setSortKey] = useState<SortKey>('added_recent')
  const [showSort, setShowSort] = useState(false)

  const fetchGames = useCallback(async () => {
    const res = await fetch('/api/games')
    const data: Game[] = await res.json()
    setGames(data)
    data.forEach((game, index) => {
      setTimeout(() => {
        setLoading((l) => ({ ...l, [game.id]: true }))
        fetch(`/api/prices?title=${encodeURIComponent(game.title)}`)
          .then((r) => r.json())
          .then((p: PriceResult) => setPrices((prev) => ({ ...prev, [game.id]: p })))
          .finally(() => setLoading((l) => ({ ...l, [game.id]: false })))
      }, index * 200)
    })
  }, [])

  useEffect(() => { fetchGames() }, [fetchGames])

  const handleDelete = async (id: string) => {
    await fetch(`/api/games/${id}`, { method: 'DELETE' })
    setGames((g) => g.filter((game) => game.id !== id))
    setPrices((p) => { const { [id]: _, ...rest } = p; return rest })
  }

  const sorted = [...games].sort((a, b) => {
    const pa = prices[a.id]
    const pb = prices[b.id]
    switch (sortKey) {
      case 'added_recent': return 0
      case 'added_old':    return 1
      case 'name_az': return a.title.localeCompare(b.title, 'fr')
      case 'name_za': return b.title.localeCompare(a.title, 'fr')
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

  const SORT_LABELS: Record<SortKey, string> = {
    added_recent: 'Date récente', added_old: 'Date ancienne',
    name_az: 'A-Z', name_za: 'Z-A',
    price_fr_asc: 'Prix FR ↑', price_fr_desc: 'Prix FR ↓',
    promo: 'Promo', saving: 'Économie KR',
  }

  return (
    <>
      <div className="flex items-center justify-between px-4 py-3">
        <h1 className="text-[22px] font-bold text-[#0D1B2A]">Mes jeux</h1>
        <button
          onClick={() => setShowSort(true)}
          className="w-10 h-10 rounded-full border border-[#007AFF] flex items-center justify-center"
          title={`Tri : ${SORT_LABELS[sortKey]}`}
        >
          <svg width="18" height="14" viewBox="0 0 18 14" fill="none">
            <path d="M1 1h16M1 7h10M1 13h6" stroke="#007AFF" strokeWidth="2" strokeLinecap="round"/>
            <path d="M14 10l2 3 2-3" stroke="#007AFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      <div className="bg-white overflow-hidden">
        {sorted.length === 0 ? (
          <p className="text-center text-gray-400 py-16 text-[15px] px-8">
            Aucun jeu dans ta liste.{' '}
            <a href="/search" className="text-[#007AFF] underline">Ajouter un jeu</a>
          </p>
        ) : (
          sorted.map((game) => (
            <GameCard
              key={game.id}
              game={game}
              prices={prices[game.id] ?? null}
              loading={loading[game.id] ?? false}
              onDelete={handleDelete}
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
