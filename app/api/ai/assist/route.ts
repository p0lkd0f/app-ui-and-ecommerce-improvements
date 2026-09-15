import { generateText, gateway } from 'ai'
import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'

const modes = new Set(['overview', 'orders', 'inbox', 'products'])

export async function POST(request: Request) {
  const current = await auth.api.getSession({ headers: await headers() })
  if (!current?.user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  if (!request.headers.get('content-type')?.includes('application/json')) return NextResponse.json({ error: 'JSON content type required' }, { status: 415 })

  const body = await request.json().catch(() => null) as { prompt?: string; mode?: string; context?: unknown } | null
  const prompt = typeof body?.prompt === 'string' ? body.prompt.trim().slice(0, 2000) : ''
  const mode = typeof body?.mode === 'string' && modes.has(body.mode) ? body.mode : 'overview'
  if (prompt.length < 3) return NextResponse.json({ error: 'Enter a question with at least 3 characters' }, { status: 422 })

  const context = JSON.stringify(body?.context ?? {}).slice(0, 8000)
  try {
    const result = await generateText({
      model: gateway('openai/gpt-5.4-mini'),
      system: `You are Efoka, a careful ecommerce operations copilot. Use only the supplied dashboard context. Never invent orders, revenue, customer details, inventory, or provider capabilities. If the context is insufficient, say what data is missing. Give concise, actionable guidance for the ${mode} workspace.`,
      prompt: `User question: ${prompt}\nDashboard context: ${context}`,
      maxOutputTokens: 500,
    })
    return NextResponse.json({ answer: result.text, mode, model: 'openai/gpt-5.4-mini' })
  } catch (error) {
    console.error('[v0] AI assistance failed', { mode, message: error instanceof Error ? error.message : 'unknown' })
    return NextResponse.json({ error: 'AI assistance is temporarily unavailable' }, { status: 503 })
  }
}
