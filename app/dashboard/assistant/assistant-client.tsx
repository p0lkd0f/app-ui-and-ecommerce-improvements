'use client'

import { useState } from 'react'
import { ArrowLeft, Loader2, Sparkles } from 'lucide-react'

export default function AssistantClient() {
  const [prompt, setPrompt] = useState('')
  const [answer, setAnswer] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const ask = async () => {
    if (prompt.trim().length < 3) return
    setBusy(true); setError(''); setAnswer('')
    const response = await fetch('/api/ai/assist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt, mode: 'overview', context: { requestedAt: new Date().toISOString() } }) })
    const data = await response.json().catch(() => ({})) as { answer?: string; error?: string }
    setBusy(false)
    if (!response.ok) { setError(data.error ?? 'AI assistance is unavailable'); return }
    setAnswer(data.answer ?? 'No answer was returned.')
  }

  return <main className="min-h-screen bg-[#f5f7f4] px-5 py-8 text-[#17211b] sm:px-8"><div className="mx-auto max-w-3xl"><button onClick={() => window.location.assign('/dashboard')} className="mb-8 inline-flex items-center gap-2 text-[12px] font-semibold text-[#52745a]"><ArrowLeft size={15} /> Back to dashboard</button><div className="rounded-3xl bg-[#173b2b] p-7 text-white shadow-xl"><div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-2xl bg-[#c5dc9f] text-[#173b2b]"><Sparkles size={19} /></div><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#c5dc9f]">Efoka copilot</p><h1 className="mt-1 text-2xl font-semibold tracking-[-.05em]">Make a better next move</h1></div></div><p className="mt-5 max-w-xl text-sm leading-6 text-[#c0d2c2]">Ask about what is visible in your connected commerce workspace. The copilot will not invent missing order, customer, or inventory data.</p><textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing && event.keyCode !== 229) { event.preventDefault(); void ask() } }} placeholder="What should I focus on today?" rows={4} className="mt-6 w-full resize-none rounded-2xl border border-white/10 bg-white/10 p-4 text-sm text-white outline-none placeholder:text-[#a4b9aa] focus:border-[#c5dc9f]" /><button onClick={ask} disabled={busy || prompt.trim().length < 3} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#c5dc9f] px-4 py-2.5 text-xs font-bold text-[#173b2b] disabled:opacity-50">{busy ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} {busy ? 'Thinking' : 'Ask Efoka'}</button></div>{error && <p role="alert" className="mt-4 rounded-xl border border-[#efc8bd] bg-[#fffaf8] p-4 text-xs font-semibold text-[#a04e3b]">{error}</p>}{answer && <section className="mt-5 rounded-2xl border border-[#e3e9e2] bg-white p-6 shadow-sm"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#6e9974]">Recommendation</p><p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[#405047]">{answer}</p></section>}</div></main>
}
