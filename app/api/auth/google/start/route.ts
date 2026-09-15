import { OAuth2Client } from 'google-auth-library'
import { NextRequest, NextResponse } from 'next/server'

const origin = 'https://v0-app-ui-and-ecommerce-improvements.vercel.app'

function googleClient() {
  return new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${origin}/api/auth/callback/google`,
  )
}

export async function GET(request: NextRequest) {
  const callbackURL = request.nextUrl.searchParams.get('callbackURL') || '/dashboard'
  const safeCallbackURL = callbackURL.startsWith('/') && !callbackURL.startsWith('//') ? callbackURL : '/dashboard'
  const state = Buffer.from(JSON.stringify({ callbackURL: safeCallbackURL, nonce: crypto.randomUUID() })).toString('base64url')
  const authorizationUrl = googleClient().generateAuthUrl({
    access_type: 'offline',
    scope: ['openid', 'email', 'profile'],
    state,
    prompt: 'select_account',
  })
  const response = NextResponse.redirect(authorizationUrl)
  response.cookies.set('efoka_google_oauth_state', state, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  })
  return response
}

export { googleClient }
export { origin as googleOrigin }
