import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const rows = await sql`SELECT * FROM games ORDER BY added_at DESC`
    return NextResponse.json(rows)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body?.title) {
    return NextResponse.json({ error: 'title required' }, { status: 400 })
  }

  try {
    const rows = await sql`
      INSERT INTO games (title, fr_product_id, kr_product_id)
      VALUES (${body.title}, ${body.fr_product_id ?? null}, ${body.kr_product_id ?? null})
      RETURNING *
    `
    return NextResponse.json(rows[0], { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
