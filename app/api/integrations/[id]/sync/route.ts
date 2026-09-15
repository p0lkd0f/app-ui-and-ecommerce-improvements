import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { storeConnection } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  const { id } = await params
  const [connection] = await db.select().from(storeConnection).where(and(eq(storeConnection.id, id), eq(storeConnection.userId, session.user.id))).limit(1)
  if (!connection) return NextResponse.json({ error: 'Connection not found' }, { status: 404 })
  if (connection.status !== 'connected') return NextResponse.json({ error: 'Connection is not ready', code: 'CONNECTION_NOT_READY', status: connection.status }, { status: 409 })
  await db.update(storeConnection).set({ status: 'pending', lastError: null, updatedAt: new Date() }).where(and(eq(storeConnection.id, id), eq(storeConnection.userId, session.user.id)))
  return NextResponse.json({ id, provider: connection.provider, status: 'pending', mode: 'provider_sync_queue', message: 'Sync queued. Provider webhooks and cursor-based pulls will update this connection.' }, { status: 202 })
}
