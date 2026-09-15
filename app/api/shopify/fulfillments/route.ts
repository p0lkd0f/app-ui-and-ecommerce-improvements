import { NextResponse } from 'next/server'
import { getShopifyConnection, requireDashboardUser, shopifyAdmin } from '@/lib/commerce/shopify'

const FULFILLMENTS_QUERY = `#graphql
 query Fulfillments($first: Int!, $after: String) {
   fulfillmentOrders(first: $first, after: $after, query: "status:OPEN OR status:SCHEDULED OR status:IN_PROGRESS", sortKey: UPDATED_AT, reverse: true) {
     pageInfo { hasNextPage endCursor }
     nodes { id status createdAt requestStatus fulfillAt destination { address1 city countryCode firstName lastName } lineItems(first: 10) { nodes { id quantity sku lineItem { id title variantTitle } } } assignedLocation { location { name } } }
   }
 }
`
type FulfillmentData = { fulfillmentOrders: { pageInfo: { hasNextPage: boolean; endCursor: string | null }; nodes: Array<{ id: string; status: string; createdAt: string; requestStatus: string; fulfillAt: string | null; destination: { address1: string; city: string; countryCode: string; firstName: string; lastName: string }; lineItems: { nodes: Array<{ id: string; quantity: number; sku: string | null; lineItem: { id: string; title: string; variantTitle: string | null } }> }; assignedLocation: { location: { name: string } } }> } }

export async function GET(request: Request) {
  try {
    await requireDashboardUser()
    const connection = getShopifyConnection()
    if (!connection?.adminToken) return NextResponse.json({ status: 'admin_not_connected', error: 'Connect Shopify Admin API to view fulfillments.', requiredCapability: 'fulfillments_read' }, { status: 503 })
    const url = new URL(request.url)
    const first = Math.min(Math.max(Number(url.searchParams.get('limit') ?? 20) || 20, 1), 100)
    const after = url.searchParams.get('after') || null
    const data = await shopifyAdmin<FulfillmentData>(FULFILLMENTS_QUERY, { first, after })
    const fulfillments = data.fulfillmentOrders.nodes.map((fo) => ({ id: fo.id, status: fo.status, requestStatus: fo.requestStatus, createdAt: fo.createdAt, fulfillAt: fo.fulfillAt, location: fo.assignedLocation.location.name, destination: { address: fo.destination.address1, city: fo.destination.city, country: fo.destination.countryCode, name: `${fo.destination.firstName} ${fo.destination.lastName}` }, items: fo.lineItems.nodes.map((item) => ({ id: item.id, title: item.lineItem.title, variant: item.lineItem.variantTitle, sku: item.sku, quantity: item.quantity })) }))
    return NextResponse.json({ source: 'shopify_admin', status: 'connected', fulfillments, pagination: data.fulfillmentOrders.pageInfo, syncedAt: new Date().toISOString() }, { headers: { 'Cache-Control': 'private, max-age=10, stale-while-revalidate=30' } })
  } catch (error) { const message = error instanceof Error ? error.message : 'Unable to fetch fulfillments'; const status = message.includes('Authentication') ? 401 : message.includes('not connected') ? 503 : 502; return NextResponse.json({ error: message }, { status }) }
}
