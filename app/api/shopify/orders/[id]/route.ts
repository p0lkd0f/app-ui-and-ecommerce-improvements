import { NextResponse } from 'next/server'
import { getShopifyConnection, requireDashboardUser, shopifyAdmin } from '@/lib/commerce/shopify'

const ORDER_DETAIL_QUERY = `#graphql
 query OrderDetail($id: ID!) {
   order(id: $id) { id name createdAt displayFinancialStatus displayFulfillmentStatus totalPriceSet { shopMoney { amount currencyCode } } customer { displayName email phone } shippingAddress { address1 address2 city province country zip } lineItems(first: 100) { nodes { id quantity sku lineItemTitle variantSku variant { displayName sku } } } fulfillments { status trackingInfo { number url } createdAt } discountApplications(first: 10) { nodes { title allocationMethod value { ... on PricingValue { percentage } ... on MoneyV2 { amount currencyCode } } } } }
 }
`
type OrderDetail = { order: { id: string; name: string; createdAt: string; displayFinancialStatus: string | null; displayFulfillmentStatus: string | null; totalPriceSet: { shopMoney: { amount: string; currencyCode: string } }; customer: { displayName: string; email: string; phone: string | null } | null; shippingAddress: any; lineItems: { nodes: Array<{ id: string; quantity: number; sku: string | null; lineItemTitle: string; variantSku: string | null; variant: { displayName: string; sku: string } }> }; fulfillments: Array<{ status: string; trackingInfo: Array<{ number: string | null; url: string | null }>; createdAt: string }>; discountApplications: { nodes: Array<any> } } }

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireDashboardUser()
    const connection = getShopifyConnection()
    if (!connection?.adminToken) return NextResponse.json({ error: 'Shopify Admin API not connected' }, { status: 503 })
    const { id } = await params
    const data = await shopifyAdmin<OrderDetail>(ORDER_DETAIL_QUERY, { id: `gid://shopify/Order/${id}` })
    const order = data.order
    return NextResponse.json({ order: { id: order.id, name: order.name, createdAt: order.createdAt, financialStatus: order.displayFinancialStatus, fulfillmentStatus: order.displayFulfillmentStatus, total: order.totalPriceSet.shopMoney.amount, currency: order.totalPriceSet.shopMoney.currencyCode, customer: order.customer, address: order.shippingAddress, items: order.lineItems.nodes, fulfillments: order.fulfillments, discounts: order.discountApplications.nodes }, syncedAt: new Date().toISOString() }, { headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=120' } })
  } catch (error) { const message = error instanceof Error ? error.message : 'Unable to fetch order'; const status = message.includes('Authentication') ? 401 : message.includes('not connected') ? 503 : 502; return NextResponse.json({ error: message }, { status }) }
}
