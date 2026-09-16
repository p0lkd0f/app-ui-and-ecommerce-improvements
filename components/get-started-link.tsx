'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Loader2 } from 'lucide-react'
import { useSession } from '@/lib/auth-client'

export function GetStartedLink({ className = '', children = 'Get started' }: { className?: string; children?: React.ReactNode }) {
  const { data: session, isPending } = useSession()
  const [href, setHref] = useState('/sign-in')

  useEffect(() => {
    if (!isPending) setHref(session?.user ? '/dashboard' : '/sign-in')
  }, [isPending, session?.user])

  if (isPending) {
    return <span className={`${className} inline-flex items-center justify-center`} aria-live="polite"><Loader2 size={15} className="animate-spin" aria-label="Checking session" /></span>
  }

  return <Link href={href} className={`${className} relative z-30 inline-flex items-center`} aria-label={href === '/dashboard' ? 'Open dashboard' : 'Get started'}>{children}<ArrowRight size={15} aria-hidden="true" /></Link>
}
