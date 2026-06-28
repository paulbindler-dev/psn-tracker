import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  const { data, error } = await supabase
    .from('games')
    .select('*')
    .order('added_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body?.title) {
    return NextResponse.json({ error: 'title required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('games')
    .insert({
      title: body.title,
      fr_product_id: body.fr_product_id ?? null,
      kr_product_id: body.kr_product_id ?? null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
