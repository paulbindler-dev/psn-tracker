import { NextRequest, NextResponse } from 'next/server'
import { getOrCreateUser, updateUserCurrency } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const user = await getOrCreateUser(params.slug)
    return NextResponse.json(user)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const body = await req.json().catch(() => null)
    const currency = body?.currency
    if (currency !== 'EUR' && currency !== 'KRW') {
      return NextResponse.json({ error: 'currency must be EUR or KRW' }, { status: 400 })
    }
    await updateUserCurrency(params.slug, currency)
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
