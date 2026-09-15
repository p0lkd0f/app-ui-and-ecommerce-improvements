import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { storeConnection } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'
import { getShopifyConnection, requireDashboardUser, shopifyAdmin } from '@/lib/commerce/shopify'

const STORE_QUERY = `#graphql
 query Store {
   shop { id name email myshopifyDomain primaryDomain { host url } plan { displayName } locations(first: 10) { nodes { id name legacyResourceId } } }
 }
`
type StoreData = { shop: { id: string; name: string; email: string; myshopifyDomain: string; primaryDomain: { host: string; url: string }; plan: { displayName: string }; locations: { nodes: Array<{ id: string; name: string; legacyResourceId: string | null }> } } }

export async function GET(request: Request) {
  try {
    const user = await requireDashboardUser()
    const connection = getShopifyConnection()
    if (!connection?.adminToken) return NextResponse.json({ status: 'admin_not_connected', error: 'Shopify Admin API not connected' }, { status: 503 })
    const data = await shopifyAdmin<StoreData>(STORE_QUERY, {})
    const shop = data.shop
    const storedConnection = await db.select().from(storeConnection).where(and(eq(storeConnection.provider, 'shopify'), eq(storeConnection.userId, user.id))).limit(1)
    if (storedConnection.length === 0) {
      await db.insert(storeConnection).values({ id: `conn_${Date.now()}`, userId: user.id, provider: 'shopify', workspaceName: shop.name, storeUrl: shop.primaryDomain.url, status: 'active', lastSyncedAt: new Date(), createdAt: new Date(), updatedAt: new Date() }).catch(() => null)
    } else {
      await db.update(storeConnection).set({ lastSyncedAt: new Date(), updatedAt: new Date() }).where(and(eq(storeConnection.provider, 'shopify'), eq(storeConnection.userId, user.id))).catch(() => null)
    }
    return NextResponse.json({ source: 'shopify_admin', status: 'connected', store: { id: shop.id, name: shop.name, email: shop.email, domain: shop.primaryDomain.host, plan: shop.plan.displayName, locations: shop.locations.nodes }, syncedAt: new Date().toISOString() }, { headers: { 'Cache-Control': 'private, max-age=300, stale-while-revalidate=600' } })
  } catch (error) { const message = error instanceof Error ? error.message : 'Unable to fetch store details'; const status = message.includes('Authentication') ? 401 : message.includes('not connected') ? 503 : 502; return NextResponse.json({ error: message }, { status }) }
}
