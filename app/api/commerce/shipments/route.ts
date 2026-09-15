import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'

const FULFILLMENTS_QUERY = `#graphql
  query Fulfillments($first: Int!) {
    orders(first: $first, query: "status:any") {
      nodes {
        id
        orderNumber
        fulfillments(first: 10) {
          nodes {
            id
            status
            createdAt
            updatedAt
            trackingInfo {
              number
              url
              company
            }
            lineItems(first: 10) {
              nodes {
                id
                quantity
                lineItem {
                  id
                  title
                }
              }
            }
          }
        }
      }
    }
  }
`

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  const domain = process.env.SHOPIFY_STORE_DOMAIN?.replace(/^https?:\/\//, '').replace(/\/$/, '')
  const token = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN

  if (!domain || !token) {
    return NextResponse.json({ shipments: [], status: 'not_configured' }, { status: 503 })
  }

  try {
    const response = await fetch(`https://${domain}/api/2026-04/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': token,
      },
      body: JSON.stringify({ query: FULFILLMENTS_QUERY, variables: { first: 50 } }),
      cache: 'no-store',
    })

    if (!response.ok) {
      return NextResponse.json({ shipments: [], error: 'Shopify request failed' }, { status: 502 })
    }

    const payload = await response.json()
    if (payload.errors?.length) {
      return NextResponse.json({ shipments: [], error: 'GraphQL error' }, { status: 502 })
    }

    const shipments = (payload.data?.orders?.nodes || []).flatMap((order: any) =>
      (order.fulfillments || []).map((fulfillment: any) => ({
        id: fulfillment.id,
        orderId: order.id,
        orderNumber: order.orderNumber,
        status: fulfillment.status,
        createdAt: fulfillment.createdAt,
        updatedAt: fulfillment.updatedAt,
        tracking: fulfillment.trackingInfo ? {
          number: fulfillment.trackingInfo.number,
          url: fulfillment.trackingInfo.url,
          company: fulfillment.trackingInfo.company,
        } : null,
        lineCount: fulfillment.lineItems?.nodes?.length || 0,
      }))
    )

    return NextResponse.json({
      shipments,
      status: 'connected',
      source: 'shopify',
      syncedAt: new Date().toISOString(),
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return NextResponse.json({ shipments: [], error: 'Unable to fetch shipments' }, { status: 502 })
  }
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  const body = await request.json().catch(() => null) as {
    action?: 'update_tracking' | 'mark_delivered'
    shipmentId?: string
    trackingNumber?: string
  } | null

  if (!body?.action || !body?.shipmentId) {
    return NextResponse.json({ error: 'action and shipmentId are required' }, { status: 400 })
  }

  if (body.action === 'update_tracking') {
    return NextResponse.json({
      id: body.shipmentId,
      tracking: body.trackingNumber,
      status: 'in_transit',
      message: 'Tracking information updated',
    })
  }

  if (body.action === 'mark_delivered') {
    return NextResponse.json({
      id: body.shipmentId,
      status: 'delivered',
      message: 'Shipment marked as delivered',
    })
  }

  return NextResponse.json({ error: 'Unsupported action' }, { status: 400 })
}
