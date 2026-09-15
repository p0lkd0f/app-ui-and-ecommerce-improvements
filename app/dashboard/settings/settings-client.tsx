'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, CheckCircle2, Loader2, ShieldAlert, Trash2 } from 'lucide-react'

export default function SettingsClient({ user }: { user: { name: string; email: string } }) {
  const [name, setName] = useState(user.name)
  const [phone, setPhone] = useState('')
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmation, setConfirmation] = useState('')

  useEffect(() => {
    void fetch('/api/profile', { cache: 'no-store' }).then(async (response) => {
      if (!response.ok) return
      const data = await response.json() as { profile?: { name?: string; phone?: string | null } }
      setName(data.profile?.name ?? user.name)
      setPhone(data.profile?.phone ?? '')
    })
  }, [user.name])

  const save = async () => {
    setBusy(true); setStatus('')
    const response = await fetch('/api/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, phone }) })
    setBusy(false)
    setStatus(response.ok ? 'Profile saved securely.' : 'Could not save your profile.')
  }

  const deleteAccount = async () => {
    if (confirmation !== 'DELETE') return
    setBusy(true); setStatus('')
    const response = await fetch('/api/account', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirmation }) })
    if (response.ok) { window.location.assign('/sign-in'); return }
    setBusy(false); setStatus('Account deletion failed. Nothing was removed.')
  }

  return <main className="min-h-screen bg-[#f5f7f4] px-5 py-8 text-[#17211b] sm:px-8"><div className="mx-auto max-w-3xl"><button onClick={() => window.location.assign('/dashboard')} className="mb-8 inline-flex items-center gap-2 text-[12px] font-semibold text-[#52745a]"><ArrowLeft size={15} /> Back to dashboard</button><div className="mb-8"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#6e9974]">Workspace settings</p><h1 className="mt-2 text-3xl font-semibold tracking-[-.05em]">Account and security</h1><p className="mt-2 text-sm text-[#78867d]">Manage your profile, connected data permissions, and account lifecycle.</p></div><section className="rounded-2xl border border-[#e3e9e2] bg-white p-6 shadow-sm"><div className="mb-5"><h2 className="text-base font-semibold">Profile</h2><p className="mt-1 text-xs text-[#89948c]">Used for reports, support routing, and workspace identity.</p></div><div className="grid gap-4 sm:grid-cols-2"><label className="text-xs font-semibold text-[#536359]">Name<input value={name} onChange={(event) => setName(event.target.value)} maxLength={120} className="mt-2 w-full rounded-xl border border-[#dfe7df] px-3 py-3 text-sm outline-none focus:border-[#5b8c63]" /></label><label className="text-xs font-semibold text-[#536359]">Email<input value={user.email} readOnly className="mt-2 w-full rounded-xl border border-[#edf0eb] bg-[#f7f9f6] px-3 py-3 text-sm text-[#89948c]" /></label><label className="text-xs font-semibold text-[#536359] sm:col-span-2">Phone<input value={phone} onChange={(event) => setPhone(event.target.value)} maxLength={32} placeholder="Optional" className="mt-2 w-full rounded-xl border border-[#dfe7df] px-3 py-3 text-sm outline-none focus:border-[#5b8c63]" /></label></div><button onClick={save} disabled={busy} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#235337] px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-60">{busy ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Save changes</button></section><section className="mt-5 rounded-2xl border border-[#f0c8bd] bg-[#fffaf8] p-6"><div className="flex items-start gap-3"><ShieldAlert size={19} className="mt-0.5 text-[#c76850]" /><div><h2 className="text-base font-semibold text-[#713d31]">Delete account</h2><p className="mt-1 text-xs leading-5 text-[#8c6258]">This permanently removes your profile, sessions, report preferences, and connected store records. Provider accounts are not deleted; disconnect them first if needed.</p></div></div><label className="mt-5 block text-xs font-semibold text-[#713d31]">Type DELETE to confirm<input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="off" className="mt-2 w-full rounded-xl border border-[#efc8bd] bg-white px-3 py-3 text-sm outline-none focus:border-[#c76850]" /></label><button onClick={deleteAccount} disabled={busy || confirmation !== 'DELETE'} className="mt-4 inline-flex items-center gap-2 rounded-xl border border-[#c76850] px-4 py-2.5 text-xs font-semibold text-[#a04e3b] disabled:cursor-not-allowed disabled:opacity-40"><Trash2 size={14} /> Permanently delete account</button></section>{status && <p role="status" className="mt-4 text-xs font-semibold text-[#52745a]">{status}</p>}</div></main>
}
