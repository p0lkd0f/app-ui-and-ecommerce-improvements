import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { storeConnection } from '@/lib/db/schema'
import { desc, eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  const connections = await db.select({ id: storeConnection.id, provider: storeConnection.provider, workspaceName: storeConnection.workspaceName, status: storeConnection.status, lastSyncedAt: storeConnection.lastSyncedAt, lastError: storeConnection.lastError }).from(storeConnection).where(eq(storeConnection.userId, session.user.id)).orderBy(desc(storeConnection.updatedAt))
  return NextResponse.json({ connections, supported: ['shopify', 'woocommerce', 'prestashop', 'meta', 'whatsapp', 'instagram'] })
}
