import { NextResponse } from 'next/server'
import { getShopifyConnection, requireDashboardUser, shopifyAdmin } from '@/lib/commerce/shopify'

const ORDERS_QUERY = `#graphql
 query Orders($first: Int!, $after: String, $query: String) {
   orders(first: $first, after: $after, query: $query, sortKey: CREATED_AT, reverse: true) {
     pageInfo { hasNextPage endCursor }
     nodes { id name createdAt displayFinancialStatus displayFulfillmentStatus totalPriceSet { shopMoney { amount currencyCode } } customer { displayName email } shippingAddress { city countryCode } fulfillments { trackingInfo { number url } } }
   }
 }
`
type OrderData = { orders: { pageInfo: { hasNextPage: boolean; endCursor: string | null }; nodes: Array<{ id: string; name: string; createdAt: string; displayFinancialStatus: string | null; displayFulfillmentStatus: string | null; totalPriceSet: { shopMoney: { amount: string; currencyCode: string } }; customer: { displayName: string; email: string } | null; shippingAddress: { city: string | null; countryCode: string | null } | null; fulfillments: Array<{ trackingInfo: Array<{ number: string | null; url: string | null }> }> }> } }

export async function GET(request: Request) {
  try {
    await requireDashboardUser()
    const connection = getShopifyConnection()
    if (!connection?.adminToken) return NextResponse.json({ status: 'admin_not_connected', error: 'Connect Shopify Admin API access to read live orders and shipments.', requiredCapability: 'orders_read' }, { status: 503 })
    const url = new URL(request.url)
    const first = Math.min(Math.max(Number(url.searchParams.get('limit') ?? 25) || 25, 1), 100)
    const after = url.searchParams.get('after') || null
    const query = url.searchParams.get('query')?.slice(0, 200) || null
    const data = await shopifyAdmin<OrderData>(ORDERS_QUERY, { first, after, query })
    const orders = data.orders.nodes.map((order) => ({ id: order.id, number: order.name, createdAt: order.createdAt, financialStatus: order.displayFinancialStatus, fulfillmentStatus: order.displayFulfillmentStatus, customer: order.customer?.displayName || 'Guest', email: order.customer?.email || null, total: Number(order.totalPriceSet.shopMoney.amount), currency: order.totalPriceSet.shopMoney.currencyCode, city: order.shippingAddress?.city || null, country: order.shippingAddress?.countryCode || null, tracking: order.fulfillments.flatMap((fulfillment) => fulfillment.trackingInfo) }))
    return NextResponse.json({ source: 'shopify_admin', status: 'connected', orders, pagination: data.orders.pageInfo, syncedAt: new Date().toISOString() }, { headers: { 'Cache-Control': 'private, max-age=15, stale-while-revalidate=60' } })
  } catch (error) { const message = error instanceof Error ? error.message : 'Unable to fetch live orders'; const status = message.includes('Authentication') ? 401 : message.includes('not connected') ? 503 : 502; return NextResponse.json({ error: message }, { status }) }
}
