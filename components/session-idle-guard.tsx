'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'

const IDLE_TIMEOUT_MS = 30 * 60 * 1000
const ACTIVITY_THROTTLE_MS = 60 * 1000

export function SessionIdleGuard() {
  const router = useRouter()
  const pathname = usePathname()
  const lastActivity = useRef(Date.now())
  const lastSent = useRef(0)

  useEffect(() => {
    if (!pathname.startsWith('/dashboard')) return

    const markActive = () => {
      lastActivity.current = Date.now()
      if (Date.now() - lastSent.current > ACTIVITY_THROTTLE_MS) {
        lastSent.current = Date.now()
        void authClient.getSession()
      }
    }
    const events = ['pointerdown', 'keydown', 'scroll', 'touchstart'] as const
    events.forEach((event) => window.addEventListener(event, markActive, { passive: true }))
    const timer = window.setInterval(() => {
      if (Date.now() - lastActivity.current >= IDLE_TIMEOUT_MS) {
        void authClient.signOut().finally(() => router.replace('/sign-in?reason=timeout'))
      }
    }, 30_000)

    return () => {
      events.forEach((event) => window.removeEventListener(event, markActive))
      window.clearInterval(timer)
    }
  }, [pathname, router])

  return null
}
