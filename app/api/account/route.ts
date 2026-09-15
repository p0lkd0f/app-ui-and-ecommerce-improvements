import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { account, reportPreference, session, storeConnection, user } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function DELETE(request: Request) {
  const current = await auth.api.getSession({ headers: await headers() })
  if (!current?.user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  const body = await request.json().catch(() => null) as { confirmation?: string } | null
  if (body?.confirmation !== 'DELETE') {
    return NextResponse.json({ error: 'Type DELETE to permanently remove this account' }, { status: 422 })
  }

  await db.transaction(async (tx) => {
    await tx.delete(storeConnection).where(eq(storeConnection.userId, current.user.id))
    await tx.delete(reportPreference).where(eq(reportPreference.userId, current.user.id))
    await tx.delete(account).where(eq(account.userId, current.user.id))
    await tx.delete(session).where(eq(session.userId, current.user.id))
    await tx.delete(user).where(eq(user.id, current.user.id))
  })

  return NextResponse.json({ ok: true, deleted: true })
}
