import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import './globals.css'
import { ConsentAnalytics } from '@/components/consent-analytics'
import { SessionIdleGuard } from '@/components/session-idle-guard'

export const metadata: Metadata = {
  title: 'Efoka.ma — Commerce operations, connected',
  description: 'Efoka.ma connects your store, sales conversations and commerce operations in one live workspace.',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
        <SessionIdleGuard />
        <ConsentAnalytics />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
