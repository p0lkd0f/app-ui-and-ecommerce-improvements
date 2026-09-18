import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'AI Commerce Assistant',
  description: 'Ask Efoka to explain performance, find opportunities, and act on your commerce data.',
}

export default function AssistantLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children
}
