'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { EfokaBrand } from '@/components/efoka-brand'
import { ArrowRight, Loader2 } from 'lucide-react'
import { authClient } from '@/lib/auth-client'

export function AuthForm({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const [verificationSent, setVerificationSent] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const isSignUp = mode === 'sign-up'

  useEffect(() => {
    if (!resendCooldown) return
    const timer = window.setInterval(() => setResendCooldown((value) => Math.max(0, value - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [resendCooldown])

  async function resendVerification() {
    if (!email || resendCooldown > 0) return
    setPending(true)
    setError('')
    const result = await authClient.sendVerificationEmail({ email, callbackURL: `${window.location.origin}/dashboard` })
    setPending(false)
    if (result.error) {
      setError('We could not resend the email right now. Please wait a moment and try again.')
      return
    }
    setResendCooldown(60)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError('')
    const result = isSignUp
      ? await authClient.signUp.email({ name, email, password })
      : await authClient.signIn.email({ email, password })
    setPending(false)
    if (result.error) {
      setError('We could not complete that request. Check your details and try again.')
      return
    }
    if (isSignUp) {
      setVerificationSent(true)
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  async function continueWithGoogle() {
    setPending(true)
    setError('')
    const result = await authClient.signIn.social({
      provider: 'google',
      callbackURL: `${window.location.origin}/dashboard`,
    })
    if (result.error) {
      setPending(false)
      setError(result.error.code === 'PROVIDER_NOT_FOUND'
        ? 'Google sign-in is not configured for this deployment. Use email and password or configure a valid Google OAuth client.'
        : 'Google sign-in is not available right now. Try email and password.')
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#071e19] px-5 py-10 text-white"><div className="pointer-events-none absolute left-1/2 top-[-14rem] h-[34rem] w-[52rem] -translate-x-1/2 rounded-full bg-[#0d8279]/20 blur-[110px]" /><div className="pointer-events-none absolute bottom-[-12rem] right-[-8rem] h-[26rem] w-[26rem] rounded-full bg-[#c6f06e]/10 blur-[100px]" />
      <div className="relative z-10 w-full max-w-md">
        <Link href="/" className="mx-auto mb-10 flex w-fit" aria-label="EfoKa home"><EfokaBrand /></Link>
        <section className="rounded-[28px] border border-white/10 bg-[#102c26]/90 p-7 shadow-[0_28px_90px_rgba(0,0,0,.3)] backdrop-blur-xl sm:p-9">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#64d7ca]">Commerce operations</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.05em]">{isSignUp ? 'Create your workspace' : 'Welcome back'}</h1>
          <p className="mt-2 text-sm leading-6 text-white/55">{isSignUp ? 'Connect your first store and operate from one live workspace.' : 'Sign in to access your connected commerce workspace.'}</p>
          <button type="button" onClick={continueWithGoogle} disabled={pending} className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-medium transition hover:bg-white/10 disabled:opacity-50">{pending ? <Loader2 className="animate-spin" size={16} /> : <span className="font-bold">G</span>} Continue with Google</button>
          <div className="my-6 flex items-center gap-3 text-[11px] text-white/35"><span className="h-px flex-1 bg-white/10" />OR CONTINUE WITH EMAIL<span className="h-px flex-1 bg-white/10" /></div>
          {verificationSent ? <div role="status" className="mt-7 rounded-2xl border border-[#9be5c0]/20 bg-[#9be5c0]/10 p-5 text-sm leading-6 text-[#d5ffe3]"><p className="font-semibold">Check your inbox</p><p className="mt-1 text-white/65">We sent a confirmation link to {email}. Open it to activate your live commerce workspace. If it does not arrive, check spam and confirm your verified Resend sender domain is configured.</p><div className="mt-5 flex flex-wrap items-center gap-4"><button type="button" onClick={resendVerification} disabled={pending || resendCooldown > 0} className="font-semibold text-[#c6f06e] disabled:cursor-not-allowed disabled:opacity-50">{resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend verification email'}</button><Link href="/sign-in" className="font-semibold text-white/60 hover:text-white">Use another email</Link></div></div> : <form onSubmit={submit} className="space-y-4">
            {isSignUp && <label className="block text-sm"><span className="mb-1.5 block text-white/65">Full name</span><input required value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-xl border border-white/10 bg-black/15 px-3.5 py-3 outline-none ring-[#c6f06e] placeholder:text-white/25 focus:ring-2" placeholder="Your name" /></label>}
            <label className="block text-sm"><span className="mb-1.5 block text-white/65">Work email</span><input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xl border border-white/10 bg-black/15 px-3.5 py-3 outline-none ring-[#c6f06e] placeholder:text-white/25 focus:ring-2" placeholder="you@company.com" /></label>
            <label className="block text-sm"><span className="mb-1.5 block text-white/65">Password</span><input required minLength={8} type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-xl border border-white/10 bg-black/15 px-3.5 py-3 outline-none ring-[#c6f06e] placeholder:text-white/25 focus:ring-2" placeholder="At least 8 characters" /></label>
            {error && <p role="alert" className="rounded-xl border border-red-300/20 bg-red-400/10 px-3 py-2 text-sm text-red-200">{error}</p>}
            <button disabled={pending} className="flex w-full items-center justify-center rounded-xl bg-[#c6f06e] px-4 py-3.5 text-sm font-semibold text-[#082c23] transition hover:bg-[#d5fa8d] disabled:opacity-50">{pending ? <Loader2 className="animate-spin" size={17} /> : <>{isSignUp ? 'Create workspace' : 'Sign in'} <ArrowRight size={15} className="ml-2" /></>}</button>
          </form>}
          <p className="mt-6 text-center text-sm text-white/50">{isSignUp ? 'Already have an account?' : 'New to Efoka?'} <Link href={isSignUp ? '/sign-in' : '/sign-up'} className="font-medium text-[#c6f06e] hover:underline">{isSignUp ? 'Sign in' : 'Create an account'}</Link></p>
        </section>
      </div>
    </main>
  )
}
