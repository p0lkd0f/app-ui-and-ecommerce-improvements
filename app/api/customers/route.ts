import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  const url = new URL(request.url)
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit') ?? 25) || 25, 1), 100)
  const query = (url.searchParams.get('q') ?? '').trim().slice(0, 120)
  return NextResponse.json({ customers: [], pagination: { limit, nextCursor: null }, filters: { query }, segments: [], metrics: { total: 0, repeatRate: 0, lifetimeValue: 0 } }, { headers: { 'Cache-Control': 'no-store' } })
}
