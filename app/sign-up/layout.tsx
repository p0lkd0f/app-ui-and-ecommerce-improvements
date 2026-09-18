import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Create your workspace',
  description: 'Create an Efoka workspace to connect stores, conversations, and commerce operations.',
}

export default function SignUpLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children
}
