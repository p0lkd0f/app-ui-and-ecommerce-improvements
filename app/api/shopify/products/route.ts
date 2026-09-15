import { NextResponse } from 'next/server'
import { getShopifyConnection, requireDashboardUser, shopifyStorefront } from '@/lib/commerce/shopify'

const PRODUCTS_QUERY = `#graphql
  query Products($first: Int!, $after: String) {
    shop { name primaryDomain { host url } }
    products(first: $first, after: $after, sortKey: UPDATED_AT, reverse: true) {
      pageInfo { hasNextPage endCursor }
      nodes { id title handle totalInventory featuredImage { url altText } variants(first: 1) { nodes { sku price { amount currencyCode } } } }
    }
  }
`
type ProductData = { shop: { name: string; primaryDomain: { host: string; url: string } | null }; products: { pageInfo: { hasNextPage: boolean; endCursor: string | null }; nodes: Array<{ id: string; title: string; handle: string; totalInventory: number | null; featuredImage: { url: string; altText: string | null } | null; variants: { nodes: Array<{ sku: string | null; price: { amount: string; currencyCode: string } }> } }> } }

export async function GET(request: Request) {
  try {
    await requireDashboardUser()
    const connection = getShopifyConnection()
    if (!connection) return NextResponse.json({ status: 'not_configured', error: 'Shopify Storefront API is not configured' }, { status: 503 })
    const url = new URL(request.url)
    const first = Math.min(Math.max(Number(url.searchParams.get('limit') ?? 50) || 50, 1), 100)
    const after = url.searchParams.get('after') || null
    const data = await shopifyStorefront<ProductData>(PRODUCTS_QUERY, { first, after })
    const products = data.products.nodes.map((product) => { const stock = product.totalInventory ?? 0; return { id: product.id, name: product.title, handle: product.handle, sku: product.variants.nodes[0]?.sku || product.handle, price: Number(product.variants.nodes[0]?.price.amount || 0), currency: product.variants.nodes[0]?.price.currencyCode || 'USD', stock, status: stock === 0 ? 'Sold out' : stock < 20 ? 'Low stock' : 'In stock', image: product.featuredImage?.url || null, alt: product.featuredImage?.altText || product.title, channel: 'Shopify' } })
    return NextResponse.json({ source: 'shopify', status: 'connected', store: data.shop, products, pagination: data.products.pageInfo, syncedAt: new Date().toISOString(), capabilities: ['catalog_read', 'inventory_read'] }, { headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=120' } })
  } catch (error) { const message = error instanceof Error ? error.message : 'Unable to fetch Shopify catalog'; const status = message.includes('Authentication') ? 401 : message.includes('not configured') ? 503 : 502; return NextResponse.json({ error: message }, { status }) }
}
