'use client'
import { useEffect } from 'react'
import { GameController } from '@phosphor-icons/react'

export default function SlugError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[PSN Tracker]', error)
  }, [error])

  return (
    <main
      style={{
        backgroundColor: 'var(--bg)',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 24px',
        textAlign: 'center',
      }}
    >
      <div className="mb-6 flex items-center justify-center rounded-2xl" style={{ width: 72, height: 72, backgroundColor: 'var(--surface)' }}>
        <GameController size={36} color="var(--muted)" />
      </div>
      <p className="text-[17px] font-semibold mb-2" style={{ color: 'var(--ink)' }}>
        Une erreur est survenue
      </p>
      <p className="text-[14px] mb-8" style={{ color: 'var(--muted)' }}>
        Recharge la page ou réessaie.
      </p>
      <button
        onClick={reset}
        className="px-6 py-3 rounded-xl font-semibold text-[15px] text-white"
        style={{ backgroundColor: '#0070d1' }}
      >
        Réessayer
      </button>
    </main>
  )
}
