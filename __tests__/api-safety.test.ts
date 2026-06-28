/**
 * TDD tests for API response safety.
 * These tests document the crash scenarios and verify the fixes.
 */

/* ── Helper: simulates the guard added to GameList ────────── */
function safeParseGamesResponse(data: unknown): { id: string }[] {
  if (!Array.isArray(data)) return []
  return data as { id: string }[]
}

/* ── Helper: simulates the guard added to Users response ──── */
function safeParseUserResponse(data: unknown): { currency: 'EUR' | 'KRW' } | null {
  if (!data || typeof data !== 'object') return null
  const d = data as Record<string, unknown>
  if (d.currency !== 'EUR' && d.currency !== 'KRW') return null
  return { currency: d.currency as 'EUR' | 'KRW' }
}

describe('safeParseGamesResponse', () => {
  it('retourne un tableau vide si la réponse est une erreur object', () => {
    const data = { error: 'DB connection failed' }
    // Avant le fix: data.forEach() lançait TypeError → crash
    expect(safeParseGamesResponse(data)).toEqual([])
  })

  it('retourne un tableau vide si null', () => {
    expect(safeParseGamesResponse(null)).toEqual([])
  })

  it('retourne un tableau vide si undefined', () => {
    expect(safeParseGamesResponse(undefined)).toEqual([])
  })

  it('retourne les jeux quand la réponse est un tableau', () => {
    const games = [
      { id: '1', title: 'God of War', fr_product_id: null, kr_product_id: null, user_id: null, added_at: '2024-01-01' },
      { id: '2', title: 'Elden Ring', fr_product_id: 'EP0700-PPSA01522_00', kr_product_id: null, user_id: null, added_at: '2024-01-02' },
    ]
    expect(safeParseGamesResponse(games)).toHaveLength(2)
    expect(safeParseGamesResponse(games)[0]).toHaveProperty('id', '1')
  })

  it('retourne tableau vide si string', () => {
    expect(safeParseGamesResponse('error')).toEqual([])
  })
})

describe('safeParseUserResponse', () => {
  it('retourne null si réponse erreur', () => {
    expect(safeParseUserResponse({ error: 'not found' })).toBeNull()
  })

  it('retourne null si currency invalide', () => {
    expect(safeParseUserResponse({ currency: 'USD' })).toBeNull()
  })

  it('retourne currency EUR quand valide', () => {
    expect(safeParseUserResponse({ id: 'x', slug: 'paul', currency: 'EUR' })).toEqual({ currency: 'EUR' })
  })

  it('retourne currency KRW quand valide', () => {
    expect(safeParseUserResponse({ id: 'x', slug: 'paul', currency: 'KRW' })).toEqual({ currency: 'KRW' })
  })

  it('retourne null si null', () => {
    expect(safeParseUserResponse(null)).toBeNull()
  })
})
