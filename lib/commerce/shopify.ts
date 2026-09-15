import { headers } from 'next/headers'
import { auth } from '@/lib/auth'

export type ShopifyConnection = { domain: string; storefrontToken: string; adminToken?: string }

export async function requireDashboardUser() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401, headers: { 'Content-Type': 'application/json' } })
  return session.user
}

export function getShopifyConnection(): ShopifyConnection | null {
  const domain = (process.env.SHOPIFY_STORE_DOMAIN ?? process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN)?.replace(/^https?:\/\//, '').replace(/\/$/, '')
  const storefrontToken = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN ?? process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN
  if (!domain || !storefrontToken) return null
  return { domain, storefrontToken, adminToken: process.env.SHOPIFY_ADMIN_ACCESS_TOKEN }
}

export async function shopifyStorefront<T>(query: string, variables: Record<string, unknown>, signal?: AbortSignal) {
  const connection = getShopifyConnection()
  if (!connection) throw new Error('Shopify Storefront API is not configured')
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000)
  if (signal) signal.addEventListener('abort', () => controller.abort(), { once: true })
  try {
    const response = await fetch(`https://${connection.domain}/api/2026-04/graphql.json`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Shopify-Storefront-Access-Token': connection.storefrontToken }, body: JSON.stringify({ query, variables }), cache: 'no-store', signal: controller.signal })
    const payload = await response.json().catch(() => null)
    if (!response.ok || payload?.errors?.length) throw new Error('Shopify Storefront API request failed')
    return payload.data as T
  } finally { clearTimeout(timeout) }
}

export async function shopifyAdmin<T>(query: string, variables: Record<string, unknown>, signal?: AbortSignal) {
  const connection = getShopifyConnection()
  if (!connection?.adminToken) throw new Error('Shopify Admin API access is not connected. Connect an Admin API token to read orders and fulfillment data.')
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 12000)
  if (signal) signal.addEventListener('abort', () => controller.abort(), { once: true })
  try {
    const response = await fetch(`https://${connection.domain}/admin/api/2026-04/graphql.json`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': connection.adminToken }, body: JSON.stringify({ query, variables }), cache: 'no-store', signal: controller.signal })
    const payload = await response.json().catch(() => null)
    if (!response.ok || payload?.errors?.length) throw new Error('Shopify Admin API request failed')
    return payload.data as T
  } finally { clearTimeout(timeout) }
}
