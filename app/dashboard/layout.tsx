import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    default: 'Workspace | Efoka',
    template: '%s | Efoka',
  },
  description: 'Operate your connected commerce workspace from Efoka.',
}

export default function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children
}
