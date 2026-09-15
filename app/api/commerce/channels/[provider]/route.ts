import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { getProviderCapability } from '@/lib/commerce/providers'

export async function GET(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  const { provider } = await params
  const capability = getProviderCapability(provider as never)
  if (!capability) return NextResponse.json({ error: 'Unsupported provider', provider }, { status: 404 })
  const url = new URL(request.url)
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit') ?? 25) || 25, 1), 100)
  const cursor = url.searchParams.get('cursor')
  return NextResponse.json({ provider, account: { status: 'connection_required', ownerId: session.user.id }, capabilities: capability, products: [], orders: [], inventory: [], pagination: { limit, cursor, nextCursor: null }, message: 'Connect this channel with OAuth or provider credentials to load live records.' }, { headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=120' } })
}
