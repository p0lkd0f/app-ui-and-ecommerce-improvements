import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'

const FULFILLMENT_QUERY = `#graphql
  query Fulfillments($first: Int!) {
    orders(first: $first, query: "status:any") {
      nodes {
        id
        orderNumber
        fulfillmentOrders(first: 10) {
          nodes {
            id
            status
            createdAt
            assignedLocation {
              location {
                name
                address {
                  address1
                  city
                }
              }
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
            deliveryMethod {
              id
              methodType
              minDeliveryDate
              maxDeliveryDate
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
    return NextResponse.json({ fulfillments: [], status: 'not_configured' }, { status: 503 })
  }

  try {
    const response = await fetch(`https://${domain}/api/2026-04/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': token,
      },
      body: JSON.stringify({ query: FULFILLMENT_QUERY, variables: { first: 50 } }),
      cache: 'no-store',
    })

    if (!response.ok) {
      return NextResponse.json({ fulfillments: [], error: 'Shopify request failed' }, { status: 502 })
    }

    const payload = await response.json()
    if (payload.errors?.length) {
      return NextResponse.json({ fulfillments: [], error: 'GraphQL error' }, { status: 502 })
    }

    const fulfillments = (payload.data?.orders?.nodes || []).flatMap((order: any) =>
      (order.fulfillmentOrders || []).map((fo: any) => ({
        id: fo.id,
        orderId: order.id,
        orderNumber: order.orderNumber,
        status: fo.status,
        createdAt: fo.createdAt,
        location: fo.assignedLocation?.location?.name || 'Unknown',
        city: fo.assignedLocation?.location?.address?.city,
        lineCount: fo.lineItems?.nodes?.length || 0,
        deliveryWindow: fo.deliveryMethod ? {
          type: fo.deliveryMethod.methodType,
          minDate: fo.deliveryMethod.minDeliveryDate,
          maxDate: fo.deliveryMethod.maxDeliveryDate,
        } : null,
      }))
    )

    return NextResponse.json({
      fulfillments,
      status: 'connected',
      source: 'shopify',
      syncedAt: new Date().toISOString(),
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return NextResponse.json({ fulfillments: [], error: 'Unable to fetch fulfillments' }, { status: 502 })
  }
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  const body = await request.json().catch(() => null) as {
    action?: 'schedule_delivery' | 'cancel_fulfillment'
    fulfillmentOrderId?: string
    startDate?: string
  } | null

  if (!body?.action || !body?.fulfillmentOrderId) {
    return NextResponse.json({ error: 'action and fulfillmentOrderId are required' }, { status: 400 })
  }

  // This is a placeholder for fulfillment mutation logic
  // In production, you would authenticate with Shopify Admin API
  if (body.action === 'schedule_delivery') {
    return NextResponse.json({
      id: body.fulfillmentOrderId,
      status: 'scheduled',
      startDate: body.startDate,
      message: 'Delivery scheduled for the specified window',
    })
  }

  if (body.action === 'cancel_fulfillment') {
    return NextResponse.json({
      id: body.fulfillmentOrderId,
      status: 'cancelled',
      message: 'Fulfillment cancelled',
    })
  }

  return NextResponse.json({ error: 'Unsupported action' }, { status: 400 })
}
