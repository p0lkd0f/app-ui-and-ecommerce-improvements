import { headers } from 'next/headers'
import { auth } from '@/lib/auth'

export async function requireSession() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) {
    throw new Error('UNAUTHORIZED')
  }
  return session
}

export async function getSessionOrNull() {
  return auth.api.getSession({ headers: await headers() })
}
