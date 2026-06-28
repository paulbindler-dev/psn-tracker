'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

function PSMark({ size = 64 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="white"
      aria-hidden="true"
    >
      {/* Shadow P (forms the S in PS illusion) */}
      <path
        opacity="0.45"
        d="M0 100 V58 Q0 30 28 26 V44 Q16 48 16 58 V100 Z"
      />
      {/* Main bold P */}
      <path d="M30 0 V100 H46 V70 H68 Q100 70 100 35 Q100 0 68 0 Z M46 16 H68 Q84 16 84 35 Q84 54 68 54 H46 Z" />
    </svg>
  )
}

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
          style={{ width: 80, height: 80, background: 'linear-gradient(145deg, #0070d1 0%, #003087 100%)' }}
        >
          <PSMark size={48} />
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
