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
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-[#f2f2f7] rounded-t-2xl pb-8 pt-2 safe-area-bottom">
        <div className="mx-4 mt-2 rounded-2xl overflow-hidden bg-white">
          {actions.map((action, i) => (
            <div key={i}>
              {i > 0 && <div className="border-t border-gray-100" />}
              {action.href ? (
                <a
                  href={action.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`block py-4 px-5 text-center text-[17px] ${
                    action.destructive ? 'text-red-500' : 'text-[#007AFF]'
                  }`}
                  onClick={onClose}
                >
                  {action.label}
                </a>
              ) : (
                <button
                  className={`w-full py-4 px-5 text-center text-[17px] ${
                    action.destructive ? 'text-red-500' : 'text-[#007AFF]'
                  }`}
                  onClick={() => { action.onClick?.(); onClose() }}
                >
                  {action.label}
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="mx-4 mt-3 rounded-2xl overflow-hidden bg-white">
          <button
            className="w-full py-4 px-5 text-center text-[17px] font-semibold text-[#007AFF]"
            onClick={onClose}
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  )
}
