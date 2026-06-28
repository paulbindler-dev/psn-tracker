'use client'
import { useEffect } from 'react'

interface Action {
  label: string
  href?: string
  onClick?: () => void
  destructive?: boolean
}

interface Props {
  actions: Action[]
  onClose: () => void
}

export function ActionSheet({ actions, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" role="dialog" aria-modal="true">
      {/* Scrim */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Sheet */}
      <div
        className="relative px-4 pb-3"
        style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
      >
        {/* Actions group */}
        <div className="rounded-2xl overflow-hidden mb-3" style={{ backgroundColor: 'var(--surface)' }}>
          {actions.map((action, i) => (
            <div key={i}>
              {i > 0 && (
                <div className="h-px mx-4" style={{ backgroundColor: 'var(--sep)' }} />
              )}
              {action.href ? (
                <a
                  href={action.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center min-h-[56px] px-5 text-[17px] active:opacity-70"
                  style={{ color: action.destructive ? '#ef4444' : '#0070d1' }}
                  onClick={onClose}
                >
                  {action.label}
                </a>
              ) : (
                <button
                  className="w-full flex items-center justify-center min-h-[56px] px-5 text-[17px] active:opacity-70"
                  style={{ color: action.destructive ? '#ef4444' : '#0070d1' }}
                  onClick={() => { action.onClick?.(); onClose() }}
                >
                  {action.label}
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Cancel — separate group */}
        <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--surface)' }}>
          <button
            className="w-full flex items-center justify-center min-h-[56px] px-5 text-[17px] font-semibold active:opacity-70"
            style={{ color: '#0070d1' }}
            onClick={onClose}
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  )
}
