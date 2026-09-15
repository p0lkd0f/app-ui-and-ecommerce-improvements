import { NextResponse } from 'next/server'
import { PROVIDER_REGISTRY } from '@/lib/integrations/registry'

export async function GET() {
  return NextResponse.json({ providers: PROVIDER_REGISTRY.map((provider) => ({ ...provider, connectionModes: provider.setup === 'oauth' ? ['oauth', 'manual', 'webhook'] : [provider.setup, 'webhook'] })) }, { headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' } })
}
