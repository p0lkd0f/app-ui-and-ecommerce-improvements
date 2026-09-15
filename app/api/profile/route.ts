import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { user, reportPreference } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

async function getSession() {
  return auth.api.getSession({ headers: await headers() })
}

export async function GET() {
  const session = await getSession()
  if (!session?.user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  const [profile, preference] = await Promise.all([
    db.select({ id: user.id, name: user.name, email: user.email, phone: user.phone }).from(user).where(eq(user.id, session.user.id)).limit(1),
    db.select().from(reportPreference).where(eq(reportPreference.userId, session.user.id)).limit(1),
  ])
  return NextResponse.json({ profile: profile[0] ?? session.user, report: preference[0] ?? { enabled: false, recipientEmail: session.user.email, recipientPhone: null, timezone: 'UTC', sendHour: '08:00' } })
}

export async function PATCH(request: Request) {
  const session = await getSession()
  if (!session?.user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  if (!request.headers.get('content-type')?.includes('application/json')) return NextResponse.json({ error: 'JSON content type required' }, { status: 415 })
  const body = await request.json().catch(() => null) as { name?: string; phone?: string; enabled?: boolean; recipientEmail?: string; recipientPhone?: string; senderName?: string; senderEmail?: string; timezone?: string; sendHour?: string } | null
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  if (body.enabled !== undefined && typeof body.enabled !== 'boolean') return NextResponse.json({ error: 'enabled must be boolean' }, { status: 422 })
  if (body.sendHour && !/^([01]\d|2[0-3]):[0-5]\d$/.test(body.sendHour)) return NextResponse.json({ error: 'sendHour must use HH:MM format' }, { status: 422 })
  const name = body.name?.trim().slice(0, 120)
  const phone = body.phone?.trim().slice(0, 32) || null
  const recipientEmail = body.recipientEmail?.trim().slice(0, 254) || session.user.email
  const recipientPhone = body.recipientPhone?.trim().slice(0, 32) || phone
  const senderName = body.senderName?.trim().slice(0, 120) || null
  const senderEmail = body.senderEmail?.trim().slice(0, 254) || null
  const timezone = body.timezone?.trim().slice(0, 64) || 'UTC'
  const sendHour = body.sendHour?.trim().match(/^([01]\d|2[0-3]):[0-5]\d$/)?.[0] ?? '08:00'
  if (name) await db.update(user).set({ name, phone, updatedAt: new Date() }).where(eq(user.id, session.user.id))
  const [report] = await db.insert(reportPreference).values({ userId: session.user.id, enabled: body.enabled === true, recipientEmail, recipientPhone, senderName, senderEmail, timezone, sendHour, updatedAt: new Date() }).onConflictDoUpdate({ target: reportPreference.userId, set: { enabled: body.enabled === true, recipientEmail, recipientPhone, senderName, senderEmail, timezone, sendHour, updatedAt: new Date() } }).returning()
  return NextResponse.json({ ok: true, report })
}
