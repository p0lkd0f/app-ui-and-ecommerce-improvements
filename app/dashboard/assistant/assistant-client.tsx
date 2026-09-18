'use client'

import { FormEvent, useState } from 'react'
import { ArrowLeft, Bot, Check, Loader2, Sparkles } from 'lucide-react'

const suggestions = [
  'What changed in revenue this month?',
  'Which products need attention?',
  'Summarize our customer growth',
]

export default function AssistantClient() {
  const [prompt, setPrompt] = useState('')
  const [answer, setAnswer] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [history, setHistory] = useState<string[]>([])

  const ask = async (event?: FormEvent) => {
    event?.preventDefault()
    const value = prompt.trim()
    if (value.length < 3 || busy) return

    setBusy(true)
    setError('')
    setAnswer('')
    try {
      const response = await fetch('/api/ai/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: value,
          mode: 'overview',
          context: { requestedAt: new Date().toISOString() },
        }),
      })
      const data = await response.json().catch(() => ({})) as { answer?: string; error?: string }
      if (!response.ok) throw new Error(data.error ?? 'AI assistance is unavailable right now.')
      setAnswer(data.answer ?? 'No answer was returned. Try asking in a different way.')
      setHistory((items) => [value, ...items.filter((item) => item !== value)].slice(0, 5))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'AI assistance is unavailable right now.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#f5f7f4] px-5 py-8 text-[#17211b] sm:px-8">
      <div className="mx-auto max-w-6xl">
        <button type="button" onClick={() => window.location.assign('/dashboard')} className="mb-8 inline-flex items-center gap-2 text-sm text-[#637168] hover:text-[#173b2b]"><ArrowLeft className="size-4" />Back to workspace</button>
        <div className="grid gap-6 lg:grid-cols-[250px_1fr]">
          <aside className="rounded-3xl border border-[#e2e9e2] bg-white p-5 shadow-[0_8px_28px_rgba(30,73,43,.04)]">
            <div className="flex items-center gap-2 text-[#173b2b]"><span className="grid size-9 place-items-center rounded-xl bg-[#e9f6c9]"><Sparkles className="size-4" /></span><span className="font-semibold">Efoka assistant</span></div>
            <p className="mt-5 text-xs leading-5 text-[#78857c]">Grounded in your connected commerce data. It never invents live results.</p>
            <p className="mt-7 text-[10px] font-bold uppercase tracking-[.16em] text-[#98a39b]">Recent prompts</p>
            <div className="mt-3 space-y-1">{history.length ? history.map((item) => <button key={item} type="button" onClick={() => setPrompt(item)} className="block w-full truncate rounded-lg px-2 py-2 text-left text-xs text-[#637168] hover:bg-[#f3f7f0]">{item}</button>) : <p className="px-2 text-xs text-[#a1aaa3]">Your prompts will appear here.</p>}</div>
          </aside>
          <section className="rounded-3xl border border-[#e2e9e2] bg-white p-6 shadow-[0_8px_28px_rgba(30,73,43,.04)] sm:p-9">
            <div className="max-w-2xl"><span className="inline-flex items-center gap-2 rounded-full bg-[#eef7df] px-3 py-1 text-[11px] font-semibold text-[#47702f]"><Check className="size-3.5" />Connected data only</span><h1 className="mt-5 text-3xl font-semibold tracking-[-.04em] text-[#173b2b]">What would you like to understand?</h1><p className="mt-2 text-sm leading-6 text-[#718078]">Ask about performance, customers, inventory, or opportunities in your store.</p></div>
            <div className="mt-8 flex flex-wrap gap-2">{suggestions.map((item) => <button key={item} type="button" onClick={() => setPrompt(item)} className="rounded-full border border-[#dfe9df] px-3 py-2 text-xs text-[#53635a] hover:border-[#9fc46d] hover:bg-[#f5faed]">{item}</button>)}</div>
            <form onSubmit={ask} className="mt-8"><label htmlFor="assistant-prompt" className="sr-only">Ask Efoka</label><textarea id="assistant-prompt" value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Ask a question about your commerce workspace…" rows={5} className="w-full resize-none rounded-2xl border border-[#dfe9df] bg-[#fbfdfb] p-4 text-sm outline-none transition focus:border-[#77a94b] focus:ring-4 focus:ring-[#dff0c4]" /><div className="mt-3 flex items-center justify-between"><span className="text-xs text-[#9aa49d]">Efoka can help interpret trends and suggest next steps.</span><button type="submit" disabled={busy || prompt.trim().length < 3} className="inline-flex items-center gap-2 rounded-xl bg-[#173b2b] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#24563d] disabled:cursor-not-allowed disabled:opacity-50">{busy ? <Loader2 className="size-4 animate-spin" /> : <Bot className="size-4" />}{busy ? 'Thinking…' : 'Ask assistant'}</button></div></form>
            {error && <p role="alert" className="mt-5 rounded-xl border border-[#f2c9b8] bg-[#fff5f0] p-4 text-sm text-[#a34d31]">{error}</p>}
            {answer && <div className="mt-6 rounded-2xl border border-[#dfe9df] bg-[#f8fbf7] p-5"><p className="mb-3 text-[10px] font-bold uppercase tracking-[.16em] text-[#6d8d56]">Efoka’s read</p><p className="whitespace-pre-wrap text-sm leading-7 text-[#34463b]">{answer}</p></div>}
          </section>
        </div>
      </div>
    </main>
  )
}
