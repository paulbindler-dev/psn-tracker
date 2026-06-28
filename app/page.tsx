'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { GameController } from '@phosphor-icons/react'

export default function HomePage() {
  const router = useRouter()
  const [slug, setSlug] = useState('')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('psn_slug')
    if (saved) {
      router.replace(`/${saved}`)
    } else {
      setReady(true)
    }
  }, [router])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const value = slug.trim().toLowerCase()
    if (!value) return
    localStorage.setItem('psn_slug', value)
    router.push(`/${value}`)
  }

  if (!ready) return null

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
      }}
    >
      {/* Logo */}
      <div className="mb-10 flex flex-col items-center gap-3">
        <div
          className="flex items-center justify-center rounded-2xl"
          style={{ width: 72, height: 72, backgroundColor: '#0070d1' }}
        >
          <GameController size={40} color="white" weight="fill" />
        </div>
        <h1
          className="text-[32px] font-bold tracking-tight"
          style={{ color: 'var(--ink)' }}
        >
          PSN Tracker
        </h1>
        <p className="text-[15px] text-center" style={{ color: 'var(--muted)' }}>
          Comparateur de prix FR / Corée
        </p>
      </div>

      {/* Formulaire */}
      <form onSubmit={handleSubmit} className="w-full max-w-sm flex flex-col gap-3">
        <label
          htmlFor="slug-input"
          className="text-[13px] font-semibold uppercase tracking-wide"
          style={{ color: 'var(--muted)' }}
        >
          Ton identifiant
        </label>
        <input
          id="slug-input"
          type="text"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="ex : paul, alex2024…"
          autoFocus
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className="w-full px-4 py-3.5 rounded-xl text-[17px] outline-none"
          style={{
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--sep)',
            color: 'var(--ink)',
          }}
        />
        <button
          type="submit"
          className="w-full py-4 rounded-xl font-semibold text-[17px] text-white"
          style={{ backgroundColor: '#0070d1' }}
        >
          Commencer
        </button>
      </form>
    </main>
  )
}
