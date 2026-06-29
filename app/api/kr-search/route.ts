import { NextRequest, NextResponse } from 'next/server'
import { searchPSN } from '@/lib/psn-scraper'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

export async function GET(req: NextRequest) {
  const title = req.nextUrl.searchParams.get('title')
  if (!title) {
    return NextResponse.json({ error: 'title required' }, { status: 400, headers: CORS })
  }

  const products = await searchPSN('ko-kr', title)

  return NextResponse.json({ products }, { headers: CORS })
}
