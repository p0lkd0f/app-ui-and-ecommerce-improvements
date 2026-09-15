import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'

const PRODUCTS_QUERY = `#graphql
  query CommerceSummary($first: Int!) {
    products(first: $first) {
      nodes {
        id
        totalInventory
        variants(first: 1) { nodes { price { amount } } }
      }
    }
  }
`

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.json({ status: 'unauthorized', error: 'Authentication required' }, { status: 401 })
  const domain = process.env.SHOPIFY_STORE_DOMAIN?.replace(/^https?:\/\//, '').replace(/\/$/, '')
  const token = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN
  if (!domain || !token) return NextResponse.json({ source: 'shopify', status: 'not_configured', message: 'Connect Shopify Storefront to load live commerce data.' }, { status: 503 })

  try {
    const response = await fetch(`https://${domain}/api/2026-04/graphql.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Shopify-Storefront-Access-Token': token },
      body: JSON.stringify({ query: PRODUCTS_QUERY, variables: { first: 250 } }),
      cache: 'no-store',
    })
    if (!response.ok) return NextResponse.json({ source: 'shopify', status: 'error', message: 'Shopify returned an unavailable response.' }, { status: 502 })
    const payload = await response.json()
    if (payload.errors?.length) return NextResponse.json({ source: 'shopify', status: 'error', message: 'Shopify returned a catalog error.' }, { status: 502 })
    const products = payload.data.products.nodes as Array<{ id: string; totalInventory: number | null; variants: { nodes: Array<{ price?: { amount: string } }> } }>
    const inventory = products.reduce((sum, product) => sum + (product.totalInventory ?? 0), 0)
    const lowStock = products.filter((product) => (product.totalInventory ?? 0) > 0 && (product.totalInventory ?? 0) < 20).length
    const catalogValue = products.reduce((sum, product) => sum + Number(product.variants.nodes[0]?.price?.amount ?? 0) * (product.totalInventory ?? 0), 0)
    return NextResponse.json({ source: 'shopify', status: 'connected', syncedAt: new Date().toISOString(), capabilities: ['catalog_read', 'inventory_read'], metrics: { products: products.length, inventory, lowStock, catalogValue } }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ source: 'shopify', status: 'error', message: 'Unable to reach Shopify right now.' }, { status: 502 })
  }
}
