import { betterAuth } from 'better-auth'
import { pool } from '@/lib/db'
import { getEmailConfig } from '@/lib/email/config'
import { createVerificationEmail } from '@/lib/email/verification-email'

const originFromEnv = (value?: string) => {
  if (!value) return undefined
  return value.startsWith('http://') || value.startsWith('https://') ? value.replace(/\/$/, '') : `https://${value}`
}
const baseURL = originFromEnv(process.env.APP_URL) ??
  originFromEnv(process.env.BETTER_AUTH_URL) ??
  originFromEnv(process.env.VERCEL_PROJECT_PRODUCTION_URL) ??
  originFromEnv(process.env.VERCEL_URL) ??
  originFromEnv(process.env.V0_RUNTIME_URL) ??
  'http://localhost:3000'

const trustedOrigins = Array.from(new Set([
  'https://app-ui-and-ecommerce-improvements.vercel.app',
  'https://v0-app-ui-and-ecommerce-improvements.vercel.app',
  ...(process.env.NODE_ENV === 'development' ? [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    originFromEnv(process.env.V0_RUNTIME_URL),
    originFromEnv(process.env.V0_DEV_APP_URL),
    originFromEnv(process.env.V0_BUILD_URL),
    originFromEnv(process.env.V0_SANDBOX_URL),
  ] : []),
  originFromEnv(process.env.VERCEL_URL),
  originFromEnv(process.env.VERCEL_PROJECT_PRODUCTION_URL),
  originFromEnv(process.env.BETTER_AUTH_URL),
  baseURL,
].filter((origin): origin is string => Boolean(origin))))

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  database: pool,
  baseURL,
  emailAndPassword: {
    enabled: true,
    autoSignIn: false,
    requireEmailVerification: true,
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url }: { user: { email: string; name: string }; url: string }) => {
      const { client, from } = getEmailConfig()
      const email = createVerificationEmail({ name: user.name, url })
      const { error } = await client.emails.send(
        { from, to: [user.email], subject: email.subject, text: email.text, html: email.html },
        { idempotencyKey: email.idempotencyKey },
      )
      if (error) {
        console.error('[v0] Verification email delivery failed', { name: error.name, statusCode: error.statusCode })
        throw new Error('Verification email could not be delivered')
      }
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    },
  },
  trustedOrigins,
  session: { expiresIn: 60 * 30, updateAge: 60 * 5 },
  ...(process.env.NODE_ENV === 'development' ? {
    advanced: { defaultCookieAttributes: { sameSite: 'none' as const, secure: true } },
  } : {}),
})
