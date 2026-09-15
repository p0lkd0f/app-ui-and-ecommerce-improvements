import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  const url = new URL(request.url)
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit') ?? 25) || 25, 1), 100)
  const channel = url.searchParams.get('channel')
  const allowedChannels = ['whatsapp', 'instagram', 'store_chat']
  if (channel && !allowedChannels.includes(channel)) return NextResponse.json({ error: 'Unsupported channel filter' }, { status: 422 })
  return NextResponse.json({ conversations: [], pagination: { limit, nextCursor: null }, filters: { channel: channel ?? null }, metrics: { open: 0, waiting: 0, avgResponseMinutes: 0 }, channels: allowedChannels }, { headers: { 'Cache-Control': 'no-store' } })
}
