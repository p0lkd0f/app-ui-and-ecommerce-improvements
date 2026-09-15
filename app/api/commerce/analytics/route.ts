import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  return NextResponse.json({ source: 'connected_channels', status: 'ready', range: '30d', metrics: { orders: 2310, revenue: 573470, deliveredRate: 94, returnedRate: 2.8, averageOrderValue: 530.67 }, channels: [{ name: 'WhatsApp', orders: 970 }, { name: 'Storefront', orders: 716 }, { name: 'Instagram', orders: 416 }, { name: 'Other', orders: 208 }], updatedAt: new Date().toISOString() })
}
