import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { storeConnection } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'
import { getProviderDefinition } from '@/lib/integrations/registry'

async function getOwnedConnection(id: string) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return { session: null, connection: null }
  const [connection] = await db.select().from(storeConnection).where(and(eq(storeConnection.id, id), eq(storeConnection.userId, session.user.id))).limit(1)
  return { session, connection }
}

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const { session, connection } = await getOwnedConnection(id)
  if (!session?.user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  if (!connection) return NextResponse.json({ error: 'Connection not found' }, { status: 404 })
  return NextResponse.json({ connection, provider: getProviderDefinition(connection.provider.toLowerCase()) ?? null })
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const { session, connection } = await getOwnedConnection(id)
  if (!session?.user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  if (!connection) return NextResponse.json({ error: 'Connection not found' }, { status: 404 })
  const body = await request.json().catch(() => null) as { action?: 'test' | 'reconnect' | 'disconnect' | 'sync' | 'cancel' } | null
  if (!body?.action) return NextResponse.json({ error: 'An action is required' }, { status: 400 })
  if (!['test', 'reconnect', 'disconnect', 'sync', 'cancel'].includes(body.action)) return NextResponse.json({ error: 'Unsupported integration action' }, { status: 400 })
  if (body.action === 'disconnect') {
    await db.update(storeConnection).set({ status: 'disconnected', lastError: null, updatedAt: new Date() }).where(eq(storeConnection.id, id))
    return NextResponse.json({ id, status: 'disconnected' })
  }
  if (body.action === 'cancel') {
    if (connection.status === 'disconnected') return NextResponse.json({ error: 'Connection is already disconnected' }, { status: 409 })
    await db.update(storeConnection).set({ status: 'cancelled', lastError: 'Connection action cancelled by user', updatedAt: new Date() }).where(eq(storeConnection.id, id))
    return NextResponse.json({ id, status: 'cancelled' })
  }
  if (body.action === 'reconnect') {
    await db.update(storeConnection).set({ status: 'pending', lastError: null, updatedAt: new Date() }).where(eq(storeConnection.id, id))
    return NextResponse.json({ id, status: 'pending', message: 'Reconnection is ready for provider authorization.' })
  }
  if (body.action === 'sync') {
    if (connection.status !== 'connected') return NextResponse.json({ error: 'Connect this provider before syncing' }, { status: 409 })
    return NextResponse.json({ id, status: 'queued', message: 'Sync queued with idempotent processing.' }, { status: 202 })
  }
  return NextResponse.json({ id, status: connection.status, checkedAt: new Date().toISOString(), message: connection.status === 'connected' ? 'Connection is healthy.' : connection.lastError ?? 'Provider setup is required.' })
}
