import { NextResponse } from 'next/server'
import { getShopifyConnection, requireDashboardUser, shopifyAdmin } from '@/lib/commerce/shopify'

const INVENTORY_QUERY = `#graphql
 query Inventory($first: Int!, $after: String) {
   inventoryItems(first: $first, after: $after, sortKey: UPDATED_AT, reverse: true) {
     pageInfo { hasNextPage endCursor }
     nodes { id sku tracked inventoryLevels(first: 10) { nodes { available incoming unavailable warehouse { name } } } product { id title handle } }
   }
 }
`
type InventoryData = { inventoryItems: { pageInfo: { hasNextPage: boolean; endCursor: string | null }; nodes: Array<{ id: string; sku: string; tracked: boolean; inventoryLevels: { nodes: Array<{ available: number; incoming: number; unavailable: number; warehouse: { name: string } }> }; product: { id: string; title: string; handle: string } | null }> } }

export async function GET(request: Request) {
  try {
    await requireDashboardUser()
    const connection = getShopifyConnection()
    if (!connection?.adminToken) return NextResponse.json({ status: 'admin_not_connected', error: 'Shopify Admin API not connected' }, { status: 503 })
    const url = new URL(request.url)
    const first = Math.min(Math.max(Number(url.searchParams.get('limit') ?? 50) || 50, 1), 100)
    const after = url.searchParams.get('after') || null
    const lowStockOnly = url.searchParams.get('lowStock') === 'true'
    const data = await shopifyAdmin<InventoryData>(INVENTORY_QUERY, { first, after })
    let items = data.inventoryItems.nodes.filter((item) => item.product).map((item) => { const totalAvailable = item.inventoryLevels.nodes.reduce((sum, level) => sum + level.available, 0); return { id: item.id, sku: item.sku, tracked: item.tracked, product: item.product!.title, handle: item.product!.handle, totalAvailable, incoming: item.inventoryLevels.nodes.reduce((sum, level) => sum + level.incoming, 0), levels: item.inventoryLevels.nodes } })
    if (lowStockOnly) items = items.filter((item) => item.totalAvailable < 20)
    return NextResponse.json({ source: 'shopify_admin', status: 'connected', items, pagination: data.inventoryItems.pageInfo, syncedAt: new Date().toISOString() }, { headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' } })
  } catch (error) { const message = error instanceof Error ? error.message : 'Unable to fetch inventory'; const status = message.includes('Authentication') ? 401 : message.includes('not connected') ? 503 : 502; return NextResponse.json({ error: message }, { status }) }
}
