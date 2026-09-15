import { db } from '@/lib/db'
import { session, user } from '@/lib/db/schema'
import { OAuth2Client } from 'google-auth-library'
import { eq } from 'drizzle-orm'
import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'

const origin = 'https://v0-app-ui-and-ecommerce-improvements.vercel.app'
const redirectUri = `${origin}/api/auth/callback/google`

function googleClient() {
  return new OAuth2Client(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, redirectUri)
}

function errorRedirect(request: NextRequest, code: string) {
  return NextResponse.redirect(new URL(`/sign-in?error=${encodeURIComponent(code)}`, request.url))
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  const state = request.nextUrl.searchParams.get('state')
  const savedState = request.cookies.get('efoka_google_oauth_state')?.value
  if (!code || !state || !savedState || state !== savedState) return errorRedirect(request, 'google_oauth_state_invalid')

  try {
    const { tokens } = await googleClient().getToken({ code, redirect_uri: redirectUri })
    if (!tokens.id_token) return errorRedirect(request, 'google_id_token_missing')
    const ticket = await googleClient().verifyIdToken({ idToken: tokens.id_token, audience: process.env.GOOGLE_CLIENT_ID })
    const payload = ticket.getPayload()
    if (!payload?.sub || !payload.email || payload.email_verified !== true) return errorRedirect(request, 'google_email_not_verified')

    const existingUser = await db.select().from(user).where(eq(user.email, payload.email)).limit(1)
    const userId = existingUser[0]?.id ?? randomUUID()
    if (!existingUser[0]) {
      await db.insert(user).values({ id: userId, name: payload.name || payload.email.split('@')[0], email: payload.email, emailVerified: true, image: payload.picture || null })
    } else if (!existingUser[0].emailVerified) {
      await db.update(user).set({ emailVerified: true, image: payload.picture || existingUser[0].image, updatedAt: new Date() }).where(eq(user.id, userId))
    }

    const token = randomUUID() + randomUUID()
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000)
    await db.insert(session).values({ id: randomUUID(), token, userId, expiresAt, ipAddress: request.headers.get('x-forwarded-for'), userAgent: request.headers.get('user-agent') })

    const destination = new URL('/dashboard', origin)
    const callbackURL = request.cookies.get('efoka_google_oauth_state')?.value
    if (callbackURL) {
      try {
        const parsed = JSON.parse(Buffer.from(callbackURL, 'base64url').toString())
        if (typeof parsed.callbackURL === 'string' && parsed.callbackURL.startsWith('/') && !parsed.callbackURL.startsWith('//')) destination.pathname = parsed.callbackURL
      } catch {}
    }
    const response = NextResponse.redirect(destination)
    // Better Auth reads the unprefixed cookie name by default. The previous callback
    // wrote a second prefixed cookie, so the stale unprefixed cookie won during lookup.
    response.cookies.set('better-auth.session_token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 30 * 60,
      path: '/',
    })
    response.cookies.delete('__Secure-better-auth.session_token')
    response.cookies.delete('efoka_google_oauth_state')
    return response
  } catch (error) {
    console.error('[v0] Google OAuth callback failed', error)
    return errorRedirect(request, 'google_oauth_failed')
  }
}
