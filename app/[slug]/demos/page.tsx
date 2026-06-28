'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import { PSNProduct } from '@/lib/types'

type PlatformFilter = 'all' | 'PS5' | 'PS4'

export default function DemosPage() {
  const [demos, setDemos] = useState<PSNProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('all')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchDemos = useCallback(async (q: string) => {
    setLoading(true)
    try {
      const url = `/api/demos?region=fr-fr${q ? `&q=${encodeURIComponent(q)}` : ''}`
      const res = await fetch(url)
      const data: PSNProduct[] = await res.json()
      setDemos(data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchDemos('') }, [fetchDemos])

  const handleSearch = (val: string) => {
    setQuery(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchDemos(val), 400)
  }

  const filtered = platformFilter === 'all'
    ? demos
    : demos.filter(d => d.platforms.includes(platformFilter))

  return (
    <main style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-[28px] font-bold" style={{ color: 'var(--ink)' }}>
          Démos jouables
        </h1>
        {!loading && (
          <p className="text-[13px] mt-0.5" style={{ color: 'var(--muted)' }}>
            {filtered.length} démo{filtered.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Search bar */}
      <div className="px-4 pb-3">
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
             style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--sep)' }}>
          {/* loupe SVG */}
          <svg width="17" height="17" viewBox="0 0 17 17" fill="none" aria-hidden="true">
            <circle cx="7.5" cy="7.5" r="5.5" stroke="var(--muted)" strokeWidth="1.5"/>
            <path d="M12 12l3 3" stroke="var(--muted)" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Chercher une démo…"
            style={{ fontSize: '16px', color: 'var(--ink)' }}
            className="flex-1 bg-transparent outline-none placeholder:text-[var(--muted)]"
          />
        </div>
      </div>

      {/* Platform pills */}
      <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-none">
        {(['all', 'PS5', 'PS4'] as PlatformFilter[]).map(f => (
          <button
            key={f}
            onClick={() => setPlatformFilter(f)}
            className="flex-shrink-0 px-3 py-1 rounded-full text-[13px] font-semibold"
            style={{
              backgroundColor: platformFilter === f ? '#0070d1' : 'var(--surface)',
              color: platformFilter === f ? '#ffffff' : 'var(--ink)',
              border: platformFilter === f ? 'none' : '1px solid var(--sep)',
            }}
          >
            {f === 'all' ? 'Tous' : f}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-12">
          <span className="text-[15px]" style={{ color: 'var(--muted)' }}>Chargement…</span>
        </div>
      )}

      {/* Empty */}
      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center py-16 px-8 gap-3">
          <p className="text-[15px] text-center" style={{ color: 'var(--muted)' }}>
            Aucune démo trouvée
          </p>
        </div>
      )}

      {/* Demo list */}
      {!loading && filtered.length > 0 && (
        <div>
          {filtered.map((demo, i) => (
            <div key={demo.id}>
              {i > 0 && <div className="h-px mx-4" style={{ backgroundColor: 'var(--sep)' }}/>}
              <DemoRow demo={demo} />
            </div>
          ))}
        </div>
      )}
    </main>
  )
}

function DemoRow({ demo }: { demo: PSNProduct }) {
  const storeUrl = `https://store.playstation.com/fr-fr/product/${demo.id}`

  return (
    <a
      href={storeUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex gap-3 px-4 py-3 w-full active:opacity-70"
      style={{ backgroundColor: 'var(--surface)' }}
    >
      {/* Cover */}
      <div className="relative flex-shrink-0 w-[68px] h-[68px] rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700">
        {demo.coverUrl ? (
          <Image src={demo.coverUrl} alt={demo.name} fill className="object-cover" unoptimized />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs font-bold"
               style={{ color: 'var(--muted)' }}>PS</div>
        )}
        {demo.platforms[0] && (
          <span className="absolute bottom-1 left-1 text-[10px] font-bold px-1 py-px bg-black/80 text-white rounded leading-none">
            {demo.platforms[0]}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
        <p className="text-[15px] font-semibold leading-[1.3] line-clamp-2" style={{ color: 'var(--ink)' }}>
          {demo.name.split('(')[0].trim().replace(/\s*[-–—]\s*[Dd][ée]mo\w*/i, '').trim()}
        </p>
        <p className="text-[13px]" style={{ color: 'var(--muted)' }}>Démo gratuite</p>
      </div>

      {/* Arrow */}
      <div className="flex items-center self-center" style={{ color: 'var(--sep)' }}>
        <svg width="8" height="14" viewBox="0 0 8 14" fill="none">
          <path d="M1 1l6 6-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </a>
  )
}
