/**
 * TDD tests for web push notification logic (Task 15)
 * Tests the logic layer only — no actual HTTP or VAPID crypto calls.
 */

// ── Helpers replicated from GameCard / GameList logic ────────────────────────

/**
 * Determines if a swipe gesture should trigger a notify toggle (right swipe)
 * or a delete reveal (left swipe), or reset.
 */
function resolveSwipeAction(swipeX: number, threshold = 80): 'notify' | 'delete-sticky' | 'reset' {
  if (swipeX > threshold) return 'notify'
  if (swipeX < -threshold) return 'delete-sticky'
  return 'reset'
}

/**
 * Builds the PATCH request body for toggling notify.
 */
function buildNotifyPatch(notify: boolean): { notify: boolean } {
  return { notify }
}

/**
 * Determines if a push should be sent based on price data.
 * Returns true only when there is an active discount.
 */
function shouldSendPush(frDiscountText: string | null | undefined): boolean {
  return !!frDiscountText
}

/**
 * Builds the push notification payload.
 */
function buildPushPayload(title: string, slug: string, gameId: string) {
  return {
    title: `${title} est en promo !`,
    body: 'Promotion disponible sur PSN France',
    gameId,
    url: `/${slug}`,
  }
}

/**
 * Validates a push subscription object from the browser.
 */
function isValidSubscription(sub: unknown): sub is { endpoint: string; keys: { p256dh: string; auth: string } } {
  if (!sub || typeof sub !== 'object') return false
  const s = sub as Record<string, unknown>
  if (typeof s.endpoint !== 'string' || !s.endpoint) return false
  const keys = s.keys as Record<string, unknown> | undefined
  if (!keys) return false
  if (typeof keys.p256dh !== 'string' || !keys.p256dh) return false
  if (typeof keys.auth !== 'string' || !keys.auth) return false
  return true
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('Swipe gesture → action mapping', () => {
  test('right swipe past threshold triggers notify', () => {
    expect(resolveSwipeAction(90)).toBe('notify')
  })

  test('right swipe exactly at threshold resets (strict greater-than)', () => {
    expect(resolveSwipeAction(80)).toBe('reset')
  })

  test('left swipe past threshold reveals delete zone', () => {
    expect(resolveSwipeAction(-90)).toBe('delete-sticky')
  })

  test('small right swipe resets', () => {
    expect(resolveSwipeAction(40)).toBe('reset')
  })

  test('small left swipe resets', () => {
    expect(resolveSwipeAction(-40)).toBe('reset')
  })

  test('zero swipe resets', () => {
    expect(resolveSwipeAction(0)).toBe('reset')
  })
})

describe('Notify PATCH body', () => {
  test('buildNotifyPatch(true) returns notify: true', () => {
    expect(buildNotifyPatch(true)).toEqual({ notify: true })
  })

  test('buildNotifyPatch(false) returns notify: false', () => {
    expect(buildNotifyPatch(false)).toEqual({ notify: false })
  })
})

describe('Push send condition', () => {
  test('sends push when discount text present', () => {
    expect(shouldSendPush('-50 %')).toBe(true)
  })

  test('does not send push when no discount', () => {
    expect(shouldSendPush(null)).toBe(false)
  })

  test('does not send push when discount text is empty string', () => {
    expect(shouldSendPush('')).toBe(false)
  })

  test('does not send push when discount text undefined', () => {
    expect(shouldSendPush(undefined)).toBe(false)
  })
})

describe('Push payload builder', () => {
  test('builds correct payload', () => {
    const payload = buildPushPayload('God of War Ragnarök', 'paul', 'game-uuid-123')
    expect(payload).toEqual({
      title: 'God of War Ragnarök est en promo !',
      body: 'Promotion disponible sur PSN France',
      gameId: 'game-uuid-123',
      url: '/paul',
    })
  })

  test('URL uses slug as path', () => {
    const payload = buildPushPayload('Some Game', 'alice', 'id')
    expect(payload.url).toBe('/alice')
  })
})

describe('Push subscription validation', () => {
  test('valid subscription passes', () => {
    expect(isValidSubscription({
      endpoint: 'https://fcm.googleapis.com/fcm/send/abc',
      keys: { p256dh: 'BBBBB', auth: 'AAAAA' },
    })).toBe(true)
  })

  test('missing endpoint fails', () => {
    expect(isValidSubscription({ keys: { p256dh: 'B', auth: 'A' } })).toBe(false)
  })

  test('empty endpoint fails', () => {
    expect(isValidSubscription({ endpoint: '', keys: { p256dh: 'B', auth: 'A' } })).toBe(false)
  })

  test('missing keys fails', () => {
    expect(isValidSubscription({ endpoint: 'https://example.com' })).toBe(false)
  })

  test('missing p256dh fails', () => {
    expect(isValidSubscription({ endpoint: 'https://example.com', keys: { auth: 'A' } })).toBe(false)
  })

  test('null fails', () => {
    expect(isValidSubscription(null)).toBe(false)
  })

  test('string fails', () => {
    expect(isValidSubscription('not-an-object')).toBe(false)
  })
})
