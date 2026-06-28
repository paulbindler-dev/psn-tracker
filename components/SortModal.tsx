'use client'
import { SortKey } from '@/lib/types'
import { useEffect } from 'react'

const OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'added_recent', label: "Date d'ajout (récente → ancienne)" },
  { key: 'added_old',    label: "Date d'ajout (ancienne → récente)" },
  { key: 'name_az',      label: 'Nom (A-Z)' },
  { key: 'name_za',      label: 'Nom (Z-A)' },
  { key: 'price_fr_asc', label: 'Prix FR (moins cher → plus cher)' },
  { key: 'price_fr_desc',label: 'Prix FR (plus cher → moins cher)' },
  { key: 'promo',        label: 'Promo active (FR ou KR)' },
  { key: 'saving',       label: 'Économie KR vs FR (plus grande → plus petite)' },
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
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl pb-8">
        <div className="py-4 text-center border-b border-gray-100">
          <span className="text-[17px] font-semibold text-[#0D1B2A]">Trier</span>
        </div>
        <div>
          {OPTIONS.map((opt) => (
            <button
              key={opt.key}
              className={`w-full flex items-center justify-between px-5 py-4 border-b border-gray-100 last:border-0 ${
                current === opt.key ? 'text-[#0D1B2A]' : 'text-gray-700'
              }`}
              onClick={() => { onChange(opt.key); onClose() }}
            >
              <span className="text-[15px]">{opt.label}</span>
              {current === opt.key ? (
                <span className="w-5 h-5 rounded-full border-2 border-[#007AFF] flex items-center justify-center">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#007AFF]" />
                </span>
              ) : (
                <span className="w-5 h-5 rounded-full border-2 border-gray-300" />
              )}
            </button>
          ))}
        </div>
        <div className="mx-4 mt-3">
          <button
            className="w-full py-4 rounded-2xl bg-[#f2f2f7] text-[17px] font-semibold text-[#007AFF]"
            onClick={onClose}
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  )
}
