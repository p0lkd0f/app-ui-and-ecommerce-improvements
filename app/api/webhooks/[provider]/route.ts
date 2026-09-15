import { createHmac, timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { type CommerceProvider, getProviderCapability } from '@/lib/commerce/providers'
import { db } from '@/lib/db'
import { webhookEvent } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'

const signatureHeaders: Record<CommerceProvider, string> = {
  shopify: 'x-shopify-hmac-sha256',
  prestashop: 'x-prestashop-signature',
  woocommerce: 'x-wc-webhook-signature',
  meta: 'x-hub-signature-256',
  facebook_marketplace: 'x-hub-signature-256',
  instagram_shops: 'x-hub-signature-256',
  tiktok_shop: 'x-tts-signature',
  whatsapp: 'x-hub-signature-256',
  cod: 'x-cod-signature',
  carriers: 'x-carrier-signature',
  stripe: 'stripe-signature',
}

function validSignature(provider: CommerceProvider, body: string, signature: string | null) {
  const secret = process.env[`${provider.toUpperCase()}_WEBHOOK_SECRET`] ?? process.env.WEBHOOK_SIGNING_SECRET
  if (!secret || !signature) return false
  const digest = createHmac('sha256', secret).update(body).digest()
  const expected = provider === 'shopify' ? digest : Buffer.from(digest.toString('hex'), 'utf8')
  const received = Buffer.from(signature.replace(/^sha256=/, ''), provider === 'shopify' ? 'base64' : 'utf8')
  return expected.length === received.length && timingSafeEqual(expected, received)
}

export async function POST(request: Request, context: { params: Promise<{ provider: string }> }) {
  const { provider: rawProvider } = await context.params
  const provider = rawProvider as CommerceProvider
  if (!getProviderCapability(provider)) return NextResponse.json({ error: 'Unsupported provider' }, { status: 404 })

  const body = await request.text()
  if (body.length > 1_000_000) return NextResponse.json({ error: 'Webhook payload too large' }, { status: 413 })
  const requestHeaders = await headers()
  const signature = requestHeaders.get(signatureHeaders[provider])
  if (!validSignature(provider, body, signature)) return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 })

  let payload: Record<string, unknown>
  try { payload = JSON.parse(body) as Record<string, unknown> } catch { return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 }) }
  const eventId = requestHeaders.get('x-event-id') ?? requestHeaders.get('x-shopify-webhook-id') ?? crypto.randomUUID()
  const topic = requestHeaders.get('x-shopify-topic') ?? requestHeaders.get('x-event-type') ?? 'unknown'
  const existing = await db.select({ id: webhookEvent.id, status: webhookEvent.status }).from(webhookEvent).where(and(eq(webhookEvent.provider, provider), eq(webhookEvent.externalId, eventId))).limit(1)
  if (existing.some((event) => event.id === eventId)) return NextResponse.json({ accepted: true, duplicate: true, eventId })
  await db.insert(webhookEvent).values({ id: eventId, provider, externalId: eventId, payload: { topic, data: payload }, status: 'pending' }).onConflictDoNothing()
  return NextResponse.json({ accepted: true, duplicate: false, eventId, provider, topic, receivedAt: new Date().toISOString() })
}
