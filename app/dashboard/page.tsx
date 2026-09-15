import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import DashboardClient from './dashboard-client'

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')
  return <DashboardClient user={{ name: session.user.name, email: session.user.email }} />
}
