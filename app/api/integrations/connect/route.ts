import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { randomUUID } from 'node:crypto'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { storeConnection } from '@/lib/db/schema'
import { desc, eq } from 'drizzle-orm'

const supportedProviders = new Set(['shopify', 'woocommerce', 'prestashop', 'meta', 'facebook_marketplace', 'instagram_shops', 'tiktok_shop', 'whatsapp', 'cod', 'carriers', 'stripe'])

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  const connections = await db.select({ id: storeConnection.id, provider: storeConnection.provider, status: storeConnection.status, storeUrl: storeConnection.storeUrl, lastSyncedAt: storeConnection.lastSyncedAt, lastError: storeConnection.lastError, updatedAt: storeConnection.updatedAt }).from(storeConnection).where(eq(storeConnection.userId, session.user.id)).orderBy(desc(storeConnection.updatedAt))
  return NextResponse.json({ connections })
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  if (!request.headers.get('content-type')?.includes('application/json')) return NextResponse.json({ error: 'JSON content type required' }, { status: 415 })
  const body = await request.json().catch(() => null) as { provider?: string; storeUrl?: string; workspaceName?: string } | null
  if (!body?.provider || !supportedProviders.has(body.provider) || !body.storeUrl?.trim() || !body.workspaceName?.trim() || body.storeUrl.length > 2048 || body.workspaceName.length > 120) {
    return NextResponse.json({ error: 'provider, storeUrl, and workspaceName are required' }, { status: 400 })
  }

  let storeUrl: URL
  try {
    storeUrl = new URL(body.storeUrl.trim())
    if (!['http:', 'https:'].includes(storeUrl.protocol)) throw new Error('invalid protocol')
  } catch {
    return NextResponse.json({ error: 'Enter a valid http or https store URL' }, { status: 400 })
  }

  const providerConfig = {
    shopify: { clientId: process.env.SHOPIFY_CLIENT_ID, callback: '/api/integrations/shopify/callback', setup: 'oauth_or_storefront_token' },
    woocommerce: { clientId: process.env.WOOCOMMERCE_CLIENT_ID, callback: '/api/integrations/woocommerce/callback', setup: 'oauth_or_api_key' },
    prestashop: { clientId: process.env.PRESTASHOP_APP_ID, callback: '/api/integrations/prestashop/callback', setup: 'api_key' },
    meta: { clientId: process.env.META_APP_ID, callback: '/api/integrations/meta/callback', setup: 'oauth' },
    facebook_marketplace: { clientId: process.env.META_APP_ID, callback: '/api/integrations/facebook_marketplace/callback', setup: 'oauth' },
    instagram_shops: { clientId: process.env.META_APP_ID, callback: '/api/integrations/instagram_shops/callback', setup: 'oauth' },
    tiktok_shop: { clientId: process.env.TIKTOK_APP_ID, callback: '/api/integrations/tiktok_shop/callback', setup: 'oauth' },
    whatsapp: { clientId: process.env.META_APP_ID, callback: '/api/integrations/whatsapp/callback', setup: 'oauth' },
  }[body.provider as 'shopify' | 'woocommerce' | 'prestashop' | 'meta' | 'facebook_marketplace' | 'instagram_shops' | 'tiktok_shop' | 'whatsapp']

  const id = randomUUID()
  await db.insert(storeConnection).values({
    id,
    userId: session.user.id,
    provider: body.provider,
    workspaceName: body.workspaceName.trim().slice(0, 120),
    storeUrl: storeUrl.origin,
    status: 'pending',
  })

  if (body.provider === 'shopify' && process.env.SHOPIFY_STORE_DOMAIN && process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN) {
    const configuredDomain = process.env.SHOPIFY_STORE_DOMAIN.replace(/^https?:\/\//, '').replace(/\/$/, '').toLowerCase()
    const requestedDomain = storeUrl.hostname.toLowerCase()
    const matchesConfiguredStore = requestedDomain === configuredDomain || requestedDomain === `www.${configuredDomain}` || `www.${requestedDomain}` === configuredDomain
    if (!matchesConfiguredStore) {
      await db.update(storeConnection).set({ status: 'error', lastError: `Configured credentials are scoped to ${configuredDomain}; submitted host was ${requestedDomain}`, updatedAt: new Date() }).where(eq(storeConnection.id, id))
      return NextResponse.json({ id, status: 'error', code: 'STORE_DOMAIN_MISMATCH', error: 'The configured Shopify token belongs to a different store. Update SHOPIFY_STORE_DOMAIN and its token together for this deployment.' }, { status: 422 })
    }
    const endpoint = `https://${configuredDomain}/api/2026-04/graphql.json`
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)
    const health = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Shopify-Storefront-Access-Token': process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN }, body: JSON.stringify({ query: '{ shop { name } }' }), cache: 'no-store', signal: controller.signal }).then(async (response) => ({ ok: response.ok, data: await response.json().catch(() => null) })).catch(() => ({ ok: false, data: null })).finally(() => clearTimeout(timeout))
    if (health.ok && !health.data?.errors) {
      await db.update(storeConnection).set({ status: 'connected', updatedAt: new Date() }).where(eq(storeConnection.id, id))
      return NextResponse.json({ id, status: 'connected', provider: body.provider, verifiedShop: health.data?.data?.shop?.name ?? null, capabilities: ['catalog_read', 'inventory_read', 'product_sync'], authorization: 'storefront_token' })
    }
    await db.update(storeConnection).set({ status: 'error', lastError: 'Provider health check failed', updatedAt: new Date() }).where(eq(storeConnection.id, id))
    return NextResponse.json({ id, status: 'error', error: 'The configured Shopify credentials could not verify this store. Check the domain and Storefront access token.' }, { status: 502 })
  }

  if (!providerConfig?.clientId) {
    await db.update(storeConnection).set({ status: 'setup_required', lastError: `${body.provider} authorization is not configured for this deployment`, updatedAt: new Date() }).where(eq(storeConnection.id, id))
    return NextResponse.json({ id, status: 'setup_required', error: `${body.provider} authorization is not configured for this deployment` }, { status: 503 })
  }

  return NextResponse.json({ id, status: 'pending', provider: body.provider, callback: providerConfig.callback, message: 'OAuth is not configured for this provider in the current deployment; no connection is claimed.' }, { status: 202 })
}
