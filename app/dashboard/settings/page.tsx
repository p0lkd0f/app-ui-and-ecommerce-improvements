import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import SettingsClient from './settings-client'

export default async function DashboardSettingsPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')
  return <SettingsClient user={{ name: session.user.name, email: session.user.email }} />
}
