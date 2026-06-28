'use client'
import { useState, useRef } from 'react'
import Image from 'next/image'
import { PriceResult, Game } from '@/lib/types'
import { ActionSheet } from './ActionSheet'

interface Props {
  game: Game
  prices: PriceResult | null
  loading: boolean
  onDelete: (id: string) => void
}

function parseFrEur(priceStr: string | null | undefined): number {
  if (!priceStr) return 0
  return parseFloat(priceStr.replace(/[^0-9,]/g, '').replace(',', '.')) || 0
}

const DELETE_THRESHOLD = 80

export function GameCard({ game, prices, loading, onDelete }: Props) {
  const [showActions, setShowActions] = useState(false)
  const [swipeX, setSwipeX] = useState(0)
  const [animating, setAnimating] = useState(false)
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)
  const isDragging = useRef(false)

  const fr = prices?.fr
  const kr = prices?.kr
  const cover = fr?.coverUrl ?? kr?.coverUrl
  const platforms = fr?.platforms ?? []
  const hasFrPromo = !!fr?.discountText
  const hasKrPromo = !!kr?.discountText

  const frAmount = parseFrEur(fr?.discountedPrice ?? fr?.basePrice)
  const krEur = kr?.priceEur ?? 0
  const saving = frAmount > 0 && krEur > 0
    ? Math.round(((frAmount - krEur) / frAmount) * 100)
    : null

  const langBadge = kr
    ? kr.langSafety === 'safe'
      ? { label: kr.langs.includes('FR') ? 'FR' : 'EN', color: 'bg-[#22C55E]' }
      : kr.langSafety === 'risky'
      ? { label: '⚠', color: 'bg-red-500' }
      : null
    : null

  const actions = [
    ...(fr?.storeUrl ? [{ label: 'Ouvrir sur PSN France', href: fr.storeUrl }] : []),
    ...(kr?.storeUrl ? [{ label: 'Ouvrir sur PSN Corée', href: kr.storeUrl }] : []),
    { label: 'Supprimer de la liste', onClick: () => onDelete(game.id), destructive: true },
  ]

  const resetSwipe = () => {
    setAnimating(true)
    setSwipeX(0)
    setTimeout(() => setAnimating(false), 300)
  }

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
    isDragging.current = false
  }

  const onTouchMove = (e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - touchStartX.current
    const dy = e.touches[0].clientY - touchStartY.current
    if (!isDragging.current && Math.abs(dy) > Math.abs(dx)) return
    isDragging.current = true
    if (dx < 0) setSwipeX(Math.max(dx, -DELETE_THRESHOLD - 20))
  }

  const onTouchEnd = () => {
    if (!isDragging.current) return
    if (swipeX < -DELETE_THRESHOLD) {
      setAnimating(true)
      setSwipeX(-DELETE_THRESHOLD)
      setTimeout(() => setAnimating(false), 200)
    } else {
      resetSwipe()
    }
  }

  const handleCardTap = () => {
    if (Math.abs(swipeX) > 5) { resetSwipe(); return }
    setShowActions(true)
  }

  return (
    <>
      <div className="relative overflow-hidden">
        {/* Delete zone */}
        <div className="absolute inset-y-0 right-0 w-20 bg-red-500 flex items-center justify-center">
          <button
            onClick={() => onDelete(game.id)}
            className="w-full h-full flex flex-col items-center justify-center text-white"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M4 6h12M8 6V4h4v2M7 6l1 10h4l1-10" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="text-[11px] font-semibold mt-1">Sup.</span>
          </button>
        </div>

        {/* Card */}
        <button
          className="flex gap-3 px-4 py-3 bg-white w-full text-left active:bg-gray-50 relative"
          style={{
            transform: `translateX(${swipeX}px)`,
            transition: animating ? 'transform 0.25s ease' : undefined,
            willChange: swipeX !== 0 || animating ? 'transform' : 'auto',
          }}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onClick={handleCardTap}
        >
          {/* Cover */}
          <div className="relative flex-shrink-0 w-[90px] h-[90px] rounded-lg overflow-hidden bg-gray-100">
            {cover ? (
              <Image src={cover} alt={game.title} fill className="object-cover" unoptimized />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">PS</div>
            )}
            {platforms.length > 0 && (
              <span className="absolute bottom-1 left-1 text-[10px] font-bold px-1 py-px bg-black/80 text-white rounded">
                {platforms[0]}
              </span>
            )}
            {langBadge && (
              <span className={`absolute bottom-1 right-1 text-[10px] font-bold px-1 py-px ${langBadge.color} text-white rounded`}>
                {langBadge.label}
              </span>
            )}
          </div>

          {/* Text */}
          <div className="flex-1 min-w-0 py-1">
            <p className="font-semibold text-[#0D1B2A] text-[15px] leading-snug line-clamp-2">
              {game.title}
            </p>
            {loading ? (
              <p className="text-[13px] text-gray-400 mt-1">Chargement…</p>
            ) : (
              <>
                {fr?.psPlusTier && (
                  <p className="text-[13px] text-[#C89A0F] mt-0.5 flex items-center gap-1">
                    <span>✦</span>
                    <span>{fr.psPlusTier === 'PREMIUM' ? 'Premium' : 'Extra'}</span>
                  </p>
                )}
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  {hasFrPromo && (
                    <span className="text-[12px] font-bold bg-[#1A1A1A] text-white px-1.5 py-px rounded">
                      {fr!.discountText}
                    </span>
                  )}
                  <span className="text-[15px] font-semibold text-[#0D1B2A]">
                    {fr?.discountedPrice ?? fr?.basePrice ?? 'N/D'}
                  </span>
                  {hasFrPromo && fr?.basePrice && (
                    <span className="text-[13px] text-gray-400 line-through">{fr.basePrice}</span>
                  )}
                </div>
                {kr && (
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <span className="text-[11px] font-bold text-gray-400">KR</span>
                    {hasKrPromo && (
                      <span className="text-[12px] font-bold bg-[#1A1A1A] text-white px-1.5 py-px rounded">
                        {kr.discountText}
                      </span>
                    )}
                    <span className="text-[14px] font-semibold text-gray-700">
                      {krEur > 0 ? `€${krEur.toFixed(2)}` : kr.discountedPrice ?? kr.basePrice}
                    </span>
                    {saving != null && saving > 0 && (
                      <span className="text-[11px] font-bold bg-[#22C55E] text-white px-1.5 py-px rounded">
                        -{saving}%
                      </span>
                    )}
                  </div>
                )}
                {!kr && (
                  <p className="text-[12px] text-gray-400 mt-0.5">Non disponible en KR</p>
                )}
                {(prices?.frHasDemo || prices?.krHasDemo) && (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] font-bold text-gray-400">Démo</span>
                    {prices?.frHasDemo && (
                      <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-1 rounded">FR</span>
                    )}
                    {prices?.krHasDemo && (
                      <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-1 rounded">KR</span>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </button>
      </div>

      <div className="ml-[118px] border-b border-gray-100" />

      {showActions && (
        <ActionSheet actions={actions} onClose={() => setShowActions(false)} />
      )}
    </>
  )
}
