import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import AssistantClient from './assistant-client'

export default async function AssistantPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')
  return <AssistantClient />
}
