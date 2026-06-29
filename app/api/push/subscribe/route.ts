import { NextRequest, NextResponse } from 'next/server'
import { getSql } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug')
  if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 })

  const body = await req.json().catch(() => null)
  if (!body?.endpoint || !body?.keys?.p256dh || !body?.keys?.auth) {
    return NextResponse.json({ error: 'invalid subscription' }, { status: 400 })
  }

  const { endpoint, keys } = body
  const sql = getSql()

  // Get user_id from slug
  const users = await sql`SELECT id FROM users WHERE slug = ${slug} LIMIT 1`
  if ((users as unknown[]).length === 0) {
    return NextResponse.json({ error: 'user not found' }, { status: 404 })
  }
  const userId = (users as { id: string }[])[0].id

  await sql`
    INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
    VALUES (${userId}, ${endpoint}, ${keys.p256dh}, ${keys.auth})
    ON CONFLICT (endpoint) DO UPDATE SET p256dh = ${keys.p256dh}, auth = ${keys.auth}
  `

  return NextResponse.json({ ok: true })
}
