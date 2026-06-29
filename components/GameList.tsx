'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { SortDescending } from '@phosphor-icons/react'
import { Game, PriceResult, SortKey } from '@/lib/types'
import { GameCard } from './GameCard'
import { SortModal } from './SortModal'
import { useSlug } from '@/lib/slug-context'

function parseFrEur(priceStr: string | null | undefined): number {
  if (!priceStr) return Infinity
  return parseFloat(priceStr.replace(/[^0-9,]/g, '').replace(',', '.')) || Infinity
}

function EmptyState({ slug }: { slug: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-8 gap-5">
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
        href={`/${slug}/search`}
        className="mt-2 px-6 py-3 rounded-xl text-[15px] font-semibold text-white"
        style={{ backgroundColor: '#0070d1' }}
      >
        Rechercher
      </Link>
    </div>
  )
}

async function registerPushSubscription(slug: string): Promise<void> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return

  const reg = await navigator.serviceWorker.ready
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  if (!vapidKey) return

  // Convert base64 URL-safe to Uint8Array
  const urlB64 = vapidKey.replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(urlB64)
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)

  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: arr,
  })

  await fetch(`/api/push/subscribe?slug=${slug}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sub.toJSON()),
  })
}

export function GameList() {
  const slug = useSlug()
  const [games, setGames] = useState<Game[]>([])
  const [prices, setPrices] = useState<Record<string, PriceResult | null>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [sortKey, setSortKey] = useState<SortKey>('added_recent')
  const [showSort, setShowSort] = useState(false)
  const [currency, setCurrency] = useState<'EUR' | 'KRW'>('EUR')
  const [pendingDelete, setPendingDelete] = useState<{ id: string; game: Game; timer: ReturnType<typeof setTimeout> } | null>(null)

  // Nettoyage timer undo delete au démontage
  useEffect(() => () => { if (pendingDelete?.timer) clearTimeout(pendingDelete.timer) }, [pendingDelete])

  // Charger la devise du user au démarrage
  useEffect(() => {
    if (!slug) return
    fetch(`/api/users/${slug}`)
      .then((r) => r.ok ? r.json() : null)
      .then((user) => {
        if (user?.currency === 'EUR' || user?.currency === 'KRW') setCurrency(user.currency)
      })
      .catch(() => {})
  }, [slug])

  // Register service worker + push subscription
  useEffect(() => {
    if (!slug || typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return

    navigator.serviceWorker.register('/sw.js').catch(() => {})

    // Only subscribe if permission already granted (don't auto-prompt on load)
    if (Notification.permission === 'granted') {
      registerPushSubscription(slug).catch(() => {})
    }
  }, [slug])

  const fetchGames = useCallback(async () => {
    if (!slug) return
    const res = await fetch(`/api/games?slug=${slug}`)
    const raw = await res.json()
    if (!Array.isArray(raw)) return
    const data = raw as Game[]
    setGames(data)
    data.forEach((game, index) => {
      setTimeout(() => {
        setLoading((l) => ({ ...l, [game.id]: true }))
        const priceUrl =
          game.fr_product_id || game.kr_product_id
            ? `/api/prices?${new URLSearchParams(
                Object.fromEntries(
                  Object.entries({ fr_id: game.fr_product_id, kr_id: game.kr_product_id })
                    .filter(([, v]) => v != null) as [string, string][]
                )
              ).toString()}`
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

  const handleDelete = (id: string) => {
    const gameToDelete = games.find(g => g.id === id)
    if (!gameToDelete) return

    setGames(g => g.filter(game => game.id !== id))

    if (pendingDelete) {
      clearTimeout(pendingDelete.timer)
      fetch(`/api/games/${pendingDelete.id}?slug=${slug}`, { method: 'DELETE' })
      setPrices(p => { const { [pendingDelete.id]: _, ...rest } = p; return rest })
    }

    const timer = setTimeout(() => {
      fetch(`/api/games/${id}?slug=${slug}`, { method: 'DELETE' })
      setPendingDelete(null)
      setPrices(p => { const { [id]: _, ...rest } = p; return rest })
    }, 3000)

    setPendingDelete({ id, game: gameToDelete, timer })
  }

  const handleUndoDelete = () => {
    if (!pendingDelete) return
    clearTimeout(pendingDelete.timer)
    setGames(g => [...g, pendingDelete.game].sort((a, b) =>
      new Date(b.added_at).getTime() - new Date(a.added_at).getTime()
    ))
    setPendingDelete(null)
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

  const handleToggleNotify = async (id: string, next: boolean) => {
    // Optimistic update
    setGames(gs => gs.map(g => g.id === id ? { ...g, notify: next } : g))

    // If turning ON, request push permission + subscribe
    if (next && slug) {
      await registerPushSubscription(slug).catch(() => {})
    }

    await fetch(`/api/games/${id}?slug=${slug}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notify: next }),
    }).catch(() => {
      // Rollback on error
      setGames(gs => gs.map(g => g.id === id ? { ...g, notify: !next } : g))
    })
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
        <h1 className="text-[28px] font-bold" style={{ color: 'var(--ink)' }}>
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
            <SortDescending size={20} color="#0070d1" />
          </button>
        </div>
      </div>

      {/* List */}
      <div style={{ backgroundColor: 'var(--bg)' }}>
        {sorted.length === 0 ? (
          <EmptyState slug={slug} />
        ) : (
          sorted.map((game) => (
            <GameCard
              key={game.id}
              game={game}
              prices={prices[game.id] ?? null}
              loading={loading[game.id] ?? false}
              onDelete={handleDelete}
              onToggleNotify={handleToggleNotify}
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

      {pendingDelete && (
        <div
          className="fixed bottom-20 left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-3 rounded-xl z-50 shadow-lg"
          style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--sep)' }}
        >
          <span className="text-[14px]" style={{ color: 'var(--ink)' }}>
            Supprimé
          </span>
          <button
            onClick={handleUndoDelete}
            className="text-[14px] font-semibold"
            style={{ color: '#0070d1' }}
          >
            Annuler
          </button>
        </div>
      )}
    </>
  )
}
