'use client'

import { MouseEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import { useSession } from '@/lib/auth-client'

export function GetStartedLink({ className = '', children = 'Get started' }: { className?: string; children?: React.ReactNode }) {
  const router = useRouter()
  const { data: session } = useSession()

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (!session?.user) return
    event.preventDefault()
    router.push('/dashboard')
  }

  return <Link href="/sign-in" onClick={handleClick} className={`${className} relative z-30 inline-flex items-center`} aria-label={session?.user ? 'Open dashboard' : 'Get started'}>{children}<ArrowRight size={15} aria-hidden="true" /></Link>
}
