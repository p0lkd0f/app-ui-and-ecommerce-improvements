import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in to your Efoka commerce operations workspace.',
}

export default function SignInLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children
}
