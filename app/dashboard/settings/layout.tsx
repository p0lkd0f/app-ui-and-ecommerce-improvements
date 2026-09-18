import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Settings',
  description: 'Manage your Efoka profile, workspace preferences, notifications, integrations, and security.',
}

export default function SettingsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children
}
