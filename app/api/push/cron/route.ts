import { NextRequest, NextResponse } from 'next/server'
import { getSql } from '@/lib/db'
import { sendPush } from '@/lib/push'
import type { PushSubscriptionRow } from '@/lib/types'

export const dynamic = 'force-dynamic'

// Called by Vercel Cron daily. Protected by CRON_SECRET.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const sql = getSql()

  // Fetch all games with notify=true that have a fr_product_id
  const gamesRaw = await sql`
    SELECT g.id, g.title, g.fr_product_id, u.slug
    FROM games g
    JOIN users u ON u.id = g.user_id
    WHERE g.notify = true
      AND g.fr_product_id IS NOT NULL
  `
  const games = gamesRaw as { id: string; title: string; fr_product_id: string; slug: string }[]

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://psn-tracker-chi.vercel.app'
  let sent = 0
  let errors = 0

  for (const game of games) {
    // Fetch current FR price
    let priceData: { discountText?: string | null } | null = null
    try {
      const res = await fetch(`${baseUrl}/api/prices?fr_id=${game.fr_product_id}`)
      if (res.ok) {
        const data = await res.json()
        priceData = data?.fr ?? null
      }
    } catch {
      errors++
      continue
    }

    if (!priceData?.discountText) continue // No promo, skip

    // Fetch subscriptions for this user
    const subsRaw = await sql`
      SELECT ps.endpoint, ps.p256dh, ps.auth
      FROM push_subscriptions ps
      JOIN users u ON u.id = ps.user_id
      JOIN games g ON g.user_id = u.id
      WHERE g.id = ${game.id}
    `
    const subs = subsRaw as PushSubscriptionRow[]

    for (const sub of subs) {
      const result = await sendPush(sub, {
        title: `${game.title} est en promo !`,
        body: `Promotion disponible sur PSN France`,
        gameId: game.id,
        url: `/${game.slug}`,
      }).catch(() => 'error' as const)

      if (result === 'gone') {
        // Subscription expired — clean it up
        await sql`DELETE FROM push_subscriptions WHERE endpoint = ${sub.endpoint}`
      } else if (result === 'sent') {
        sent++
      } else {
        errors++
      }
    }
  }

  return NextResponse.json({ ok: true, sent, errors })
}
