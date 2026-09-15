import { NextResponse } from 'next/server'
import { PROVIDER_CAPABILITIES } from '@/lib/commerce/providers'

const providers = [
  { id: 'cmi', name: 'CMI Maroc', region: 'Morocco', mode: 'redirect', configured: false },
  { id: 'payzone', name: 'Payzone', region: 'Morocco', mode: 'hosted', configured: false },
  { id: 'naps', name: 'NAPS', region: 'Morocco', mode: 'hosted', configured: false },
  { id: 'stripe', name: 'Stripe', region: 'International', mode: 'checkout', configured: Boolean(process.env.STRIPE_SECRET_KEY) },
] as const

export function GET() {
  return NextResponse.json({
    providers,
    commerceProviders: PROVIDER_CAPABILITIES.map(({ provider, label, capabilities, webhookTopics, analyticsEvents }) => ({ provider, label, capabilities, webhookTopics, analyticsEvents })),
    message: 'Payment and commerce providers are shown by capability. Store credentials are never returned to the browser.',
  }, { headers: { 'Cache-Control': 'private, max-age=60' } })
}
