'use client'
import { useState, useRef } from 'react'
import Image from 'next/image'
import { StarFour } from '@phosphor-icons/react'
import { PriceResult, Game } from '@/lib/types'
import { ActionSheet } from './ActionSheet'

interface Props {
  game: Game
  prices: PriceResult | null
  loading: boolean
  onDelete: (id: string) => void
  currency: 'EUR' | 'KRW'
}

function parseFrEur(priceStr: string | null | undefined): number {
  if (!priceStr) return 0
  return parseFloat(priceStr.replace(/[^0-9,]/g, '').replace(',', '.')) || 0
}

const DELETE_THRESHOLD = 80

export function GameCard({ game, prices, loading, onDelete, currency }: Props) {
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
  const saving =
    frAmount > 0 && krEur > 0
      ? Math.round(((frAmount - krEur) / frAmount) * 100)
      : null

  const langBadge = kr
    ? kr.langSafety === 'safe'
      ? { label: kr.langs.includes('FR') ? 'FR' : 'EN', color: 'bg-[#22c55e]' }
      : kr.langSafety === 'risky'
      ? { label: '⚠', color: 'bg-[#ef4444]' }
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

  /* Subtitle row: "Carte" / "Offre groupée" */
  const subtitle = fr
    ? fr.psPlusTier === null &&
      (fr.name?.toLowerCase().includes('bundle') || game.title.toLowerCase().includes('bundle'))
      ? 'Offre groupée'
      : null
    : null

  return (
    <>
      <div className="relative overflow-hidden">
        {/* Delete zone */}
        <div className="absolute inset-y-0 right-0 w-20 bg-[#ef4444] flex items-center justify-center">
          <button
            onClick={() => onDelete(game.id)}
            className="w-full h-full flex flex-col items-center justify-center text-white"
            aria-label="Supprimer"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M4 6h12M8 6V4h4v2M7 6l1 10h4l1-10"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="text-[11px] font-semibold mt-1">Sup.</span>
          </button>
        </div>

        {/* Card row */}
        <button
          className="flex gap-3 px-4 py-3 w-full text-left active:opacity-70"
          style={{
            backgroundColor: 'var(--surface)',
            transform: `translateX(${swipeX}px)`,
            transition: animating ? 'transform 0.25s ease' : undefined,
            willChange: swipeX !== 0 || animating ? 'transform' : 'auto',
          }}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onClick={handleCardTap}
        >
          {/* Cover 68×68 */}
          <div className="relative flex-shrink-0 w-[68px] h-[68px] rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700">
            {cover ? (
              <Image src={cover} alt={game.title} fill className="object-cover" unoptimized />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center text-xs font-bold"
                style={{ color: 'var(--muted)' }}
              >
                PS
              </div>
            )}
            {/* Platform badge — bottom-left */}
            {platforms.length > 0 && (
              <span className="absolute bottom-1 left-1 text-[10px] font-bold px-1 py-px bg-black/80 text-white rounded leading-none">
                {platforms[0]}
              </span>
            )}
            {/* Language badge — bottom-right */}
            {langBadge && (
              <span
                className={`absolute bottom-1 right-1 text-[10px] font-bold px-1 py-px ${langBadge.color} text-white rounded leading-none`}
              >
                {langBadge.label}
              </span>
            )}
          </div>

          {/* Text content */}
          <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
            {/* Title */}
            <p
              className="text-[15px] font-normal leading-[1.3] line-clamp-2"
              style={{ color: 'var(--ink)' }}
            >
              {game.title}
            </p>

            {/* Subtitle (Carte / Offre groupée) */}
            {subtitle && (
              <p className="text-[13px]" style={{ color: 'var(--muted)' }}>
                {subtitle}
              </p>
            )}

            {loading ? (
              <p className="text-[13px]" style={{ color: 'var(--muted)' }}>
                Chargement…
              </p>
            ) : (
              <>
                {/* PS Plus row */}
                {fr?.psPlusTier && (
                  <p className="text-[13px] flex items-center gap-0.5" style={{ color: '#f0b400' }}>
                    <StarFour size={11} weight="fill" color="#f0b400" />
                    <span>{fr.psPlusTier === 'PREMIUM' ? 'Premium' : 'Extra'}</span>
                  </p>
                )}

                {/* Prix FR row */}
                {(fr?.discountedPrice || fr?.basePrice) && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] font-bold" style={{ color: 'var(--muted)' }}>
                      FR
                    </span>
                    {hasFrPromo && (
                      <span
                        className="text-[11px] font-bold px-1.5 py-0.5 rounded text-white dark:bg-white/10"
                        style={{ backgroundColor: 'var(--promo-bg)' }}
                      >
                        {fr!.discountText}
                      </span>
                    )}
                    <span className="text-[15px] font-bold" style={{ color: 'var(--ink)' }}>
                      {fr?.discountedPrice ?? fr?.basePrice}
                    </span>
                    {hasFrPromo && fr?.basePrice && (
                      <span
                        className="text-[13px] line-through"
                        style={{ color: 'var(--muted)' }}
                      >
                        {fr.basePrice}
                      </span>
                    )}
                  </div>
                )}

                {/* Prix KR row */}
                {kr && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className="text-[11px] font-bold"
                      style={{ color: 'var(--muted)' }}
                    >
                      KR
                    </span>
                    {hasKrPromo && (
                      <span
                        className="text-[11px] font-bold px-1.5 py-0.5 rounded text-white dark:bg-white/10"
                        style={{ backgroundColor: 'var(--promo-bg)' }}
                      >
                        {kr.discountText}
                      </span>
                    )}
                    <span
                      className="text-[14px] font-semibold"
                      style={{ color: 'var(--ink)' }}
                    >
                      {currency === 'KRW'
                        ? (kr.discountedPrice ?? kr.basePrice)
                        : krEur > 0
                          ? `€${krEur.toFixed(2)}`
                          : (kr.discountedPrice ?? kr.basePrice)}
                    </span>
                    {hasKrPromo && kr.basePrice && currency === 'KRW' && (
                      <span className="text-[12px] line-through" style={{ color: 'var(--muted)' }}>
                        {kr.basePrice}
                      </span>
                    )}
                    {saving != null && saving > 0 && (
                      <span className="text-[11px] font-bold bg-[#22c55e] text-white px-1.5 py-0.5 rounded">
                        -{saving}%
                      </span>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </button>

        {/* Bottom separator — aligns with text (after cover) */}
        <div
          className="absolute bottom-0 right-0 h-px"
          style={{ backgroundColor: 'var(--sep)', left: 96 }}
        />
      </div>

      {showActions && (
        <ActionSheet actions={actions} onClose={() => setShowActions(false)} />
      )}
    </>
  )
}
