import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { storeConnection } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'

const actions = new Set(['update', 'delete', 'archive', 'publish'])

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const current = await auth.api.getSession({ headers: await headers() })
  if (!current?.user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  const { id } = await context.params
  const body = await request.json().catch(() => null) as { provider?: string; action?: string; title?: string; price?: number; inventory?: number } | null
  if (!body?.provider || !body.action || !actions.has(body.action)) return NextResponse.json({ error: 'provider and a supported action are required' }, { status: 400 })
  if (body.action === 'update' && (body.title !== undefined && (typeof body.title !== 'string' || body.title.trim().length === 0 || body.title.length > 255))) return NextResponse.json({ error: 'title is invalid' }, { status: 422 })
  if (body.price !== undefined && (!Number.isFinite(body.price) || body.price < 0)) return NextResponse.json({ error: 'price must be a non-negative number' }, { status: 422 })
  if (body.inventory !== undefined && (!Number.isInteger(body.inventory) || body.inventory < 0)) return NextResponse.json({ error: 'inventory must be a non-negative integer' }, { status: 422 })

  const [connection] = await db.select({ id: storeConnection.id, status: storeConnection.status, provider: storeConnection.provider }).from(storeConnection).where(and(eq(storeConnection.userId, current.user.id), eq(storeConnection.provider, body.provider))).limit(1)
  if (!connection) return NextResponse.json({ error: 'No owned connection exists for this provider' }, { status: 404 })
  if (connection.status !== 'connected') return NextResponse.json({ error: 'Provider connection must be healthy before mutating products' }, { status: 409 })

  return NextResponse.json({ error: 'Product mutations require a provider Admin API connection. The current Storefront connection is read-only.', provider: connection.provider, productId: id, supportedActions: ['read'] }, { status: 501 })
}
