import { NextRequest, NextResponse } from 'next/server'
import { getSql } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug')
  if (!slug) {
    return NextResponse.json({ error: 'slug required' }, { status: 400 })
  }

  const sql = getSql()
  try {
    const rows = await sql`
      SELECT g.* FROM games g
      JOIN users u ON g.user_id = u.id
      WHERE u.slug = ${slug}
      ORDER BY g.added_at DESC
    `
    return NextResponse.json(rows)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug')
  if (!slug) {
    return NextResponse.json({ error: 'slug required' }, { status: 400 })
  }

  const body = await req.json().catch(() => null)
  if (!body?.title) {
    return NextResponse.json({ error: 'title required' }, { status: 400 })
  }

  const { title, fr_product_id, kr_product_id } = body
  const fr_id = fr_product_id ?? null
  const kr_id = kr_product_id ?? null

  const sql = getSql()
  try {
    const rows = await sql`
      INSERT INTO games (title, fr_product_id, kr_product_id, user_id)
      SELECT ${title}, ${fr_id}, ${kr_id}, id
      FROM users
      WHERE slug = ${slug}
      RETURNING *
    `
    if ((rows as unknown[]).length === 0) {
      return NextResponse.json({ error: 'user not found' }, { status: 404 })
    }
    return NextResponse.json((rows as unknown[])[0], { status: 201 })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
