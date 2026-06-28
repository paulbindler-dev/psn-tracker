'use client'
import { useEffect } from 'react'

export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
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
      <p className="text-[17px] font-semibold mb-2" style={{ color: 'var(--ink)' }}>
        Une erreur est survenue
      </p>
      <button
        onClick={reset}
        className="px-6 py-3 rounded-xl font-semibold text-[15px] text-white mt-6"
        style={{ backgroundColor: '#0070d1' }}
      >
        Réessayer
      </button>
    </main>
  )
}
