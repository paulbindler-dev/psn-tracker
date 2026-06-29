import { NextRequest, NextResponse } from 'next/server'
import { getSql } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const slug = req.nextUrl.searchParams.get('slug')
  if (!slug) {
    return NextResponse.json({ error: 'slug required' }, { status: 400 })
  }

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'body required' }, { status: 400 })

  const { kr_product_id, notify } = body
  const sql = getSql()
  try {
    // Build SET clause based on which fields were provided
    const hasKr = 'kr_product_id' in body
    const hasNotify = typeof notify === 'boolean'

    let rows: unknown[]
    if (hasNotify && !hasKr) {
      rows = await sql`
        UPDATE games g
        SET notify = ${notify}
        FROM users u
        WHERE g.id = ${params.id}
          AND g.user_id = u.id
          AND u.slug = ${slug}
        RETURNING g.id
      ` as unknown[]
    } else if (hasKr && !hasNotify) {
      rows = await sql`
        UPDATE games g
        SET kr_product_id = ${kr_product_id ?? null}
        FROM users u
        WHERE g.id = ${params.id}
          AND g.user_id = u.id
          AND u.slug = ${slug}
        RETURNING g.id
      ` as unknown[]
    } else {
      rows = await sql`
        UPDATE games g
        SET kr_product_id = ${kr_product_id ?? null},
            notify = ${notify ?? false}
        FROM users u
        WHERE g.id = ${params.id}
          AND g.user_id = u.id
          AND u.slug = ${slug}
        RETURNING g.id
      ` as unknown[]
    }
    if ((rows as unknown[]).length === 0) {
      return NextResponse.json({ error: 'not authorized or not found' }, { status: 403 })
    }
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const slug = req.nextUrl.searchParams.get('slug')
  if (!slug) {
    return NextResponse.json({ error: 'slug required' }, { status: 400 })
  }

  const sql = getSql()
  try {
    const rows = await sql`
      DELETE FROM games g
      USING users u
      WHERE g.id = ${params.id}
        AND g.user_id = u.id
        AND u.slug = ${slug}
      RETURNING g.id
    `
    if ((rows as unknown[]).length === 0) {
      return NextResponse.json({ error: 'not authorized or not found' }, { status: 403 })
    }
    return new NextResponse(null, { status: 204 })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
