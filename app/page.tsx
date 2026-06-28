'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

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
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none" aria-hidden="true">
          <rect width="64" height="64" rx="16" fill="#0070d1"/>
          <path
            d="M14 36C14 28.27 20.27 22 28 22h8c7.73 0 14 6.27 14 14v5c0 7.73-6.27 14-14 14h-8c-7.73 0-14-6.27-14-14V36z"
            stroke="white"
            strokeWidth="2.5"
            fill="none"
          />
          <line x1="20" y1="37" x2="25" y2="37" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          <line x1="22.5" y1="34.5" x2="22.5" y2="39.5" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          <circle cx="42" cy="35" r="1.8" fill="white"/>
          <circle cx="45" cy="38" r="1.8" fill="white"/>
          <circle cx="39" cy="38" r="1.8" fill="white"/>
          <circle cx="42" cy="41" r="1.8" fill="white"/>
          <circle cx="26" cy="42" r="3" stroke="white" strokeWidth="1.8" fill="none"/>
          <circle cx="37" cy="42" r="3" stroke="white" strokeWidth="1.8" fill="none"/>
        </svg>
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
