'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, CheckCircle2, Loader2, ShieldAlert, Trash2 } from 'lucide-react'

export default function SettingsClient({ user }: { user: { name: string; email: string } }) {
  const [name, setName] = useState(user.name)
  const [phone, setPhone] = useState('')
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmation, setConfirmation] = useState('')
  const [notifications, setNotifications] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    void fetch('/api/profile', { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) return
        const data = await response.json() as { profile?: { name?: string; phone?: string | null } }
        setName(data.profile?.name ?? user.name)
        setPhone(data.profile?.phone ?? '')
      })
      .catch((error) => { if (!(error instanceof DOMException && error.name === 'AbortError')) setStatus('Could not load your profile.') })
    return () => controller.abort()
  }, [user.name])

  const save = async () => {
    if (!name.trim()) { setStatus('Name cannot be empty.'); return }
    setBusy(true); setStatus('')
    try {
      const response = await fetch('/api/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: name.trim(), phone: phone.trim() }) })
      setStatus(response.ok ? 'Profile saved securely.' : 'Could not save your profile.')
    } catch { setStatus('Network error. Please try again.') } finally { setBusy(false) }
  }

  const deleteAccount = async () => {
    if (confirmation !== 'DELETE' || busy) return
    setBusy(true); setStatus('')
    try {
      const response = await fetch('/api/account', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirmation }) })
      if (response.ok) { window.location.assign('/sign-in'); return }
      setStatus('Account deletion failed. Nothing was removed.')
    } catch { setStatus('Network error. Nothing was removed.') } finally { setBusy(false) }
  }

  return <main className="min-h-screen bg-[#f5f7f4] px-5 py-8 text-[#17211b] sm:px-8"><div className="mx-auto max-w-3xl"><button type="button" onClick={() => window.location.assign('/dashboard')} className="mb-8 inline-flex items-center gap-2 text-sm text-[#637168] hover:text-[#173b2b]"><ArrowLeft className="size-4" />Back to workspace</button><div className="mb-8"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#77915e]">Workspace settings</p><h1 className="mt-2 text-3xl font-semibold tracking-[-.04em] text-[#173b2b]">Your account</h1><p className="mt-2 text-sm text-[#718078]">Manage your profile and the way Efoka keeps you informed.</p></div>{status && <p role="status" className="mb-5 rounded-xl border border-[#dfe9df] bg-white p-3 text-sm text-[#53635a]">{status}</p>}<section className="rounded-3xl border border-[#e2e9e2] bg-white p-6 shadow-[0_8px_28px_rgba(30,73,43,.04)] sm:p-8"><h2 className="font-semibold text-[#173b2b]">Profile</h2><p className="mt-1 text-sm text-[#829087]">Visible to your team members.</p><div className="mt-6 grid gap-5 sm:grid-cols-2"><label className="text-sm"><span className="mb-2 block font-medium">Full name</span><input value={name} onChange={(event) => setName(event.target.value)} className="w-full rounded-xl border border-[#dfe9df] px-3 py-2.5 outline-none focus:border-[#77a94b]" /></label><label className="text-sm"><span className="mb-2 block font-medium">Phone</span><input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Optional" className="w-full rounded-xl border border-[#dfe9df] px-3 py-2.5 outline-none focus:border-[#77a94b]" /></label></div><label className="mt-5 block text-sm"><span className="mb-2 block font-medium">Email</span><input value={user.email} disabled className="w-full rounded-xl border border-[#e9eee8] bg-[#f6f8f5] px-3 py-2.5 text-[#829087]" /></label><button type="button" onClick={save} disabled={busy} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#173b2b] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}Save changes</button></section><section className="mt-5 rounded-3xl border border-[#e2e9e2] bg-white p-6 sm:p-8"><div className="flex items-center justify-between gap-4"><div><h2 className="font-semibold text-[#173b2b]">Notifications</h2><p className="mt-1 text-sm text-[#829087]">Receive operational alerts by email.</p></div><button type="button" role="switch" aria-checked={notifications} onClick={() => setNotifications((value) => !value)} className={`relative h-6 w-11 rounded-full transition ${notifications ? 'bg-[#77a94b]' : 'bg-[#cbd5cc]'}`}><span className={`absolute top-1 size-4 rounded-full bg-white transition ${notifications ? 'left-6' : 'left-1'}`} /></button></div></section><section className="mt-5 rounded-3xl border border-[#f0d5ca] bg-[#fffaf7] p-6 sm:p-8"><div className="flex gap-3"><ShieldAlert className="mt-0.5 size-5 text-[#b65b3c]" /><div><h2 className="font-semibold text-[#7f3b27]">Delete account</h2><p className="mt-1 text-sm leading-6 text-[#9b624e]">This permanently removes your account and connected workspace data.</p><input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="Type DELETE to confirm" className="mt-4 w-full rounded-xl border border-[#ebcbbd] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#b65b3c] sm:max-w-xs" /><button type="button" onClick={deleteAccount} disabled={busy || confirmation !== 'DELETE'} className="mt-4 flex items-center gap-2 rounded-xl bg-[#a34d31] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"><Trash2 className="size-4" />Delete account</button></div></div></section></div></main>
}
