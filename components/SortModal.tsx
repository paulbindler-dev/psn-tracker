'use client'
import { SortKey } from '@/lib/types'
import { useEffect } from 'react'

const OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'added_recent', label: "Date d'ajout (de la plus récente à la plus ancienne)" },
  { key: 'added_old',    label: "Date d'ajout (de la plus ancienne à la plus récente)" },
  { key: 'name_az',      label: 'Nom (A-Z)' },
  { key: 'name_za',      label: 'Nom (Z-A)' },
  { key: 'price_fr_asc', label: 'Prix (du moins cher au plus cher)' },
  { key: 'price_fr_desc',label: 'Prix (du plus cher au moins cher)' },
  { key: 'promo',        label: 'Promo active' },
  { key: 'saving',       label: 'Économie KR' },
]

interface Props {
  current: SortKey
  onChange: (key: SortKey) => void
  onClose: () => void
}

export function SortModal({ current, onChange, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    // Prevent body scroll while sheet is open
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" role="dialog" aria-modal="true" aria-label="Trier">
      {/* Scrim */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Sheet */}
      <div
        className="relative rounded-t-2xl overflow-hidden"
        style={{
          backgroundColor: 'var(--surface)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-2.5 pb-1">
          <div
            className="w-9 h-1 rounded-full"
            style={{ backgroundColor: 'var(--sep)' }}
          />
        </div>

        {/* Title */}
        <div
          className="py-3 text-center border-b"
          style={{ borderColor: 'var(--sep)' }}
        >
          <span
            className="text-[17px] font-semibold"
            style={{ color: 'var(--ink)' }}
          >
            Trier
          </span>
        </div>

        {/* Options — scrollable, contained */}
        <div style={{ overflowY: 'auto', maxHeight: '60vh', overscrollBehavior: 'contain' }}>
          {OPTIONS.map((opt, i) => (
            <button
              key={opt.key}
              className="w-full flex items-center justify-between px-5 py-4 active:opacity-70"
              style={{
                borderBottom: i < OPTIONS.length - 1 ? '1px solid var(--sep)' : undefined,
              }}
              onClick={() => { onChange(opt.key); onClose() }}
            >
              <span
                className="text-[15px] text-left pr-4"
                style={{ color: 'var(--ink)' }}
              >
                {opt.label}
              </span>
              {/* Radio */}
              <span
                className="flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center"
                style={{
                  borderColor: current === opt.key ? '#0070d1' : 'var(--muted)',
                }}
              >
                {current === opt.key && (
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: '#0070d1' }}
                  />
                )}
              </span>
            </button>
          ))}
        </div>

      </div>
    </div>
  )
}
