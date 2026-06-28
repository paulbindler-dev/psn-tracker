import { NextRequest, NextResponse } from 'next/server'
import { getSql } from '@/lib/db'

export const dynamic = 'force-dynamic'

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
