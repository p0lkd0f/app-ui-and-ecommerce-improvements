import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { getCookies } from 'better-auth/cookies'
import { makeSignature } from 'better-auth/crypto'
import { user } from '@/lib/db/schema'
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

    // Use Better Auth's own adapter so the token format, expiry, and lookup
    // semantics exactly match auth.api.getSession on protected server routes.
    const authContext = await auth.$context
    const createdSession = await authContext.internalAdapter.createSession(userId)
    const token = createdSession.token
    const expiresAt = createdSession.expiresAt

    const destination = new URL('/dashboard', origin)
    const callbackURL = request.cookies.get('efoka_google_oauth_state')?.value
    if (callbackURL) {
      try {
        const parsed = JSON.parse(Buffer.from(callbackURL, 'base64url').toString())
        if (typeof parsed.callbackURL === 'string' && parsed.callbackURL.startsWith('/') && !parsed.callbackURL.startsWith('//')) destination.pathname = parsed.callbackURL
      } catch {}
    }
    const response = NextResponse.redirect(destination)
    const sessionCookie = getCookies(auth.options).sessionToken
    const secret = process.env.BETTER_AUTH_SECRET
    if (!secret) throw new Error('BETTER_AUTH_SECRET is not configured')

    // Better Auth signs the session cookie. A raw database token is intentionally
    // rejected by getSession, which was the cause of the dashboard 307 redirect.
    const signature = await makeSignature(token, secret)
    response.cookies.set(sessionCookie.name, encodeURIComponent(`${token}.${signature}`), {
      ...sessionCookie.attributes,
      sameSite: 'lax',
      maxAge: 30 * 60,
    })
    response.cookies.set('better-auth.session_token', '', { maxAge: 0, path: '/' })
    response.cookies.set('__Secure-better-auth.session_token', '', { maxAge: 0, path: '/' })
    response.cookies.set('efoka_google_oauth_state', '', { maxAge: 0, path: '/' })
    return response
  } catch (error) {
    console.error('[v0] Google OAuth callback failed', error)
    return errorRedirect(request, 'google_oauth_failed')
  }
}
