import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { getProviderCapability } from '@/lib/commerce/providers'

export async function GET(_: Request, { params }: { params: Promise<{ provider: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  const { provider } = await params
  const capability = getProviderCapability(provider as never)
  if (!capability) return NextResponse.json({ error: 'Unsupported provider' }, { status: 404 })
  return NextResponse.json({ provider, status: 'setup_required', verification: 'signature_required', topics: capability.webhookTopics, message: 'Configure the provider webhook target and signing secret before accepting events.' })
}
