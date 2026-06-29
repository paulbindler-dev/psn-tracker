import { NextRequest, NextResponse } from 'next/server'
import { getSql } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body?.endpoint) {
    return NextResponse.json({ error: 'endpoint required' }, { status: 400 })
  }

  const sql = getSql()
  await sql`DELETE FROM push_subscriptions WHERE endpoint = ${body.endpoint}`

  return NextResponse.json({ ok: true })
}
